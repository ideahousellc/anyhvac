import Link from "next/link";

import styles from "./FeaturedResourceSection.module.css";

const featuredResource = {
  eyebrow: "Design Reference #01",
  title: "Duct Design Quick Reference",
  description:
    "A two-page HVAC duct design reference covering airflow, velocity, duct area, friction rate, pressure relationships, rectangular duct fundamentals, conversions, and design checks.",
  href: "/resources/duct-design-quick-reference",
  facts: ["Free", "2-page reference", "No signup required"],
} as const;

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

export function FeaturedResourceSection() {
  return (
    <section
      className={`page-shell ${styles.section}`}
      aria-labelledby="featured-resource-title"
    >
      <header className={styles.heading}>
        <p>Resources</p>
        <h2 id="featured-resource-title">
          Practical HVAC references for everyday design work.
        </h2>
      </header>

      <article className={styles.card}>
        <div className={styles.copy}>
          <p className={styles.eyebrow}>{featuredResource.eyebrow}</p>
          <h3>{featuredResource.title}</h3>
          <p className={styles.description}>{featuredResource.description}</p>
          <ul className={styles.facts} aria-label="Resource details">
            {featuredResource.facts.map((fact) => (
              <li key={fact}>{fact}</li>
            ))}
          </ul>
        </div>

        <div className={styles.actions}>
          <Link className={styles.primaryAction} href={featuredResource.href}>
            View Quick Reference
            <ArrowIcon />
          </Link>
          <Link className={styles.secondaryAction} href="/resources">
            View all resources
          </Link>
        </div>
      </article>
    </section>
  );
}
