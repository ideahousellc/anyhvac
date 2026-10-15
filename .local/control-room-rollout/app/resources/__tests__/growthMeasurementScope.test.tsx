import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import DuctDesignQuickReferencePage from "@/app/resources/duct-design-quick-reference/page";
import { metadata as ductMetadata } from "@/app/tools/duct-calculator/page";
import { ModalProvider } from "@/components/ModalProvider";

describe("measurement-only growth preparation", () => {
  it("marks both existing calculator links while leaving the content experiment unlaunched", () => {
    const markup = renderToStaticMarkup(
      <ModalProvider><DuctDesignQuickReferencePage /></ModalProvider>,
    );
    expect(markup).toContain('data-growth-calculator="duct-reference-top"');
    expect(markup).toContain('data-growth-calculator="duct-reference-contextual"');
    expect((markup.match(/href="\/tools\/duct-calculator"/g) ?? []).length).toBe(2);
    expect(markup).toContain("Need an exact duct size instead of a quick reference?");
    expect(markup).toContain("Download Free PDF");
    expect(markup).toContain("No signup required");
    expect(markup).not.toContain("Get free tool updates");
    expect(markup).not.toContain("Use your airflow and design friction rate to explore");
  });

  it("keeps the approved SEO title test unlaunched across page and share metadata", () => {
    expect(ductMetadata.title).toBe("HVAC Duct Calculator | AnyHVAC");
    expect(ductMetadata.openGraph?.title).toBe("HVAC Duct Calculator | AnyHVAC");
    expect(ductMetadata.twitter?.title).toBe("HVAC Duct Calculator | AnyHVAC");
  });
});
