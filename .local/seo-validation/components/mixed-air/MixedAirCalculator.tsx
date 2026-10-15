"use client";

import gsap from "gsap";
import { useEffect, useMemo, useRef, useState } from "react";

import type { MixedAirSolution } from "../../lib/psychrometrics/mixing";
import type { CurrentWeather } from "../../lib/weather";
import {
  formatWeatherObservationTime,
  requestCurrentWeather,
} from "../../lib/weather/client";
import {
  calculateMixedAirForm,
  DEFAULT_MIXED_AIR_FORM,
  fieldErrors,
  switchMixedAirUnits,
  weatherAutofillValues,
  type MixedAirFormState,
} from "./calculatorState";
import { MixedAirResults } from "./MixedAirResults";
import { MixedAirVisualization } from "./MixedAirVisualization";

import styles from "./MixedAirCalculator.module.css";

export const MIXED_AIR_ANIMATION_DURATION = 1.26;

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
  const [weatherQuery, setWeatherQuery] = useState("");
  const [weather, setWeather] = useState<CurrentWeather>();
  const [weatherStatus, setWeatherStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const timeline = useRef<gsap.core.Timeline | null>(null);
  const weatherRequest = useRef<AbortController | null>(null);
  const outdoorFlow = useRef<SVGPathElement>(null);
  const returnFlow = useRef<SVGPathElement>(null);
  const mixedFlow = useRef<SVGPathElement>(null);
  const mixingFlow = useRef<SVGGElement>(null);
  const mixedLabel = useRef<SVGGElement>(null);
  const liveValidation = useMemo(() => calculateMixedAirForm(form), [form]);

  useEffect(() => () => {
    timeline.current?.kill();
    weatherRequest.current?.abort();
  }, []);

  function update(field: FormField, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setSubmittedErrors(new Map());
  }

  function selectOutdoorMode(mode: "manual" | "weather") {
    if (mode === "manual") weatherRequest.current?.abort();
    update("outdoorMode", mode);
  }

  function playAnimation() {
    timeline.current?.kill();
    const mixingPaths = mixingFlow.current?.querySelectorAll("path") ?? [];
    const animatedElements = [
      outdoorFlow.current,
      returnFlow.current,
      ...mixingPaths,
      mixedFlow.current,
      mixedLabel.current,
    ];
    if (shouldReduceMotion()) {
      gsap.set(animatedElements, { clearProps: "all" });
      return;
    }
    const incoming = [outdoorFlow.current, returnFlow.current];
    timeline.current = gsap.timeline({ defaults: { ease: "power1.out", overwrite: "auto" } })
      .set(incoming, { strokeDasharray: 1, strokeDashoffset: 1, opacity: 0.28 })
      .set(mixingPaths, { strokeDasharray: 1, strokeDashoffset: 1, opacity: 0.06 })
      .set(mixedFlow.current, { strokeDasharray: 1, strokeDashoffset: 1, opacity: 0.08 })
      .set(mixedLabel.current, { opacity: 0.62, scale: 0.99, transformOrigin: "left center" })
      .to(incoming, { strokeDashoffset: 0, opacity: 1, duration: 0.31 }, 0)
      .to(mixingPaths, { strokeDashoffset: 0, opacity: 1, duration: 0.34, stagger: 0.025 }, 0.29)
      .to(mixedFlow.current, { strokeDashoffset: 0, opacity: 1, duration: 0.33 }, 0.65)
      .to(mixedLabel.current, { opacity: 1, scale: 1.018, duration: 0.14 }, 1)
      .to(mixedLabel.current, { scale: 1, duration: 0.12 }, 1.14)
      .set([...incoming, ...mixingPaths, mixedFlow.current], { clearProps: "strokeDasharray,strokeDashoffset,opacity" }, 1.26)
      .set(mixedLabel.current, { clearProps: "transform,opacity" }, 1.26);
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

  async function loadCurrentWeather() {
    weatherRequest.current?.abort();
    const controller = new AbortController();
    weatherRequest.current = controller;
    setWeatherStatus("loading");
    setWeather(undefined);
    try {
      const current = await requestCurrentWeather(weatherQuery, controller.signal);
      if (weatherRequest.current !== controller) return;
      setWeather(current);
      setWeatherStatus("success");
      setForm((existing) => ({
        ...existing,
        ...weatherAutofillValues(current, existing.unitSystem),
      }));
      setSubmittedErrors(new Map());
    } catch {
      if (controller.signal.aborted) return;
      setWeatherStatus("error");
      setWeather(undefined);
    }
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
          mixingFlowRef={mixingFlow}
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
              <button type="button" aria-pressed={form.outdoorMode === "manual"} onClick={() => selectOutdoorMode("manual")}>Manual Conditions</button>
              <button type="button" aria-pressed={form.outdoorMode === "weather"} onClick={() => selectOutdoorMode("weather")}>Current Weather</button>
            </div>
            {form.outdoorMode === "weather" ? (
              <div className={styles.weatherBox}>
                <label htmlFor="mixed-air-location">Location</label>
                <div className={styles.weatherSearch}>
                  <input id="mixed-air-location" value={weatherQuery} onChange={(event) => setWeatherQuery(event.target.value)} placeholder="Cleveland, OH" maxLength={100} />
                  <button type="button" onClick={loadCurrentWeather} disabled={weatherStatus === "loading"}>{weatherStatus === "loading" ? "Loading…" : "Use Current Weather"}</button>
                </div>
                <CurrentWeatherStatus status={weatherStatus} weather={weather} />
                <p className={styles.weatherDisclaimer}><strong>Weather notice:</strong> Weather information displayed here is for general informational convenience only. Conditions are probabilistic and may not be accurate for your specific location or time, and they are not HVAC design conditions. Do not use this data as the sole basis for personal safety, aviation, marine navigation, emergency planning, or other safety-critical decisions. Always consult official meteorological services and relevant authorities when accuracy is critical.</p>
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

export function CurrentWeatherStatus({
  status,
  weather,
}: {
  status: "idle" | "loading" | "success" | "error";
  weather?: CurrentWeather;
}) {
  if (status === "success" && weather) {
    return (
      <div role="status">
        <p className={styles.weatherStatus}>Current conditions loaded for {weather.locationLabel}</p>
        <p className={styles.weatherMeta}>Updated {formatWeatherObservationTime(weather.observedAt)} · <a className={styles.weatherAttribution} href="https://www.weatherapi.com/" target="_blank" rel="noreferrer">Weather data provided by WeatherAPI.com</a></p>
      </div>
    );
  }
  if (status === "error") {
    return <p className={styles.fieldError} role="status">Current weather is unavailable. Enter outdoor conditions manually.</p>;
  }
  return null;
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
