import type { PsychrometricState } from "../types";
import { clipPolylineToHumidityRatioDomain } from "./curves";
import type {
  ChartGeometryError,
  EnthalpyLine,
  PsychrometricChartConfig,
  PsychrometricChartPoint,
  SpecificVolumeLine,
  WetBulbLine,
} from "./types";

export type ChartStateEvaluator = (
  dryBulb: number,
  moistureMode: "relativeHumidity" | "wetBulb",
  moistureValue: number,
) => PsychrometricState | ChartGeometryError;

type LineFamilyResult<T> =
  | { ok: true; lines: T[] }
  | { ok: false; error: ChartGeometryError };

type PropertyKey = "enthalpy" | "specificVolume";

const RELATIVE_HUMIDITY_BRACKETS = [
  0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100,
] as const;

function generateTargets(min: number, max: number, interval: number): number[] {
  const first = Math.ceil(min / interval - 1e-12);
  const last = Math.floor(max / interval + 1e-12);
  return Array.from({ length: Math.max(0, last - first + 1) }, (_, index) =>
    (first + index) * interval,
  );
}

function normalizeTargets(values: readonly number[]): number[] {
  return [...new Set(values)].sort((left, right) => left - right);
}

function toPoint(state: PsychrometricState): PsychrometricChartPoint {
  return { dryBulb: state.dryBulb, humidityRatio: state.humidityRatio };
}

function propertyValue(state: PsychrometricState, property: PropertyKey): number {
  return state[property];
}

function solvePropertyAtDryBulb(
  dryBulb: number,
  target: number,
  property: PropertyKey,
  tolerance: number,
  maxIterations: number,
  evaluate: ChartStateEvaluator,
): { state?: PsychrometricState; error?: ChartGeometryError } {
  const bracketStates: PsychrometricState[] = [];
  for (const relativeHumidity of RELATIVE_HUMIDITY_BRACKETS) {
    const state = evaluate(dryBulb, "relativeHumidity", relativeHumidity);
    if ("code" in state) return { error: state };
    bracketStates.push(state);
  }

  const firstValue = propertyValue(bracketStates[0], property);
  const lastValue = propertyValue(bracketStates.at(-1)!, property);
  if (target < firstValue - tolerance || target > lastValue + tolerance) return {};

  for (let index = 1; index < bracketStates.length; index += 1) {
    let lower = bracketStates[index - 1];
    let upper = bracketStates[index];
    let lowerValue = propertyValue(lower, property);
    let upperValue = propertyValue(upper, property);
    if (target < lowerValue - tolerance || target > upperValue + tolerance) continue;
    if (Math.abs(lowerValue - target) <= tolerance) return { state: lower };
    if (Math.abs(upperValue - target) <= tolerance) return { state: upper };

    for (let iteration = 0; iteration < maxIterations; iteration += 1) {
      let fraction = (target - lowerValue) / (upperValue - lowerValue);
      if (!Number.isFinite(fraction) || fraction <= 0.02 || fraction >= 0.98) {
        fraction = 0.5;
      }
      const relativeHumidity =
        lower.relativeHumidity +
        fraction * (upper.relativeHumidity - lower.relativeHumidity);
      const candidate = evaluate(
        dryBulb,
        "relativeHumidity",
        relativeHumidity,
      );
      if ("code" in candidate) return { error: candidate };
      const candidateValue = propertyValue(candidate, property);
      if (Math.abs(candidateValue - target) <= tolerance) {
        return { state: candidate };
      }
      if (candidateValue < target) {
        lower = candidate;
        lowerValue = candidateValue;
      } else {
        upper = candidate;
        upperValue = candidateValue;
      }
    }

    const best =
      Math.abs(lowerValue - target) <= Math.abs(upperValue - target)
        ? lower
        : upper;
    if (Math.abs(propertyValue(best, property) - target) <= tolerance) {
      return { state: best };
    }
    return {
      error: {
        code: "PROPERTY_SOLVER_FAILED",
        message: `The bounded ${property} solver did not converge.`,
        dryBulb,
      },
    };
  }
  return {};
}

function refineDryBulbBoundary(
  lowerState: PsychrometricState,
  upperState: PsychrometricState,
  relativeHumidity: 0 | 100,
  target: number,
  property: PropertyKey,
  tolerance: number,
  maxIterations: number,
  evaluate: ChartStateEvaluator,
): { state?: PsychrometricState; error?: ChartGeometryError } {
  let lower = lowerState;
  let upper = upperState;
  let lowerDifference = propertyValue(lower, property) - target;
  let upperDifference = propertyValue(upper, property) - target;
  if (lowerDifference * upperDifference > 0) return {};

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    const midpoint = evaluate(
      (lower.dryBulb + upper.dryBulb) / 2,
      "relativeHumidity",
      relativeHumidity,
    );
    if ("code" in midpoint) return { error: midpoint };
    const difference = propertyValue(midpoint, property) - target;
    if (Math.abs(difference) <= tolerance) return { state: midpoint };
    if (lowerDifference * difference <= 0) {
      upper = midpoint;
      upperDifference = difference;
    } else {
      lower = midpoint;
      lowerDifference = difference;
    }
  }

  const best =
    Math.abs(lowerDifference) <= Math.abs(upperDifference) ? lower : upper;
  return Math.abs(propertyValue(best, property) - target) <= tolerance
    ? { state: best }
    : {
        error: {
          code: "PROPERTY_SOLVER_FAILED",
          message: `The bounded ${property} boundary solver did not converge.`,
          dryBulb: best.dryBulb,
        },
      };
}

export function generateWetBulbLines(
  config: PsychrometricChartConfig,
  temperatures: readonly number[],
  evaluate: ChartStateEvaluator,
): LineFamilyResult<WetBulbLine> {
  const targets = normalizeTargets(
    config.wetBulbLineValues ??
      generateTargets(
        config.dryBulbDomain.min,
        config.dryBulbDomain.max,
        config.wetBulbLineInterval,
      ),
  );
  const lines: WetBulbLine[] = [];

  const refineDryBoundary = (
    lowerDryBulb: number,
    upperDryBulb: number,
    wetBulb: number,
  ): { dryBulb?: number; error?: ChartGeometryError } => {
    let lower = lowerDryBulb;
    let upper = upperDryBulb;
    for (
      let iteration = 0;
      iteration < config.maxPropertySolverIterations &&
      upper - lower > config.dryBulbBoundaryTolerance;
      iteration += 1
    ) {
      const midpoint = (lower + upper) / 2;
      const wetState = evaluate(midpoint, "wetBulb", wetBulb);
      if ("code" in wetState) return { error: wetState };
      const dryState = evaluate(midpoint, "relativeHumidity", 0);
      if ("code" in dryState) return { error: dryState };
      if (wetState.humidityRatio > dryState.humidityRatio) lower = midpoint;
      else upper = midpoint;
    }
    return { dryBulb: upper };
  };

  for (const wetBulb of targets) {
    if (wetBulb > config.dryBulbDomain.max) continue;
    const firstDryBulb = Math.max(wetBulb, config.dryBulbDomain.min);
    const dryBulbs = normalizeTargets([
      firstDryBulb,
      ...temperatures.filter((temperature) => temperature > firstDryBulb),
    ]);
    const rawPoints: PsychrometricChartPoint[] = [];
    let previousDryBulb: number | undefined;
    for (const dryBulb of dryBulbs) {
      const state = evaluate(dryBulb, "wetBulb", wetBulb);
      if ("code" in state) return { ok: false, error: state };
      const saturation = evaluate(dryBulb, "relativeHumidity", 100);
      if ("code" in saturation) return { ok: false, error: saturation };
      const dryState = evaluate(dryBulb, "relativeHumidity", 0);
      if ("code" in dryState) return { ok: false, error: dryState };
      if (
        previousDryBulb !== undefined &&
        state.humidityRatio <= dryState.humidityRatio
      ) {
        const boundary = refineDryBoundary(previousDryBulb, dryBulb, wetBulb);
        if (boundary.error) return { ok: false, error: boundary.error };
        rawPoints.push({
          dryBulb: boundary.dryBulb!,
          humidityRatio: config.humidityRatioDomain.min,
        });
        break;
      }
      rawPoints.push({
        dryBulb,
        // Geometry clipping resolves tiny cross-path solver differences at saturation.
        humidityRatio: Math.min(state.humidityRatio, saturation.humidityRatio),
      });
      previousDryBulb = dryBulb;
    }
    const points = clipPolylineToHumidityRatioDomain(
      rawPoints,
      config.humidityRatioDomain,
      config.intersectionTolerance,
    );
    if (points.length >= 2) lines.push({ wetBulb, points });
  }
  return { ok: true, lines };
}

export function generateConstantPropertyLines(
  config: PsychrometricChartConfig,
  temperatures: readonly number[],
  property: "enthalpy",
  evaluate: ChartStateEvaluator,
): LineFamilyResult<EnthalpyLine>;
export function generateConstantPropertyLines(
  config: PsychrometricChartConfig,
  temperatures: readonly number[],
  property: "specificVolume",
  evaluate: ChartStateEvaluator,
): LineFamilyResult<SpecificVolumeLine>;
export function generateConstantPropertyLines(
  config: PsychrometricChartConfig,
  temperatures: readonly number[],
  property: PropertyKey,
  evaluate: ChartStateEvaluator,
): LineFamilyResult<EnthalpyLine | SpecificVolumeLine> {
  const tolerance =
    property === "enthalpy"
      ? config.enthalpySolverTolerance
      : config.specificVolumeSolverTolerance;
  const interval =
    property === "enthalpy"
      ? config.enthalpyLineInterval
      : config.specificVolumeLineInterval;
  const explicitValues =
    property === "enthalpy"
      ? config.enthalpyLineValues
      : config.specificVolumeLineValues;

  const boundaryStates: Array<{
    dryBulb: number;
    dry: PsychrometricState;
    saturated: PsychrometricState;
  }> = [];
  for (const dryBulb of temperatures) {
    const dry = evaluate(dryBulb, "relativeHumidity", 0);
    if ("code" in dry) return { ok: false, error: dry };
    const saturated = evaluate(dryBulb, "relativeHumidity", 100);
    if ("code" in saturated) return { ok: false, error: saturated };
    boundaryStates.push({ dryBulb, dry, saturated });
  }

  const allBoundaryValues = boundaryStates.flatMap(({ dry, saturated }) => [
    propertyValue(dry, property),
    propertyValue(saturated, property),
  ]);
  const targets = normalizeTargets(
    explicitValues ??
      generateTargets(
        Math.min(...allBoundaryValues),
        Math.max(...allBoundaryValues),
        interval,
      ),
  );
  const lines: Array<EnthalpyLine | SpecificVolumeLine> = [];

  for (const target of targets) {
    const solvedStates: Array<PsychrometricState | undefined> = [];
    for (const { dryBulb } of boundaryStates) {
      const solved = solvePropertyAtDryBulb(
        dryBulb,
        target,
        property,
        tolerance,
        config.maxPropertySolverIterations,
        evaluate,
      );
      if (solved.error) return { ok: false, error: solved.error };
      solvedStates.push(solved.state);
    }

    const firstIndex = solvedStates.findIndex(Boolean);
    if (firstIndex < 0) continue;
    let lastIndex = firstIndex;
    while (lastIndex + 1 < solvedStates.length && solvedStates[lastIndex + 1]) {
      lastIndex += 1;
    }
    const states: PsychrometricState[] = [];

    if (firstIndex > 0) {
      const previous = boundaryStates[firstIndex - 1];
      const current = boundaryStates[firstIndex];
      const moistureBoundary: 0 | 100 =
        propertyValue(previous.saturated, property) < target ? 100 : 0;
      const refined = refineDryBulbBoundary(
        moistureBoundary === 100 ? previous.saturated : previous.dry,
        moistureBoundary === 100 ? current.saturated : current.dry,
        moistureBoundary,
        target,
        property,
        tolerance,
        config.maxPropertySolverIterations,
        evaluate,
      );
      if (refined.error) return { ok: false, error: refined.error };
      if (refined.state) states.push(refined.state);
    }

    for (let index = firstIndex; index <= lastIndex; index += 1) {
      states.push(solvedStates[index]!);
    }

    if (lastIndex + 1 < boundaryStates.length) {
      const current = boundaryStates[lastIndex];
      const next = boundaryStates[lastIndex + 1];
      const moistureBoundary: 0 | 100 =
        propertyValue(next.dry, property) > target ? 0 : 100;
      const refined = refineDryBulbBoundary(
        moistureBoundary === 100 ? current.saturated : current.dry,
        moistureBoundary === 100 ? next.saturated : next.dry,
        moistureBoundary,
        target,
        property,
        tolerance,
        config.maxPropertySolverIterations,
        evaluate,
      );
      if (refined.error) return { ok: false, error: refined.error };
      if (refined.state) states.push(refined.state);
    }

    const points = clipPolylineToHumidityRatioDomain(
      states.map(toPoint),
      config.humidityRatioDomain,
      config.intersectionTolerance,
    );
    if (points.length < 2) continue;
    lines.push(
      property === "enthalpy"
        ? { enthalpy: target, points }
        : { specificVolume: target, points },
    );
  }

  return { ok: true, lines };
}
