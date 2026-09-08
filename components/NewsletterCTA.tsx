"use client";

import { NewsletterTrigger } from "@/components/ModalTriggers";

import styles from "./NewsletterCTA.module.css";

export function NewsletterCTA({ compact = false }: { compact?: boolean }) {
  return (
    <aside className={`${styles.cta} ${compact ? styles.compact : ""}`}>
      <div>
        <h2>Get new free HVAC tools in your inbox.</h2>
        <p>
          New calculators, practical HVAC references, and AnyHVAC updates. No
          spam.
        </p>
      </div>
      <NewsletterTrigger>
        Join the AnyHVAC Newsletter
      </NewsletterTrigger>
    </aside>
  );
}
