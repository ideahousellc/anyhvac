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

const futureTools = [
  "Dew Point Calculator",
  "Humidity Ratio / RH Converter",
  "Air Density Calculator",
] as const;

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
          Practical moist-air and psychrometric calculation tools for HVAC design
          and analysis.
        </p>
      </section>

      <section className={`page-shell ${styles.library}`} aria-labelledby="available-tools">
        <div className={styles.sectionHeading}>
          <p>Available now</p>
          <h2 id="available-tools">Moist-air analysis</h2>
        </div>

        <ToolCardGrid tools={[PSYCHROMETRIC_CALCULATOR_TOOL]} />

        <div className={styles.futureSection}>
          <div>
            <p className={styles.futureEyebrow}>Planned library</p>
            <h2>More focused air-property tools</h2>
          </div>
          <div className={styles.futureGrid}>
            {futureTools.map((tool) => (
              <article className={styles.futureCard} key={tool}>
                <span>Coming Soon</span>
                <h3>{tool}</h3>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
