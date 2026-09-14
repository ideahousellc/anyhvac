"use client";

import gsap from "gsap";
import { useEffect, useMemo, useRef, useState } from "react";

import type { MixedAirSolution } from "../../lib/psychrometrics/mixing";
import {
  calculateMixedAirForm,
  DEFAULT_MIXED_AIR_FORM,
  fieldErrors,
  switchMixedAirUnits,
  type MixedAirFormState,
} from "./calculatorState";
import { MixedAirResults } from "./MixedAirResults";
import { MixedAirVisualization } from "./MixedAirVisualization";

import styles from "./MixedAirCalculator.module.css";

export const MIXED_AIR_ANIMATION_DURATION = 1.05;

export function shouldReduceMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

type FormField = keyof MixedAirFormState;

export function MixedAirCalculator({
  initialForm = DEFAULT_MIXED_AIR_FORM,
}: {
  initialForm?: MixedAirFormState;
}) {
  const [form, setForm] = useState(initialForm);
  const [solution, setSolution] = useState<MixedAirSolution>();
  const [submittedErrors, setSubmittedErrors] = useState<ReturnType<typeof fieldErrors>>(new Map());
  const timeline = useRef<gsap.core.Timeline | null>(null);
  const outdoorFlow = useRef<SVGPathElement>(null);
  const returnFlow = useRef<SVGPathElement>(null);
  const mixedFlow = useRef<SVGPathElement>(null);
  const mixingPulse = useRef<SVGGElement>(null);
  const mixedLabel = useRef<SVGGElement>(null);
  const liveValidation = useMemo(() => calculateMixedAirForm(form), [form]);

  useEffect(() => () => {
    timeline.current?.kill();
  }, []);

  function update(field: FormField, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setSubmittedErrors(new Map());
  }

  function playAnimation() {
    timeline.current?.kill();
    if (shouldReduceMotion()) {
      gsap.set([outdoorFlow.current, returnFlow.current, mixedFlow.current, mixingPulse.current, mixedLabel.current], { clearProps: "all" });
      return;
    }
    const incoming = [outdoorFlow.current, returnFlow.current];
    timeline.current = gsap.timeline({ defaults: { ease: "power1.out", overwrite: "auto" } })
      .set(incoming, { strokeDashoffset: 90, opacity: 0.35 })
      .set(mixedFlow.current, { strokeDashoffset: 90, opacity: 0.22 })
      .set(mixingPulse.current, { scale: 0.76, opacity: 0, transformOrigin: "center" })
      .to(incoming, { strokeDashoffset: 0, opacity: 1, duration: 0.42 }, 0)
      .to(mixingPulse.current, { scale: 1.08, opacity: 0.75, duration: 0.2 }, 0.38)
      .to(mixingPulse.current, { scale: 1, opacity: 0.28, duration: 0.16 }, 0.58)
      .to(mixedFlow.current, { strokeDashoffset: 0, opacity: 1, duration: 0.35 }, 0.64)
      .fromTo(mixedLabel.current, { opacity: 0.5 }, { opacity: 1, duration: 0.17 }, 0.88);
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = calculateMixedAirForm(form);
    if (!result.ok) {
      setSubmittedErrors(fieldErrors(result));
      return;
    }
    setSubmittedErrors(new Map());
    setSolution(result.value);
    playAnimation();
  }

  const temperatureUnit = form.unitSystem === "IP" ? "°F" : "°C";
  const airflowUnit = form.unitSystem === "IP" ? "CFM" : "L/s";
  const pressureField = form.pressureMode === "elevation" ? "elevation" : "pressure";
  const generalError = submittedErrors.get("calculation");

  return (
    <div className={styles.calculator}>
      <div className={styles.workspace}>
        <MixedAirVisualization
          form={form}
          result={solution}
          outdoorFlowRef={outdoorFlow}
          returnFlowRef={returnFlow}
          mixedFlowRef={mixedFlow}
          mixingPulseRef={mixingPulse}
          mixedLabelRef={mixedLabel}
        />

        <form className={styles.controls} onSubmit={submit} aria-labelledby="mixed-air-inputs-heading" noValidate>
          <div className={styles.controlHeading}>
            <p>Air stream inputs</p>
            <h2 id="mixed-air-inputs-heading">Define the mixing conditions</h2>
          </div>

          <fieldset className={styles.inputSection}>
            <legend>Outdoor Air</legend>
            <div className={styles.segmented} aria-label="Outdoor air condition source">
              <button type="button" aria-pressed={form.outdoorMode === "manual"} onClick={() => update("outdoorMode", "manual")}>Manual Conditions</button>
              <button type="button" aria-pressed={form.outdoorMode === "weather"} onClick={() => update("outdoorMode", "weather")}>Current Weather</button>
            </div>
            {form.outdoorMode === "weather" ? (
              <div className={styles.weatherBox}>
                <small role="status">Weather data is unavailable. Enter outdoor conditions manually. A production provider has not been enabled because the evaluated keyless service restricts commercial use.</small>
              </div>
            ) : null}
            <div className={styles.fieldGrid}>
              <NumberField id="mixed-air-oa-flow" label={`Airflow (${airflowUnit})`} value={form.outdoorAirflow} error={submittedErrors.get("outdoorAir.airflow")} onChange={(value) => update("outdoorAirflow", value)} />
              <NumberField id="mixed-air-oa-db" label={`Dry Bulb (${temperatureUnit})`} value={form.outdoorDryBulb} error={submittedErrors.get("outdoorAir.dryBulb")} onChange={(value) => update("outdoorDryBulb", value)} />
              <NumberField id="mixed-air-oa-rh" label="Relative Humidity (%)" value={form.outdoorRelativeHumidity} error={submittedErrors.get("outdoorAir.relativeHumidity")} onChange={(value) => update("outdoorRelativeHumidity", value)} />
            </div>
          </fieldset>

          <fieldset className={styles.inputSection}>
            <legend>Return Air</legend>
            <div className={styles.fieldGrid}>
              <NumberField id="mixed-air-ra-flow" label={`Airflow (${airflowUnit})`} value={form.returnAirflow} error={submittedErrors.get("returnAir.airflow")} onChange={(value) => update("returnAirflow", value)} />
              <NumberField id="mixed-air-ra-db" label={`Dry Bulb (${temperatureUnit})`} value={form.returnDryBulb} error={submittedErrors.get("returnAir.dryBulb")} onChange={(value) => update("returnDryBulb", value)} />
              <NumberField id="mixed-air-ra-rh" label="Relative Humidity (%)" value={form.returnRelativeHumidity} error={submittedErrors.get("returnAir.relativeHumidity")} onChange={(value) => update("returnRelativeHumidity", value)} />
            </div>
          </fieldset>

          <fieldset className={styles.inputSection}>
            <legend>Project Conditions</legend>
            <div className={styles.fieldGrid}>
              <label className={styles.field}>Unit system<select value={form.unitSystem} onChange={(event) => { setSolution(undefined); setForm((current) => switchMixedAirUnits(current, event.target.value as "IP" | "SI")); }}><option>IP</option><option>SI</option></select></label>
              <label className={styles.field}>Pressure input<select value={form.pressureMode} onChange={(event) => update("pressureMode", event.target.value)}><option value="elevation">Elevation</option><option value="manual">Manual Pressure</option></select></label>
              <NumberField id="mixed-air-project-condition" label={form.pressureMode === "elevation" ? `Elevation (${form.unitSystem === "IP" ? "ft" : "m"})` : `Pressure (${form.unitSystem === "IP" ? "psi" : "kPa"})`} value={form[pressureField]} error={submittedErrors.get(pressureField)} onChange={(value) => update(pressureField, value)} />
            </div>
          </fieldset>

          {generalError ? <p className={styles.errorSummary} role="alert">{generalError}</p> : null}
          <button className={styles.calculateButton} type="submit" disabled={!liveValidation.ok && submittedErrors.size > 0}>Calculate Mixed Air</button>
          <p className={styles.submitHint}>Press Enter from any calculator field to calculate.</p>
        </form>
      </div>
      {solution ? <MixedAirResults solution={solution} /> : (
        <section className={styles.resultsPlaceholder} aria-label="Mixed-air results">
          <p>Enter both air streams and calculate to see the complete mixed-air state.</p>
        </section>
      )}
    </div>
  );
}

function NumberField({ id, label, value, error, onChange }: { id: string; label: string; value: string; error?: string; onChange: (value: string) => void }) {
  const errorId = `${id}-error`;
  return (
    <label className={styles.field} htmlFor={id}>
      <span>{label}</span>
      <input id={id} type="number" inputMode="decimal" step="any" value={value} aria-invalid={error ? true : undefined} aria-describedby={error ? errorId : undefined} onChange={(event) => onChange(event.target.value)} />
      {error ? <small id={errorId} className={styles.fieldError}>{error}</small> : null}
    </label>
  );
}
