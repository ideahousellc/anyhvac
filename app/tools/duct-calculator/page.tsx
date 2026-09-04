import type { Metadata } from "next";
import Link from "next/link";

import { AdPlaceholder } from "@/components/AdPlaceholder";
import { Header } from "@/components/Header";
import { ToolPageIntro } from "@/components/ToolPageIntro";

import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "HVAC Duct Calculator | AnyHVAC",
  description:
    "Interactive duct sizing tool for airflow, friction rate, velocity, round duct, and rectangular duct design.",
};

const calculatorOutputs = [
  "Round duct diameter",
  "Suggested nominal duct size",
  "Air velocity",
  "Friction rate",
  "Equivalent rectangular duct dimensions",
];

function WorkspaceIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32" fill="none">
      <path
        d="M5 10h15v12H5zM20 13h7v6h-7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M9 10V7m7 3V7M9 25v-3m7 3v-3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

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
        description="Interactive duct sizing tool for airflow, friction rate, velocity, round duct, and rectangular duct design."
        status="Equal Friction Method"
      />

      <section
        className={`page-shell ${styles.workspaceSection}`}
        aria-labelledby="calculator-workspace-title"
      >
        <div className={styles.workspace}>
          <span className={styles.workspaceIcon}>
            <WorkspaceIcon />
          </span>
          <h2 id="calculator-workspace-title">HVAC Duct Calculator</h2>
          <p>Calculator interface will be inserted here.</p>
        </div>
      </section>

      <div className={styles.adWrap}>
        <AdPlaceholder />
      </div>

      <section className={`page-shell ${styles.content}`} aria-label="Calculator guide">
        <div className={styles.contentBlock}>
          <h2>How to Use the HVAC Duct Calculator</h2>
          <p>
            Enter airflow and friction rate to determine an equivalent round duct
            size, velocity, and practical rectangular duct options.
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

        <div className={styles.contentBlock}>
          <h2>Equal Friction Method</h2>
          <p>
            The equal friction method sizes ductwork around a consistent friction
            rate while maintaining the airflow required by the system.
          </p>
        </div>

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
