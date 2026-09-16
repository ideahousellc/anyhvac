import type { Metadata } from "next";
import Link from "next/link";

import { ContentPage, ContentSection, StatusPanel } from "@/components/ContentPage";
import { createPageMetadata } from "@/lib/seo";

import styles from "../resources.module.css";

export const metadata: Metadata = createPageMetadata({
  title: "Duct Design Quick Reference | AnyHVAC",
  description:
    "Download the free AnyHVAC Duct Design Quick Reference for airflow, velocity, duct sizing, friction rate, pressure relationships, conversions, and HVAC design checks.",
  path: "/resources/duct-design-quick-reference",
});

const contents = [
  "Airflow, velocity, and duct-area formulas",
  "Round duct airflow quick-reference table",
  "Friction-rate fundamentals",
  "Rectangular and equivalent-round duct relationships",
  "Static, velocity, and total pressure basics",
  "Published design-criteria examples",
  "Common IP/SI HVAC conversions",
  "Fast duct-design sanity checks",
] as const;

export default function DuctDesignQuickReferencePage() {
  return (
    <ContentPage
      compact
      eyebrow="AnyHVAC Design Reference #01"
      title="Duct Design Quick Reference"
      intro="A practical two-page reference for HVAC designers and engineers."
    >
      <div className={styles.downloadPanel}>
        <StatusPanel>
          <div className={styles.downloadMeta}>
            <span className={styles.badge}>Free PDF</span>
            <span>2 pages · US Letter · No signup required</span>
          </div>
          <div className={styles.actions}>
            <a
              className={styles.primaryAction}
              href="/resources/anyhvac-duct-design-quick-reference.pdf"
              download="anyhvac-duct-design-quick-reference.pdf"
              data-resource-download="duct-design-quick-reference"
            >
              Download Free PDF
            </a>
            <Link className={styles.secondaryAction} href="/tools/duct-calculator">
              Open Duct Calculator
            </Link>
          </div>
        </StatusPanel>
      </div>

      <ContentSection title="What's inside">
        <ul className={styles.contents}>
          {contents.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </ContentSection>

      <ContentSection title="Explore the calculator">
        <p>Need an exact duct size instead of a quick reference?</p>
        <Link className={styles.textLink} href="/tools/duct-calculator">
          Open HVAC Duct Calculator <span aria-hidden="true">↗</span>
        </Link>
      </ContentSection>

      <ContentSection title="Engineering Notice">
        <p className={styles.notice}>
          AnyHVAC reference materials are provided as informational and
          design-assistance resources. Values, examples, and criteria should be
          independently verified against applicable project requirements, codes,
          standards, manufacturer data, and AHJ requirements before use in final
          design or construction.
        </p>
      </ContentSection>
    </ContentPage>
  );
}
