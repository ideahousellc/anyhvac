import {
  calculatePsychrometricState,
  type PsychrometricInput,
  type PsychrometricState,
} from "../../lib/psychrometrics";
import type {
  ChartPressureCondition,
  PsychrometricChartGeometry,
  PsychrometricChartPoint,
} from "../../lib/psychrometrics/chart";

export const CHART_INTERACTION_MAX_ITERATIONS = 24;
export const CHART_INTERACTION_HUMIDITY_RATIO_TOLERANCE = 1e-8;

export type ChartInteractionErrorCode =
  | "NON_FINITE_POINT"
  | "OUTSIDE_DRY_BULB_DOMAIN"
  | "BELOW_CHART_FLOOR"
  | "ABOVE_CHART_CEILING"
  | "BELOW_PHYSICAL_MINIMUM"
  | "ABOVE_SATURATION"
  | "ENGINE_REJECTED_BOUNDARY"
  | "SOLVER_DID_NOT_CONVERGE";

export type ChartInteractionResult =
  | {
      ok: true;
      state: PsychrometricState;
      engineCallCount: number;
      iterations: number;
    }
  | {
      ok: false;
      code: ChartInteractionErrorCode;
      message: string;
      engineCallCount: number;
    };

export function interactionPointsAreEquivalent(
  first: PsychrometricChartPoint | undefined,
  second: PsychrometricChartPoint,
): boolean {
  return (
    first !== undefined &&
    Math.abs(first.dryBulb - second.dryBulb) < 1e-6 &&
    Math.abs(first.humidityRatio - second.humidityRatio) < 1e-10
  );
}

function engineInputAtRelativeHumidity(
  geometry: PsychrometricChartGeometry,
  dryBulb: number,
  relativeHumidity: number,
): PsychrometricInput {
  const common = {
    unitSystem: geometry.unitSystem,
    dryBulb,
    moistureMode: "relativeHumidity" as const,
    moistureValue: relativeHumidity,
  };
  const pressureCondition: ChartPressureCondition = geometry.pressureCondition;

  return pressureCondition.pressureMode === "elevation"
    ? {
        ...common,
        pressureMode: "elevation",
        elevation: pressureCondition.elevation,
      }
    : {
        ...common,
        pressureMode: "manual",
        pressure: pressureCondition.pressure,
        pressureUnit: pressureCondition.pressureUnit,
      };
}

function failure(
  code: ChartInteractionErrorCode,
  message: string,
  engineCallCount = 0,
): ChartInteractionResult {
  return { ok: false, code, message, engineCallCount };
}

/**
 * Resolves DB + humidity ratio without introducing a second psychrometric model.
 * Every physical evaluation delegates to the locked public engine at a bounded RH.
 */
export function solvePsychrometricStateFromChartPoint(
  point: PsychrometricChartPoint,
  geometry: PsychrometricChartGeometry,
): ChartInteractionResult {
  if (!Number.isFinite(point.dryBulb) || !Number.isFinite(point.humidityRatio)) {
    return failure("NON_FINITE_POINT", "The selected chart point is not finite.");
  }
  if (
    point.dryBulb < geometry.dryBulbDomain.min ||
    point.dryBulb > geometry.dryBulbDomain.max
  ) {
    return failure(
      "OUTSIDE_DRY_BULB_DOMAIN",
      "Select a point within the chart's dry-bulb range.",
    );
  }
  if (point.humidityRatio < geometry.humidityRatioDomain.min) {
    return failure("BELOW_CHART_FLOOR", "Select a point above the chart floor.");
  }
  if (point.humidityRatio > geometry.humidityRatioDomain.max) {
    return failure("ABOVE_CHART_CEILING", "Select a point below the chart ceiling.");
  }

  let engineCallCount = 0;
  const calculateAt = (relativeHumidity: number) => {
    engineCallCount += 1;
    return calculatePsychrometricState(
      engineInputAtRelativeHumidity(geometry, point.dryBulb, relativeHumidity),
    );
  };
  const dryBoundary = calculateAt(0);
  const saturatedBoundary = calculateAt(100);

  if (!dryBoundary.ok || !saturatedBoundary.ok) {
    return failure(
      "ENGINE_REJECTED_BOUNDARY",
      "The physical boundaries could not be evaluated at this dry-bulb temperature.",
      engineCallCount,
    );
  }
  if (
    point.humidityRatio <
    dryBoundary.value.humidityRatio - CHART_INTERACTION_HUMIDITY_RATIO_TOLERANCE
  ) {
    return failure(
      "BELOW_PHYSICAL_MINIMUM",
      "The selected point is below the physical humidity-ratio boundary.",
      engineCallCount,
    );
  }
  if (
    point.humidityRatio >
    saturatedBoundary.value.humidityRatio +
      CHART_INTERACTION_HUMIDITY_RATIO_TOLERANCE
  ) {
    return failure(
      "ABOVE_SATURATION",
      "The selected point is above the saturation curve.",
      engineCallCount,
    );
  }

  if (
    Math.abs(point.humidityRatio - dryBoundary.value.humidityRatio) <=
    CHART_INTERACTION_HUMIDITY_RATIO_TOLERANCE
  ) {
    return { ok: true, state: dryBoundary.value, engineCallCount, iterations: 0 };
  }
  if (
    Math.abs(point.humidityRatio - saturatedBoundary.value.humidityRatio) <=
    CHART_INTERACTION_HUMIDITY_RATIO_TOLERANCE
  ) {
    return {
      ok: true,
      state: saturatedBoundary.value,
      engineCallCount,
      iterations: 0,
    };
  }

  let lowerRh = 0;
  let upperRh = 100;
  let lowerState = dryBoundary.value;
  let upperState = saturatedBoundary.value;

  for (let iteration = 1; iteration <= CHART_INTERACTION_MAX_ITERATIONS; iteration += 1) {
    const humidityRatioSpan =
      upperState.humidityRatio - lowerState.humidityRatio;
    const interpolatedRh =
      humidityRatioSpan > 0
        ? lowerRh +
          ((point.humidityRatio - lowerState.humidityRatio) /
            humidityRatioSpan) *
            (upperRh - lowerRh)
        : Number.NaN;
    const relativeHumidity =
      Number.isFinite(interpolatedRh) &&
      interpolatedRh > lowerRh &&
      interpolatedRh < upperRh
        ? interpolatedRh
        : (lowerRh + upperRh) / 2;
    const candidate = calculateAt(relativeHumidity);
    if (!candidate.ok) {
      return failure(
        "ENGINE_REJECTED_BOUNDARY",
        "The selected state could not be evaluated by the psychrometric engine.",
        engineCallCount,
      );
    }

    const difference = candidate.value.humidityRatio - point.humidityRatio;
    if (Math.abs(difference) <= CHART_INTERACTION_HUMIDITY_RATIO_TOLERANCE) {
      return {
        ok: true,
        state: candidate.value,
        engineCallCount,
        iterations: iteration,
      };
    }

    if (difference < 0) {
      lowerRh = relativeHumidity;
      lowerState = candidate.value;
    } else {
      upperRh = relativeHumidity;
      upperState = candidate.value;
    }
  }

  const closest =
    Math.abs(lowerState.humidityRatio - point.humidityRatio) <=
    Math.abs(upperState.humidityRatio - point.humidityRatio)
      ? lowerState
      : upperState;
  if (
    Math.abs(closest.humidityRatio - point.humidityRatio) <=
    CHART_INTERACTION_HUMIDITY_RATIO_TOLERANCE
  ) {
    return {
      ok: true,
      state: closest,
      engineCallCount,
      iterations: CHART_INTERACTION_MAX_ITERATIONS,
    };
  }

  return failure(
    "SOLVER_DID_NOT_CONVERGE",
    "The selected humidity ratio could not be resolved within the interaction tolerance.",
    engineCallCount,
  );
}
