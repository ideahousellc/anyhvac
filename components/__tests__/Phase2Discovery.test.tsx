import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import AirPropertiesPage from "@/app/tools/air-properties/page";
import { HVAC_TOOLS } from "@/data/tools";
import { ToolsSection } from "../ToolsSection";
import { ToolsDirectory } from "../ToolsDirectory";
import { Footer } from "../Footer";
import { ModalProvider } from "../ModalProvider";
import { AirDistributionTools } from "../air-distribution/AirDistributionTools";
import { AirDistributionGuidance, type AirDistributionModule } from "../air-distribution/AirDistributionGuidance";

const render = (element: React.ReactNode) => renderToStaticMarkup(<ModalProvider>{element}</ModalProvider>);
const destinations = ["duct-calculator", "air-distribution", "psychrometric-calculator", "mixed-air-calculator"];

describe("Phase 2 tool discovery", () => {
  it.each([ToolsSection, ToolsDirectory, Footer])("exposes all four calculators directly without duplicate cards", (Component) => {
    const markup = render(<Component />);
    for (const path of destinations) {
      expect(markup.match(new RegExp(`href="/tools/${path}"`, "g"))).toHaveLength(1);
    }
    expect(markup).not.toContain("Coming Soon");
  });

  it("retains the hub in the catalog without presenting it as an extra calculator", () => {
    const hub = HVAC_TOOLS.find(tool => tool.id === "air-properties");
    expect(hub?.href).toBe("/tools/air-properties");
    expect(hub?.showInDirectory).toBe(false);
    expect(hub?.showOnHomepage).toBe(false);
    const markup = render(<AirPropertiesPage />);
    expect(markup).toContain("<caption>Choose by the question and inputs you have</caption>");
    for (const label of ["Use when", "Inputs", "Outputs", "Limits", "CFM", "L/s", "Saturation produces a warning"]) expect(markup).toContain(label);
    for (const path of destinations.slice(2)) expect(markup).toContain(`href="/tools/${path}"`);
  });

  it("links the footer to the measurement reference", () => {
    expect(render(<Footer />)).toContain('href="/resources/airflow-static-pressure-measurement"');
  });
});

describe("module-specific engineering guidance", () => {
  it.each([
    ["airflow", "1,200 CFM", "single centerline reading"],
    ["ach", "300 × 60 / 3,000 = 6 ACH", "not proof of complete air replacement"],
    ["friction", "0.50 × 100 / 250 = 0.20", "Measured TESP is not a design allowance"],
    ["system-pressure", "Path total = 0.24", "does not search a duct network"],
  ] as const)("shows the %s method and example before expandable details", (module, example, limitation) => {
    const markup = render(<AirDistributionGuidance module={module as AirDistributionModule} />);
    const visible = markup.split("<details>")[0];
    expect(visible).toContain(example);
    expect(markup).toContain(limitation);
    expect(visible).toContain("Illustrative arithmetic, not a verified reference value");
    expect(markup).toContain("<summary>Assumptions and interpretation</summary>");
    expect(markup).not.toContain("<details open");
    expect(markup).toContain('href="/resources/airflow-static-pressure-measurement"');
  });

  it("places guidance in the active module without changing calculator markup", () => {
    const markup = render(<AirDistributionTools />);
    expect(markup).toContain('id="airflow-guidance-title"');
    expect(markup).toContain('id="airflow-cfm"');
    const source = readFileSync("components/air-distribution/AirDistributionTools.tsx", "utf8");
    expect(source).toContain('<AirDistributionGuidance key={activeModule} module={activeModule} />');
  });
});
