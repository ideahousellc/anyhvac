import type { Metadata } from "next";
import Link from "next/link";

import { EngineeringNotice } from "@/components/EngineeringNotice";
import { Header } from "@/components/Header";
import { MixedAirCalculator } from "@/components/mixed-air/MixedAirCalculator";
import { MixedAirGuide } from "@/components/mixed-air/MixedAirGuide";
import { createPageMetadata } from "@/lib/seo";

import styles from "../psychrometric-calculator/page.module.css";

export const metadata: Metadata = createPageMetadata({
  title: "Mixed Air Calculator | HVAC Air Mixing | AnyHVAC",
  description: "Free HVAC mixed air calculator for combining outdoor air and return air using psychrometric properties, airflow, humidity, enthalpy, and atmospheric pressure.",
  path: "/tools/mixed-air-calculator",
});

export default function MixedAirCalculatorPage() {
  return (
    <main className={styles.toolPage} id="top">
      <Header />
      <section className={`page-shell ${styles.intro}`} aria-labelledby="tool-title">
        <nav className={styles.breadcrumb} aria-label="Breadcrumb"><ol><li><Link href="/tools">Tools</Link></li><li className={styles.separator} aria-hidden="true">/</li><li><Link href="/tools/air-properties">Air Properties</Link></li><li className={styles.separator} aria-hidden="true">/</li><li aria-current="page">Mixed Air Calculator</li></ol></nav>
        <p className={styles.eyebrow}>Air Properties Tool</p>
        <h1 id="tool-title">Mixed Air Calculator</h1>
        <p className={styles.description}>Combine outdoor air and return air on a dry-air mass basis to find the complete mixed-air condition.</p>
      </section>
      <section className={`page-shell ${styles.workspace}`} aria-label="Mixed air calculator workspace"><MixedAirCalculator /></section>
      <EngineeringNotice />
      <section className={`page-shell ${styles.guidance}`} aria-labelledby="using-tool">
        <div>
          <p className={styles.guidanceEyebrow}>Using the calculator</p>
          <h2 id="using-tool">Combine two air streams</h2>
          <p>
            Use this to estimate the entering air condition after outdoor air and
            return air mix, before heating or cooling. Define both states and
            airflows at a common project pressure. The calculation conserves
            humidity ratio and enthalpy on a dry-air mass basis; relative humidity
            is calculated from the mixed state, not directly averaged.
          </p>
          <p>
            For example, enter 500 CFM of outdoor air at 90°F and 50% RH, and
            1,500 CFM of return air at 75°F and 50% RH, with 0 ft elevation.
            Calculate the mixed state and inspect its dry bulb, humidity ratio
            and enthalpy. These are illustrative inputs, not ventilation rates
            or recommended operating conditions.
          </p>
          <p>
            This ideal, adiabatic mixing model does not calculate coil loads,
            leaving-air conditions or ventilation compliance. Current weather
            is an optional input convenience, not design weather. Incoming and
            mixed air properties use <a href="https://github.com/psychrometrics/psychrolib" target="_blank" rel="noreferrer">PsychroLib</a> through the existing engine.
          </p>
        </div>
        <nav className={styles.relatedLinks} aria-label="Related tool navigation"><Link href="/tools/psychrometric-calculator">Psychrometric Calculator</Link><Link href="/tools/air-properties">Air Properties Tools</Link></nav>
      </section>
      <div className={`page-shell ${styles.guideSection}`}><MixedAirGuide /></div>
    </main>
  );
}
