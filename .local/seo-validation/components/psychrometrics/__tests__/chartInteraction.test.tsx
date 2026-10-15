import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { calculatePsychrometricState } from "../../../lib/psychrometrics";
import { PsychrometricChart } from "../PsychrometricChart";
import { ChartPointerDragSession } from "../chartPointerDrag";
import {
  CHART_INTERACTION_MAX_ITERATIONS,
  interactionPointsAreEquivalent,
  solvePsychrometricStateFromChartPoint,
} from "../chartInteractionSolver";
import {
  DEFAULT_CALCULATOR_FORM,
  generateChartForForm,
  synchronizeFormWithState,
  type CalculatorFormState,
} from "../calculatorState";
import {
  clientToSvgPoint,
  physicalToSvgPoint,
  svgToPhysicalPoint,
} from "../svgCoordinates";
import { PSYCHROMETRIC_CHART_PLOT } from "../PsychrometricChart";

function geometry(form: CalculatorFormState = DEFAULT_CALCULATOR_FORM) {
  const result = generateChartForForm(form);
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.value;
}

function referenceState(form: CalculatorFormState = DEFAULT_CALCULATOR_FORM) {
  const result = calculatePsychrometricState({
    unitSystem: form.unitSystem,
    dryBulb: Number(form.dryBulb),
    moistureMode: "relativeHumidity",
    moistureValue: 50,
    pressureMode: "elevation",
    elevation: Number(form.elevation),
  });
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.value;
}

describe("chart interaction solver", () => {
  it("recovers an IP engine state from dry bulb and humidity ratio", () => {
    const chart = geometry();
    const expected = referenceState();
    const result = solvePsychrometricStateFromChartPoint(
      { dryBulb: expected.dryBulb, humidityRatio: expected.humidityRatio },
      chart,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.humidityRatio).toBeCloseTo(expected.humidityRatio, 7);
    expect(result.state.relativeHumidity).toBeCloseTo(50, 2);
    expect(result.state.atmosphericPressure).toBe(chart.atmosphericPressure);
  });

  it("recovers an SI engine state", () => {
    const form: CalculatorFormState = {
      ...DEFAULT_CALCULATOR_FORM,
      unitSystem: "SI",
      dryBulb: "25",
      elevation: "1000",
    };
    const chart = geometry(form);
    const expected = referenceState(form);
    const result = solvePsychrometricStateFromChartPoint(
      { dryBulb: expected.dryBulb, humidityRatio: expected.humidityRatio },
      chart,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state.humidityRatio).toBeCloseTo(expected.humidityRatio, 7);
      expect(result.state.unitSystem).toBe("SI");
    }
  });

  it.each([10, 90])(
    "recovers low/high humidity state at %s%% RH including WB and DP",
    (relativeHumidity) => {
      const chart = geometry();
      const expectedResult = calculatePsychrometricState({
        unitSystem: "IP",
        dryBulb: 75,
        moistureMode: "relativeHumidity",
        moistureValue: relativeHumidity,
        pressureMode: "elevation",
        elevation: 0,
      });
      if (!expectedResult.ok) throw new Error("Reference calculation failed");
      const result = solvePsychrometricStateFromChartPoint(
        {
          dryBulb: expectedResult.value.dryBulb,
          humidityRatio: expectedResult.value.humidityRatio,
        },
        chart,
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.state.relativeHumidity).toBeCloseTo(relativeHumidity, 2);
      expect(result.state.wetBulb).toBeCloseTo(expectedResult.value.wetBulb, 2);
      expect(result.state.dewPoint).toBeCloseTo(expectedResult.value.dewPoint, 2);
      expect(result.state.humidityRatio).toBeCloseTo(
        expectedResult.value.humidityRatio,
        7,
      );
    },
  );

  it("uses the chart's manual pressure", () => {
    const form: CalculatorFormState = {
      ...DEFAULT_CALCULATOR_FORM,
      pressureMode: "manual",
      pressure: "13.5",
    };
    const chart = geometry(form);
    const targetResult = calculatePsychrometricState({
      unitSystem: "IP",
      dryBulb: 75,
      moistureMode: "relativeHumidity",
      moistureValue: 60,
      pressureMode: "manual",
      pressure: 13.5,
    });
    if (!targetResult.ok) throw new Error("Reference calculation failed");
    const result = solvePsychrometricStateFromChartPoint(
      {
        dryBulb: targetResult.value.dryBulb,
        humidityRatio: targetResult.value.humidityRatio,
      },
      chart,
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.state.atmosphericPressure).toBe(13.5);
  });

  it("bounds engine calls during interaction", () => {
    const expected = referenceState();
    const result = solvePsychrometricStateFromChartPoint(
      { dryBulb: expected.dryBulb, humidityRatio: expected.humidityRatio },
      geometry(),
    );
    expect(result.ok).toBe(true);
    expect(result.engineCallCount).toBeLessThanOrEqual(
      CHART_INTERACTION_MAX_ITERATIONS + 2,
    );
    expect(result.engineCallCount).toBeLessThanOrEqual(8);
  });

  it("identifies duplicate pointer positions for drag coalescing", () => {
    const point = { dryBulb: 75, humidityRatio: 0.009 };
    expect(interactionPointsAreEquivalent(point, { ...point })).toBe(true);
    expect(
      interactionPointsAreEquivalent(point, {
        dryBulb: 75.1,
        humidityRatio: 0.009,
      }),
    ).toBe(false);
  });

  it("accepts the saturation boundary", () => {
    const chart = geometry();
    const saturated = calculatePsychrometricState({
      unitSystem: "IP",
      dryBulb: 75,
      moistureMode: "relativeHumidity",
      moistureValue: 100,
      pressureMode: "elevation",
      elevation: 0,
    });
    if (!saturated.ok) throw new Error("Saturation calculation failed");
    const result = solvePsychrometricStateFromChartPoint(
      { dryBulb: 75, humidityRatio: saturated.value.humidityRatio },
      chart,
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.state.relativeHumidity).toBe(100);
  });

  it("rejects a point above saturation without clamping", () => {
    const chart = geometry();
    const saturated = calculatePsychrometricState({
      unitSystem: "IP",
      dryBulb: 75,
      moistureMode: "relativeHumidity",
      moistureValue: 100,
      pressureMode: "elevation",
      elevation: 0,
    });
    if (!saturated.ok) throw new Error("Saturation calculation failed");
    const result = solvePsychrometricStateFromChartPoint(
      { dryBulb: 75, humidityRatio: saturated.value.humidityRatio + 0.001 },
      chart,
    );
    expect(result).toMatchObject({ ok: false, code: "ABOVE_SATURATION" });
  });

  it("rejects a point below the physical engine minimum", () => {
    const result = solvePsychrometricStateFromChartPoint(
      { dryBulb: 75, humidityRatio: 0 },
      geometry(),
    );
    expect(result).toMatchObject({ ok: false, code: "BELOW_PHYSICAL_MINIMUM" });
  });

  it("rejects points above the chart ceiling before solving", () => {
    const chart = geometry();
    const result = solvePsychrometricStateFromChartPoint(
      {
        dryBulb: 75,
        humidityRatio: chart.humidityRatioDomain.max + 0.001,
      },
      chart,
    );
    expect(result).toMatchObject({
      ok: false,
      code: "ABOVE_CHART_CEILING",
      engineCallCount: 0,
    });
  });

  it("rejects dry-bulb values outside the chart domain", () => {
    const chart = geometry();
    const result = solvePsychrometricStateFromChartPoint(
      { dryBulb: chart.dryBulbDomain.max + 1, humidityRatio: 0.01 },
      chart,
    );
    expect(result).toMatchObject({
      ok: false,
      code: "OUTSIDE_DRY_BULB_DOMAIN",
      engineCallCount: 0,
    });
  });

  it("rejects non-finite pointer-derived values", () => {
    expect(
      solvePsychrometricStateFromChartPoint(
        { dryBulb: Number.NaN, humidityRatio: 0.01 },
        geometry(),
      ),
    ).toMatchObject({ ok: false, code: "NON_FINITE_POINT" });
  });

  it.each(["relativeHumidity", "wetBulb", "dewPoint"] as const)(
    "updates %s inputs from the exact engine-returned state",
    (moistureMode) => {
      const chart = geometry();
      const expected = referenceState();
      const solved = solvePsychrometricStateFromChartPoint(
        { dryBulb: expected.dryBulb, humidityRatio: expected.humidityRatio },
        chart,
      );
      if (!solved.ok) throw new Error("Interaction solve failed");
      const form = synchronizeFormWithState(
        { ...DEFAULT_CALCULATOR_FORM, moistureMode },
        solved.state,
      );
      expect(Number(form.dryBulb)).toBeCloseTo(solved.state.dryBulb, 5);
      expect(Number(form.moistureValue)).toBeCloseTo(
        moistureMode === "relativeHumidity"
          ? solved.state.relativeHumidity
          : moistureMode === "wetBulb"
            ? solved.state.wetBulb
            : solved.state.dewPoint,
        5,
      );
    },
  );
});

describe("interactive SVG coordinate mapping", () => {
  it("starts, coalesces, and ends a pointer drag cleanly", () => {
    const session = new ChartPointerDragSession();
    const first = { dryBulb: 70, humidityRatio: 0.008 };
    const latest = { dryBulb: 72, humidityRatio: 0.009 };

    session.begin(7);
    expect(session.isActive(7)).toBe(true);
    expect(session.queue(8, first)).toBe(false);
    expect(session.queue(7, first)).toBe(true);
    expect(session.queue(7, latest)).toBe(true);
    expect(session.end(7)).toEqual(latest);
    expect(session.isActive(7)).toBe(false);
    expect(session.takePending()).toBeUndefined();
  });

  it("round-trips physical points through SVG coordinates", () => {
    const chart = geometry();
    const physical = { dryBulb: 75, humidityRatio: 0.00925 };
    const svg = physicalToSvgPoint(physical, chart, PSYCHROMETRIC_CHART_PLOT);
    const recovered = svgToPhysicalPoint(svg, chart, PSYCHROMETRIC_CHART_PLOT);
    expect(recovered.dryBulb).toBeCloseTo(physical.dryBulb, 10);
    expect(recovered.humidityRatio).toBeCloseTo(physical.humidityRatio, 10);
  });

  it("maps client coordinates into the SVG viewBox", () => {
    expect(
      clientToSvgPoint(
        { x: 350, y: 220 },
        { left: 100, top: 20, width: 500, height: 400 },
        { width: 1_000, height: 800 },
      ),
    ).toEqual({ x: 500, y: 400 });
  });

  it("renders a selectable plot surface and draggable marker semantics", () => {
    const chart = geometry();
    const state = referenceState();
    const markup = renderToStaticMarkup(
      <PsychrometricChart
        geometry={chart}
        selectedState={{ dryBulb: state.dryBulb, humidityRatio: state.humidityRatio }}
        onSelectPoint={() => undefined}
      />,
    );
    expect(markup).toContain('data-chart-interaction-surface="true"');
    expect(markup).toContain('data-selected-state="true"');
    expect(markup).not.toMatch(/(?:NaN|[-+]?Infinity)/);
  });

  it("keeps the Phase 3 renderer non-interactive when no callback is supplied", () => {
    const markup = renderToStaticMarkup(<PsychrometricChart geometry={geometry()} />);
    expect(markup).not.toContain('data-chart-interaction-surface="true"');
  });
});
