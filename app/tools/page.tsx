import type { Metadata } from "next";

import { AdPlaceholder } from "@/components/AdPlaceholder";
import { Header } from "@/components/Header";
import { ToolsDirectory } from "@/components/ToolsDirectory";

import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "HVAC Calculators & Tools | AnyHVAC",
  description:
    "Free, practical tools for HVAC professionals, engineers, designers, technicians, and students.",
};

const benefits = [
  { title: "Free to Use", description: "No account required." },
  {
    title: "Practical",
    description: "Focused on everyday HVAC calculations.",
  },
  {
    title: "Growing Library",
    description: "More HVAC tools are on the way.",
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

      <div className={styles.adWrap}>
        <AdPlaceholder />
      </div>

      <section className={`page-shell ${styles.support}`}>
        <div className={styles.supportHeading}>
          <h2>Built for everyday HVAC work.</h2>
          <p>
            AnyHVAC brings practical HVAC calculations together in one simple,
            free toolbox. More tools will be added as the library grows.
          </p>
        </div>
        <div className={styles.benefits}>
          {benefits.map((benefit) => (
            <article className={styles.benefit} key={benefit.title}>
              <span className={styles.benefitIcon} aria-hidden="true">
                ✓
              </span>
              <h3>{benefit.title}</h3>
              <p>{benefit.description}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
