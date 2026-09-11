import { existsSync } from "node:fs";
import path from "node:path";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import sitemap from "../../sitemap";
import { ModalProvider } from "../../../components/ModalProvider";
import AirPropertiesPage, {
  metadata as airPropertiesMetadata,
} from "../air-properties/page";
import PsychrometricCalculatorPage, {
  metadata as psychrometricMetadata,
} from "../psychrometric-calculator/page";
import ToolsPage from "../page";

const render = (page: React.ReactNode) =>
  renderToStaticMarkup(<ModalProvider>{page}</ModalProvider>);
const h1Count = (markup: string) => (markup.match(/<h1(?:\s|>)/g) ?? []).length;

describe("psychrometric production integration", () => {
  it("links the tools library to the active Air Properties category", () => {
    const markup = render(<ToolsPage />);
    expect(markup).toContain('href="/tools/air-properties"');
    expect(markup).toContain("Explore Tools");
  });

  it("renders the Air Properties category with exactly one H1", () => {
    const markup = render(<AirPropertiesPage />);
    expect(markup).toContain("Air Properties Tools");
    expect(h1Count(markup)).toBe(1);
  });

  it("links Air Properties to the production calculator", () => {
    expect(render(<AirPropertiesPage />)).toContain(
      'href="/tools/psychrometric-calculator"',
    );
  });

  it("renders the production calculator with exactly one H1", () => {
    const markup = render(<PsychrometricCalculatorPage />);
    expect(markup).toContain("Psychrometric Calculator");
    expect(h1Count(markup)).toBe(1);
  });

  it("reuses the calculator defaults, chart, selected state, and interaction", () => {
    const markup = render(<PsychrometricCalculatorPage />);
    expect(markup).toContain('value="75"');
    expect(markup).toContain('value="50"');
    expect(markup).toContain('value="0"');
    expect(markup).toContain('data-selected-state="true"');
    expect(markup).toContain('data-chart-interaction-surface="true"');
    expect(markup).not.toMatch(/(?:NaN|[-+]?Infinity)/);
  });

  it("uses the approved Engineering Notice", () => {
    const markup = render(<PsychrometricCalculatorPage />);
    expect(markup).toContain(
      "Results should be independently verified before use in final design, construction, equipment selection, permitting, or other safety-critical applications.",
    );
  });

  it("provides production breadcrumbs and return links", () => {
    const markup = render(<PsychrometricCalculatorPage />);
    expect(markup).toContain('href="/tools/air-properties"');
    expect(markup).toContain('href="/tools"');
  });

  it("sets Air Properties metadata and canonical URL", () => {
    expect(airPropertiesMetadata.title).toBe("Air Properties Tools | AnyHVAC");
    expect(airPropertiesMetadata.alternates?.canonical).toBe(
      "https://www.anyhvac.net/tools/air-properties",
    );
  });

  it("sets psychrometric metadata and canonical URL", () => {
    expect(psychrometricMetadata.title).toBe(
      "Psychrometric Calculator | AnyHVAC",
    );
    expect(psychrometricMetadata.alternates?.canonical).toBe(
      "https://www.anyhvac.net/tools/psychrometric-calculator",
    );
  });

  it("includes both production routes and excludes the development route", () => {
    const urls = sitemap().map((entry) => entry.url);
    expect(urls).toContain("https://www.anyhvac.net/tools/air-properties");
    expect(urls).toContain(
      "https://www.anyhvac.net/tools/psychrometric-calculator",
    );
    expect(urls).not.toContain(
      "https://www.anyhvac.net/dev/psychrometric-chart",
    );
  });

  it("removes the duplicate development page", () => {
    expect(
      existsSync(
        path.join(process.cwd(), "app/dev/psychrometric-chart/page.tsx"),
      ),
    ).toBe(false);
  });
});
