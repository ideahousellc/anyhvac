import {
  normalizedToPhysical,
  physicalToNormalized,
  type NormalizedChartPoint,
  type PsychrometricChartGeometry,
  type PsychrometricChartPoint,
} from "../../lib/psychrometrics/chart";

export type SvgPlotBox = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type SvgPoint = {
  x: number;
  y: number;
};

export type ClientRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export function normalizedToSvgPoint(
  point: NormalizedChartPoint,
  plot: SvgPlotBox,
): SvgPoint {
  return {
    x: plot.left + point.x * plot.width,
    y: plot.top + (1 - point.y) * plot.height,
  };
}

export function physicalToSvgPoint(
  point: PsychrometricChartPoint,
  geometry: Pick<
    PsychrometricChartGeometry,
    "dryBulbDomain" | "humidityRatioDomain"
  >,
  plot: SvgPlotBox,
): SvgPoint {
  return normalizedToSvgPoint(physicalToNormalized(point, geometry), plot);
}

export function svgToPhysicalPoint(
  point: SvgPoint,
  geometry: Pick<
    PsychrometricChartGeometry,
    "dryBulbDomain" | "humidityRatioDomain"
  >,
  plot: SvgPlotBox,
): PsychrometricChartPoint {
  return normalizedToPhysical(
    {
      x: (point.x - plot.left) / plot.width,
      y: 1 - (point.y - plot.top) / plot.height,
    },
    geometry,
  );
}

export function clientToSvgPoint(
  point: SvgPoint,
  bounds: ClientRect,
  viewBox: { width: number; height: number },
): SvgPoint {
  return {
    x: ((point.x - bounds.left) / bounds.width) * viewBox.width,
    y: ((point.y - bounds.top) / bounds.height) * viewBox.height,
  };
}

function formatSvgNumber(value: number): string {
  const formatted = Number(value.toFixed(3));
  return Object.is(formatted, -0) ? "0" : String(formatted);
}

export function pointsToSvgPath(
  points: readonly PsychrometricChartPoint[],
  geometry: Pick<
    PsychrometricChartGeometry,
    "dryBulbDomain" | "humidityRatioDomain"
  >,
  plot: SvgPlotBox,
): string {
  return points
    .map((point, index) => {
      const svgPoint = physicalToSvgPoint(point, geometry, plot);
      return `${index === 0 ? "M" : "L"}${formatSvgNumber(svgPoint.x)} ${formatSvgNumber(svgPoint.y)}`;
    })
    .join(" ");
}
