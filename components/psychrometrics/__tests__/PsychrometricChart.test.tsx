import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  createDefaultChartConfig,
  generatePsychrometricChartGeometry,
  type PsychrometricChartGeometry,
} from "../../../lib/psychrometrics/chart";

import { PsychrometricChart } from "../PsychrometricChart";
import { normalizedToSvgPoint } from "../svgCoordinates";

function geometry(unitSystem: "IP" | "SI"): PsychrometricChartGeometry {
  const result = generatePsychrometricChartGeometry(
    createDefaultChartConfig(unitSystem),
  );
  if (!result.ok) throw new Error(result.errors.map((error) => error.message).join("; "));
  return result.value;
}

const ipGeometry = geometry("IP");
const siGeometry = geometry("SI");
const ipMarkup = renderToStaticMarkup(
  <PsychrometricChart geometry={ipGeometry} idPrefix="ip-test" />,
);
const siMarkup = renderToStaticMarkup(
  <PsychrometricChart geometry={siGeometry} idPrefix="si-test" />,
);

describe("PsychrometricChart", () => {
  it("renders an accessible responsive SVG surface", () => {
    expect(ipMarkup).toContain("<svg");
    expect(ipMarkup).toContain('viewBox="0 0 1280 760"');
    expect(ipMarkup).toContain('role="img"');
    expect(ipMarkup).toContain('aria-labelledby="ip-test-title ip-test-description"');
  });

  it("renders a title and description", () => {
    expect(ipMarkup).toContain('<title id="ip-test-title">Psychrometric chart</title>');
    expect(ipMarkup).toContain('<desc id="ip-test-description">');
  });

  it("renders the saturation curve", () => {
    expect(ipMarkup).toContain('data-line-family="saturation"');
  });

  it("renders relative-humidity curves", () => {
    expect(ipMarkup).toContain('data-line-family="relative-humidity"');
    expect(ipMarkup).toContain('data-relative-humidity="50"');
  });

  it("renders dry-bulb grid lines", () => {
    expect(ipMarkup).toContain('data-line-family="dry-bulb-grid"');
  });

  it("renders humidity-ratio grid lines", () => {
    expect(ipMarkup).toContain('data-line-family="humidity-ratio-grid"');
  });

  it("renders wet-bulb lines", () => {
    expect(ipMarkup).toContain('data-line-family="wet-bulb"');
  });

  it("renders enthalpy lines", () => {
    expect(ipMarkup).toContain('data-line-family="enthalpy"');
  });

  it("renders specific-volume lines", () => {
    expect(ipMarkup).toContain('data-line-family="specific-volume"');
  });

  it("labels IP axes with display units", () => {
    expect(ipMarkup).toContain("Dry-Bulb Temperature (°F)");
    expect(ipMarkup).toContain("Humidity Ratio (grains/lb dry air)");
  });

  it("labels SI axes with display units", () => {
    expect(siMarkup).toContain("Dry-Bulb Temperature (°C)");
    expect(siMarkup).toContain("Humidity Ratio (g/kg dry air)");
  });

  it("uses semantic curve values for direct labels", () => {
    expect(ipMarkup).toContain("100% RH");
    expect(ipMarkup).toMatch(/WB -?\d+/);
    expect(ipMarkup).toMatch(/h -?\d+/);
    expect(ipMarkup).toMatch(/v \d+/);
  });

  it("inverts normalized y coordinates for SVG space", () => {
    const plot = { left: 10, top: 20, width: 100, height: 200 };
    expect(normalizedToSvgPoint({ x: 0.25, y: 0 }, plot)).toEqual({
      x: 35,
      y: 220,
    });
    expect(normalizedToSvgPoint({ x: 0.25, y: 1 }, plot)).toEqual({
      x: 35,
      y: 20,
    });
  });

  it("emits no non-finite SVG values", () => {
    expect(ipMarkup).not.toMatch(/(?:NaN|[-+]?Infinity)/);
    expect(siMarkup).not.toMatch(/(?:NaN|[-+]?Infinity)/);
  });

  it("records the geometry unit system and pressure on the figure", () => {
    expect(ipMarkup).toContain('data-unit-system="IP"');
    expect(ipMarkup).toContain(
      `data-atmospheric-pressure="${ipGeometry.atmosphericPressure}"`,
    );
  });

  it("changes rendered geometry when atmospheric pressure changes", () => {
    const elevatedResult = generatePsychrometricChartGeometry(
      createDefaultChartConfig("IP", {
        pressureMode: "elevation",
        elevation: 5_000,
      }),
    );
    if (!elevatedResult.ok) throw new Error("Elevated geometry generation failed");

    const elevatedMarkup = renderToStaticMarkup(
      <PsychrometricChart geometry={elevatedResult.value} idPrefix="elevated-test" />,
    );
    expect(elevatedResult.value.atmosphericPressure).not.toBe(
      ipGeometry.atmosphericPressure,
    );
    expect(elevatedMarkup).not.toBe(ipMarkup);
  });
});
