import { calculatePsychrometricState } from "../engine";
import type { PsychrometricInput, PsychrometricState } from "../types";
import {
  clipCurveToHumidityRatioDomain,
  findSaturationIntersectionDryBulb,
} from "./curves";
import {
  generateConstantPropertyLines,
  generateWetBulbLines,
  type ChartStateEvaluator,
} from "./lineFamilies";
import type {
  ChartGeometryError,
  ChartPressureCondition,
  DryBulbGridLine,
  HumidityRatioGridLine,
  PsychrometricChartConfig,
  PsychrometricChartGeometryResult,
  PsychrometricChartPoint,
  RelativeHumidityCurve,
} from "./types";

export const RELATIVE_HUMIDITY_LEVELS = [
  10, 20, 30, 40, 50, 60, 70, 80, 90,
] as const;

function validateConfig(config: PsychrometricChartConfig): ChartGeometryError[] {
  const temperatureSpan =
    config.dryBulbDomain.max - config.dryBulbDomain.min;
  const estimatedTemperatureSamples =
    temperatureSpan / config.temperatureSampleInterval + 1;
  const estimatedDerivedLineSamples =
    temperatureSpan / config.derivedLineTemperatureInterval + 1;
  const values = [
    config.dryBulbDomain.min,
    config.dryBulbDomain.max,
    config.humidityRatioDomain.min,
    config.humidityRatioDomain.max,
    config.temperatureSampleInterval,
    config.dryBulbGridInterval,
    config.humidityRatioGridInterval,
    config.intersectionTolerance,
    config.derivedLineTemperatureInterval,
    config.wetBulbLineInterval,
    config.enthalpyLineInterval,
    config.specificVolumeLineInterval,
    config.enthalpySolverTolerance,
    config.specificVolumeSolverTolerance,
    config.dryBulbBoundaryTolerance,
    config.maxPropertySolverIterations,
  ];
  const valid =
    values.every(Number.isFinite) &&
    config.dryBulbDomain.max > config.dryBulbDomain.min &&
    config.humidityRatioDomain.min === 0 &&
    config.humidityRatioDomain.max > 0 &&
    config.temperatureSampleInterval > 0 &&
    config.dryBulbGridInterval > 0 &&
    config.humidityRatioGridInterval > 0 &&
    config.intersectionTolerance > 0 &&
    config.intersectionTolerance < config.temperatureSampleInterval &&
    config.intersectionTolerance < config.dryBulbGridInterval &&
    config.intersectionTolerance < config.humidityRatioGridInterval &&
    config.intersectionTolerance < config.derivedLineTemperatureInterval &&
    config.derivedLineTemperatureInterval > 0 &&
    config.wetBulbLineInterval > 0 &&
    config.enthalpyLineInterval > 0 &&
    config.specificVolumeLineInterval > 0 &&
    config.enthalpySolverTolerance > 0 &&
    config.specificVolumeSolverTolerance > 0 &&
    config.dryBulbBoundaryTolerance > 0 &&
    Number.isInteger(config.maxPropertySolverIterations) &&
    config.maxPropertySolverIterations > 0 &&
    config.maxPropertySolverIterations <= 100 &&
    [
      config.wetBulbLineValues,
      config.enthalpyLineValues,
      config.specificVolumeLineValues,
    ].every(
      (targets) =>
        targets === undefined ||
        (targets.length > 0 && targets.every(Number.isFinite)),
    ) &&
    Number.isFinite(estimatedTemperatureSamples) &&
    estimatedTemperatureSamples <= 5_000 &&
    Number.isFinite(estimatedDerivedLineSamples) &&
    estimatedDerivedLineSamples <= 5_000;

  return valid
    ? []
    : [
        {
          code: "INVALID_CONFIG",
          message:
            "Chart domains and targets must be finite; domains must increase; humidity ratio must start at zero; intervals and solver tolerances must be positive; intersection tolerance must be smaller than Phase 2A intervals; solver iterations must be an integer from 1 to 100; the temperature grid must not exceed 5,000 samples.",
        },
      ];
}

function generateTicks(min: number, max: number, interval: number): number[] {
  const firstIndex = Math.ceil(min / interval - 1e-12);
  const lastIndex = Math.floor(max / interval + 1e-12);
  const ticks: number[] = [];
  for (let index = firstIndex; index <= lastIndex; index += 1) {
    const value = index * interval;
    ticks.push(Math.abs(value) < 1e-14 ? 0 : value);
  }
  return ticks;
}

function generateTemperatureSamples(
  config: PsychrometricChartConfig,
  interval = config.temperatureSampleInterval,
): number[] {
  const { min, max } = config.dryBulbDomain;
  const sampleCount = Math.floor((max - min) / interval);
  const samples = Array.from(
    { length: sampleCount + 1 },
    (_, index) => min + index * interval,
  ).filter((temperature) => temperature <= max + config.intersectionTolerance);
  samples.push(max);
  samples.push(...generateTicks(min, max, config.dryBulbGridInterval));
  samples.sort((left, right) => left - right);

  return samples.filter(
    (temperature, index) =>
      index === 0 ||
      Math.abs(temperature - samples[index - 1]) > config.intersectionTolerance,
  );
}

function toEngineInput(
  config: PsychrometricChartConfig,
  pressure: ChartPressureCondition,
  dryBulb: number,
  moistureMode: "relativeHumidity" | "wetBulb",
  moistureValue: number,
): PsychrometricInput {
  const common = {
    unitSystem: config.unitSystem,
    dryBulb,
    moistureMode,
    moistureValue,
  };

  return pressure.pressureMode === "elevation"
    ? { ...common, pressureMode: "elevation", elevation: pressure.elevation }
    : {
        ...common,
        pressureMode: "manual",
        pressure: pressure.pressure,
        pressureUnit: pressure.pressureUnit,
        elevation: pressure.elevation,
      };
}

export function generatePsychrometricChartGeometry(
  config: PsychrometricChartConfig,
): PsychrometricChartGeometryResult {
  const configErrors = validateConfig(config);
  if (configErrors.length > 0) return { ok: false, errors: configErrors };

  let stateEvaluationCount = 0;
  const stateCache = new Map<string, PsychrometricState>();
  const cacheKey = (
    dryBulb: number,
    moistureMode: "relativeHumidity" | "wetBulb",
    moistureValue: number,
  ) => `${moistureMode}:${dryBulb}:${moistureValue}`;
  const calculate = (
    dryBulb: number,
    relativeHumidity: number,
  ): PsychrometricState | ChartGeometryError => {
    stateEvaluationCount += 1;
    const result = calculatePsychrometricState(
      toEngineInput(
        config,
        config.pressureCondition,
        dryBulb,
        "relativeHumidity",
        relativeHumidity,
      ),
    );
    if (result.ok) {
      stateCache.set(
        cacheKey(dryBulb, "relativeHumidity", relativeHumidity),
        result.value,
      );
      return result.value;
    }
    return {
      code: "ENGINE_CALCULATION_FAILED",
      message: "The locked psychrometric engine rejected a chart sample.",
      dryBulb,
      relativeHumidity,
      engineErrors: result.errors,
    };
  };

  const evaluateState: ChartStateEvaluator = (
    dryBulb,
    moistureMode,
    moistureValue,
  ) => {
    const key = cacheKey(dryBulb, moistureMode, moistureValue);
    const cached = stateCache.get(key);
    if (cached) return cached;
    stateEvaluationCount += 1;
    const result = calculatePsychrometricState(
      toEngineInput(
        config,
        config.pressureCondition,
        dryBulb,
        moistureMode,
        moistureValue,
      ),
    );
    if (result.ok) {
      stateCache.set(key, result.value);
      return result.value;
    }
    return {
      code: "ENGINE_CALCULATION_FAILED",
      message: "The locked psychrometric engine rejected a chart sample.",
      dryBulb,
      relativeHumidity:
        moistureMode === "relativeHumidity" ? moistureValue : undefined,
      engineErrors: result.errors,
    };
  };

  const temperatures = generateTemperatureSamples(config);
  const derivedLineTemperatures = generateTemperatureSamples(
    config,
    config.derivedLineTemperatureInterval,
  );
  const saturationStates: PsychrometricState[] = [];
  const saturationStateCache = new Map<number, PsychrometricState>();
  for (const dryBulb of temperatures) {
    const state = calculate(dryBulb, 100);
    if ("code" in state) return { ok: false, errors: [state] };
    saturationStates.push(state);
    saturationStateCache.set(dryBulb, state);
  }

  const initialSaturationPoints = saturationStates.map(
    ({ dryBulb, humidityRatio }) => ({ dryBulb, humidityRatio }),
  );
  const humidityRatioTicks = generateTicks(
    config.humidityRatioDomain.min,
    config.humidityRatioDomain.max,
    config.humidityRatioGridInterval,
  );
  const saturationIntersectionTargets = [
    ...humidityRatioTicks,
    config.humidityRatioDomain.max,
  ].filter(
    (humidityRatio, index, values) =>
      values.findIndex(
        (candidate) =>
          Math.abs(candidate - humidityRatio) <= config.intersectionTolerance,
      ) === index,
  );
  const horizontalIntersections = new Map<number, number>();
  let intersectionError: ChartGeometryError | undefined;

  const evaluateSaturation = (dryBulb: number): PsychrometricState | undefined => {
    const cached = saturationStateCache.get(dryBulb);
    if (cached) return cached;
    const state = calculate(dryBulb, 100);
    if ("code" in state) {
      intersectionError = state;
      return undefined;
    }
    saturationStateCache.set(dryBulb, state);
    saturationStates.push(state);
    return state;
  };

  for (const humidityRatio of saturationIntersectionTargets) {
    const first = saturationStates[0];
    if (humidityRatio <= first.humidityRatio) {
      horizontalIntersections.set(humidityRatio, first.dryBulb);
      continue;
    }

    const upperIndex = saturationStates.findIndex(
      (state) => state.humidityRatio >= humidityRatio,
    );
    if (upperIndex < 1) continue;
    let lower = saturationStates[upperIndex - 1];
    let upper = saturationStates[upperIndex];

    const interpolatedDryBulb = findSaturationIntersectionDryBulb(
      initialSaturationPoints,
      humidityRatio,
      config.intersectionTolerance,
    );
    if (
      interpolatedDryBulb !== null &&
      interpolatedDryBulb > lower.dryBulb &&
      interpolatedDryBulb < upper.dryBulb
    ) {
      const interpolatedState = evaluateSaturation(interpolatedDryBulb);
      if (!interpolatedState) break;
      if (interpolatedState.humidityRatio >= humidityRatio) upper = interpolatedState;
      else lower = interpolatedState;
    }

    while (
      upper.humidityRatio - lower.humidityRatio > config.intersectionTolerance
    ) {
      const midpointState = evaluateSaturation(
        (lower.dryBulb + upper.dryBulb) / 2,
      );
      if (!midpointState) break;
      if (midpointState.humidityRatio >= humidityRatio) upper = midpointState;
      else lower = midpointState;
    }
    if (intersectionError) break;
    horizontalIntersections.set(humidityRatio, upper.dryBulb);
  }
  if (intersectionError) return { ok: false, errors: [intersectionError] };

  saturationStates.sort((left, right) => left.dryBulb - right.dryBulb);
  const saturationCurve = {
    points: clipCurveToHumidityRatioDomain(
      saturationStates.map(({ dryBulb, humidityRatio }) => ({
        dryBulb,
        humidityRatio,
      })),
      config.humidityRatioDomain,
    ),
  };
  const saturationTopIntersection = horizontalIntersections.get(
    config.humidityRatioDomain.max,
  );
  if (
    saturationTopIntersection !== undefined &&
    saturationCurve.points.at(-1)?.humidityRatio ===
      config.humidityRatioDomain.max
  ) {
    saturationCurve.points[saturationCurve.points.length - 1] = {
      dryBulb: saturationTopIntersection,
      humidityRatio: config.humidityRatioDomain.max,
    };
  }
  if (saturationCurve.points.length === 0) {
    return {
      ok: false,
      errors: [{ code: "EMPTY_GEOMETRY", message: "Saturation geometry is empty." }],
    };
  }

  const relativeHumidityCurves: RelativeHumidityCurve[] = [];
  for (const relativeHumidity of RELATIVE_HUMIDITY_LEVELS) {
    const points: PsychrometricChartPoint[] = [];
    for (const dryBulb of temperatures) {
      const state = calculate(dryBulb, relativeHumidity);
      if ("code" in state) return { ok: false, errors: [state] };
      points.push({ dryBulb, humidityRatio: state.humidityRatio });
    }
    relativeHumidityCurves.push({
      relativeHumidity,
      points: clipCurveToHumidityRatioDomain(
        points,
        config.humidityRatioDomain,
      ),
    });
  }

  const dryBulbGridLines = generateTicks(
    config.dryBulbDomain.min,
    config.dryBulbDomain.max,
    config.dryBulbGridInterval,
  ).map((dryBulb): DryBulbGridLine => {
    const saturationState = saturationStates.find(
      (state) =>
        Math.abs(state.dryBulb - dryBulb) <= config.intersectionTolerance,
    );
    if (saturationState === undefined) {
      throw new Error("Dry-bulb grid temperature is missing from shared samples.");
    }
    const upperHumidityRatio = Math.min(
      saturationState.humidityRatio,
      config.humidityRatioDomain.max,
    );
    return {
      dryBulb,
      points: [
        { dryBulb, humidityRatio: config.humidityRatioDomain.min },
        { dryBulb, humidityRatio: upperHumidityRatio },
      ],
    };
  });

  const humidityRatioGridLines: HumidityRatioGridLine[] = humidityRatioTicks.flatMap(
    (humidityRatio) => {
      const intersection = horizontalIntersections.get(humidityRatio);
      if (intersection === undefined) return [];
      return [
        {
          humidityRatio,
          points: [
            { dryBulb: intersection, humidityRatio },
            { dryBulb: config.dryBulbDomain.max, humidityRatio },
          ],
        },
      ];
    },
  );

  const phase2AEvaluationCount = stateEvaluationCount;
  const wetBulbResult = generateWetBulbLines(
    config,
    derivedLineTemperatures,
    evaluateState,
  );
  if (!wetBulbResult.ok) return { ok: false, errors: [wetBulbResult.error] };
  const wetBulbEvaluationCount = stateEvaluationCount - phase2AEvaluationCount;
  const enthalpyResult = generateConstantPropertyLines(
    config,
    derivedLineTemperatures,
    "enthalpy",
    evaluateState,
  );
  if (!enthalpyResult.ok) return { ok: false, errors: [enthalpyResult.error] };
  const enthalpyEvaluationCount =
    stateEvaluationCount - phase2AEvaluationCount - wetBulbEvaluationCount;
  const specificVolumeResult = generateConstantPropertyLines(
    config,
    derivedLineTemperatures,
    "specificVolume",
    evaluateState,
  );
  if (!specificVolumeResult.ok) {
    return { ok: false, errors: [specificVolumeResult.error] };
  }
  const specificVolumeEvaluationCount =
    stateEvaluationCount -
    phase2AEvaluationCount -
    wetBulbEvaluationCount -
    enthalpyEvaluationCount;

  return {
    ok: true,
    value: {
      unitSystem: config.unitSystem,
      atmosphericPressure: saturationStates[0].atmosphericPressure,
      pressureCondition: { ...config.pressureCondition },
      dryBulbDomain: { ...config.dryBulbDomain },
      humidityRatioDomain: { ...config.humidityRatioDomain },
      saturationCurve,
      relativeHumidityCurves,
      dryBulbGridLines,
      humidityRatioGridLines,
      wetBulbLines: wetBulbResult.lines,
      enthalpyLines: enthalpyResult.lines,
      specificVolumeLines: specificVolumeResult.lines,
      stateEvaluationCount,
      stateEvaluationBreakdown: {
        phase2A: phase2AEvaluationCount,
        wetBulbLines: wetBulbEvaluationCount,
        enthalpyLines: enthalpyEvaluationCount,
        specificVolumeLines: specificVolumeEvaluationCount,
      },
    },
  };
}
