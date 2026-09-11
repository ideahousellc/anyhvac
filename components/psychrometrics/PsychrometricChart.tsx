import {
  humidityRatioToGrainsPerPound,
  humidityRatioToGramsPerKilogram,
  pascalsToKilopascals,
} from "../../lib/psychrometrics";
import type {
  PsychrometricChartGeometry,
  PsychrometricChartPoint,
} from "../../lib/psychrometrics/chart";

import styles from "./PsychrometricChart.module.css";
import {
  physicalToSvgPoint,
  pointsToSvgPath,
  type SvgPlotBox,
} from "./svgCoordinates";

const VIEWBOX_WIDTH = 1_280;
const VIEWBOX_HEIGHT = 760;
const PLOT: SvgPlotBox = { left: 78, top: 34, width: 1_092, height: 640 };

type PsychrometricChartProps = {
  geometry: PsychrometricChartGeometry;
  title?: string;
  description?: string;
  idPrefix?: string;
  className?: string;
};

type CurveLabelProps = {
  points: readonly PsychrometricChartPoint[];
  geometry: PsychrometricChartGeometry;
  fraction: number;
  children: string;
  className?: string;
};

function formatTick(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function displayHumidityRatio(
  humidityRatio: number,
  unitSystem: PsychrometricChartGeometry["unitSystem"],
): number {
  return unitSystem === "IP"
    ? humidityRatioToGrainsPerPound(humidityRatio)
    : humidityRatioToGramsPerKilogram(humidityRatio);
}

function pressureSummary(geometry: PsychrometricChartGeometry): string {
  return geometry.unitSystem === "IP"
    ? `${geometry.atmosphericPressure.toFixed(3)} psi`
    : `${pascalsToKilopascals(geometry.atmosphericPressure).toFixed(2)} kPa`;
}

function CurveLabel({
  points,
  geometry,
  fraction,
  children,
  className,
}: CurveLabelProps) {
  if (points.length < 2) return null;

  const index = Math.min(
    points.length - 2,
    Math.max(0, Math.round((points.length - 1) * fraction)),
  );
  const point = physicalToSvgPoint(points[index], geometry, PLOT);
  const next = physicalToSvgPoint(points[index + 1], geometry, PLOT);
  if (
    point.x < PLOT.left + 34 ||
    point.x > PLOT.left + PLOT.width - 34 ||
    point.y < PLOT.top + 16 ||
    point.y > PLOT.top + PLOT.height - 16
  ) {
    return null;
  }
  let angle = (Math.atan2(next.y - point.y, next.x - point.x) * 180) / Math.PI;
  if (angle > 90 || angle < -90) angle += 180;

  return (
    <text
      className={`${styles.curveLabel}${className ? ` ${className}` : ""}`}
      x={point.x}
      y={point.y - 4}
      textAnchor="middle"
      transform={`rotate(${angle.toFixed(2)} ${point.x.toFixed(2)} ${(
        point.y - 4
      ).toFixed(2)})`}
    >
      {children}
    </text>
  );
}

export function PsychrometricChart({
  geometry,
  title = "Psychrometric chart",
  description,
  idPrefix = "psychrometric-chart",
  className,
}: PsychrometricChartProps) {
  const titleId = `${idPrefix}-title`;
  const descriptionId = `${idPrefix}-description`;
  const clipId = `${idPrefix}-plot-clip`;
  const dryBulbUnit = geometry.unitSystem === "IP" ? "°F" : "°C";
  const humidityUnit =
    geometry.unitSystem === "IP" ? "grains/lb dry air" : "g/kg dry air";
  const resolvedDescription =
    description ??
    `Psychrometric chart at ${pressureSummary(geometry)}, showing saturation, relative humidity, dry-bulb, humidity-ratio, wet-bulb, enthalpy, and specific-volume lines.`;

  return (
    <figure
      className={`${styles.figure}${className ? ` ${className}` : ""}`}
      data-atmospheric-pressure={geometry.atmosphericPressure}
      data-unit-system={geometry.unitSystem}
    >
      <div className={styles.viewport}>
        <svg
          className={styles.chart}
          viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
          role="img"
          aria-labelledby={`${titleId} ${descriptionId}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <title id={titleId}>{title}</title>
          <desc id={descriptionId}>{resolvedDescription}</desc>
          <defs>
            <clipPath id={clipId}>
              <rect x={PLOT.left} y={PLOT.top} width={PLOT.width} height={PLOT.height} />
            </clipPath>
          </defs>

          <rect
            className={styles.plotBackground}
            x={PLOT.left}
            y={PLOT.top}
            width={PLOT.width}
            height={PLOT.height}
          />

          <g clipPath={`url(#${clipId})`}>
            <g aria-label="Dry-bulb temperature grid">
              {geometry.dryBulbGridLines.map((line) => (
                <path
                  key={line.dryBulb}
                  className={styles.gridLine}
                  data-line-family="dry-bulb-grid"
                  d={pointsToSvgPath(line.points, geometry, PLOT)}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </g>
            <g aria-label="Humidity-ratio grid">
              {geometry.humidityRatioGridLines.map((line) => (
                <path
                  key={line.humidityRatio}
                  className={styles.gridLine}
                  data-line-family="humidity-ratio-grid"
                  d={pointsToSvgPath(line.points, geometry, PLOT)}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </g>
            <g aria-label="Specific-volume lines">
              {geometry.specificVolumeLines.map((line) => (
                <path
                  key={line.specificVolume}
                  className={styles.specificVolumeLine}
                  data-line-family="specific-volume"
                  data-value={line.specificVolume}
                  d={pointsToSvgPath(line.points, geometry, PLOT)}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </g>
            <g aria-label="Enthalpy lines">
              {geometry.enthalpyLines.map((line) => (
                <path
                  key={line.enthalpy}
                  className={styles.enthalpyLine}
                  data-line-family="enthalpy"
                  data-value={line.enthalpy}
                  d={pointsToSvgPath(line.points, geometry, PLOT)}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </g>
            <g aria-label="Wet-bulb temperature lines">
              {geometry.wetBulbLines.map((line) => (
                <path
                  key={line.wetBulb}
                  className={styles.wetBulbLine}
                  data-line-family="wet-bulb"
                  data-value={line.wetBulb}
                  d={pointsToSvgPath(line.points, geometry, PLOT)}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </g>
            <g aria-label="Relative-humidity curves">
              {geometry.relativeHumidityCurves.map((curve) => (
                <path
                  key={curve.relativeHumidity}
                  className={styles.relativeHumidityLine}
                  data-line-family="relative-humidity"
                  data-relative-humidity={curve.relativeHumidity}
                  d={pointsToSvgPath(curve.points, geometry, PLOT)}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </g>
            <path
              className={styles.saturationLine}
              data-line-family="saturation"
              d={pointsToSvgPath(geometry.saturationCurve.points, geometry, PLOT)}
              vectorEffect="non-scaling-stroke"
            />

            <g aria-hidden="true">
              {geometry.relativeHumidityCurves
                .filter((curve) => curve.relativeHumidity % 20 === 0)
                .map((curve) => (
                  <CurveLabel
                    key={curve.relativeHumidity}
                    points={curve.points}
                    geometry={geometry}
                    fraction={0.72}
                  >
                    {`${curve.relativeHumidity}%`}
                  </CurveLabel>
                ))}
              <CurveLabel
                points={geometry.saturationCurve.points}
                geometry={geometry}
                fraction={0.42}
                className={styles.saturationLabel}
              >
                100% RH
              </CurveLabel>
              {geometry.wetBulbLines
                .filter((line, index) => line.points.length > 12 && index % 4 === 0)
                .map((line) => (
                  <CurveLabel
                    key={line.wetBulb}
                    points={line.points}
                    geometry={geometry}
                    fraction={0.22}
                  >
                    {`WB ${formatTick(line.wetBulb)}°`}
                  </CurveLabel>
                ))}
              {geometry.enthalpyLines
                .filter((line, index) => line.points.length > 12 && index % 4 === 0)
                .map((line) => (
                  <CurveLabel
                    key={line.enthalpy}
                    points={line.points}
                    geometry={geometry}
                    fraction={0.52}
                  >
                    {`h ${formatTick(line.enthalpy)}`}
                  </CurveLabel>
                ))}
              {geometry.specificVolumeLines
                .filter((line, index) => line.points.length > 12 && index % 3 === 0)
                .map((line) => (
                  <CurveLabel
                    key={line.specificVolume}
                    points={line.points}
                    geometry={geometry}
                    fraction={0.79}
                  >
                    {`v ${formatTick(line.specificVolume)}`}
                  </CurveLabel>
                ))}
            </g>
          </g>

          <path
            className={styles.axisLine}
            d={`M${PLOT.left} ${PLOT.top}V${PLOT.top + PLOT.height}H${
              PLOT.left + PLOT.width
            }V${PLOT.top}`}
            vectorEffect="non-scaling-stroke"
          />

          <g aria-label={`Dry-bulb temperature axis in ${dryBulbUnit}`}>
            {geometry.dryBulbGridLines.map((line) => {
              const point = physicalToSvgPoint(line.points[0], geometry, PLOT);
              return (
                <g key={line.dryBulb}>
                  <line
                    className={styles.tick}
                    x1={point.x}
                    x2={point.x}
                    y1={PLOT.top + PLOT.height}
                    y2={PLOT.top + PLOT.height + 8}
                  />
                  <text
                    className={styles.tickLabel}
                    x={point.x}
                    y={PLOT.top + PLOT.height + 27}
                    textAnchor="middle"
                  >
                    {formatTick(line.dryBulb)}
                  </text>
                </g>
              );
            })}
            <text
              className={styles.axisLabel}
              x={PLOT.left + PLOT.width / 2}
              y={VIEWBOX_HEIGHT - 15}
              textAnchor="middle"
            >
              {`Dry-Bulb Temperature (${dryBulbUnit})`}
            </text>
          </g>

          <g aria-label={`Humidity-ratio axis in ${humidityUnit}`}>
            {geometry.humidityRatioGridLines.map((line) => {
              const point = physicalToSvgPoint(line.points[1], geometry, PLOT);
              return (
                <g key={line.humidityRatio}>
                  <line
                    className={styles.tick}
                    x1={PLOT.left + PLOT.width}
                    x2={PLOT.left + PLOT.width + 8}
                    y1={point.y}
                    y2={point.y}
                  />
                  <text
                    className={styles.tickLabel}
                    x={PLOT.left + PLOT.width + 14}
                    y={point.y + 4}
                    textAnchor="start"
                  >
                    {formatTick(displayHumidityRatio(line.humidityRatio, geometry.unitSystem))}
                  </text>
                </g>
              );
            })}
            <text
              className={styles.axisLabel}
              x={VIEWBOX_WIDTH - 18}
              y={PLOT.top + PLOT.height / 2}
              textAnchor="middle"
              transform={`rotate(90 ${VIEWBOX_WIDTH - 18} ${
                PLOT.top + PLOT.height / 2
              })`}
            >
              {`Humidity Ratio (${humidityUnit})`}
            </text>
          </g>
        </svg>
      </div>
    </figure>
  );
}
