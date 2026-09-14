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
  mixingFlowRef,
  mixedLabelRef,
}: {
  form: MixedAirFormState;
  result?: MixedAirSolution;
  outdoorFlowRef: RefObject<SVGPathElement | null>;
  returnFlowRef: RefObject<SVGPathElement | null>;
  mixedFlowRef: RefObject<SVGPathElement | null>;
  mixingFlowRef: RefObject<SVGGElement | null>;
  mixedLabelRef: RefObject<SVGGElement | null>;
}) {
  const isIP = form.unitSystem === "IP";
  const flowUnit = isIP ? "CFM" : "L/s";
  const temperatureUnit = isIP ? "°F" : "°C";
  const outdoorAirflow = number(form.outdoorAirflow);
  const returnAirflow = number(form.returnAirflow);
  const widths = airflowStrokeWidths(outdoorAirflow, returnAirflow);
  const mixedState = result?.mixedState;
  const totalAirflow = result?.totalInputAirflow ?? outdoorAirflow + returnAirflow;

  return (
    <section className={styles.visualCard} aria-labelledby="mixed-air-visual-heading">
      <div className={styles.visualHeading}>
        <p>Airflow visualization</p>
        <h2 id="mixed-air-visual-heading">Mixing section</h2>
      </div>

      <svg className={styles.visualization} viewBox="0 0 760 480" role="img" aria-labelledby="mixing-visual-title mixing-visual-description" data-visualization="cohesive-isometric-mixing-plenum">
        <title id="mixing-visual-title">Outdoor and return air flowing through one HVAC mixing assembly</title>
        <desc id="mixing-visual-description">A compact dimensional HVAC casing has an outdoor-air aperture on the left, a return-air aperture underneath, a long internal cutaway where separate blue and purple ribbons progressively overlap, and a right-side discharge carrying one unified mixed-air ribbon.</desc>

        <defs>
          <linearGradient id="ahu-top-face" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="var(--surface)" /><stop offset="1" stopColor="var(--surface-soft)" /></linearGradient>
          <linearGradient id="ahu-front-face" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="var(--surface)" /><stop offset="1" stopColor="var(--surface-soft)" /></linearGradient>
          <linearGradient id="ahu-side-face" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="var(--surface-soft)" /><stop offset="1" stopColor="#cdd6e0" /></linearGradient>
          <linearGradient id="outdoor-ribbon" x1="0" x2="1"><stop offset="0" stopColor="#1682cf" /><stop offset="1" stopColor="#66b7ed" /></linearGradient>
          <linearGradient id="return-ribbon" x1="0" x2="1"><stop offset="0" stopColor="#7551a5" /><stop offset="1" stopColor="#a78bce" /></linearGradient>
          <linearGradient id="progressive-mix" x1="0" x2="1"><stop offset="0" stopColor="#8870ba" stopOpacity=".7" /><stop offset=".48" stopColor="#697ec0" stopOpacity=".9" /><stop offset="1" stopColor="#398bc6" /></linearGradient>
          <linearGradient id="unified-mixed-ribbon" x1="0" x2="1"><stop offset="0" stopColor="#6874b3" /><stop offset=".48" stopColor="#4b7eba" /><stop offset="1" stopColor="#2389c8" /></linearGradient>
          <radialGradient id="mixing-zone-glow"><stop offset="0" stopColor="#7184c5" stopOpacity=".24" /><stop offset=".72" stopColor="#7184c5" stopOpacity=".08" /><stop offset="1" stopColor="#7184c5" stopOpacity="0" /></radialGradient>
          <clipPath id="mixing-window-clip"><path d="M218 164H592V316H218Z" /></clipPath>
          <filter id="ahu-soft-shadow" x="-18%" y="-24%" width="150%" height="170%"><feDropShadow dx="9" dy="12" stdDeviation="11" floodColor="#708095" floodOpacity=".25" /></filter>
          <filter id="ribbon-softness" x="-12%" y="-35%" width="130%" height="170%"><feGaussianBlur stdDeviation="1.3" /></filter>
        </defs>

        {/* Single prism using one depth vector: +36 horizontally and -24 vertically. */}
        <g className={styles.cohesiveCasing} filter="url(#ahu-soft-shadow)" aria-hidden="true" data-equipment-body="single-casing">
          <path className={styles.casingRearFace} d="M190 140H620V340H190Z" />
          <path className={styles.casingTopFace} d="M190 140l36-24h430l-36 24Z" />
          <path className={styles.casingEndFace} d="M620 140l36-24v200l-36 24Z" />
          <path className={styles.baseRail} d="M214 340v15h104v-15M504 340v15h92v-15" />
        </g>

        <g aria-hidden="true">
          <path className={styles.airwayBed} d="M58 202H246C301 202 330 212 370 230C407 247 444 250 493 246" style={{ strokeWidth: widths.outdoor + 12 }} />
          <path className={styles.airwayBed} d="M108 407H281C315 407 323 370 337 333C351 296 378 275 414 260C442 249 467 247 493 246" style={{ strokeWidth: widths.return + 12 }} />
          <path className={styles.airwayBed} d="M481 246C531 246 562 239 601 239H718" style={{ strokeWidth: widths.mixed + 13 }} />

          <path ref={outdoorFlowRef} pathLength={1} data-air-path="outdoor" className={`${styles.airRibbon} ${styles.outdoorRibbon}`} d="M58 202H246C301 202 330 212 370 230C407 247 444 250 493 246" style={{ strokeWidth: widths.outdoor }} />
          <path ref={returnFlowRef} pathLength={1} data-air-path="return" className={`${styles.airRibbon} ${styles.returnRibbon}`} d="M108 407H281C315 407 323 370 337 333C351 296 378 275 414 260C442 249 467 247 493 246" style={{ strokeWidth: widths.return }} />
        </g>

        <g clipPath="url(#mixing-window-clip)" aria-hidden="true">
          <ellipse className={styles.mixingZoneGlow} cx="458" cy="246" rx="152" ry="78" data-mixing-zone="progressive" />
          <g ref={mixingFlowRef} className={styles.progressiveMixing} data-mixing-paths="progressive-overlap">
            <path pathLength={1} data-mixing-path="outdoor-layer" className={styles.outdoorMixLayer} d="M316 211C365 215 390 235 430 241C473 247 510 244 566 239" style={{ strokeWidth: Math.max(8, widths.outdoor * .78) }} />
            <path pathLength={1} data-mixing-path="return-layer" className={styles.returnMixLayer} d="M339 306C370 278 397 260 434 252C478 243 516 244 566 239" style={{ strokeWidth: Math.max(9, widths.return * .72) }} />
            <path pathLength={1} data-mixing-path="interwoven-layer" className={styles.interwovenMixLayer} d="M376 225C414 241 433 270 473 253C509 238 535 244 578 239" />
            <path pathLength={1} data-mixing-path="composite-layer" className={styles.compositeMixLayer} d="M438 247C484 246 523 244 578 239" style={{ strokeWidth: widths.mixed }} />
          </g>
        </g>

        <path ref={mixedFlowRef} pathLength={1} data-air-path="mixed" className={`${styles.airRibbon} ${styles.unifiedMixedRibbon}`} d="M500 246C541 245 567 239 601 239H718" style={{ strokeWidth: widths.mixed }} aria-hidden="true" />

        {/* Opaque frame, window glazing, and rims sit in front of airflow for occlusion. */}
        <path className={styles.casingFrontFrame} fillRule="evenodd" d="M190 140H620V340H190ZM218 164H592V316H218ZM184 181H224V222H184ZM311 308H376V346H311ZM584 207H626V277H584Z" aria-hidden="true" />
        <path className={styles.windowGlazing} d="M218 164H592V316H218Z" aria-hidden="true" />
        <g className={styles.apertureRims} aria-hidden="true"><path d="M190 181v41M190 181h28M190 222h28" /><path d="M311 316v24h65v-24" /><path d="M592 207h28v70h-28" /></g>
        <path className={styles.casingHighlight} d="M226 116h430M198 148h414" aria-hidden="true" />
        <g className={styles.staticDirectionCues} aria-hidden="true"><path d="m155 191 15 11-15 11" /><path d="m220 396 15 11-15 11" /><path d="m661 228 16 11-16 11" /></g>

        <g className={styles.streamLabel} data-stationary-label="outdoor"><text x="43" y="60">OUTDOOR AIR</text><text className={styles.labelValue} x="43" y="84">{`${airflow(outdoorAirflow, flowUnit)} · ${number(form.outdoorDryBulb).toFixed(1)}${temperatureUnit} · ${number(form.outdoorRelativeHumidity).toFixed(1)}% RH`}</text></g>
        <g className={styles.streamLabel} data-stationary-label="return"><text x="43" y="432">RETURN AIR</text><text className={styles.labelValue} x="43" y="456">{`${airflow(returnAirflow, flowUnit)} · ${number(form.returnDryBulb).toFixed(1)}${temperatureUnit} · ${number(form.returnRelativeHumidity).toFixed(1)}% RH`}</text></g>
        <g ref={mixedLabelRef} className={`${styles.streamLabel} ${styles.mixedAirLabel}`} data-stationary-label="mixed"><text x="520" y="382">MIXED AIR</text><text className={styles.labelValue} x="520" y="406">{mixedState ? `${airflow(totalAirflow, flowUnit)} · ${mixedState.dryBulb.toFixed(1)}${temperatureUnit} · ${mixedState.relativeHumidity.toFixed(1)}% RH` : "Calculate to view result"}</text></g>
      </svg>

      <p className={styles.visualNote}>Ribbon width illustrates each incoming airflow contribution; calculations use dry-air mass flow.</p>
    </section>
  );
}
