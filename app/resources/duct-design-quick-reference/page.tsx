import type { Metadata } from "next";
import Link from "next/link";

import { ContentPage, ContentSection, StatusPanel } from "@/components/ContentPage";
import { createPageMetadata } from "@/lib/seo";
import { ResourceGrowthMeasurement } from "@/components/ResourceGrowthMeasurement";

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
      <ResourceGrowthMeasurement />
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
            <Link className={styles.secondaryAction} href="/tools/duct-calculator" data-growth-calculator="duct-reference-top">
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

      <ContentSection title="Relate airflow, velocity and clear duct area">
        <p>
          Airflow is the volume of air passing through a section per unit time.
          In IP units, Q (CFM) = A (ft²) × V (FPM), where V is the average velocity
          across the section. Use clear internal dimensions: rectangular area is
          width × height, and round area is πD² / 4 with diameter in feet.
          Convert square inches to square feet by dividing by 144.
        </p>
        <p>
          The PDF&apos;s round-duct table applies this relationship at several
          velocities. Its airflow entries are calculated values, not recommended
          duct capacities. A table lookup alone does not check noise, available
          fan pressure or the losses along a complete duct path.
        </p>
      </ContentSection>

      <ContentSection title="Worked example: read the round-duct table">
        <StatusPanel>
          <p>
            <strong>Illustrative inputs:</strong> a 12-inch clear inside diameter
            and an average velocity of 1,000 FPM. Convert the diameter first:
            12 in ÷ 12 = 1 ft.
          </p>
          <p>
            Area = π × 1² / 4 ≈ 0.785 ft². Airflow = 0.785 × 1,000 ≈ 785 CFM,
            matching the PDF table entry after rounding.
          </p>
          <p>
            These are arithmetic examples, not a recommended duct size or target
            velocity. Actual airflow estimation needs representative average
            velocity and actual clear area; one point reading may not represent
            the duct average.
          </p>
        </StatusPanel>
      </ContentSection>

      <ContentSection title="Separate friction, geometry and system pressure">
        <p>
          Friction rate expresses duct pressure loss per unit length, commonly
          in. w.g. per 100 ft. Equal-friction sizing starts with a selected design
          friction rate; it does not establish the total loss through elbows,
          transitions, dampers, equipment and terminals. Evaluate those losses
          and the critical path before checking the fan pressure requirement.
        </p>
        <p>
          For rectangular duct, check both clear area and aspect ratio. The
          equivalent-round relationship in the PDF compares frictional behavior;
          it is not an area-equivalent conversion. Equal areas alone do not
          establish equal friction losses.
        </p>
        <p>
          Total pressure is static plus velocity pressure at the same point and
          reference basis. Keep these quantities separate when comparing a
          pressure-loss calculation with equipment data or field readings.
        </p>
      </ContentSection>

      <ContentSection title="Apply project criteria, not universal targets">
        <p>
          Establish required airflow, choose a sizing method, check velocity and
          acoustics, include straight-duct and fitting losses, and identify the
          highest-loss path. The PDF&apos;s published velocity and friction
          examples show why application and project context matter; they are
          not limits that apply to every system.
        </p>
        <p>
          Verify material, roughness, geometry, manufacturer data, project
          specifications, applicable codes and AHJ requirements. A calculation
          or reference table does not certify a complete design.
        </p>
      </ContentSection>

      <ContentSection title="Explore the calculator">
        <p>
          Use the calculator to compare round and rectangular sizes for your own
          airflow and design friction rate. Check the calculated diameter against
          practical nominal sizes and review the resulting velocity and friction
          rate before proceeding with system-level checks.
        </p>
        <Link className={styles.textLink} href="/tools/duct-calculator" data-growth-calculator="duct-reference-contextual">
          Open HVAC Duct Calculator <span aria-hidden="true">↗</span>
        </Link>
      </ContentSection>

      <ContentSection title="Measure airflow and pressure">
        <p>
          Learn how field velocity, duct area, TESP, and available static pressure
          connect to responsible HVAC calculations.
        </p>
        <Link className={styles.textLink} href="/resources/airflow-static-pressure-measurement">
          Open Airflow &amp; Static Pressure Measurement Reference <span aria-hidden="true">↗</span>
        </Link>
      </ContentSection>

      <ContentSection title="Technical references">
        <p>
          The downloadable reference cites the 2025 ASHRAE Handbook—Fundamentals,
          Chapter 21, Duct Design, and the VA HVAC Design Manual dated March 1,
          2024. Consult the edition and criteria governing your project; citing
          a reference does not imply endorsement or project compliance.
        </p>
        <a
          className={styles.textLink}
          href="https://handbook.ashrae.org/Handbooks/F25/IP/F25_Ch21/F25_Ch21_ip.aspx"
          target="_blank"
          rel="noreferrer"
        >
          ASHRAE Handbook: Duct Design
        </a>
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
