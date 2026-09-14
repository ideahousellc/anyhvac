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
} from "../calculatorState";

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
    expect(MIXED_AIR_ANIMATION_DURATION).toBeLessThanOrEqual(1.2);
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

  it("keeps weather unavailable and independent of manual calculation", () => {
    const markup = renderToStaticMarkup(<MixedAirCalculator initialForm={{ ...DEFAULT_MIXED_AIR_FORM, outdoorMode: "weather" }} />);
    expect(markup).toContain("Weather data is unavailable");
    expect(calculateMixedAirForm(DEFAULT_MIXED_AIR_FORM).ok).toBe(true);
  });
});
