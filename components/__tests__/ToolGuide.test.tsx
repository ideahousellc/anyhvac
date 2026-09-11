import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DuctSizingGuide } from "../duct-calculator/DuctSizingGuide";
import { PsychrometricGuide } from "../psychrometrics/PsychrometricGuide";
import { nextGuideSelection } from "../ToolGuide";

const count = (markup: string, pattern: RegExp) =>
  (markup.match(pattern) ?? []).length;

describe("shared calculator guide", () => {
  it("renders the Psychrometric Guide closed with all topics and content in the DOM", () => {
    const markup = renderToStaticMarkup(<PsychrometricGuide />);

    expect(markup).toContain("Psychrometric Guide");
    expect(count(markup, /aria-controls="psychrometric-guide-panel"/g)).toBe(8);
    expect(count(markup, /aria-expanded="false"/g)).toBe(8);
    expect(markup).toContain(
      'id="psychrometric-guide-panel" role="region" aria-live="polite" aria-hidden="true"',
    );

    for (const topic of [
      "How to Use",
      "Reading the Chart",
      "Dry &amp; Wet Bulb",
      "Humidity &amp; Dew Point",
      "Enthalpy &amp; Specific Volume",
      "Example Calculation",
      "HVAC Applications",
      "FAQ",
    ]) {
      expect(markup).toContain(topic);
    }

    expect(markup).toContain("What is a psychrometric chart?");
    expect(markup).toContain("62.6°F");
    expect(markup).toContain("55.1°F");
    expect(markup).toContain("64.6 grains/lb");
    expect(markup).toContain("28.1 Btu/lb");
    expect(markup).toContain("13.68 ft³/lb");
  });

  it("uses one semantic guide heading and one H3 for each topic", () => {
    const markup = renderToStaticMarkup(<PsychrometricGuide />);

    expect(count(markup, /<h2(?:\s|>)/g)).toBe(1);
    expect(count(markup, /<h3(?:\s|>)/g)).toBe(8);
    expect(count(markup, /<h1(?:\s|>)/g)).toBe(0);
  });

  it("opens, switches, and closes one selected topic at a time", () => {
    const opened = nextGuideSelection(null, "how-to-use");
    const switched = nextGuideSelection(opened, "reading-chart");
    const closed = nextGuideSelection(switched, "reading-chart");

    expect(opened).toBe("how-to-use");
    expect(switched).toBe("reading-chart");
    expect(closed).toBeNull();
  });

  it("preserves the Duct Sizing Guide structure and closed initial state", () => {
    const markup = renderToStaticMarkup(<DuctSizingGuide />);

    expect(markup).toContain('id="duct-sizing-guide-title"');
    expect(markup).toContain('id="duct-sizing-guide-panel"');
    expect(markup).toContain('id="how-to-size-button"');
    expect(count(markup, /aria-expanded="false"/g)).toBe(8);
    expect(markup).toContain("Duct Sizing Guide");
    expect(markup).toContain("Equal Friction Method");
  });
});
