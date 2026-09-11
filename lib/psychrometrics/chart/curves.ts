import type {
  NumericDomain,
  PsychrometricChartPoint,
} from "./types";

function interpolateAtHumidityRatio(
  start: PsychrometricChartPoint,
  end: PsychrometricChartPoint,
  humidityRatio: number,
): PsychrometricChartPoint {
  const fraction =
    (humidityRatio - start.humidityRatio) /
    (end.humidityRatio - start.humidityRatio);
  return {
    dryBulb: start.dryBulb + fraction * (end.dryBulb - start.dryBulb),
    humidityRatio,
  };
}

/** Clips sampled geometry without changing or inventing thermodynamic states. */
export function clipCurveToHumidityRatioDomain(
  points: readonly PsychrometricChartPoint[],
  domain: NumericDomain,
): PsychrometricChartPoint[] {
  const clipped: PsychrometricChartPoint[] = [];

  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];
    const previous = points[index - 1];

    if (point.humidityRatio >= domain.min && point.humidityRatio <= domain.max) {
      if (
        previous &&
        previous.humidityRatio < domain.min &&
        point.humidityRatio !== previous.humidityRatio
      ) {
        clipped.push(interpolateAtHumidityRatio(previous, point, domain.min));
      }
      clipped.push(point);
      continue;
    }

    if (
      previous &&
      previous.humidityRatio <= domain.max &&
      point.humidityRatio > domain.max &&
      point.humidityRatio !== previous.humidityRatio
    ) {
      clipped.push(interpolateAtHumidityRatio(previous, point, domain.max));
      break;
    }
  }

  return clipped;
}

/**
 * Finds the first dry-bulb coordinate at which sampled saturation geometry
 * reaches a humidity ratio. This is linear geometry interpolation, not a
 * psychrometric equation.
 */
export function findSaturationIntersectionDryBulb(
  saturationPoints: readonly PsychrometricChartPoint[],
  humidityRatio: number,
  tolerance: number,
): number | null {
  if (saturationPoints.length === 0) return null;
  const first = saturationPoints[0];
  if (humidityRatio <= first.humidityRatio + tolerance) return first.dryBulb;

  let low = 0;
  let high = saturationPoints.length - 1;
  if (humidityRatio > saturationPoints[high].humidityRatio + tolerance) return null;

  while (low + 1 < high) {
    const middle = Math.floor((low + high) / 2);
    if (saturationPoints[middle].humidityRatio < humidityRatio) low = middle;
    else high = middle;
  }

  const upper = saturationPoints[high];
  if (Math.abs(upper.humidityRatio - humidityRatio) <= tolerance) {
    return upper.dryBulb;
  }
  return interpolateAtHumidityRatio(
    saturationPoints[low],
    upper,
    humidityRatio,
  ).dryBulb;
}
