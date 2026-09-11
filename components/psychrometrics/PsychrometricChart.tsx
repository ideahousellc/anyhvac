"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { gsap } from "gsap";

import {
  humidityRatioToGrainsPerPound,
  humidityRatioToGramsPerKilogram,
  pascalsToKilopascals,
} from "../../lib/psychrometrics";
import type {
  PsychrometricChartGeometry,
  PsychrometricChartPoint,
} from "../../lib/psychrometrics/chart";
import { interactionPointsAreEquivalent } from "./chartInteractionSolver";
import { ChartPointerDragSession } from "./chartPointerDrag";
import {
  chartGeometryMotionKey,
  createMarkerMotionPlan,
  MARKER_EMPHASIS_DURATION_SECONDS,
  MARKER_EMPHASIS_SCALE,
} from "./chartMotion";

import styles from "./PsychrometricChart.module.css";
import {
  physicalToSvgPoint,
  pointsToSvgPath,
  clientToSvgPoint,
  svgToPhysicalPoint,
  type SvgPlotBox,
} from "./svgCoordinates";

const VIEWBOX_WIDTH = 1_280;
const VIEWBOX_HEIGHT = 760;
export const PSYCHROMETRIC_CHART_PLOT: SvgPlotBox = {
  left: 78,
  top: 34,
  width: 1_092,
  height: 640,
};
const PLOT = PSYCHROMETRIC_CHART_PLOT;

export type ChartSelectedState = PsychrometricChartPoint & {
  accessibleLabel?: string;
};

type PsychrometricChartProps = {
  geometry: PsychrometricChartGeometry;
  title?: string;
  description?: string;
  idPrefix?: string;
  className?: string;
  selectedState?: ChartSelectedState;
  onSelectPoint?: (point: PsychrometricChartPoint) => void;
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
  selectedState,
  onSelectPoint,
}: PsychrometricChartProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const markerPresentationRef = useRef<SVGGElement>(null);
  const markerHaloRef = useRef<SVGCircleElement>(null);
  const motionContextRef = useRef<gsap.Context | undefined>(undefined);
  const previousMarkerPointRef = useRef<{ x: number; y: number } | undefined>(
    undefined,
  );
  const previousGeometryMotionKeyRef = useRef<string | undefined>(undefined);
  const directManipulationPointRef = useRef<
    PsychrometricChartPoint | undefined
  >(undefined);
  const centeredContextRef = useRef<string | undefined>(undefined);
  const dragSessionRef = useRef(new ChartPointerDragSession());
  const animationFrameRef = useRef<number | undefined>(undefined);
  const lastDispatchedPointRef = useRef<PsychrometricChartPoint | undefined>(
    undefined,
  );
  const [isDragging, setIsDragging] = useState(false);
  const titleId = `${idPrefix}-title`;
  const descriptionId = `${idPrefix}-description`;
  const clipId = `${idPrefix}-plot-clip`;
  const dryBulbUnit = geometry.unitSystem === "IP" ? "°F" : "°C";
  const humidityUnit =
    geometry.unitSystem === "IP" ? "grains/lb dry air" : "g/kg dry air";
  const resolvedDescription =
    description ??
    `Psychrometric chart at ${pressureSummary(geometry)}, showing saturation, relative humidity, dry-bulb, humidity-ratio, wet-bulb, enthalpy, and specific-volume lines.`;
  const selectedStateIsVisible =
    selectedState !== undefined &&
    Number.isFinite(selectedState.dryBulb) &&
    Number.isFinite(selectedState.humidityRatio) &&
    selectedState.dryBulb >= geometry.dryBulbDomain.min &&
    selectedState.dryBulb <= geometry.dryBulbDomain.max &&
    selectedState.humidityRatio >= geometry.humidityRatioDomain.min &&
    selectedState.humidityRatio <= geometry.humidityRatioDomain.max;
  const markerPoint = selectedStateIsVisible
    ? physicalToSvgPoint(selectedState, geometry, PLOT)
    : undefined;
  const markerX = markerPoint?.x;
  const markerY = markerPoint?.y;
  const selectedDryBulb = selectedState?.dryBulb;
  const selectedHumidityRatio = selectedState?.humidityRatio;
  const centeringContext = `${idPrefix}:${geometry.unitSystem}:${geometry.atmosphericPressure}`;
  const geometryMotionKey = chartGeometryMotionKey(geometry);

  useLayoutEffect(() => {
    const marker = markerPresentationRef.current;
    if (!marker) return;
    const context = gsap.context(() => undefined, marker);
    motionContextRef.current = context;
    return () => {
      context.revert();
      if (motionContextRef.current === context) motionContextRef.current = undefined;
    };
  }, [selectedStateIsVisible]);

  useLayoutEffect(() => {
    const marker = markerPresentationRef.current;
    const target =
      markerX !== undefined && markerY !== undefined
        ? { x: markerX, y: markerY }
        : undefined;
    if (!marker || !target) {
      previousMarkerPointRef.current = target;
      previousGeometryMotionKeyRef.current = geometryMotionKey;
      directManipulationPointRef.current = undefined;
      return;
    }

    const currentOffset = {
      x: Number(gsap.getProperty(marker, "x")) || 0,
      y: Number(gsap.getProperty(marker, "y")) || 0,
    };
    const directManipulationPoint = directManipulationPointRef.current;
    const matchesDirectManipulation =
      directManipulationPoint !== undefined &&
      selectedDryBulb !== undefined &&
      selectedHumidityRatio !== undefined &&
      Math.abs(directManipulationPoint.dryBulb - selectedDryBulb) < 1e-6 &&
      Math.abs(
        directManipulationPoint.humidityRatio - selectedHumidityRatio,
      ) <= 1e-8;
    const plan = createMarkerMotionPlan({
      previousTarget: previousMarkerPointRef.current,
      target,
      currentOffset,
      directManipulation: isDragging || matchesDirectManipulation,
      reducedMotion:
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      geometryChanged:
        previousGeometryMotionKeyRef.current !== undefined &&
        previousGeometryMotionKeyRef.current !== geometryMotionKey,
    });

    directManipulationPointRef.current = undefined;
    previousMarkerPointRef.current = target;
    previousGeometryMotionKeyRef.current = geometryMotionKey;
    gsap.killTweensOf(marker);
    if (markerHaloRef.current) gsap.killTweensOf(markerHaloRef.current);

    const context = motionContextRef.current;
    const applyMotion = () => {
      if (plan.mode !== "animate") {
        gsap.set(marker, { x: 0, y: 0 });
        return;
      }

      const timeline = gsap.timeline({ defaults: { overwrite: true } });
      timeline.fromTo(
        marker,
        { x: plan.from.x, y: plan.from.y },
        { x: 0, y: 0, duration: plan.duration, ease: plan.ease },
        0,
      );
      if (markerHaloRef.current) {
        timeline
          .fromTo(
            markerHaloRef.current,
            { scale: 1, transformOrigin: "center" },
            {
              scale: MARKER_EMPHASIS_SCALE,
              duration: MARKER_EMPHASIS_DURATION_SECONDS / 2,
              ease: "power1.out",
            },
            0,
          )
          .to(markerHaloRef.current, {
            scale: 1,
            duration: MARKER_EMPHASIS_DURATION_SECONDS / 2,
            ease: "power1.inOut",
          });
      }
    };
    if (context) context.add(applyMotion);
    else applyMotion();
  }, [
    geometryMotionKey,
    isDragging,
    markerX,
    markerY,
    selectedDryBulb,
    selectedHumidityRatio,
  ]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = () => {
      if (!media.matches || !markerPresentationRef.current) return;
      gsap.killTweensOf(markerPresentationRef.current);
      if (markerHaloRef.current) gsap.killTweensOf(markerHaloRef.current);
      gsap.set(markerPresentationRef.current, { x: 0, y: 0 });
      if (markerHaloRef.current) gsap.set(markerHaloRef.current, { scale: 1 });
    };
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (
      viewport === null ||
      markerX === undefined ||
      viewport.scrollWidth <= viewport.clientWidth ||
      centeredContextRef.current === centeringContext
    ) {
      return;
    }

    const markerPosition = (markerX / VIEWBOX_WIDTH) * viewport.scrollWidth;
    viewport.scrollLeft = Math.max(0, markerPosition - viewport.clientWidth / 2);
    centeredContextRef.current = centeringContext;
  }, [centeringContext, markerX]);

  useEffect(
    () => () => {
      if (animationFrameRef.current !== undefined) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    },
    [],
  );

  function physicalPointFromPointer(
    event: ReactPointerEvent<SVGElement>,
  ): PsychrometricChartPoint | undefined {
    const svg = event.currentTarget.ownerSVGElement;
    if (svg === null) return undefined;
    const svgPoint = clientToSvgPoint(
      { x: event.clientX, y: event.clientY },
      svg.getBoundingClientRect(),
      { width: VIEWBOX_WIDTH, height: VIEWBOX_HEIGHT },
    );
    return svgToPhysicalPoint(svgPoint, geometry, PLOT);
  }

  function handlePlotClick(event: ReactPointerEvent<SVGRectElement>) {
    const point = physicalPointFromPointer(event);
    if (
      point &&
      !interactionPointsAreEquivalent(lastDispatchedPointRef.current, point)
    ) {
      lastDispatchedPointRef.current = point;
      onSelectPoint?.(point);
    }
  }

  function flushPendingDrag() {
    animationFrameRef.current = undefined;
    const point = dragSessionRef.current.takePending();
    if (
      point &&
      !interactionPointsAreEquivalent(lastDispatchedPointRef.current, point)
    ) {
      lastDispatchedPointRef.current = point;
      onSelectPoint?.(point);
    }
  }

  function handleMarkerPointerDown(event: ReactPointerEvent<SVGGElement>) {
    if (!onSelectPoint) return;
    event.stopPropagation();
    event.preventDefault();
    dragSessionRef.current.begin(event.pointerId);
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDragging(true);
  }

  function handleMarkerPointerMove(event: ReactPointerEvent<SVGGElement>) {
    if (!dragSessionRef.current.isActive(event.pointerId)) return;
    const point = physicalPointFromPointer(event);
    if (!point) return;
    dragSessionRef.current.queue(event.pointerId, point);
    if (animationFrameRef.current === undefined) {
      animationFrameRef.current = requestAnimationFrame(flushPendingDrag);
    }
  }

  function finishMarkerDrag(event: ReactPointerEvent<SVGGElement>) {
    if (!dragSessionRef.current.isActive(event.pointerId)) return;
    event.stopPropagation();
    const releasePoint = physicalPointFromPointer(event);
    if (releasePoint) {
      dragSessionRef.current.queue(event.pointerId, releasePoint);
    }
    if (animationFrameRef.current !== undefined) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = undefined;
    }
    const finalPoint = dragSessionRef.current.end(event.pointerId);
    if (
      finalPoint &&
      !interactionPointsAreEquivalent(lastDispatchedPointRef.current, finalPoint)
    ) {
      directManipulationPointRef.current = finalPoint;
      lastDispatchedPointRef.current = finalPoint;
      onSelectPoint?.(finalPoint);
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setIsDragging(false);
  }

  return (
    <figure
      className={`${styles.figure}${className ? ` ${className}` : ""}`}
      data-atmospheric-pressure={geometry.atmosphericPressure}
      data-unit-system={geometry.unitSystem}
    >
      <div className={styles.viewport} ref={viewportRef}>
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

            {onSelectPoint ? (
              <rect
                className={styles.interactionSurface}
                data-chart-interaction-surface="true"
                x={PLOT.left}
                y={PLOT.top}
                width={PLOT.width}
                height={PLOT.height}
                onClick={handlePlotClick}
              />
            ) : null}

            {markerPoint && selectedState ? (
              <g
                ref={markerPresentationRef}
                className={
                  onSelectPoint
                    ? `${styles.stateInteraction}${isDragging ? ` ${styles.stateDragging}` : ""}`
                    : undefined
                }
                data-selected-state="true"
                data-dragging={isDragging || undefined}
                data-svg-x={markerPoint.x}
                data-svg-y={markerPoint.y}
                role="img"
                aria-label={
                  selectedState.accessibleLabel ??
                  `Selected state at dry bulb ${selectedState.dryBulb} and humidity ratio ${selectedState.humidityRatio}`
                }
                onPointerDown={onSelectPoint ? handleMarkerPointerDown : undefined}
                onPointerMove={onSelectPoint ? handleMarkerPointerMove : undefined}
                onPointerUp={onSelectPoint ? finishMarkerDrag : undefined}
                onPointerCancel={onSelectPoint ? finishMarkerDrag : undefined}
              >
                <title>
                  {selectedState.accessibleLabel ?? "Selected psychrometric state"}
                </title>
                <line
                  className={styles.stateGuide}
                  data-state-guide="dry-bulb"
                  x1={markerPoint.x}
                  x2={markerPoint.x}
                  y1={markerPoint.y}
                  y2={PLOT.top + PLOT.height}
                  vectorEffect="non-scaling-stroke"
                />
                <line
                  className={styles.stateGuide}
                  data-state-guide="humidity-ratio"
                  x1={markerPoint.x}
                  x2={PLOT.left + PLOT.width}
                  y1={markerPoint.y}
                  y2={markerPoint.y}
                  vectorEffect="non-scaling-stroke"
                />
                <circle
                  ref={markerHaloRef}
                  className={styles.stateHalo}
                  cx={markerPoint.x}
                  cy={markerPoint.y}
                  r="11"
                  vectorEffect="non-scaling-stroke"
                />
                <circle
                  className={styles.stateMarker}
                  cx={markerPoint.x}
                  cy={markerPoint.y}
                  r="6"
                  vectorEffect="non-scaling-stroke"
                />
                <text
                  className={styles.stateLabel}
                  x={markerPoint.x + 15}
                  y={markerPoint.y - 12}
                >
                  State
                </text>
              </g>
            ) : null}
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
