import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import DuctPage from "@/app/tools/duct-calculator/page";
import PsychrometricPage from "@/app/tools/psychrometric-calculator/page";
import MixedAirPage from "@/app/tools/mixed-air-calculator/page";
import { ModalProvider } from "../ModalProvider";
import { DuctSizingGuide } from "../duct-calculator/DuctSizingGuide";
import { PsychrometricGuide } from "../psychrometrics/PsychrometricGuide";
import { MixedAirGuide } from "../mixed-air/MixedAirGuide";

describe("engineering method disclosure", () => {
  it.each([
    [DuctPage, "duct-sizing-guide", "FR = 0.109136", "not an independent reference", "25.6 inches"],
    [PsychrometricPage, "psychrometric-guide", "absolute atmospheric pressure", "not an independent", "75°F dry bulb"],
    [MixedAirPage, "mixed-air-guide", "divided by specific volume", "not an independent", "500 CFM of outdoor air"],
  ])("renders method, evidence limits, and issue reporting before the expandable guide", (Page, id, method, evidence, example) => {
    const markup = renderToStaticMarkup(<ModalProvider><Page /></ModalProvider>);
    const guideStart = markup.indexOf(`id="${id}-title"`);
    expect(guideStart).toBeGreaterThan(0);
    const summary = markup.slice(0, guideStart);
    expect(summary).toContain(method);
    expect(summary).toContain(evidence);
    expect(summary).toContain(example);
    expect(summary).toContain('href="/contact">Report a calculation issue</a>');
    expect(summary).toContain("expected result with its source");
    expect(markup).toContain(`id="${id}-panel"`);
    expect(markup).toContain('aria-expanded="false"');
  });

  it("discloses dimensional and selection assumptions without standards attribution", () => {
    const guide = renderToStaticMarkup(<DuctSizingGuide />);
    expect(guide).toContain("0.109136 × Q^1.9 / FR");
    expect(guide).toContain("Q is CFM, D is inches, and FR is in. w.g./100 ft");
    expect(guide).toContain("1.3 × (a × b)^0.625");
    expect(guide).toContain("5%, with a 6.5% allowance");
    expect(guide).toContain("does not attribute");
  });

  it("separates the library reference check from the engine-generated demonstration", () => {
    const guide = renderToStaticMarkup(<PsychrometricGuide />);
    expect(guide).toContain("21.3094°C at 25°C dry bulb, 80% RH, and 101,325 Pa");
    expect(guide).toContain("not validation independent of");
    expect(guide).toContain("Calculator-generated demonstration");
    expect(guide).toContain("64.6 grains/lb");
    expect(guide).toContain("28.1 Btu/lb");
  });

  it("documents the dry-air balances, flow units, and saturation boundary", () => {
    const guide = renderToStaticMarkup(<MixedAirGuide />);
    expect(guide).toContain("m₁ = Q₁ / v₁");
    expect(guide).toContain("Wmix = (m₁W₁ + m₂W₂) / (m₁ + m₂)");
    expect(guide).toContain("hmix = (m₁h₁ + m₂h₂) / (m₁ + m₂)");
    expect(guide).toContain("L/s to m³/s");
    expect(guide).toContain("does not calculate condensate");
    expect(guide).toContain("not an independently measured mixing benchmark");
  });
});
