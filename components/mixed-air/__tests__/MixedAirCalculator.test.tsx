import { readFileSync } from "node:fs";
import path from "node:path";

import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ModalProvider } from "../../ModalProvider";
import MixedAirCalculatorPage, { metadata } from "../../../app/tools/mixed-air-calculator/page";
import AirPropertiesPage from "../../../app/tools/air-properties/page";
import ToolsPage from "../../../app/tools/page";
import sitemap from "../../../app/sitemap";
import { calculateMixedAir } from "../../../lib/psychrometrics/mixing";
import {
  MIXED_AIR_ANIMATION_DURATION,
  CurrentWeatherStatus,
  MixedAirCalculator,
  shouldReduceMotion,
} from "../MixedAirCalculator";
import { MixedAirGuide } from "../MixedAirGuide";
import { MixedAirResults } from "../MixedAirResults";
import {
  airflowStrokeWidths,
  calculateMixedAirForm,
  DEFAULT_MIXED_AIR_FORM,
  switchMixedAirUnits,
  weatherAutofillValues,
} from "../calculatorState";
import type { CurrentWeather } from "../../../lib/weather";

const render = (node: React.ReactNode) => renderToStaticMarkup(<ModalProvider>{node}</ModalProvider>);
const h1Count = (markup: string) => (markup.match(/<h1(?:\s|>)/g) ?? []).length;

afterEach(() => vi.unstubAllGlobals());

describe("mixed-air calculator UI and production integration", () => {
  it("renders the production page with one H1", () => {
    const markup = render(<MixedAirCalculatorPage />);
    expect(markup).toContain("Mixed Air Calculator");
    expect(h1Count(markup)).toBe(1);
  });

  it("renders outdoor-air fields", () => {
    const markup = renderToStaticMarkup(<MixedAirCalculator />);
    expect(markup).toContain('id="mixed-air-oa-flow"');
    expect(markup).toContain('id="mixed-air-oa-db"');
    expect(markup).toContain('id="mixed-air-oa-rh"');
  });

  it("renders return-air fields", () => {
    const markup = renderToStaticMarkup(<MixedAirCalculator />);
    expect(markup).toContain('id="mixed-air-ra-flow"');
    expect(markup).toContain('id="mixed-air-ra-db"');
    expect(markup).toContain('id="mixed-air-ra-rh"');
  });

  it("renders project condition controls", () => {
    const markup = renderToStaticMarkup(<MixedAirCalculator />);
    expect(markup).toContain("Project Conditions");
    expect(markup).toContain("Elevation (ft)");
    expect(markup).toContain("Pressure input");
  });

  it("renders Manual and Current Weather selectors", () => {
    const markup = renderToStaticMarkup(<MixedAirCalculator />);
    expect(markup).toContain("Manual Conditions");
    expect(markup).toContain("Current Weather");
  });

  it("uses a submit form and Calculate button for click or Enter submission", () => {
    const markup = renderToStaticMarkup(<MixedAirCalculator />);
    expect(markup).toContain("<form");
    expect(markup).toContain('type="submit"');
    expect(markup).toContain("Press Enter from any calculator field");
  });

  it("keeps invalid input from producing a solution", () => {
    expect(calculateMixedAirForm({ ...DEFAULT_MIXED_AIR_FORM, outdoorRelativeHumidity: "120" }).ok).toBe(false);
  });

  it("renders result cards after a valid calculation", () => {
    const result = calculateMixedAir({ unitSystem: "IP", outdoorAir: { airflow: 500, dryBulb: 90, relativeHumidity: 50 }, returnAir: { airflow: 1500, dryBulb: 75, relativeHumidity: 50 }, pressureMode: "elevation", elevation: 0 });
    if (!result.ok) throw new Error("Expected result");
    const markup = renderToStaticMarkup(<MixedAirResults solution={result.value} />);
    expect(markup).toContain("Mixed Dry Bulb");
    expect(markup).toContain("Atmospheric Pressure");
  });

  it("renders stationary stream labels from current values", () => {
    const markup = renderToStaticMarkup(<MixedAirCalculator />);
    expect(markup).toContain("OUTDOOR AIR");
    expect(markup).toContain("500 CFM · 90.0°F · 50.0% RH");
    expect(markup).toContain("RETURN AIR");
    expect(markup).toContain('data-stationary-label="mixed"');
  });

  it("renders one cohesive casing with integrated OA, RA, mixing, and discharge paths", () => {
    const markup = renderToStaticMarkup(<MixedAirCalculator />);
    expect((markup.match(/data-equipment-body="single-casing"/g) ?? [])).toHaveLength(1);
    expect(markup).toContain('data-air-path="outdoor"');
    expect(markup).toContain('data-air-path="return"');
    expect(markup).toContain('data-mixing-zone="progressive"');
    expect(markup).toContain('data-mixing-paths="progressive-overlap"');
    expect(markup).toContain('data-mixing-path="outdoor-layer"');
    expect(markup).toContain('data-mixing-path="return-layer"');
    expect(markup).toContain('data-mixing-path="composite-layer"');
    expect(markup).toContain('data-air-path="mixed"');
    expect(markup).toContain('data-visualization="cohesive-isometric-mixing-plenum"');
    expect(markup).toContain('clip-path="url(#mixing-window-clip)"');
  });

  it("keeps engineering and GSAP presentation calls separated", () => {
    const source = readFileSync(path.join(process.cwd(), "components/mixed-air/MixedAirCalculator.tsx"), "utf8");
    expect(source).toContain("const result = calculateMixedAirForm(form)");
    expect(source).toContain("playAnimation();");
    expect(source).not.toMatch(/onUpdate:\s*[\s\S]*calculateMixedAir/);
  });

  it("supports reduced motion without changing calculation", () => {
    vi.stubGlobal("window", { matchMedia: vi.fn(() => ({ matches: true })) });
    expect(shouldReduceMotion()).toBe(true);
    expect(calculateMixedAirForm(DEFAULT_MIXED_AIR_FORM).ok).toBe(true);
  });

  it("kills the previous GSAP timeline and stays within target duration", () => {
    const source = readFileSync(path.join(process.cwd(), "components/mixed-air/MixedAirCalculator.tsx"), "utf8");
    expect(source).toContain("timeline.current?.kill()");
    expect(MIXED_AIR_ANIMATION_DURATION).toBeGreaterThanOrEqual(.9);
    expect(MIXED_AIR_ANIMATION_DURATION).toBeLessThanOrEqual(1.3);
    expect((source.match(/gsap\.timeline/g) ?? [])).toHaveLength(1);
    expect(source).toContain(".to(incoming");
    expect(source).toContain(".to(mixingPaths");
    expect(source).toContain(".to(mixedFlow.current");
    expect(source).toContain(".to(mixedLabel.current");
  });

  it("clamps illustrative stream widths at readable sizes", () => {
    expect(airflowStrokeWidths(1, 100000).outdoor).toBeGreaterThanOrEqual(7);
    expect(airflowStrokeWidths(100000, 1).outdoor).toBeLessThanOrEqual(22);
  });

  it("preserves physical inputs when switching mobile-friendly IP/SI fields", () => {
    const si = switchMixedAirUnits(DEFAULT_MIXED_AIR_FORM, "SI");
    const ip = switchMixedAirUnits(si, "IP");
    expect(Number(ip.outdoorAirflow)).toBeCloseTo(500, 3);
    expect(Number(ip.outdoorDryBulb)).toBeCloseTo(90, 3);
  });

  it("includes responsive layout rules without horizontal page overflow", () => {
    const css = readFileSync(path.join(process.cwd(), "components/mixed-air/MixedAirCalculator.module.css"), "utf8");
    expect(css).toContain("@media (max-width: 1080px)");
    expect(css).toContain("grid-template-columns: 1fr");
    expect(css).not.toContain("100vw");
  });

  it("renders all eight shared ToolGuide topics and keeps content in the DOM", () => {
    const markup = renderToStaticMarkup(<MixedAirGuide />);
    expect((markup.match(/aria-controls="mixed-air-guide-panel"/g) ?? [])).toHaveLength(8);
    expect(markup).toContain("Relative humidity is not directly averaged.");
    expect(markup).toContain("Can I use this calculator for final engineering design?");
  });

  it("adds the standard card under Air Properties and the tools directory", () => {
    expect(render(<AirPropertiesPage />)).toContain('href="/tools/mixed-air-calculator"');
    expect(render(<ToolsPage />)).toContain('href="/tools/mixed-air-calculator"');
  });

  it("sets canonical SEO metadata and sitemap route", () => {
    expect(metadata.title).toBe("Mixed Air Calculator | HVAC Air Mixing | AnyHVAC");
    expect(metadata.alternates?.canonical).toBe("https://www.anyhvac.net/tools/mixed-air-calculator");
    expect(sitemap().map((item) => item.url)).toContain("https://www.anyhvac.net/tools/mixed-air-calculator");
  });

  it("renders the intentional Current Weather request UI and disclaimer", () => {
    const markup = renderToStaticMarkup(<MixedAirCalculator initialForm={{ ...DEFAULT_MIXED_AIR_FORM, outdoorMode: "weather" }} />);
    expect(markup).toContain('id="mixed-air-location"');
    expect(markup).toContain("Use Current Weather");
    expect(markup).toContain("not HVAC design conditions");
    expect(calculateMixedAirForm(DEFAULT_MIXED_AIR_FORM).ok).toBe(true);
  });

  it("formats successful weather status, timestamp, and attribution", () => {
    const weather: CurrentWeather = {
      locationLabel: "Cleveland, Ohio, USA", locationName: "Cleveland", region: "Ohio", country: "USA",
      latitude: 41.5, longitude: -81.7, temperatureCelsius: 21.1, temperatureFahrenheit: 70,
      relativeHumidity: 56, observedAt: "2026-09-14 15:05", provider: "WeatherAPI.com",
    };
    const markup = renderToStaticMarkup(<CurrentWeatherStatus status="success" weather={weather} />);
    expect(markup).toContain("Current conditions loaded for Cleveland, Ohio, USA");
    expect(markup).toContain("Updated 3:05 PM local time");
    expect(markup).toContain("Weather data provided by WeatherAPI.com");
  });

  it("applies IP/SI weather values without touching project pressure", () => {
    const weather: CurrentWeather = {
      locationLabel: "Madrid, Madrid, Spain", locationName: "Madrid", region: "Madrid", country: "Spain",
      latitude: 40.4, longitude: -3.7, temperatureCelsius: 25, temperatureFahrenheit: 77,
      relativeHumidity: 40, observedAt: "2026-09-14 18:00", provider: "WeatherAPI.com",
    };
    const ip = { ...DEFAULT_MIXED_AIR_FORM, pressureMode: "manual" as const, pressure: "13.8", ...weatherAutofillValues(weather, "IP") };
    const si = weatherAutofillValues(weather, "SI");
    expect(ip.outdoorDryBulb).toBe("77");
    expect(ip.outdoorRelativeHumidity).toBe("40");
    expect(ip.pressure).toBe("13.8");
    expect(si.outdoorDryBulb).toBe("25");
  });

  it("keeps loaded outdoor fields editable and makes no automatic weather request", () => {
    const markup = renderToStaticMarkup(<MixedAirCalculator initialForm={{ ...DEFAULT_MIXED_AIR_FORM, outdoorMode: "weather" }} />);
    expect(markup).not.toMatch(/id="mixed-air-oa-db"[^>]*readonly/i);
    const source = readFileSync(path.join(process.cwd(), "components/mixed-air/MixedAirCalculator.tsx"), "utf8");
    expect((source.match(/requestCurrentWeather\(/g) ?? [])).toHaveLength(1);
    expect(source).not.toMatch(/setInterval|polling/i);
  });
});
