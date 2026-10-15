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

function interpolateSegment(
  start: PsychrometricChartPoint,
  end: PsychrometricChartPoint,
  fraction: number,
): PsychrometricChartPoint {
  return {
    dryBulb: start.dryBulb + fraction * (end.dryBulb - start.dryBulb),
    humidityRatio:
      start.humidityRatio +
      fraction * (end.humidityRatio - start.humidityRatio),
  };
}

/** Clips increasing or decreasing polylines to horizontal chart bounds. */
export function clipPolylineToHumidityRatioDomain(
  points: readonly PsychrometricChartPoint[],
  domain: NumericDomain,
  tolerance = 1e-12,
): PsychrometricChartPoint[] {
  if (points.length === 1) {
    const point = points[0];
    return point.humidityRatio >= domain.min && point.humidityRatio <= domain.max
      ? [point]
      : [];
  }

  const clipped: PsychrometricChartPoint[] = [];
  for (let index = 1; index < points.length; index += 1) {
    const start = points[index - 1];
    const end = points[index];
    const delta = end.humidityRatio - start.humidityRatio;

    let lowerFraction = 0;
    let upperFraction = 1;
    if (delta === 0) {
      if (start.humidityRatio < domain.min || start.humidityRatio > domain.max) {
        continue;
      }
    } else {
      const firstCrossing = (domain.min - start.humidityRatio) / delta;
      const secondCrossing = (domain.max - start.humidityRatio) / delta;
      lowerFraction = Math.max(0, Math.min(firstCrossing, secondCrossing));
      upperFraction = Math.min(1, Math.max(firstCrossing, secondCrossing));
      if (lowerFraction > upperFraction) continue;
    }

    const segmentPoints = [
      interpolateSegment(start, end, lowerFraction),
      interpolateSegment(start, end, upperFraction),
    ];
    for (const point of segmentPoints) {
      const previous = clipped.at(-1);
      if (
        !previous ||
        Math.abs(previous.dryBulb - point.dryBulb) > tolerance ||
        Math.abs(previous.humidityRatio - point.humidityRatio) > tolerance
      ) {
        clipped.push(point);
      }
    }
  }
  return clipped;
}
