import type { RefObject } from "react";

import type { MixedAirSolution } from "../../lib/psychrometrics/mixing";
import type { MixedAirFormState } from "./calculatorState";
import { airflowStrokeWidths } from "./calculatorState";

import styles from "./MixedAirCalculator.module.css";

function number(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function airflow(value: number, unit: string) {
  return `${Math.max(0, value).toLocaleString(undefined, { maximumFractionDigits: 1 })} ${unit}`;
}

export function MixedAirVisualization({
  form,
  result,
  outdoorFlowRef,
  returnFlowRef,
  mixedFlowRef,
  mixingPulseRef,
  mixedLabelRef,
}: {
  form: MixedAirFormState;
  result?: MixedAirSolution;
  outdoorFlowRef: RefObject<SVGPathElement | null>;
  returnFlowRef: RefObject<SVGPathElement | null>;
  mixedFlowRef: RefObject<SVGPathElement | null>;
  mixingPulseRef: RefObject<SVGGElement | null>;
  mixedLabelRef: RefObject<SVGGElement | null>;
}) {
  const isIP = form.unitSystem === "IP";
  const flowUnit = isIP ? "CFM" : "L/s";
  const temperatureUnit = isIP ? "°F" : "°C";
  const oaFlow = number(form.outdoorAirflow);
  const raFlow = number(form.returnAirflow);
  const widths = airflowStrokeWidths(oaFlow, raFlow);
  const mixed = result?.mixedState;
  const totalFlow = result?.totalInputAirflow ?? oaFlow + raFlow;

  return (
    <section className={styles.visualCard} aria-labelledby="mixed-air-visual-heading">
      <div className={styles.visualHeading}>
        <p>Airflow visualization</p>
        <h2 id="mixed-air-visual-heading">Mixing section</h2>
      </div>
      <svg
        className={styles.visualization}
        viewBox="0 0 680 500"
        role="img"
        aria-labelledby="mixing-visual-title mixing-visual-description"
      >
        <title id="mixing-visual-title">Outdoor and return air mixing</title>
        <desc id="mixing-visual-description">
          Outdoor air enters the upper path, return air enters the lower path, and both combine in a central mixing box before leaving as mixed air.
        </desc>
        <defs>
          <linearGradient id="mixed-air-gradient" x1="0" x2="1">
            <stop offset="0" stopColor="#4098f2" />
            <stop offset="1" stopColor="#6754a8" />
          </linearGradient>
          <filter id="mixing-soft-shadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="5" dy="7" stdDeviation="7" floodColor="#8794a5" floodOpacity=".28" />
          </filter>
        </defs>

        <path className={styles.fixedPath} d="M55 145 H245 Q290 145 320 215" style={{ strokeWidth: widths.outdoor }} />
        <path className={styles.fixedPath} d="M55 370 H245 Q290 370 320 285" style={{ strokeWidth: widths.return }} />
        <path className={styles.fixedPath} d="M430 250 H625" style={{ strokeWidth: widths.mixed }} />
        <path ref={outdoorFlowRef} className={`${styles.flowPath} ${styles.outdoorFlow}`} d="M55 145 H245 Q290 145 320 215" style={{ strokeWidth: widths.outdoor }} />
        <path ref={returnFlowRef} className={`${styles.flowPath} ${styles.returnFlow}`} d="M55 370 H245 Q290 370 320 285" style={{ strokeWidth: widths.return }} />
        <path ref={mixedFlowRef} className={`${styles.flowPath} ${styles.mixedFlow}`} d="M430 250 H625" style={{ strokeWidth: widths.mixed }} />

        <g filter="url(#mixing-soft-shadow)">
          <rect className={styles.mixingBox} x="305" y="180" width="140" height="140" rx="28" />
          <path className={styles.damper} d="M330 207l90 86M420 207l-90 86" />
          <g ref={mixingPulseRef} className={styles.mixingPulse}>
            <circle cx="375" cy="250" r="28" />
            <circle cx="375" cy="250" r="15" />
          </g>
        </g>

        <g className={styles.streamLabel}>
          <text x="54" y="76">OUTDOOR AIR</text>
          <text className={styles.labelValue} x="54" y="101">
            {`${airflow(oaFlow, flowUnit)} · ${number(form.outdoorDryBulb).toFixed(1)}${temperatureUnit} · ${number(form.outdoorRelativeHumidity).toFixed(1)}% RH`}
          </text>
        </g>
        <g className={styles.streamLabel}>
          <text x="54" y="421">RETURN AIR</text>
          <text className={styles.labelValue} x="54" y="446">
            {`${airflow(raFlow, flowUnit)} · ${number(form.returnDryBulb).toFixed(1)}${temperatureUnit} · ${number(form.returnRelativeHumidity).toFixed(1)}% RH`}
          </text>
        </g>
        <g ref={mixedLabelRef} className={styles.streamLabel}>
          <text x="455" y="330">MIXED AIR</text>
          <text className={styles.labelValue} x="455" y="355">
            {mixed
              ? `${airflow(totalFlow, flowUnit)} · ${mixed.dryBulb.toFixed(1)}${temperatureUnit} · ${mixed.relativeHumidity.toFixed(1)}% RH`
              : "Calculate to view result"}
          </text>
        </g>
      </svg>
      <p className={styles.visualNote}>Path thickness illustrates each incoming airflow contribution; calculations use dry-air mass flow.</p>
    </section>
  );
}
