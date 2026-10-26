import type { Metadata } from "next";
import Link from "next/link";

import { ContentPage } from "@/components/ContentPage";
import { createPageMetadata } from "@/lib/seo";

import styles from "./resources.module.css";

export const metadata: Metadata = createPageMetadata({
  title: "HVAC Design Resources & Quick References | AnyHVAC",
  description:
    "Free HVAC design references, quick-reference sheets, and practical resources for HVAC professionals and designers.",
  path: "/resources",
});

export default function ResourcesPage() {
  return (
    <ContentPage
      eyebrow="AnyHVAC Resources"
      title="HVAC Design Resources"
      intro="Practical references for HVAC professionals and designers."
    >
      <p className={styles.secondary}>
        Choose the duct design reference for sizing relationships and design
        checks. Choose the measurement reference when you need to interpret
        field readings before using them in a calculation. Both include a free
        two-page PDF with no signup required.
      </p>

      <section className={styles.library} aria-label="Resource library">
        <article className={`${styles.card} ${styles.available}`}>
          <div className={styles.cardTop}>
            <p className={styles.eyebrow}>Design Reference #01</p>
            <span className={styles.badge}>Free</span>
          </div>
          <h2>Duct Design Quick Reference</h2>
          <p>
            A two-page HVAC duct design reference covering airflow, velocity,
            duct area, friction rate, pressure relationships, rectangular duct
            fundamentals, conversions, and design checks.
          </p>
          <p>
            Use this to check units and relationships while reviewing a design.
            When you need to compare duct sizes for your own airflow and friction
            rate, use the <Link href="/tools/duct-calculator">Duct Calculator</Link>.
          </p>
          <div className={styles.cardBottom}>
            <span className={styles.descriptor}>PDF · 2 pages</span>
            <Link className={styles.cardLink} href="/resources/duct-design-quick-reference">
              View Reference <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </article>

        <article className={`${styles.card} ${styles.available}`}>
          <div className={styles.cardTop}>
            <p className={styles.eyebrow}>Design Reference #02</p>
            <span className={styles.badge}>Free</span>
          </div>
          <h2>HVAC Airflow &amp; Static Pressure Measurement Quick Reference</h2>
          <p>
            A two-page field and design reference covering pressure terminology,
            TESP, airflow measurement, traverses, capture hoods, formulas, and
            responsible calculator connections.
          </p>
          <p>
            Start here to distinguish measured TESP from airflow and design
            available static pressure. Then use <Link href="/tools/air-distribution">Air Distribution Tools</Link>{" "}
            for the calculation that matches the inputs you have established.
          </p>
          <div className={styles.cardBottom}>
            <span className={styles.descriptor}>PDF · 2 pages</span>
            <Link className={styles.cardLink} href="/resources/airflow-static-pressure-measurement">
              View Reference <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </article>

      </section>
    </ContentPage>
  );
}
