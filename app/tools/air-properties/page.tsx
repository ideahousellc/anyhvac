import type { Metadata } from "next";
import Link from "next/link";

import { Header } from "@/components/Header";
import { ToolCardGrid } from "@/components/ToolsDirectory";
import { HVAC_TOOLS } from "@/data/tools";
import { createPageMetadata } from "@/lib/seo";

import styles from "./page.module.css";

export const metadata: Metadata = createPageMetadata({
  title: "Air Properties Tools | AnyHVAC",
  description:
    "Free HVAC air-properties tools for psychrometric calculations, humidity, temperature, enthalpy, and moist-air analysis.",
  path: "/tools/air-properties",
});

const airPropertyTools = HVAC_TOOLS.filter((tool) =>
  tool.category === "Air Properties" && tool.showInDirectory && tool.status === "Available",
);

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

        <ToolCardGrid tools={airPropertyTools} />
        <div className={styles.comparison}>
          <table>
            <caption>Choose by the question and inputs you have</caption>
            <thead><tr><th scope="col">Compare</th><th scope="col">Psychrometric Calculator</th><th scope="col">Mixed Air Calculator</th></tr></thead>
            <tbody>
              <tr><th scope="row">Use when</th><td>You need to describe one air state or explore it on a chart.</td><td>You need the ideal combined state of outdoor and return air before conditioning.</td></tr>
              <tr><th scope="row">Inputs</th><td>Dry bulb plus RH, wet bulb, or dew point; elevation or absolute atmospheric pressure. IP and SI supported.</td><td>Airflow, dry bulb, and RH for each stream; one common elevation or absolute pressure. IP airflow is CFM; SI is L/s. Current weather is optional, not design weather.</td></tr>
              <tr><th scope="row">Outputs</th><td>Wet bulb, dew point, RH, humidity ratio, enthalpy, specific volume, and related properties, with a chart marker.</td><td>Mixed-air properties, total entered airflow, and volumetric OA/RA percentages. Moisture and energy are balanced by dry-air mass.</td></tr>
              <tr><th scope="row">Limits</th><td>One state, not a coil-load or leaving-air calculation. Elevation gives standard-atmosphere pressure, not a local observation.</td><td>Ideal adiabatic mixing at common pressure. Saturation produces a warning; condensate, coil loads, incomplete mixing, and ventilation compliance are not calculated.</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
