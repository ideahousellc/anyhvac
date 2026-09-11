import type { PsychrometricChartGeometry } from "../../lib/psychrometrics/chart";

export const MARKER_MOTION_DURATION_SECONDS = 0.32;
export const MARKER_MOTION_EASE = "power2.out";
export const MARKER_MOTION_MINIMUM_DISTANCE = 0.25;
export const MARKER_EMPHASIS_SCALE = 1.12;
export const MARKER_EMPHASIS_DURATION_SECONDS = 0.36;

export type MarkerSvgPoint = {
  x: number;
  y: number;
};

export type MarkerMotionPlan =
  | { mode: "initial" | "immediate"; target: MarkerSvgPoint }
  | {
      mode: "animate";
      target: MarkerSvgPoint;
      from: MarkerSvgPoint;
      duration: number;
      ease: string;
      emphasize: true;
    };

export function chartGeometryMotionKey(
  geometry: PsychrometricChartGeometry,
): string {
  return [
    geometry.unitSystem,
    geometry.atmosphericPressure,
    geometry.dryBulbDomain.min,
    geometry.dryBulbDomain.max,
    geometry.humidityRatioDomain.min,
    geometry.humidityRatioDomain.max,
  ].join(":");
}

export function createMarkerMotionPlan({
  previousTarget,
  target,
  currentOffset = { x: 0, y: 0 },
  directManipulation,
  reducedMotion,
  geometryChanged,
}: {
  previousTarget: MarkerSvgPoint | undefined;
  target: MarkerSvgPoint;
  currentOffset?: MarkerSvgPoint;
  directManipulation: boolean;
  reducedMotion: boolean;
  geometryChanged: boolean;
}): MarkerMotionPlan {
  if (!previousTarget) return { mode: "initial", target };
  if (directManipulation || reducedMotion || geometryChanged) {
    return { mode: "immediate", target };
  }

  const currentVisiblePoint = {
    x: previousTarget.x + currentOffset.x,
    y: previousTarget.y + currentOffset.y,
  };
  const from = {
    x: currentVisiblePoint.x - target.x,
    y: currentVisiblePoint.y - target.y,
  };
  if (Math.hypot(from.x, from.y) < MARKER_MOTION_MINIMUM_DISTANCE) {
    return { mode: "immediate", target };
  }

  return {
    mode: "animate",
    target,
    from,
    duration: MARKER_MOTION_DURATION_SECONDS,
    ease: MARKER_MOTION_EASE,
    emphasize: true,
  };
}
