import type { Metadata } from "next";
import Link from "next/link";

import { EngineeringNotice } from "@/components/EngineeringNotice";
import { Header } from "@/components/Header";
import { PsychrometricCalculator } from "@/components/psychrometrics/PsychrometricCalculator";
import { createPageMetadata } from "@/lib/seo";

import styles from "./page.module.css";

export const metadata: Metadata = createPageMetadata({
  title: "Psychrometric Calculator | AnyHVAC",
  description:
    "Free interactive psychrometric calculator and chart for dry bulb, wet bulb, relative humidity, dew point, humidity ratio, enthalpy, specific volume, and atmospheric pressure.",
  path: "/tools/psychrometric-calculator",
});

export default function PsychrometricCalculatorPage() {
  return (
    <main className={styles.toolPage} id="top">
      <Header />

      <section className={`page-shell ${styles.intro}`} aria-labelledby="tool-title">
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <ol>
            <li>
              <Link href="/tools">Tools</Link>
            </li>
            <li className={styles.separator} aria-hidden="true">
              /
            </li>
            <li>
              <Link href="/tools/air-properties">Air Properties</Link>
            </li>
            <li className={styles.separator} aria-hidden="true">
              /
            </li>
            <li aria-current="page">Psychrometric Calculator</li>
          </ol>
        </nav>
        <p className={styles.eyebrow}>Air Properties Tool</p>
        <h1 id="tool-title">Psychrometric Calculator</h1>
        <p className={styles.description}>
          Interactive psychrometric chart and moist-air property calculator for
          HVAC design and analysis.
        </p>
      </section>

      <section
        className={`page-shell ${styles.workspace}`}
        aria-label="Psychrometric calculator workspace"
      >
        <PsychrometricCalculator />
      </section>

      <EngineeringNotice />

      <section className={`page-shell ${styles.guidance}`} aria-labelledby="using-tool">
        <div>
          <p className={styles.guidanceEyebrow}>Using the calculator</p>
          <h2 id="using-tool">Define or select one air state</h2>
          <p>
            Enter dry-bulb temperature with relative humidity, wet bulb, or dew
            point. Set elevation or atmospheric pressure, or select a valid point
            directly on the chart. Calculated properties and the chart marker stay
            synchronized.
          </p>
        </div>
        <nav className={styles.relatedLinks} aria-label="Related tool navigation">
          <Link href="/tools/air-properties">Air Properties Tools</Link>
          <Link href="/tools">All HVAC Tools</Link>
        </nav>
      </section>
    </main>
  );
}
