import Link from "next/link";

import styles from "./AirDistributionGuidance.module.css";

export type AirDistributionModule = "airflow" | "ach" | "friction" | "system-pressure";

const guidance = {
  airflow: {
    title: "Relate airflow, average velocity, and clear area",
    method: "Q = V × A: use CFM for airflow, FPM for average velocity, and ft² for clear cross-sectional area. Geometry inputs are inches; the tool converts them to feet before calculating area.",
    example: "An 18 × 12 inch clear opening has 1.5 ft² of area. At an average 800 FPM, Q = 800 × 1.5 = 1,200 CFM. Conversely, 1,200 CFM through 1.5 ft² corresponds to 800 FPM.",
    limit: "Use representative average velocity and internal dimensions accounting for liner. This relationship does not determine friction, equivalent duct size, noise, or whether the airflow is acceptable.",
    details: "Select the quantity to solve for and supply the other two. Round area is π(D/12)²/4; rectangular area is (W/12) × (H/12). A single centerline reading may not represent the average. The calculation cannot correct poor sampling, flow angle, leakage, or instrument error.",
  },
  ach: {
    title: "Interpret nominal air changes",
    method: "Room volume = length × width × height in ft³, using dimensions in feet. ACH = CFM × 60 / room volume. In Required CFM mode, CFM = desired ACH × room volume / 60.",
    example: "A 20 × 15 × 10 ft room has 3,000 ft³ of volume. At 300 CFM, 300 × 60 / 3,000 = 6 ACH. Entering 6 ACH in reverse mode gives 300 CFM.",
    limit: "This is a nominal volume-to-flow ratio, not proof of complete air replacement, outdoor-air delivery, contaminant removal, or code compliance. The example does not recommend 6 ACH for any application.",
    details: "The tool assumes a rectangular room volume. Identify what the entered airflow represents: total supply, outdoor air, or exhaust describe different quantities and are not interchangeable. Mixing effectiveness, short-circuiting, occupancy, and ventilation requirements are not calculated. Establish an applicable target separately before using reverse mode.",
  },
  friction: {
    title: "Allocate a design pressure budget",
    method: "Available static pressure (ASP) = fan external-static allowance − entered component losses, all in in. w.g. Design friction rate = ASP × 100 / total effective length (TEL in ft), giving in. w.g./100 ft.",
    example: "For an illustrative 0.80 in. w.g. allowance, 0.30 in. w.g. of component losses, and 250 ft TEL: ASP = 0.50 in. w.g.; friction rate = 0.50 × 100 / 250 = 0.20 in. w.g./100 ft.",
    limit: "Establish the fan allowance and losses at the intended airflow and matching equipment boundary. Measured TESP is not a design allowance. The example is not a recommended fan pressure or friction rate.",
    details: "TEL includes straight lengths and fitting effects under the chosen design method; it is not simply measured straight length. Avoid counting a loss both as a component pressure drop and in equivalent length. Blank component losses count as zero, not verified negligible losses. If losses exceed the allowance, ASP is negative and the tool supplies no design friction rate. Zero ASP gives zero friction rate, not a usable duct-sizing target.",
  },
  "system-pressure": {
    title: "Evaluate one selected duct path",
    method: "For each section, straight loss = entered friction rate (in. w.g./100 ft) × straight length (ft) / 100. Add separately entered fitting/component losses in in. w.g.; sum the sections along one path. Optional remaining static = entered ASP − path loss.",
    example: "A 60 ft section at 0.10 in. w.g./100 ft plus 0.04 in. w.g. of fittings loses 0.10 in. w.g. A second 40 ft section at 0.15 plus 0.08 of components loses 0.14. Path total = 0.24; an ASP of 0.30 leaves 0.06 in. w.g.",
    limit: "You select the path: the tool does not search a duct network for its critical path. Airflow and dimensions document sections but do not derive friction rate or component losses. A positive remainder only compares the entered budget and losses.",
    details: "Compare candidate complete paths separately on a consistent pressure basis and at their design airflows; the controlling path is the highest-loss applicable path, not necessarily the longest. Do not sum parallel branches as series sections. Use straight length here when fitting losses are entered explicitly, rather than counting those fittings again in equivalent length. Match the ASP boundary to the included losses and avoid re-adding components already deducted from ASP. Blank numeric fields count as zero; an empty path is not a verified loss-free system. This tool does not solve fan operating points or balance branch flows.",
  },
} as const;

export function AirDistributionGuidance({ module }: { module: AirDistributionModule }) {
  const entry = guidance[module];
  return (
    <section className={styles.guidance} aria-labelledby={`${module}-guidance-title`}>
      <h2 id={`${module}-guidance-title`}>{entry.title}</h2>
      <p>{entry.method}</p>
      <p><strong>Illustrative arithmetic, not a verified reference value:</strong> {entry.example}</p>
      <p>{entry.limit}</p>
      <details>
        <summary>Assumptions and interpretation</summary>
        <p>{entry.details}</p>
        <p>For field inputs and pressure boundaries, see the <Link href="/resources/airflow-static-pressure-measurement">Airflow &amp; Static Pressure Measurement reference</Link>.</p>
      </details>
    </section>
  );
}
