import { readFileSync } from "node:fs";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import Home from "@/app/page";
import NotFound, { metadata } from "@/app/not-found";
import ToolsPage from "@/app/tools/page";
import DuctCalculatorPage from "@/app/tools/duct-calculator/page";
import { AdPlaceholder } from "@/components/AdPlaceholder";
import { Header } from "@/components/Header";
import { ModalProvider } from "@/components/ModalProvider";

const render = (page: React.ReactNode) =>
  renderToStaticMarkup(<ModalProvider>{page}</ModalProvider>);

describe("launch polish batch 1", () => {
  it("removes Search while preserving public navigation and theme control", () => {
    const markup = render(<Header />);
    expect(markup).not.toMatch(/search/i);
    expect(markup).toContain('aria-label="AnyHVAC home"');
    expect(markup).toContain('aria-label="Primary navigation"');
    for (const href of ["/", "/tools", "/resources", "/about", "/contact"]) {
      expect(markup).toContain(`href="${href}"`);
    }
    expect(markup).toContain('aria-label="Support AnyHVAC"');
    expect(markup).toContain('aria-label="Switch to dark mode"');
    const css = readFileSync("app/globals.css", "utf8");
    expect(css).not.toMatch(/\.icon-button:first-child\s*\{[^}]*display:\s*none/);
  });

  it("renders a branded 404 with one heading and named recovery links", () => {
    // Also works on standalone routes that do not mount the public modal provider.
    const markup = renderToStaticMarkup(<NotFound />);
    expect(markup).toContain("AnyHVAC · 404");
    expect(markup).toContain("<h1>Page not found.</h1>");
    expect(markup.match(/<h1[ >]/g)).toHaveLength(1);
    const navigation = markup.match(/<nav aria-label="Page recovery"[\s\S]*?<\/nav>/)?.[0];
    expect(navigation).toBeDefined();
    for (const [href, label] of [["/", "Home"], ["/tools", "Tools"], ["/resources", "Resources"], ["/contact", "Contact"]]) {
      expect(navigation).toContain(`<a href="${href}">${label}</a>`);
    }
  });

  it("declares noindex and overrides inherited homepage metadata", () => {
    expect(metadata.robots).toEqual({ index: false, follow: true });
    expect(metadata.title).toBe("Page Not Found | AnyHVAC");
    expect(metadata.description).toContain("This page could not be found.");
    expect(metadata.alternates).toBeNull();
    expect(metadata.openGraph).toBeNull();
    expect(metadata.twitter).toBeNull();
  });

  it("keeps inactive advertising entirely out of the rendered markup", () => {
    expect(renderToStaticMarkup(<AdPlaceholder />)).toBe("");
  });

  it.each([
    ["home", Home, ["HVAC tools.", 'id="tools"']],
    ["tools", ToolsPage, ["Explore Tools", "Built for everyday HVAC work."]],
    ["duct calculator", DuctCalculatorPage, ['aria-label="HVAC duct calculator workspace"', "Engineering Notice", "How to Use the HVAC Duct Calculator"]],
  ])("preserves surrounding %s content without ad scaffolding or wrappers", (_name, Page, content) => {
    const markup = render(<Page />);
    expect(markup).not.toMatch(/Advertisement|ad-placeholder|ad-section|adWrap/);
    for (const text of content) expect(markup).toContain(text);
  });
});
