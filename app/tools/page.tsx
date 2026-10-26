import type { Metadata } from "next";
import Link from "next/link";

import { AdPlaceholder } from "@/components/AdPlaceholder";
import { Header } from "@/components/Header";
import { ToolsDirectory } from "@/components/ToolsDirectory";
import { createPageMetadata } from "@/lib/seo";

import styles from "./page.module.css";

export const metadata: Metadata = createPageMetadata({
  title: "HVAC Calculators & Tools | AnyHVAC",
  description:
    "Free, practical tools for HVAC professionals, engineers, designers, technicians, and students.",
  path: "/tools",
});

const toolGuidance = [
  {
    title: "Compare duct sizes",
    description:
      "Use the Duct Calculator when airflow and a design friction rate are known. Compare round and rectangular options, then check velocity, fittings and project requirements before selecting a size.",
    href: "/tools/duct-calculator",
    linkLabel: "Open Duct Calculator",
  },
  {
    title: "Check airflow and pressure inputs",
    description:
      "Choose Air Distribution to relate airflow, velocity and area, calculate nominal air changes, or work through a design pressure budget. Establish the friction rate here before using it to size ducts; measured TESP is not a design pressure allowance.",
    href: "/tools/air-distribution",
    linkLabel: "Open Air Distribution Tools",
  },
  {
    title: "Describe air or combine streams",
    description:
      "Choose the Psychrometric Calculator for one moist-air state. Use the Mixed Air Calculator for outdoor and return air together, with flow inputs and a common project pressure. Air Properties links to both tools.",
    href: "/tools/air-properties",
    linkLabel: "Explore Air Properties",
  },
];

export default function ToolsPage() {
  return (
    <main className={styles.toolsPage} id="top">
      <Header />

      <section className={`page-shell ${styles.intro}`}>
        <p className={styles.eyebrow}>HVAC Tools</p>
        <h1>HVAC Calculators &amp; Tools</h1>
        <p className={styles.lead}>
          Free, practical tools for HVAC professionals, engineers, designers,
          technicians, and students.
        </p>
        <p className={styles.secondary}>
          Choose a tool below to get started. No account or sign-up required.
        </p>
      </section>

      <ToolsDirectory />

      <AdPlaceholder />

      <section className={`page-shell ${styles.support}`}>
        <div className={styles.supportHeading}>
          <h2>Choose the tool for your engineering question.</h2>
          <p>
            Start with the quantities you know and the result you need. All tools
            are free to use without an account; results still need to be checked
            against the conditions and requirements of your project.
          </p>
        </div>
        <div className={styles.benefits}>
          {toolGuidance.map((guide) => (
            <article className={styles.benefit} key={guide.title}>
              <span className={styles.benefitIcon} aria-hidden="true">
                ✓
              </span>
              <h3>{guide.title}</h3>
              <p>{guide.description}</p>
              <p><Link href={guide.href}>{guide.linkLabel}</Link></p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
