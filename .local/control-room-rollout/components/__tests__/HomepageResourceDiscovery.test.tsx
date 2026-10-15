import { readFileSync } from "node:fs";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import Home from "@/app/page";
import { ModalProvider } from "@/components/ModalProvider";

const markup = renderToStaticMarkup(
  <ModalProvider>
    <Home />
  </ModalProvider>,
);

describe("homepage resource discovery", () => {
  it("features the existing duct design reference with accurate access details", () => {
    expect(markup).toContain("Resources");
    expect(markup).toContain("Design Reference #01");
    expect(markup).toContain("Duct Design Quick Reference");
    expect(markup).toContain("Free");
    expect(markup).toContain("2-page reference");
    expect(markup).toContain("No signup required");
  });

  it("links to the reference and the complete resource library without forcing a download", () => {
    expect(markup).toContain(
      'href="/resources/duct-design-quick-reference"',
    );
    expect(markup).toContain("View Quick Reference");
    expect(markup).toContain('href="/resources"');
    expect(markup).toContain("View all resources");
    expect(markup).not.toContain("anyhvac-duct-design-quick-reference.pdf");
    expect(markup).not.toContain("download=");
  });

  it("preserves Tools discovery and a clean semantic heading hierarchy", () => {
    expect(markup).toContain('id="tools"');
    expect(markup).toContain("Tools built for real HVAC work.");
    expect((markup.match(/<h1(?:\s|>)/g) ?? []).length).toBe(1);
    expect((markup.match(/<h2(?:\s|>)/g) ?? []).length).toBe(2);
    expect((markup.match(/<h3(?:\s|>)/g) ?? []).length).toBeGreaterThan(0);
  });

  it("includes compact responsive safeguards and usable CTA targets", () => {
    const css = readFileSync(
      "components/FeaturedResourceSection.module.css",
      "utf8",
    );

    expect(css).toMatch(/grid-template-columns:\s*minmax\(0, 1fr\) auto/);
    expect(css).toMatch(/@media \(max-width: 760px\)/);
    expect(css).toMatch(/@media \(max-width: 520px\)/);
    expect(css).toMatch(/min-height:\s*46px/);
    expect(css).toMatch(/min-width:\s*0/);
  });
});
