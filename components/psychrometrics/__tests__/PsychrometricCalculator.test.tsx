import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PsychrometricCalculator } from "../PsychrometricCalculator";
import {
  PSYCHROMETRIC_CHART_PLOT,
  PsychrometricChart,
} from "../PsychrometricChart";
import { formatPsychrometricResults } from "../PsychrometricResults";
import {
  calculateSelectedState,
  DEFAULT_CALCULATOR_FORM,
  generateChartForForm,
  isStateInsideChart,
  switchMoistureMode,
  switchUnitSystem,
  type CalculatorFormState,
} from "../calculatorState";
import { physicalToSvgPoint } from "../svgCoordinates";

function validState(form: CalculatorFormState) {
  const result = calculateSelectedState(form);
  expect(result.ok, result.ok ? undefined : JSON.stringify(result.errors)).toBe(true);
  if (!result.ok) throw new Error("Expected a valid state");
  return result.value;
}

function validGeometry(form: CalculatorFormState) {
  const result = generateChartForForm(form);
  expect(result.ok, result.ok ? undefined : JSON.stringify(result.errors)).toBe(true);
  if (!result.ok) throw new Error("Expected valid geometry");
  return result.value;
}

describe("single-state psychrometric calculator", () => {
  it("calculates the default 75 F / 50% RH state", () => {
    const state = validState(DEFAULT_CALCULATOR_FORM);
    expect(state.dryBulb).toBe(75);
    expect(state.relativeHumidity).toBe(50);
    expect(state.atmosphericPressure).toBeCloseTo(14.696, 3);
  });

  it("renders the default selected-state marker and projection guides", () => {
    const markup = renderToStaticMarkup(<PsychrometricCalculator />);
    expect(markup).toContain('data-selected-state="true"');
    expect(markup).toContain('data-state-guide="dry-bulb"');
    expect(markup).toContain('data-state-guide="humidity-ratio"');
  });

  it("maps marker coordinates from the engine state through the SVG transform", () => {
    const state = validState(DEFAULT_CALCULATOR_FORM);
    const chart = validGeometry(DEFAULT_CALCULATOR_FORM);
    const expected = physicalToSvgPoint(
      { dryBulb: state.dryBulb, humidityRatio: state.humidityRatio },
      chart,
      PSYCHROMETRIC_CHART_PLOT,
    );
    const markup = renderToStaticMarkup(
      <PsychrometricChart
        geometry={chart}
        selectedState={{ dryBulb: state.dryBulb, humidityRatio: state.humidityRatio }}
      />,
    );
    expect(markup).toContain(`data-svg-x="${expected.x}"`);
    expect(markup).toContain(`data-svg-y="${expected.y}"`);
  });

  it("calculates relative-humidity mode", () => {
    expect(validState(DEFAULT_CALCULATOR_FORM).relativeHumidity).toBe(50);
  });

  it("calculates wet-bulb mode", () => {
    const state = validState({
      ...DEFAULT_CALCULATOR_FORM,
      moistureMode: "wetBulb",
      moistureValue: "62.5",
    });
    expect(state.wetBulb).toBe(62.5);
  });

  it("calculates dew-point mode", () => {
    const state = validState({
      ...DEFAULT_CALCULATOR_FORM,
      moistureMode: "dewPoint",
      moistureValue: "55",
    });
    expect(state.dewPoint).toBe(55);
  });

  it.each(["wetBulb", "dewPoint"] as const)(
    "preserves the physical state when switching to %s mode",
    (mode) => {
      const initial = validState(DEFAULT_CALCULATOR_FORM);
      const switched = switchMoistureMode(DEFAULT_CALCULATOR_FORM, initial, mode);
      const recovered = validState(switched);
      expect(recovered.dryBulb).toBeCloseTo(initial.dryBulb, 5);
      expect(recovered.humidityRatio).toBeCloseTo(initial.humidityRatio, 6);
      expect(recovered.relativeHumidity).toBeCloseTo(initial.relativeHumidity, 2);
    },
  );

  it("preserves physical state when switching IP to SI", () => {
    const initial = validState(DEFAULT_CALCULATOR_FORM);
    const siForm = switchUnitSystem(DEFAULT_CALCULATOR_FORM, initial, "SI");
    const converted = validState(siForm);
    expect(converted.dryBulb).toBeCloseTo(23.8889, 3);
    expect(converted.relativeHumidity).toBeCloseTo(initial.relativeHumidity, 4);
    expect(converted.humidityRatio).toBeCloseTo(initial.humidityRatio, 6);
  });

  it("preserves physical state when switching SI back to IP", () => {
    const initial = validState(DEFAULT_CALCULATOR_FORM);
    const siForm = switchUnitSystem(DEFAULT_CALCULATOR_FORM, initial, "SI");
    const siState = validState(siForm);
    const ipForm = switchUnitSystem(siForm, siState, "IP");
    const recovered = validState(ipForm);
    expect(recovered.dryBulb).toBeCloseTo(initial.dryBulb, 4);
    expect(recovered.relativeHumidity).toBeCloseTo(initial.relativeHumidity, 4);
    expect(recovered.humidityRatio).toBeCloseTo(initial.humidityRatio, 6);
  });

  it("uses elevation-derived pressure", () => {
    const elevated = validState({ ...DEFAULT_CALCULATOR_FORM, elevation: "5000" });
    const seaLevel = validState(DEFAULT_CALCULATOR_FORM);
    expect(elevated.atmosphericPressure).toBeLessThan(seaLevel.atmosphericPressure);
  });

  it("uses manual pressure", () => {
    const state = validState({
      ...DEFAULT_CALCULATOR_FORM,
      pressureMode: "manual",
      pressure: "13.5",
    });
    expect(state.atmosphericPressure).toBe(13.5);
  });

  it("regenerates chart geometry after a pressure change", () => {
    const seaLevel = validGeometry(DEFAULT_CALCULATOR_FORM);
    const elevated = validGeometry({ ...DEFAULT_CALCULATOR_FORM, elevation: "5000" });
    expect(elevated.atmosphericPressure).not.toBe(seaLevel.atmosphericPressure);
    expect(elevated.saturationCurve.points).not.toEqual(seaLevel.saturationCurve.points);
  });

  it("surfaces invalid RH and does not plot a marker", () => {
    const form = { ...DEFAULT_CALCULATOR_FORM, moistureValue: "110" };
    const result = calculateSelectedState(form);
    expect(result).toMatchObject({
      ok: false,
      errors: [{ field: "moistureValue", code: "OUT_OF_RANGE" }],
    });
    const markup = renderToStaticMarkup(<PsychrometricCalculator initialForm={form} />);
    expect(markup).toContain("Relative humidity must be between 0% and 100%.");
    expect(markup).not.toContain('data-selected-state="true"');
  });

  it("surfaces wet bulb above dry bulb", () => {
    const result = calculateSelectedState({
      ...DEFAULT_CALCULATOR_FORM,
      moistureMode: "wetBulb",
      moistureValue: "76",
    });
    expect(result).toMatchObject({
      ok: false,
      errors: [{ code: "WET_BULB_ABOVE_DRY_BULB" }],
    });
  });

  it("surfaces dew point above dry bulb", () => {
    const result = calculateSelectedState({
      ...DEFAULT_CALCULATOR_FORM,
      moistureMode: "dewPoint",
      moistureValue: "76",
    });
    expect(result).toMatchObject({
      ok: false,
      errors: [{ code: "DEW_POINT_ABOVE_DRY_BULB" }],
    });
  });

  it.each(["", "0", "-1"])("surfaces invalid manual pressure %s", (pressure) => {
    const result = calculateSelectedState({
      ...DEFAULT_CALCULATOR_FORM,
      pressureMode: "manual",
      pressure,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0].field).toBe("pressure");
  });

  it("renders invalid pressure feedback without a chart marker", () => {
    const markup = renderToStaticMarkup(
      <PsychrometricCalculator
        initialForm={{
          ...DEFAULT_CALCULATOR_FORM,
          pressureMode: "manual",
          pressure: "0",
        }}
      />,
    );
    expect(markup).toContain("Manual atmospheric pressure must be positive.");
    expect(markup).toContain("Chart unavailable");
    expect(markup).not.toContain('data-selected-state="true"');
  });

  it("does not clamp or plot a valid outside-domain state", () => {
    const form = { ...DEFAULT_CALCULATOR_FORM, dryBulb: "140" };
    const state = validState(form);
    const chart = validGeometry(form);
    expect(isStateInsideChart(state, chart)).toBe(false);
    const markup = renderToStaticMarkup(<PsychrometricCalculator initialForm={form} />);
    expect(markup).toContain("outside the current chart range");
    expect(markup).not.toContain('data-selected-state="true"');
  });

  it("renders all engine result fields with converted humidity ratio", () => {
    const state = validState(DEFAULT_CALCULATOR_FORM);
    const results = formatPsychrometricResults(state);
    expect(results).toHaveLength(10);
    expect(results.map(({ label }) => label)).toEqual([
      "Dry Bulb",
      "Wet Bulb",
      "Dew Point",
      "Relative Humidity",
      "Humidity Ratio",
      "Enthalpy",
      "Specific Volume",
      "Vapor Pressure",
      "Degree of Saturation",
      "Atmospheric Pressure",
    ]);
    expect(results.find(({ label }) => label === "Humidity Ratio")?.value).toBe(
      `${(state.humidityRatio * 7_000).toFixed(1)} grains/lb`,
    );
  });

  it("emits no NaN or Infinity in the default calculator SVG", () => {
    const markup = renderToStaticMarkup(<PsychrometricCalculator />);
    expect(markup).not.toMatch(/(?:NaN|[-+]?Infinity)/);
  });

  it("does not leak unit state while alternating calculator units", () => {
    let form = DEFAULT_CALCULATOR_FORM;
    for (let index = 0; index < 6; index += 1) {
      const ip = validState(form);
      form = switchUnitSystem(form, ip, "SI");
      const si = validState(form);
      expect(si.dryBulb).toBeLessThan(30);
      form = switchUnitSystem(form, si, "IP");
      expect(validState(form).dryBulb).toBeCloseTo(75, 3);
    }
  });
});
