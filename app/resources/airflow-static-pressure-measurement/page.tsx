import type { Metadata } from "next";
import Link from "next/link";

import { ContentPage, ContentSection, StatusPanel } from "@/components/ContentPage";
import { createPageMetadata } from "@/lib/seo";

import styles from "./page.module.css";

export const metadata: Metadata = createPageMetadata({
  title: "HVAC Airflow & Static Pressure Measurement Guide | AnyHVAC",
  description:
    "Learn how HVAC static pressure, TESP, velocity, duct area, traverses, and flow-hood measurements connect to CFM and duct calculations.",
  path: "/resources/airflow-static-pressure-measurement",
});

const pressureTerms = [
  {
    term: "Static pressure",
    definition:
      "The pressure exerted within the air system apart from the kinetic contribution represented by velocity pressure. It may be positive or negative relative to the selected reference.",
  },
  {
    term: "Velocity pressure",
    definition:
      "The pressure associated with air motion. A pitot-static tube and differential manometer can determine it from total pressure minus static pressure.",
  },
  {
    term: "Total pressure",
    definition:
      "Static pressure plus velocity pressure at the same measurement point.",
  },
  {
    term: "Pressure drop",
    definition:
      "The pressure difference across a component or section at a stated operating condition. A pressure drop is not automatically an airflow measurement.",
  },
  {
    term: "TESP",
    definition:
      "Total external static pressure across the air-moving equipment's defined external boundary. The correct boundary and probe locations depend on the equipment and manufacturer procedure.",
  },
  {
    term: "Manufacturer-rated external static pressure",
    definition:
      "The external static condition associated with published equipment or fan performance. Use the current data for the exact equipment, configuration, operating mode, and airflow setting.",
  },
  {
    term: "Available static pressure",
    definition:
      "A design pressure budget available to overcome distribution-system losses after applicable external component losses are deducted from the fan or equipment allowance.",
  },
  {
    term: "Friction rate",
    definition:
      "The available static pressure allocated per 100 feet of total effective duct length: FR = ASP × 100 / TEL.",
  },
] as const;

const instruments = [
  ["Digital manometer", "Gauge or differential pressure", "Static pressure, component drop, TESP, or pitot velocity pressure", "Range, resolution, zeroing, tubing leaks, fluctuating readings, and calibration"],
  ["Static-pressure probe", "Static pressure when connected to a manometer", "Duct or equipment test ports selected under the applicable procedure", "Orientation, turbulence, location, leaks, and accidental velocity-pressure influence"],
  ["Pitot-static tube", "Total and static pressure; their difference is velocity pressure", "Recognized duct traverses where velocity pressure is within instrument capability", "Alignment, density, low pressure, incomplete traverse, and poor measurement plane"],
  ["Hot-wire anemometer", "Local air velocity; some probes also measure temperature or humidity", "Low-velocity measurements and suitable duct traverses", "Direction, contamination, temperature compensation, turbulence, and single-point misuse"],
  ["Vane anemometer", "Local or averaged velocity through the vane area", "Larger openings, face velocity, grilles, and suitable duct applications", "Flow angle, grille effects, free area, coverage, and low-velocity range"],
  ["Flow or capture hood", "Volumetric airflow at a terminal", "Supply diffusers and return or exhaust grilles", "Hood-induced backpressure, seal, range, orientation, diffuser geometry, and correction factors"],
  ["Psychrometer", "Dry-bulb plus wet-bulb or relative humidity", "Secondary air-property or capacity analysis", "Sensor placement, equilibration, calibration, and spatial variation"],
] as const;

const toolConnections = [
  ["Airflow & Velocity", "Representative average velocity and actual area", "FPM and ft²", "CFM", "Estimated volumetric airflow from Q = V × A", "That the velocity measurement was representative or TAB-compliant"],
  ["Airflow & Velocity", "Airflow and actual area", "CFM and ft²", "FPM", "Average velocity corresponding to the inputs", "Actual point velocities, turbulence, noise, or acceptable design"],
  ["Air Changes", "Measured or estimated airflow and room dimensions", "CFM, length, width, and height", "ACH", "Nominal air changes based on the supplied volume and airflow", "Required ventilation, outdoor-air delivery, mixing effectiveness, or code compliance"],
  ["Friction Rate", "A valid design fan-ESP allowance, external component losses, and TEL", "ESP, losses, and TEL", "ASP and design friction rate", "A design pressure budget", "Measured TESP, actual airflow, or acceptable duct performance"],
  ["System Pressure Loss", "Design friction rates, lengths, and separately established component losses", "Section friction rates, lengths, losses, and optional ASP", "Path loss and remaining static", "Whether entered design losses fit the entered pressure budget", "Actual field loss or airflow; CFM and geometry do not derive friction rate in this module"],
  ["HVAC Duct Calculator", "Required airflow and a valid design friction rate", "CFM and in. w.g./100 ft", "Duct sizing relationships, velocity, and nominal-size friction", "A duct-sizing starting point", "That a measured system complies or that fittings, noise, and project requirements are satisfied"],
] as const;

const sources = [
  ["ASHRAE Handbook - Measurement and Instruments", "https://handbook.ashrae.org/Handbooks/F17/IP/F17_Ch37/f17_ch37_ip.aspx"],
  ["ASHRAE Handbook - Testing, Adjusting, and Balancing", "https://handbook.ashrae.org/handbooks/A19/IP/a19_ch39/a19_ch39_ip.aspx"],
  ["ASHRAE Handbook - Duct Design", "https://handbook.ashrae.org/Handbooks/F17/IP/f17_ch21/f17_ch21_ip.aspx"],
  ["ACCA static-pressure measurement guidance", "https://hvac-blog.acca.org/use-static-pressure-measurement-pinpoint-duct-deficiencies/"],
  ["NEBB Procedural Standards", "https://www.nebb.org/resources/nebb-bookstore/procedural-standards/"],
  ["AABC National Standards for Total System Balance", "https://aabc.com/national-standards/"],
  ["NIST ventilation assessment manual", "https://nvlpubs.nist.gov/nistpubs/Legacy/IR/nistir5329.pdf"],
  ["NIST pressure and gas-flow conversions", "https://www.nist.gov/pml/owm/metric-si/unit-conversion/pressure-and-gas-flow-unit-conversions"],
  ["DOE air-conditioner diagnostics guide", "https://www1.eere.energy.gov/buildings/publications/pdfs/building_america/measure_guide_air_cond_diagnostics.pdf"],
  ["TSI duct-traverse application note", "https://tsi.com/getmedia/4f2a0494-eec5-47b5-af17-f41652fad93b/TSI-106?ext=.pdf"],
] as const;

function PressureDiagram() {
  return (
    <figure className={styles.diagramCard}>
      <svg viewBox="0 0 760 250" role="img" aria-labelledby="pressure-diagram-title pressure-diagram-desc">
        <title id="pressure-diagram-title">Conceptual supply and return static-pressure relationship</title>
        <desc id="pressure-diagram-desc">Return air with negative static pressure enters conceptual equipment and fan, then supply air leaves with positive static pressure. Measurement boundaries vary.</desc>
        <defs>
          <marker id="airflow-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M0 0l8 4-8 4z" fill="currentColor" />
          </marker>
        </defs>
        <path className={styles.airPath} d="M80 126H252M508 126h172" markerEnd="url(#airflow-arrow)" />
        <rect className={styles.equipment} x="260" y="66" width="240" height="120" rx="22" />
        <circle className={styles.fan} cx="380" cy="126" r="35" />
        <path className={styles.fanBlade} d="M380 92c18 10 22 22 12 35-10 13-25 10-30-2M414 126c-10 18-22 22-35 12-13-10-10-25 2-30M380 160c-18-10-22-22-12-35 10-13 25-10 30 2" />
        <text className={styles.diagramLabel} x="119" y="92">RETURN SIDE</text>
        <text className={styles.negativeLabel} x="117" y="168">negative static</text>
        <text className={styles.diagramLabel} x="565" y="92">SUPPLY SIDE</text>
        <text className={styles.positiveLabel} x="570" y="168">positive static</text>
        <text className={styles.equipmentLabel} x="380" y="214">EQUIPMENT / FAN</text>
      </svg>
      <figcaption><strong>Conceptual only.</strong> Measurement boundaries and approved probe locations vary by equipment, accessories, and manufacturer.</figcaption>
    </figure>
  );
}

function TraverseDiagram() {
  const points = [
    [150, 77], [245, 77], [340, 77], [435, 77], [530, 77],
    [150, 132], [245, 132], [340, 132], [435, 132], [530, 132],
    [150, 187], [245, 187], [340, 187], [435, 187], [530, 187],
  ];
  return (
    <figure className={styles.diagramCard}>
      <svg viewBox="0 0 680 265" role="img" aria-labelledby="traverse-diagram-title traverse-diagram-desc">
        <title id="traverse-diagram-title">Conceptual multi-point duct traverse</title>
        <desc id="traverse-diagram-desc">A rectangular duct cross-section divided into multiple conceptual measurement regions with sample points.</desc>
        <rect className={styles.ductOutline} x="100" y="45" width="480" height="176" rx="9" />
        {[196, 292, 388, 484].map((x) => <line className={styles.regionLine} x1={x} y1="45" x2={x} y2="221" key={`v-${x}`} />)}
        {[103, 162].map((y) => <line className={styles.regionLine} x1="100" y1={y} x2="580" y2={y} key={`h-${y}`} />)}
        {points.map(([cx, cy]) => <circle className={styles.traversePoint} cx={cx} cy={cy} r="7" key={`${cx}-${cy}`} />)}
        <text className={styles.traverseLabel} x="340" y="25">MULTIPLE REGIONS AND READINGS</text>
        <text className={styles.traverseLabel} x="340" y="250">AVERAGE REPRESENTATIVE VELOCITIES, THEN MULTIPLY BY ACTUAL AREA</text>
      </svg>
      <figcaption><strong>Conceptual only.</strong> This is not a standards traverse layout or point-count prescription. Follow the procedure governing the project.</figcaption>
    </figure>
  );
}

function Example({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <aside className={styles.example} aria-label={`${title} illustrative example`}>
      <p className={styles.exampleLabel}>Illustrative example</p>
      <h3>{title}</h3>
      {children}
      <p className={styles.exampleNote}>These values demonstrate arithmetic only. They are not a normal, recommended, acceptable, code-compliant, or design target.</p>
    </aside>
  );
}

export default function AirflowStaticPressureMeasurementPage() {
  return (
    <ContentPage
      eyebrow="AnyHVAC Design Reference #02"
      title="HVAC Airflow & Static Pressure Measurement Quick Reference"
      intro="A practical guide to measuring pressure and airflow, interpreting the readings, and connecting field information to HVAC calculations."
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
              href="/resources/anyhvac-airflow-static-pressure-measurement-quick-reference.pdf"
              download="anyhvac-airflow-static-pressure-measurement-quick-reference.pdf"
              data-resource-download="airflow-static-pressure-measurement"
            >
              Download Free PDF
            </a>
            <Link className={styles.secondaryAction} href="/tools/air-distribution">
              Open Air Distribution Tools
            </Link>
          </div>
        </StatusPanel>
      </div>

      <ContentSection title="What airflow and static pressure tell you">
        <p>
          Airflow describes how much air moves through a system. Static pressure helps describe the resistance the fan is working against at a particular operating condition. Used together—and measured with an appropriate method—they help diagnose restrictions, compare operation with manufacturer data, and connect field information to duct-system calculations.
        </p>
        <div className={styles.callout}>
          <strong>Two distinctions matter throughout this guide:</strong>
          <p><b>TESP is not airflow.</b> A pressure reading can support airflow evaluation only with the correct equipment data and operating conditions.</p>
          <p><b>Measured TESP is not design available static pressure.</b> Do not enter measured TESP directly into the Friction Rate module&apos;s Fan External Static Pressure field unless a valid design workflow establishes that pressure allowance.</p>
        </div>
      </ContentSection>

      <ContentSection title="Pressure terminology">
        <div className={styles.termGrid}>
          {pressureTerms.map(({ term, definition }) => (
            <article className={styles.termCard} key={term}>
              <h3>{term}</h3>
              <p>{definition}</p>
            </article>
          ))}
        </div>
      </ContentSection>

      <ContentSection title="Conceptual pressure relationship">
        <PressureDiagram />
        <Example title="TESP magnitude">
          <dl className={styles.exampleValues}>
            <div><dt>Return static</dt><dd>-0.20 in. w.c.</dd></div>
            <div><dt>Supply static</dt><dd>+0.35 in. w.c.</dd></div>
            <div><dt>TESP magnitude</dt><dd>|-0.20| + |+0.35| = 0.55 in. w.c.</dd></div>
          </dl>
        </Example>
        <p className={styles.followup}>
          Equipment boundaries vary among furnaces, fan coils, air handlers, packaged equipment, filters, coils, and accessories. Use the current manufacturer procedure to choose locations and interpret the result.
        </p>
      </ContentSection>

      <ContentSection title="Measurement instruments">
        <div className={styles.tableWrap} tabIndex={0} role="region" aria-label="Measurement instrument comparison table">
          <table className={styles.dataTable}>
            <thead><tr><th>Instrument</th><th>Measures</th><th>Useful for</th><th>Common limitations</th></tr></thead>
            <tbody>
              {instruments.map((row) => <tr key={row[0]}>{row.map((cell) => <td key={cell}>{cell}</td>)}</tr>)}
            </tbody>
          </table>
        </div>
        <p className={styles.followup}>
          A psychrometer is secondary here. When temperature and humidity measurements are needed for moist-air analysis, use the <Link href="/tools/psychrometric-calculator">Psychrometric Calculator</Link>.
        </p>
      </ContentSection>

      <ContentSection title="Units and formulas">
        <div className={styles.formulaGrid}>
          <article><span>Airflow</span><strong>Q = V × A</strong><small>CFM = FPM × ft²</small></article>
          <article><span>Rectangular area</span><strong>A = W × H</strong><small>Use internal dimensions in feet</small></article>
          <article><span>Round area</span><strong>A = πD² / 4</strong><small>Use inside diameter in feet</small></article>
          <article><span>Friction rate</span><strong>FR = ASP × 100 / TEL</strong><small>Design relationship used by AnyHVAC</small></article>
        </div>
        <ul className={styles.compactList}>
          <li><strong>in. w.c. / in. w.g.</strong> — inches of water column or water gauge; equivalent HVAC usage in this guide and the existing tools.</li>
          <li><strong>Pa</strong> — pascal. 1 conventional in. w.c. = 249.0889 Pa.</li>
          <li><strong>FPM</strong> — feet per minute, a velocity.</li>
          <li><strong>CFM</strong> — cubic feet per minute, a volumetric airflow rate.</li>
          <li><strong>ft²</strong> — square feet of actual cross-sectional area. 144 in² = 1 ft².</li>
        </ul>
      </ContentSection>

      <ContentSection title="Workflow A — Measure total external static pressure">
        <ol className={styles.steps}>
          <li>Identify the exact equipment and obtain its current measurement procedure and performance data.</li>
          <li>Determine which filters, coils, and accessories are inside or outside the manufacturer-rated boundary.</li>
          <li>Choose only approved return- and supply-side test locations; safely access or create test ports.</li>
          <li>Zero the manometer and connect the static-pressure probe according to the instrument instructions.</li>
          <li>Operate the system in the required stable mode and airflow setting.</li>
          <li>Record return and supply readings plus fan setting, mode, filter condition, and other material conditions.</li>
          <li>For the conventional negative-return/positive-supply arrangement, add the reading magnitudes and compare the result with the correct manufacturer data.</li>
        </ol>
        <p className={styles.limit}><strong>Limit:</strong> TESP does not independently establish airflow, and one universal pair of probe locations does not apply to every system.</p>
      </ContentSection>

      <ContentSection title="Workflow B — Estimate airflow from velocity and area">
        <ol className={styles.steps}>
          <li>Measure the actual internal duct dimensions, accounting for internal liner.</li>
          <li>Obtain a representative average velocity normal to the duct cross-section.</li>
          <li>Calculate actual area in square feet.</li>
          <li>Multiply average FPM by area in ft² to estimate CFM.</li>
        </ol>
        <Example title="Velocity × area">
          <dl className={styles.exampleValues}>
            <div><dt>Internal duct</dt><dd>18 in × 12 in</dd></div>
            <div><dt>Area</dt><dd>1.5 ft²</dd></div>
            <div><dt>Average velocity</dt><dd>800 FPM</dd></div>
            <div><dt>Estimated airflow</dt><dd>800 × 1.5 = 1,200 CFM</dd></div>
          </dl>
        </Example>
        <p className={styles.limit}><strong>Limit:</strong> The calculation cannot correct an unrepresentative velocity, poor measurement plane, wrong free area, leakage, or instrument error.</p>
      </ContentSection>

      <ContentSection title="Workflow C — Measure airflow using a traverse">
        <TraverseDiagram />
        <ol className={styles.steps}>
          <li>Select the best available straight, accessible duct section and measure its internal dimensions.</li>
          <li>Use the traverse pattern and point requirements specified by the governing standard, project, or approved procedure.</li>
          <li>Record a stable reading at each point with the probe correctly aligned.</li>
          <li>For pitot measurements, convert each point&apos;s velocity pressure to velocity before averaging the velocities.</li>
          <li>Multiply the average velocity by actual cross-sectional area.</li>
        </ol>
        <p className={styles.limit}><strong>Limit:</strong> This guide does not reproduce proprietary traverse tables or certify a field measurement as TAB work.</p>
      </ContentSection>

      <ContentSection title="Workflow D — Measure airflow using a capture hood">
        <ol className={styles.steps}>
          <li>Confirm that the hood configuration, range, and flow direction are appropriate for the terminal.</li>
          <li>Cover the complete diffuser or grille and establish a consistent seal.</li>
          <li>Allow the reading to stabilize and record repeated readings when the procedure requires them.</li>
          <li>Apply only manufacturer- or method-validated corrections or K-factors.</li>
          <li>Document terminal configuration and test conditions.</li>
        </ol>
        <p className={styles.limit}><strong>Limit:</strong> The hood adds resistance and may alter flow. A terminal reading does not establish total system airflow unless the measurement plan supports that conclusion.</p>
      </ContentSection>

      <ContentSection title="From measurement to AnyHVAC">
        <div className={styles.tableWrap} tabIndex={0} role="region" aria-label="Measurement to AnyHVAC tool connections">
          <table className={`${styles.dataTable} ${styles.connectionTable}`}>
            <thead><tr><th>Tool</th><th>User measures or establishes</th><th>Enter</th><th>AnyHVAC calculates</th><th>Result means</th><th>Does not prove</th></tr></thead>
            <tbody>
              {toolConnections.map((row, index) => <tr key={`${row[0]}-${index}`}>{row.map((cell) => <td key={cell}>{cell}</td>)}</tr>)}
            </tbody>
          </table>
        </div>
        <div className={styles.toolActions}>
          <Link href="/tools/air-distribution">Open Air Distribution Tools</Link>
          <Link href="/tools/duct-calculator">Open HVAC Duct Calculator</Link>
        </div>
      </ContentSection>

      <ContentSection title="Available static pressure and design friction rate">
        <p>
          In a design workflow, available static pressure is the fan or equipment external-static allowance at the intended airflow minus applicable external component pressure losses. Total effective length then allocates that budget as a design friction rate.
        </p>
        <div className={styles.formulaBand}>
          <span>Design pressure allowance</span><b>−</b><span>Applicable component losses</span><b>=</b><span>Available static pressure</span><b>→</b><span>FR = ASP × 100 / TEL</span>
        </div>
        <p>
          The AnyHVAC Friction Rate module performs that arithmetic from user inputs. It does not convert a measured TESP into a design allowance. The System Pressure Loss module calculates straight loss from the entered friction rate and length; its CFM and geometry fields do not automatically derive friction rate.
        </p>
      </ContentSection>

      <ContentSection title="Common measurement mistakes">
        <ul className={styles.checkGrid}>
          <li>Using universal TESP probe locations instead of the equipment procedure</li>
          <li>Adding signed return and supply values instead of their magnitudes</li>
          <li>Calling TESP an airflow measurement</li>
          <li>Treating measured TESP as design available static pressure</li>
          <li>Failing to zero the instrument or check tubing</li>
          <li>Ignoring fan mode, filter, coil, damper, or accessory condition</li>
          <li>Using external dimensions when internal liner reduces free area</li>
          <li>Using one centerline velocity as the duct average</li>
          <li>Averaging pitot pressure readings before converting each to velocity</li>
          <li>Applying a generic grille free-area or hood correction factor</li>
        </ul>
      </ContentSection>

      <ContentSection title="Quick-reference summary">
        <div className={styles.summaryGrid}>
          <article><h3>Pressure</h3><p>Measure at procedure-approved locations, document the operating condition, and compare with the exact manufacturer data.</p></article>
          <article><h3>Airflow</h3><p>Use representative average velocity and actual free area. Q = V × A does not repair weak measurement inputs.</p></article>
          <article><h3>Design</h3><p>Keep measured TESP separate from the design ESP allowance, ASP, TEL, and friction-rate workflow.</p></article>
          <article><h3>Verification</h3><p>Instrument accuracy, calibration, location, method, system condition, and professional requirements all matter.</p></article>
        </div>
      </ContentSection>

      <ContentSection title="Professional and engineering boundaries">
        <div className={styles.notice}>
          <p>
            Follow current equipment and instrument manufacturer procedures. De-energize equipment before creating test ports, verify the location is clear of coils, wiring, tubing, controls, and rotating components, and restore test ports after use. Field estimates are not automatically certified TAB results.
          </p>
          <p>
            Applicable codes, standards, project requirements, and professional judgment still govern. Read the complete <Link href="/engineering-disclaimer">AnyHVAC Engineering Disclaimer</Link>.
          </p>
        </div>
      </ContentSection>

      <ContentSection title="Sources and further reading">
        <p>Use the current edition and the procedure governing the project. External references may change after publication.</p>
        <ul className={styles.sourceList}>
          {sources.map(([label, href]) => (
            <li key={href}><a href={href} target="_blank" rel="noreferrer">{label}</a></li>
          ))}
        </ul>
      </ContentSection>
    </ContentPage>
  );
}
