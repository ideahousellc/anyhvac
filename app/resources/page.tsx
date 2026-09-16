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

const upcomingResources = [
  {
    number: "#02",
    title: "Air Distribution Quick Reference",
    description: "Airflow, velocity, area, ACH, and practical air-distribution relationships.",
  },
  {
    number: "#03",
    title: "Psychrometrics Quick Reference",
    description:
      "Dry bulb, wet bulb, dew point, relative humidity, humidity ratio, enthalpy, and common HVAC processes.",
  },
  {
    number: "#04",
    title: "Mixed Air Quick Reference",
    description:
      "Outdoor air, return air, mixed air, airflow weighting, moisture, and enthalpy relationships.",
  },
] as const;

export default function ResourcesPage() {
  return (
    <ContentPage
      eyebrow="AnyHVAC Resources"
      title="HVAC Design Resources"
      intro="Practical references for HVAC professionals and designers."
    >
      <p className={styles.secondary}>
        Download free quick-reference sheets, keep them at your desk, or use them
        alongside the AnyHVAC calculators. No signup required.
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
          <div className={styles.cardBottom}>
            <span className={styles.descriptor}>PDF · 2 pages</span>
            <Link className={styles.cardLink} href="/resources/duct-design-quick-reference">
              View Reference <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </article>

        {upcomingResources.map((resource) => (
          <article className={`${styles.card} ${styles.upcoming}`} key={resource.number}>
            <div className={styles.cardTop}>
              <p className={styles.eyebrow}>Design Reference {resource.number}</p>
              <span className={`${styles.badge} ${styles.soonBadge}`}>Coming Soon</span>
            </div>
            <h2>{resource.title}</h2>
            <p>{resource.description}</p>
          </article>
        ))}
      </section>
    </ContentPage>
  );
}
