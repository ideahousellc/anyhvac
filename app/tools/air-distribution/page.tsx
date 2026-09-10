import type { Metadata } from "next";
import Link from "next/link";

import { Header } from "@/components/Header";
import { AirDistributionTools } from "@/components/air-distribution/AirDistributionTools";
import { EngineeringNotice } from "@/components/EngineeringNotice";
import { createPageMetadata } from "@/lib/seo";
import {
  UnitsAndTerms,
  type UnitTerm,
} from "@/components/units-and-terms/UnitsAndTerms";

import styles from "./page.module.css";

export const metadata: Metadata = createPageMetadata({
  title: "Air Distribution Tools | AnyHVAC",
  description:
    "Practical calculators for airflow, velocity, air changes, friction rate, pressure, and duct-system design.",
  path: "/tools/air-distribution",
});

const AIR_DISTRIBUTION_TERMS: readonly UnitTerm[] = [
  {
    abbreviation: "CFM",
    name: "Cubic Feet per Minute",
    description: "Volumetric airflow rate.",
  },
  {
    abbreviation: "FPM",
    name: "Feet per Minute",
    description: "Air velocity.",
  },
  {
    abbreviation: "ACH",
    name: "Air Changes per Hour",
    description: "The number of times a space's air volume is replaced in one hour.",
  },
  {
    abbreviation: "ft²",
    name: "Square Feet",
    description: "Cross-sectional area, such as duct area.",
  },
  {
    abbreviation: "ft³",
    name: "Cubic Feet",
    description: "Volume, such as room volume.",
  },
  {
    abbreviation: "in. w.g.",
    name: "Inches of Water Gauge",
    description: "Pressure measurement commonly used in HVAC systems.",
  },
  {
    abbreviation: "in. w.g./100 ft",
    name: "Pressure Loss per 100 Feet of Duct",
    description: "Duct friction pressure loss expressed per 100 feet.",
  },
  {
    abbreviation: "SP",
    name: "Static Pressure",
    description: "Pressure exerted by air within an HVAC system.",
  },
  {
    abbreviation: "ASP",
    name: "Available Static Pressure",
    description: "Static pressure available to overcome distribution-system pressure losses.",
  },
  {
    abbreviation: "ESP",
    name: "External Static Pressure",
    description: "Static pressure external to the HVAC equipment used when evaluating the available pressure for the distribution system.",
  },
  {
    abbreviation: "TEL",
    name: "Total Effective Length",
    description: "Effective duct-system length used for friction-rate calculations, including the effect of fittings where applicable.",
  },
];

export default function AirDistributionToolsPage() {
  return (
    <main className={styles.familyPage} id="top">
      <Header />

      <section
        className={`page-shell ${styles.intro}`}
        aria-labelledby="family-title"
      >
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <ol>
            <li>
              <Link href="/tools">Tools</Link>
            </li>
            <li className={styles.separator} aria-hidden="true">
              /
            </li>
            <li aria-current="page">Air Distribution Tools</li>
          </ol>
        </nav>
        <p className={styles.eyebrow}>Air Distribution</p>
        <h1 id="family-title">Air Distribution Tools</h1>
        <p className={styles.description}>
          Practical calculators for airflow, velocity, air changes, friction
          rate, pressure, and duct-system design.
        </p>
      </section>

      <section
        className={`page-shell ${styles.workspaceSection}`}
        aria-label="Air distribution calculator workspace"
      >
        <AirDistributionTools />
      </section>

      <EngineeringNotice />

      <div className={`page-shell ${styles.termsSection}`}>
        <UnitsAndTerms terms={AIR_DISTRIBUTION_TERMS} />
      </div>
    </main>
  );
}
