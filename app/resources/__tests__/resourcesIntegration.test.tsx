import { readFileSync } from "node:fs";
import path from "node:path";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import sitemap from "@/app/sitemap";
import ResourcesPage, { metadata as resourcesMetadata } from "@/app/resources/page";
import DuctDesignQuickReferencePage, {
  metadata as referenceMetadata,
} from "@/app/resources/duct-design-quick-reference/page";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { ModalProvider } from "@/components/ModalProvider";

const render = (page: React.ReactNode) =>
  renderToStaticMarkup(<ModalProvider>{page}</ModalProvider>);

describe("public resource pages", () => {
  it("lists one available reference and three unlinked future references", () => {
    const markup = render(<ResourcesPage />);
    expect(markup).toContain("HVAC Design Resources");
    expect(markup).toContain("Duct Design Quick Reference");
    expect(markup).toContain("PDF · 2 pages");
    expect(markup).toContain('href="/resources/duct-design-quick-reference"');
    expect(markup).not.toContain("anyhvac-duct-design-quick-reference.pdf");
    expect((markup.match(/Coming Soon/g) ?? []).length).toBe(3);
    expect((markup.match(/Design Reference #0[1-4]/g) ?? []).length).toBe(4);
    expect((markup.match(/<h1(?:\s|>)/g) ?? []).length).toBe(1);
  });

  it("offers a direct, identifiable PDF download and the duct calculator", () => {
    const markup = render(<DuctDesignQuickReferencePage />);
    expect(markup).toContain('href="/resources/anyhvac-duct-design-quick-reference.pdf"');
    expect(markup).toContain('download="anyhvac-duct-design-quick-reference.pdf"');
    expect(markup).toContain('data-resource-download="duct-design-quick-reference"');
    expect((markup.match(/href="\/tools\/duct-calculator"/g) ?? []).length).toBe(2);
    expect(markup).toContain("No signup required");
    expect(markup).toContain("Engineering Notice");
    expect((markup.match(/<h1(?:\s|>)/g) ?? []).length).toBe(1);
  });

  it("uses the existing public navigation and preserves the footer's future link area", () => {
    const markup = render(<><Header /><Footer /></>);
    expect((markup.match(/href="\/resources"/g) ?? []).length).toBe(2);
    expect(markup).toContain('href="/resources/duct-design-quick-reference"');
    expect(markup).toContain("Codes &amp; Standards");
    expect(markup).toContain('href="/tools"');
  });

  it("sets indexable metadata and lists only the HTML pages in the sitemap", () => {
    expect(resourcesMetadata.title).toBe("HVAC Design Resources & Quick References | AnyHVAC");
    expect(referenceMetadata.title).toBe("Duct Design Quick Reference | AnyHVAC");
    expect(referenceMetadata.alternates?.canonical).toBe(
      "https://www.anyhvac.net/resources/duct-design-quick-reference",
    );
    expect(referenceMetadata.robots).toBeUndefined();
    const urls = sitemap().map((entry) => entry.url);
    expect(urls).toContain("https://www.anyhvac.net/resources");
    expect(urls).toContain("https://www.anyhvac.net/resources/duct-design-quick-reference");
    expect(urls).not.toContain("https://www.anyhvac.net/resources/anyhvac-duct-design-quick-reference.pdf");
  });

  it("has a real two-page PDF at the download path", () => {
    const file = readFileSync(path.join(
      process.cwd(), "public/resources/anyhvac-duct-design-quick-reference.pdf",
    ));
    const content = file.toString("latin1");
    expect(content.startsWith("%PDF-")).toBe(true);
    expect((content.match(/\/Type\s*\/Page\b/g) ?? []).length).toBe(2);
  });
});
