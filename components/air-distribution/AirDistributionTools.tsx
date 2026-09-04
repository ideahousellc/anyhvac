"use client";

import Link from "next/link";
import { useRef, useState } from "react";

import { InfoTip } from "@/components/units-and-terms/UnitsAndTerms";

import styles from "./AirDistributionTools.module.css";
import { SystemPressureLoss } from "./SystemPressureLoss";

type ModuleId = "airflow" | "ach" | "friction" | "system-pressure";
type AirflowSolveFor = "airflow" | "velocity" | "area";
type AchMode = "ach" | "cfm";

type AirflowResult = {
  airflow: number;
  velocity: number;
  area: number;
};

type AchResult = {
  volume: number;
  value: number;
};

type FrictionResult = {
  totalLosses: number;
  availableStatic: number;
  frictionRate: number | null;
};

type ComponentRow = {
  id: number;
  label: string;
  pressureDrop: string;
};

const MODULES: { id: ModuleId; label: string }[] = [
  { id: "airflow", label: "Airflow & Velocity" },
  { id: "ach", label: "Air Changes" },
  { id: "friction", label: "Friction Rate" },
  { id: "system-pressure", label: "System Pressure Loss" },
];

const INITIAL_COMPONENTS: ComponentRow[] = [
  { id: 1, label: "Filter", pressureDrop: "" },
  { id: 2, label: "Coil", pressureDrop: "" },
  { id: 3, label: "Supply outlet", pressureDrop: "" },
  { id: 4, label: "Return grille", pressureDrop: "" },
  { id: 5, label: "Other", pressureDrop: "" },
];

function positiveNumber(value: string) {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function nonNegativeNumber(value: string) {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function formatNumber(
  value: number,
  maximumFractionDigits = 2,
  minimumFractionDigits = 0,
) {
  return value.toLocaleString(undefined, {
    maximumFractionDigits,
    minimumFractionDigits,
  });
}

function NumberField({
  id,
  label,
  unit,
  value,
  onChange,
  step = "any",
  helpText,
}: {
  id: string;
  label: string;
  unit: string;
  value: string;
  onChange: (value: string) => void;
  step?: string;
  helpText?: string;
}) {
  return (
    <div className={styles.field}>
      <div className={styles.fieldLabel}>
        <label htmlFor={id}>{label}</label>
        {helpText ? <InfoTip label={label}>{helpText}</InfoTip> : null}
      </div>
      <span className={styles.inputRow}>
        <input
          id={id}
          type="number"
          min="0"
          step={step}
          inputMode="decimal"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <span>{unit}</span>
      </span>
    </div>
  );
}

function Result({ label, value, unit, helpText }: { label: string; value: string; unit: string; helpText?: string }) {
  return (
    <div className={styles.resultCard}>
      <div className={styles.resultLabel}>
        <span>{label}</span>
        {helpText ? <InfoTip label={label}>{helpText}</InfoTip> : null}
      </div>
      <strong>{value}</strong>
      <small>{unit}</small>
    </div>
  );
}

function AirflowCalculator() {
  const [solveFor, setSolveFor] = useState<AirflowSolveFor>("area");
  const [airflow, setAirflow] = useState("");
  const [velocity, setVelocity] = useState("");
  const [area, setArea] = useState("");
  const [diameter, setDiameter] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [result, setResult] = useState<AirflowResult | null>(null);
  const [message, setMessage] = useState("");

  const roundDiameter = positiveNumber(diameter);
  const roundArea = roundDiameter === null ? null : Math.PI * (roundDiameter / 12) ** 2 / 4;
  const rectangleWidth = positiveNumber(width);
  const rectangleHeight = positiveNumber(height);
  const rectangularArea =
    rectangleWidth === null || rectangleHeight === null
      ? null
      : (rectangleWidth / 12) * (rectangleHeight / 12);

  function applyGeometryArea(value: number | null, geometry: string) {
    if (value === null || value <= 0) {
      setMessage(`Enter valid positive ${geometry} dimensions first.`);
      return;
    }
    setArea(String(Number(value.toFixed(6))));
    setSolveFor((current) => (current === "area" ? "airflow" : current));
    setResult(null);
    setMessage("");
  }

  function calculate() {
    const q = positiveNumber(airflow);
    const v = positiveNumber(velocity);
    const a = positiveNumber(area);

    if (solveFor === "airflow") {
      if (v === null || a === null) {
        setResult(null);
        setMessage("Enter positive velocity and area values to calculate airflow.");
        return;
      }
      const next = { airflow: v * a, velocity: v, area: a };
      setAirflow(String(Number(next.airflow.toFixed(6))));
      setResult(next);
    } else if (solveFor === "velocity") {
      if (q === null || a === null) {
        setResult(null);
        setMessage("Enter positive airflow and area values to calculate velocity.");
        return;
      }
      const next = { airflow: q, velocity: q / a, area: a };
      setVelocity(String(Number(next.velocity.toFixed(6))));
      setResult(next);
    } else {
      if (q === null || v === null) {
        setResult(null);
        setMessage("Enter positive airflow and velocity values to calculate area.");
        return;
      }
      const next = { airflow: q, velocity: v, area: q / v };
      setArea(String(Number(next.area.toFixed(6))));
      setResult(next);
    }
    setMessage("");
  }

  return (
    <div className={styles.moduleGrid}>
      <section className={styles.inputPanel} aria-labelledby="airflow-inputs-title">
        <div className={styles.panelHeading}>
          <p>Q = V × A</p>
          <h2 id="airflow-inputs-title">Airflow, velocity &amp; area</h2>
        </div>

        <label className={styles.selectField} htmlFor="airflow-solve-for">
          <span>Solve for</span>
          <select
            id="airflow-solve-for"
            value={solveFor}
            onChange={(event) => {
              setSolveFor(event.target.value as AirflowSolveFor);
              setResult(null);
              setMessage("");
            }}
          >
            <option value="airflow">Airflow</option>
            <option value="velocity">Velocity</option>
            <option value="area">Area</option>
          </select>
        </label>

        <div className={styles.fieldGrid}>
          <NumberField id="airflow-cfm" label="Airflow" unit="CFM" value={airflow} onChange={setAirflow} />
          <NumberField id="airflow-fpm" label="Velocity" unit="FPM" value={velocity} onChange={setVelocity} />
          <NumberField id="airflow-area" label="Area" unit="ft²" value={area} onChange={setArea} helpText="Cross-sectional area perpendicular to the direction of airflow." />
        </div>

        <div className={styles.geometryGrid}>
          <div className={styles.geometryCard}>
            <h3>Round geometry</h3>
            <NumberField id="round-diameter" label="Diameter" unit="in" value={diameter} onChange={setDiameter} />
            <p>Calculated area: <strong>{roundArea === null ? "—" : `${formatNumber(roundArea, 4)} ft²`}</strong></p>
            <button type="button" className={styles.secondaryButton} onClick={() => applyGeometryArea(roundArea, "round duct")}>Use round area</button>
          </div>
          <div className={styles.geometryCard}>
            <h3>Rectangular geometry</h3>
            <div className={styles.compactFields}>
              <NumberField id="rectangle-width" label="Width" unit="in" value={width} onChange={setWidth} />
              <NumberField id="rectangle-height" label="Height" unit="in" value={height} onChange={setHeight} />
            </div>
            <p>Calculated area: <strong>{rectangularArea === null ? "—" : `${formatNumber(rectangularArea, 4)} ft²`}</strong></p>
            <button type="button" className={styles.secondaryButton} onClick={() => applyGeometryArea(rectangularArea, "rectangular duct")}>Use rectangular area</button>
          </div>
        </div>

        {message ? <p className={styles.message} role="alert">{message}</p> : null}
        <button type="button" className={styles.primaryButton} onClick={calculate}>Calculate</button>
      </section>

      <section className={styles.resultsPanel} aria-labelledby="airflow-results-title">
        <div className={styles.panelHeading}>
          <p>Calculated results</p>
          <h2 id="airflow-results-title">Air relationship</h2>
        </div>
        <div className={styles.resultsGrid} aria-live="polite">
          <Result label="Airflow" value={result ? formatNumber(result.airflow) : "—"} unit="CFM" />
          <Result label="Velocity" value={result ? formatNumber(result.velocity) : "—"} unit="FPM" />
          <Result label="Area" value={result ? formatNumber(result.area, 4) : "—"} unit="ft²" />
          <Result label="Area" value={result ? formatNumber(result.area * 144, 2) : "—"} unit="in²" />
        </div>
        <p className={styles.formulaNote}>Uses cross-sectional area only. No duct-equivalency or automatic sizing factors are applied.</p>
      </section>
    </div>
  );
}

function AchCalculator() {
  const [mode, setMode] = useState<AchMode>("ach");
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [airflow, setAirflow] = useState("");
  const [desiredAch, setDesiredAch] = useState("");
  const [result, setResult] = useState<AchResult | null>(null);
  const [message, setMessage] = useState("");

  function calculate() {
    const l = positiveNumber(length);
    const w = positiveNumber(width);
    const h = positiveNumber(height);
    if (l === null || w === null || h === null) {
      setResult(null);
      setMessage("Enter positive length, width, and height values.");
      return;
    }
    const volume = l * w * h;
    const source = positiveNumber(mode === "ach" ? airflow : desiredAch);
    if (source === null) {
      setResult(null);
      setMessage(mode === "ach" ? "Enter a positive airflow value." : "Enter a positive desired ACH value.");
      return;
    }
    setResult({ volume, value: mode === "ach" ? source * 60 / volume : source * volume / 60 });
    setMessage("");
  }

  return (
    <div className={styles.moduleGrid}>
      <section className={styles.inputPanel} aria-labelledby="ach-inputs-title">
        <div className={styles.panelHeading}>
          <p>Room air changes</p>
          <h2 id="ach-inputs-title">Air changes per hour</h2>
        </div>
        <div className={styles.modeSwitch} aria-label="Air changes calculation mode">
          <button type="button" className={mode === "ach" ? styles.activeMode : ""} aria-pressed={mode === "ach"} onClick={() => { setMode("ach"); setResult(null); setMessage(""); }}>Calculate ACH</button>
          <button type="button" className={mode === "cfm" ? styles.activeMode : ""} aria-pressed={mode === "cfm"} onClick={() => { setMode("cfm"); setResult(null); setMessage(""); }}>Calculate Required CFM</button>
        </div>
        <div className={styles.fieldGrid}>
          <NumberField id="room-length" label="Length" unit="ft" value={length} onChange={setLength} />
          <NumberField id="room-width" label="Width" unit="ft" value={width} onChange={setWidth} />
          <NumberField id="room-height" label="Height" unit="ft" value={height} onChange={setHeight} />
          {mode === "ach" ? (
            <NumberField id="ach-airflow" label="Airflow" unit="CFM" value={airflow} onChange={setAirflow} />
          ) : (
            <NumberField id="desired-ach" label="Desired air changes" unit="ACH" value={desiredAch} onChange={setDesiredAch} helpText="ACH — Air Changes per Hour. The number of times a space's air volume is replaced in one hour." />
          )}
        </div>
        {message ? <p className={styles.message} role="alert">{message}</p> : null}
        <button type="button" className={styles.primaryButton} onClick={calculate}>Calculate</button>
      </section>

      <section className={styles.resultsPanel} aria-labelledby="ach-results-title">
        <div className={styles.panelHeading}>
          <p>Calculated results</p>
          <h2 id="ach-results-title">Room airflow</h2>
        </div>
        <div className={styles.resultsGrid} aria-live="polite">
          <Result label="Room volume" value={result ? formatNumber(result.volume) : "—"} unit="ft³" />
          <Result label={mode === "ach" ? "Air changes" : "Required airflow"} value={result ? formatNumber(result.value, 2) : "—"} unit={mode === "ach" ? "ACH" : "CFM"} helpText={mode === "ach" ? "ACH — Air Changes per Hour. The number of times a space's air volume is replaced in one hour." : undefined} />
        </div>
        <p className={styles.formulaNote}>Required air-change rates depend on the application and applicable codes or standards.</p>
      </section>
    </div>
  );
}

function FrictionCalculator() {
  const [fanEsp, setFanEsp] = useState("");
  const [tel, setTel] = useState("");
  const [components, setComponents] = useState<ComponentRow[]>(INITIAL_COMPONENTS);
  const nextComponentId = useRef(6);
  const [result, setResult] = useState<FrictionResult | null>(null);
  const [message, setMessage] = useState("");

  function updateComponent(id: number, field: "label" | "pressureDrop", value: string) {
    setComponents((current) => current.map((row) => row.id === id ? { ...row, [field]: value } : row));
  }

  function addComponent() {
    const id = nextComponentId.current++;
    setComponents((current) => [...current, { id, label: "New component", pressureDrop: "" }]);
  }

  function calculate() {
    const fan = nonNegativeNumber(fanEsp);
    const length = positiveNumber(tel);
    if (fan === null) {
      setResult(null);
      setMessage("Enter a valid non-negative fan external static pressure.");
      return;
    }
    if (length === null) {
      setResult(null);
      setMessage("Enter a total effective length greater than zero.");
      return;
    }
    const parsedLosses = components.map((row) => row.pressureDrop.trim() === "" ? 0 : nonNegativeNumber(row.pressureDrop));
    if (parsedLosses.some((value) => value === null)) {
      setResult(null);
      setMessage("Component pressure losses must be blank, zero, or positive numbers.");
      return;
    }
    const totalLosses = parsedLosses.reduce<number>((sum, value) => sum + (value ?? 0), 0);
    const availableStatic = fan - totalLosses;
    setResult({
      totalLosses,
      availableStatic,
      frictionRate: availableStatic < 0 ? null : availableStatic * 100 / length,
    });
    setMessage(availableStatic < 0 ? "Component losses exceed the fan external static pressure. No valid design friction rate is available." : "");
  }

  return (
    <div className={styles.moduleGrid}>
      <section className={styles.inputPanel} aria-labelledby="friction-inputs-title">
        <div className={styles.panelHeading}>
          <p>Available static pressure</p>
          <h2 id="friction-inputs-title">Friction rate inputs</h2>
        </div>
        <NumberField id="fan-esp" label="Fan external static pressure" unit="in.w.g." value={fanEsp} onChange={setFanEsp} step="0.01" helpText="ESP — Static pressure external to the HVAC equipment used to evaluate pressure available for the distribution system." />

        <fieldset className={styles.componentList}>
          <legend>Component pressure losses</legend>
          {components.map((component) => (
            <div className={styles.componentRow} key={component.id}>
              <label>
                <span className={styles.srOnly}>Component label</span>
                <input type="text" value={component.label} onChange={(event) => updateComponent(component.id, "label", event.target.value)} aria-label="Component label" />
              </label>
              <label className={styles.lossInput}>
                <span className={styles.srOnly}>{component.label || "Component"} pressure drop in inches water gauge</span>
                <input type="number" min="0" step="0.01" inputMode="decimal" value={component.pressureDrop} onChange={(event) => updateComponent(component.id, "pressureDrop", event.target.value)} aria-label={`${component.label || "Component"} pressure drop`} />
                <span>in.w.g.</span>
              </label>
              <button type="button" className={styles.removeButton} aria-label={`Remove ${component.label || "component"}`} onClick={() => setComponents((current) => current.filter((row) => row.id !== component.id))}>Remove</button>
            </div>
          ))}
          <button type="button" className={styles.addButton} onClick={addComponent}>+ Add Component</button>
        </fieldset>

        <NumberField id="total-effective-length" label="Total effective length" unit="ft" value={tel} onChange={setTel} helpText="TEL — Effective duct-system length used for friction-rate calculations, including fitting effects where applicable." />
        {message ? <p className={`${styles.message} ${result?.availableStatic !== undefined && result.availableStatic < 0 ? styles.warning : ""}`} role="alert">{message}</p> : null}
        <button type="button" className={styles.primaryButton} onClick={calculate}>Calculate</button>
      </section>

      <section className={styles.resultsPanel} aria-labelledby="friction-results-title">
        <div className={styles.panelHeading}>
          <p>Calculated results</p>
          <h2 id="friction-results-title">Design friction rate</h2>
        </div>
        <div className={styles.resultsGrid} aria-live="polite">
          <Result label="Total component losses" value={result ? formatNumber(result.totalLosses, 3, 2) : "—"} unit="in.w.g." />
          <Result label="Available static pressure" value={result ? formatNumber(result.availableStatic, 3, 2) : "—"} unit="in.w.g." />
          <Result label="Design friction rate" value={result?.frictionRate !== null && result?.frictionRate !== undefined ? formatNumber(result.frictionRate, 3, 2) : "—"} unit="in.w.g./100 ft" helpText="Available static pressure allocated per 100 feet of total effective duct length." />
        </div>
        {result?.frictionRate !== null && result?.frictionRate !== undefined ? (
          <Link className={styles.ductLink} href="/tools/duct-calculator">Open Duct Calculator <span aria-hidden="true">→</span></Link>
        ) : null}
      </section>
    </div>
  );
}

export function AirDistributionTools() {
  const [activeModule, setActiveModule] = useState<ModuleId>("airflow");

  return (
    <div className={styles.tools}>
      <div className={styles.moduleSelector} aria-label="Select an air distribution calculator">
        {MODULES.map((module) => (
          <button
            type="button"
            key={module.id}
            className={activeModule === module.id ? styles.activeModule : ""}
            aria-pressed={activeModule === module.id}
            aria-controls="active-air-distribution-calculator"
            onClick={() => setActiveModule(module.id)}
          >
            {module.label}
          </button>
        ))}
      </div>
      <div id="active-air-distribution-calculator">
        {activeModule === "airflow" ? <AirflowCalculator /> : null}
        {activeModule === "ach" ? <AchCalculator /> : null}
        {activeModule === "friction" ? <FrictionCalculator /> : null}
        {activeModule === "system-pressure" ? <SystemPressureLoss /> : null}
      </div>
    </div>
  );
}
