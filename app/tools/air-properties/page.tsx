import type { Metadata } from "next";
import Link from "next/link";

import { Header } from "@/components/Header";
import { ToolCardGrid } from "@/components/ToolsDirectory";
import type { HvacTool } from "@/data/tools";
import { createPageMetadata } from "@/lib/seo";

import styles from "./page.module.css";

export const metadata: Metadata = createPageMetadata({
  title: "Air Properties Tools | AnyHVAC",
  description:
    "Free HVAC air-properties tools for psychrometric calculations, humidity, temperature, enthalpy, and moist-air analysis.",
  path: "/tools/air-properties",
});

const PSYCHROMETRIC_CALCULATOR_TOOL: HvacTool = {
  id: "psychrometric-calculator",
  title: "Psychrometric Calculator",
  category: "Air Properties",
  description:
    "Interactive psychrometric chart and moist-air property calculations for temperature, humidity, enthalpy, and HVAC analysis.",
  status: "Available",
  href: "/tools/psychrometric-calculator",
  cta: "Open Calculator",
  icon: "psychrometric",
  showOnHomepage: false,
  showInDirectory: false,
};

const MIXED_AIR_CALCULATOR_TOOL: HvacTool = {
  id: "mixed-air-calculator",
  title: "Mixed Air Calculator",
  category: "Air Properties",
  description:
    "Combine outdoor and return air using dry-air mass flow, humidity ratio, enthalpy, and project pressure.",
  status: "Available",
  href: "/tools/mixed-air-calculator",
  cta: "Open Calculator",
  icon: "psychrometric",
  showOnHomepage: false,
  showInDirectory: false,
};

export default function AirPropertiesPage() {
  return (
    <main className={styles.categoryPage} id="top">
      <Header />

      <section className={`page-shell ${styles.intro}`} aria-labelledby="category-title">
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <ol>
            <li>
              <Link href="/tools">Tools</Link>
            </li>
            <li className={styles.separator} aria-hidden="true">
              /
            </li>
            <li aria-current="page">Air Properties</li>
          </ol>
        </nav>
        <p className={styles.eyebrow}>Air Properties</p>
        <h1 id="category-title">Air Properties Tools</h1>
        <p className={styles.description}>
          Choose the Psychrometric Calculator to describe one air state from
          dry-bulb temperature, a moisture input and atmospheric pressure. Use
          the chart to compare temperature, humidity ratio, enthalpy and the
          other properties of that same state.
        </p>
        <p className={styles.description}>
          Choose the Mixed Air Calculator when outdoor air and return air combine.
          Enter both states, their airflows and a common project pressure. The
          tool balances moisture and energy on a dry-air mass basis; simply
          averaging the two relative humidities does not describe the mixed state.
          Ideal mixing results do not establish ventilation compliance.
        </p>
      </section>

      <section className={`page-shell ${styles.library}`} aria-labelledby="available-tools">
        <div className={styles.sectionHeading}>
          <p>Available now</p>
          <h2 id="available-tools">Moist-air analysis</h2>
        </div>

        <ToolCardGrid tools={[PSYCHROMETRIC_CALCULATOR_TOOL, MIXED_AIR_CALCULATOR_TOOL]} />

      </section>
    </main>
  );
}
