import type {
  NormalizedChartPoint,
  NumericDomain,
  PsychrometricChartPoint,
} from "./types";

export type ChartCoordinateDomains = {
  dryBulbDomain: NumericDomain;
  humidityRatioDomain: NumericDomain;
};

function assertUsableDomain(domain: NumericDomain, name: string): void {
  if (
    !Number.isFinite(domain.min) ||
    !Number.isFinite(domain.max) ||
    domain.max <= domain.min
  ) {
    throw new RangeError(`${name} must have finite values and max greater than min.`);
  }
}

export function physicalToNormalized(
  point: PsychrometricChartPoint,
  domains: ChartCoordinateDomains,
): NormalizedChartPoint {
  assertUsableDomain(domains.dryBulbDomain, "Dry-bulb domain");
  assertUsableDomain(domains.humidityRatioDomain, "Humidity-ratio domain");

  return {
    x:
      (point.dryBulb - domains.dryBulbDomain.min) /
      (domains.dryBulbDomain.max - domains.dryBulbDomain.min),
    y:
      (point.humidityRatio - domains.humidityRatioDomain.min) /
      (domains.humidityRatioDomain.max - domains.humidityRatioDomain.min),
  };
}

export function normalizedToPhysical(
  point: NormalizedChartPoint,
  domains: ChartCoordinateDomains,
): PsychrometricChartPoint {
  assertUsableDomain(domains.dryBulbDomain, "Dry-bulb domain");
  assertUsableDomain(domains.humidityRatioDomain, "Humidity-ratio domain");

  return {
    dryBulb:
      domains.dryBulbDomain.min +
      point.x * (domains.dryBulbDomain.max - domains.dryBulbDomain.min),
    humidityRatio:
      domains.humidityRatioDomain.min +
      point.y *
        (domains.humidityRatioDomain.max - domains.humidityRatioDomain.min),
  };
}
