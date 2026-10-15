import { describe, expect, it } from "vitest";
import { gsap } from "gsap";

import {
  chartGeometryMotionKey,
  createMarkerMotionPlan,
  MARKER_EMPHASIS_DURATION_SECONDS,
  MARKER_EMPHASIS_SCALE,
  MARKER_MOTION_DURATION_SECONDS,
  MARKER_MOTION_EASE,
  MARKER_MOTION_MINIMUM_DISTANCE,
} from "../chartMotion";
import {
  DEFAULT_CALCULATOR_FORM,
  generateChartForForm,
} from "../calculatorState";

const previous = { x: 400, y: 300 };
const target = { x: 520, y: 240 };

function animatedPlan(overrides: Partial<Parameters<typeof createMarkerMotionPlan>[0]> = {}) {
  return createMarkerMotionPlan({
    previousTarget: previous,
    target,
    directManipulation: false,
    reducedMotion: false,
    geometryChanged: false,
    ...overrides,
  });
}

describe("selected-state marker motion intent", () => {
  it("loads the GSAP presentation layer safely", () => {
    expect(gsap.timeline).toBeTypeOf("function");
    expect(gsap.context).toBeTypeOf("function");
  });

  it("initializes safely without requesting a tween", () => {
    expect(animatedPlan({ previousTarget: undefined })).toEqual({
      mode: "initial",
      target,
    });
  });

  it("requests restrained programmatic marker movement", () => {
    expect(animatedPlan()).toMatchObject({
      mode: "animate",
      duration: MARKER_MOTION_DURATION_SECONDS,
      ease: MARKER_MOTION_EASE,
    });
  });

  it("uses the same bounded movement plan for a chart-click target", () => {
    const plan = animatedPlan();
    expect(plan.mode).toBe("animate");
    if (plan.mode === "animate") {
      expect(plan.target).toEqual(target);
      expect(plan.emphasize).toBe(true);
    }
  });

  it("uses the current visible position when replacing a rapid update", () => {
    expect(animatedPlan({ currentOffset: { x: -30, y: 10 } })).toMatchObject({
      mode: "animate",
      from: { x: -150, y: 70 },
    });
  });

  it("bypasses tweening during active pointer manipulation", () => {
    expect(animatedPlan({ directManipulation: true }).mode).toBe("immediate");
  });

  it("skips tweening when reduced motion is requested", () => {
    expect(animatedPlan({ reducedMotion: true }).mode).toBe("immediate");
  });

  it("places the marker immediately after geometry regeneration", () => {
    expect(animatedPlan({ geometryChanged: true }).mode).toBe("immediate");
  });

  it("does not animate a representation change with an unchanged target", () => {
    expect(animatedPlan({ previousTarget: target }).mode).toBe("immediate");
  });

  it("ignores sub-pixel conversion noise during a mode change", () => {
    expect(
      animatedPlan({
        previousTarget: {
          x: target.x,
          y: target.y - MARKER_MOTION_MINIMUM_DISTANCE / 2,
        },
      }).mode,
    ).toBe("immediate");
  });

  it("ends exactly at the authoritative SVG target", () => {
    expect(animatedPlan()).toMatchObject({ target, from: { x: -120, y: 60 } });
  });

  it("uses one restrained, non-bouncy emphasis", () => {
    expect(MARKER_EMPHASIS_SCALE).toBe(1.12);
    expect(MARKER_EMPHASIS_DURATION_SECONDS).toBeLessThanOrEqual(0.5);
    expect(MARKER_MOTION_EASE).not.toMatch(/bounce|elastic|back/i);
  });

  it("detects pressure and unit geometry changes", () => {
    const base = generateChartForForm(DEFAULT_CALCULATOR_FORM);
    const pressure = generateChartForForm({
      ...DEFAULT_CALCULATOR_FORM,
      elevation: "5000",
    });
    const si = generateChartForForm({
      ...DEFAULT_CALCULATOR_FORM,
      unitSystem: "SI",
      dryBulb: "23.8889",
      elevation: "0",
    });
    if (!base.ok || !pressure.ok || !si.ok) throw new Error("Geometry failed");
    expect(chartGeometryMotionKey(pressure.value)).not.toBe(
      chartGeometryMotionKey(base.value),
    );
    expect(chartGeometryMotionKey(si.value)).not.toBe(
      chartGeometryMotionKey(base.value),
    );
  });
});
