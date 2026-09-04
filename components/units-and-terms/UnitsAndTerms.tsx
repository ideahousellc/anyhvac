"use client";

import { useId, useState } from "react";

import styles from "./UnitsAndTerms.module.css";

export type UnitTerm = {
  abbreviation: string;
  name: string;
  description: string;
};

export function InfoTip({ label, children }: { label: string; children: string }) {
  const tooltipId = useId();
  const [open, setOpen] = useState(false);

  return (
    <span
      className={`${styles.infoTip} ${open ? styles.open : ""}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label={`More information about ${label}`}
        aria-describedby={tooltipId}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
            event.currentTarget.blur();
          }
        }}
      >
        i
      </button>
      <span className={styles.tooltip} id={tooltipId} role="tooltip">
        {children}
      </span>
    </span>
  );
}

export function UnitsAndTerms({ terms }: { terms: readonly UnitTerm[] }) {
  const headingId = useId();

  return (
    <section className={styles.reference} aria-labelledby={headingId}>
      <div className={styles.heading}>
        <h2 id={headingId}>Units &amp; Terms</h2>
        <p>Quick reference for abbreviations and units used in these calculators.</p>
      </div>
      <dl className={styles.termGrid}>
        {terms.map((term) => (
          <div className={styles.term} key={term.abbreviation}>
            <dt>{term.abbreviation}</dt>
            <dd>
              <strong>{term.name}</strong>
              <span>{term.description}</span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
