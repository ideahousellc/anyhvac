import type { Metadata } from "next";
import Link from "next/link";

import { AdPlaceholder } from "@/components/AdPlaceholder";
import { DuctCalculator } from "@/components/duct-calculator/DuctCalculator";
import { DuctSizingGuide } from "@/components/duct-calculator/DuctSizingGuide";
import { EngineeringNotice } from "@/components/EngineeringNotice";
import { Header } from "@/components/Header";
import { ToolPageIntro } from "@/components/ToolPageIntro";
import { createPageMetadata } from "@/lib/seo";

import styles from "./page.module.css";

export const metadata: Metadata = createPageMetadata({
  title: "HVAC Duct Calculator | AnyHVAC",
  description:
    "Free HVAC duct sizing Ductulator for round and rectangular ducts. Compare duct size, air velocity and friction rate from airflow.",
  path: "/tools/duct-calculator",
});

const calculatorOutputs = [
  "Round duct diameter",
  "Suggested nominal duct size",
  "Air velocity",
  "Friction rate",
  "Equivalent rectangular duct dimensions",
];

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <path
        d="M5 12h14M13 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function DuctCalculatorPage() {
  return (
    <main className={styles.toolPage} id="top">
      <Header />

      <ToolPageIntro
        eyebrow="HVAC Design Tool"
        title="HVAC Duct Calculator"
        description="Use this free online ductulator to size round and rectangular HVAC ducts from airflow and friction rate, then compare nominal sizes and air velocity."
        status="Equal Friction Method"
      />

      <section
        className={`page-shell ${styles.workspaceSection}`}
        aria-label="HVAC duct calculator workspace"
      >
        <div className={styles.workspace}>
          <DuctCalculator />
        </div>
      </section>

      <EngineeringNotice />

      <AdPlaceholder />

      <section className={`page-shell ${styles.content}`} aria-label="Calculator guide">
        <div className={styles.contentBlock}>
          <h2>How to Use the HVAC Duct Calculator</h2>
          <p>
            Enter airflow and friction rate to determine an equivalent round duct
            size, velocity, and practical rectangular duct options.
          </p>
          <p>
            Use this when required airflow and a design friction rate have been
            established and you need to compare duct geometry. A calculated size
            is a starting point; it does not include all fitting and equipment
            losses or establish acceptable noise levels.
          </p>
        </div>

        <div className={styles.contentBlock}>
          <h2>Practical duct-sizing example</h2>
          <p>
            For illustrative inputs of 5,000 CFM and 0.10 in. w.g./100 ft, the
            calculator gives a round diameter of about 25.6 inches. Comparing a
            26-inch nominal round size gives about 1,356 FPM and 0.092 in.
            w.g./100 ft. The nominal size changes both reported quantities;
            these values are not recommended design targets.
          </p>
          <p>
            The detailed guide below explains the equal-friction approach and
            rectangular comparisons. For the broader design method and its
            limitations, see the{" "}
            <Link href="/resources/duct-design-quick-reference">Duct Design Quick Reference</Link>.
          </p>
        </div>

        <div className={styles.contentBlock}>
          <h2>What This Calculator Provides</h2>
          <ul className={styles.featureGrid}>
            {calculatorOutputs.map((output) => (
              <li key={output}>
                <span className={styles.check} aria-hidden="true">
                  ✓
                </span>
                <span>{output}</span>
              </li>
            ))}
          </ul>
        </div>

        <DuctSizingGuide />

        <div className={styles.footerAction}>
          <Link className={styles.backLink} href="/tools">
            View All HVAC Tools
            <ArrowIcon />
          </Link>
        </div>
      </section>
    </main>
  );
}
