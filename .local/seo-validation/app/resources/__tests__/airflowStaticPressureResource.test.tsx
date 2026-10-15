import { readFileSync } from "node:fs";
import path from "node:path";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import AirflowStaticPressureMeasurementPage, {
  metadata,
} from "@/app/resources/airflow-static-pressure-measurement/page";
import ResourcesPage from "@/app/resources/page";
import sitemap from "@/app/sitemap";
import { ModalProvider } from "@/components/ModalProvider";

const render = (page: React.ReactNode) =>
  renderToStaticMarkup(<ModalProvider>{page}</ModalProvider>);

describe("airflow and static pressure measurement resource", () => {
  const markup = render(<AirflowStaticPressureMeasurementPage />);

  it("renders the canonical resource with one H1 and Design Reference #02 identity", () => {
    expect(markup).toContain("HVAC Airflow &amp; Static Pressure Measurement Quick Reference");
    expect(markup).toContain("AnyHVAC Design Reference #02");
    expect((markup.match(/<h1(?:\s|>)/g) ?? []).length).toBe(1);
    expect((markup.match(/<h2(?:\s|>)/g) ?? []).length).toBeGreaterThan(8);
  });

  it("offers the free two-page PDF without signup", () => {
    expect(markup).toContain('href="/resources/anyhvac-airflow-static-pressure-measurement-quick-reference.pdf"');
    expect(markup).toContain('download="anyhvac-airflow-static-pressure-measurement-quick-reference.pdf"');
    expect(markup).toContain('data-resource-download="airflow-static-pressure-measurement"');
    expect(markup).toContain("2 pages · US Letter · No signup required");
  });

  it("links only to real related tools and the engineering disclaimer", () => {
    expect(markup).toContain('href="/tools/air-distribution"');
    expect(markup).toContain('href="/tools/duct-calculator"');
    expect(markup).toContain('href="/tools/psychrometric-calculator"');
    expect(markup).toContain('href="/engineering-disclaimer"');
  });

  it("preserves the central TESP and available-static technical warnings", () => {
    expect(markup).toContain("TESP is not airflow");
    expect(markup).toContain("Measured TESP is not design available static pressure");
    expect(markup).toContain("do not automatically derive friction rate");
    expect((markup.match(/Illustrative example/g) ?? []).length).toBe(2);
    expect(markup).toContain("Conceptual only");
    expect(markup).toContain("not automatically certified TAB results");
  });

  it("contains no affiliate or product-roundup content", () => {
    expect(markup).not.toMatch(/Amazon|affiliate link|buy now|best manometer|sponsored/i);
    expect(markup).not.toContain("Product card");
  });

  it("is connected from the resource index", () => {
    const indexMarkup = render(<ResourcesPage />);
    expect(indexMarkup).toContain('href="/resources/airflow-static-pressure-measurement"');
    expect(indexMarkup).toContain("Design Reference #02");
    expect((indexMarkup.match(/Coming Soon/g) ?? []).length).toBe(2);
  });

  it("sets canonical metadata and appears in the sitemap", () => {
    expect(metadata.title).toBe("HVAC Airflow & Static Pressure Measurement Guide | AnyHVAC");
    expect(metadata.description).toBe("Learn how HVAC static pressure, TESP, velocity, duct area, traverses, and flow-hood measurements connect to CFM and duct calculations.");
    expect(metadata.alternates?.canonical).toBe("https://www.anyhvac.net/resources/airflow-static-pressure-measurement");
    expect(sitemap().map((entry) => entry.url)).toContain("https://www.anyhvac.net/resources/airflow-static-pressure-measurement");
  });

  it("has a real two-page PDF at the public download path", () => {
    const file = readFileSync(path.join(
      process.cwd(),
      "public/resources/anyhvac-airflow-static-pressure-measurement-quick-reference.pdf",
    ));
    const content = file.toString("latin1");
    expect(content.startsWith("%PDF-")).toBe(true);
    expect((content.match(/\/Type\s*\/Page\b/g) ?? []).length).toBe(2);
  });

  it("includes mobile and table-overflow safeguards", () => {
    const css = readFileSync(
      "app/resources/airflow-static-pressure-measurement/page.module.css",
      "utf8",
    );
    expect(css).toMatch(/overflow-x:\s*auto/);
    expect(css).toMatch(/@media \(max-width: 720px\)/);
    expect(css).toMatch(/@media \(max-width: 520px\)/);
    expect(css).toMatch(/min-height:\s*46px/);
  });
});
