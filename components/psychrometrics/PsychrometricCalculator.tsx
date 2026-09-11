"use client";

import { useMemo, useState } from "react";

import type {
  MoistureMode,
  PressureMode,
  PsychrometricValidationField,
  UnitSystem,
} from "../../lib/psychrometrics";
import { PsychrometricChart } from "./PsychrometricChart";
import { PsychrometricResults } from "./PsychrometricResults";
import {
  calculateSelectedState,
  DEFAULT_CALCULATOR_FORM,
  generateChartForPressure,
  isStateInsideChart,
  switchMoistureMode,
  switchPressureMode,
  switchUnitSystem,
  type CalculatorFormState,
} from "./calculatorState";

import styles from "./PsychrometricCalculator.module.css";

const MOISTURE_LABELS: Record<MoistureMode, string> = {
  relativeHumidity: "Relative Humidity",
  wetBulb: "Wet Bulb",
  dewPoint: "Dew Point",
};

function errorId(field: PsychrometricValidationField): string {
  return `psychrometric-${field}-error`;
}

export function PsychrometricCalculator({
  initialForm = DEFAULT_CALCULATOR_FORM,
}: {
  initialForm?: CalculatorFormState;
}) {
  const [form, setForm] = useState<CalculatorFormState>(initialForm);
  const calculation = useMemo(() => calculateSelectedState(form), [form]);
  const { unitSystem, pressureMode, elevation, pressure } = form;
  const chartGeometry = useMemo(
    () => generateChartForPressure(unitSystem, pressureMode, elevation, pressure),
    [unitSystem, pressureMode, elevation, pressure],
  );
  const state = calculation.ok ? calculation.value : undefined;
  const fieldErrors = calculation.ok
    ? new Map<PsychrometricValidationField, string>()
    : new Map(calculation.errors.map((error) => [error.field, error.message]));
  const pressureMatches =
    state !== undefined &&
    chartGeometry.ok &&
    Math.abs(state.atmosphericPressure - chartGeometry.value.atmosphericPressure) <=
      Math.max(1e-8, Math.abs(state.atmosphericPressure) * 1e-10);
  const stateInsideChart =
    pressureMatches && state && chartGeometry.ok
      ? isStateInsideChart(state, chartGeometry.value)
      : false;
  const temperatureUnit = form.unitSystem === "IP" ? "°F" : "°C";
  const secondPropertyUnit =
    form.moistureMode === "relativeHumidity" ? "%" : temperatureUnit;
  const pressureField = form.pressureMode === "elevation" ? "elevation" : "pressure";
  const pressureError = fieldErrors.get(pressureField);

  function updateField<K extends keyof CalculatorFormState>(
    field: K,
    value: CalculatorFormState[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <div className={styles.calculator}>
      <div className={styles.workspace}>
        <section
          className={styles.controls}
          aria-labelledby="psychrometric-inputs-heading"
        >
          <div className={styles.sectionHeading}>
            <p>Development inputs</p>
            <h2 id="psychrometric-inputs-heading">Define one air state</h2>
          </div>

          <div className={styles.inputGrid}>
            <label className={styles.field}>
              <span>Unit system</span>
              <select
                value={form.unitSystem}
                onChange={(event) =>
                  setForm((current) =>
                    switchUnitSystem(
                      current,
                      state,
                      event.target.value as UnitSystem,
                    ),
                  )
                }
              >
                <option value="IP">IP</option>
                <option value="SI">SI</option>
              </select>
            </label>

            <label className={styles.field}>
              <span>Moisture input</span>
              <select
                value={form.moistureMode}
                onChange={(event) =>
                  setForm((current) =>
                    switchMoistureMode(
                      current,
                      state,
                      event.target.value as MoistureMode,
                    ),
                  )
                }
              >
                <option value="relativeHumidity">Relative Humidity</option>
                <option value="wetBulb">Wet Bulb</option>
                <option value="dewPoint">Dew Point</option>
              </select>
            </label>

            <label className={styles.field} htmlFor="psychrometric-dry-bulb">
              <span>{`Dry Bulb (${temperatureUnit})`}</span>
              <input
                id="psychrometric-dry-bulb"
                type="number"
                inputMode="decimal"
                step="any"
                value={form.dryBulb}
                aria-invalid={fieldErrors.has("dryBulb") || undefined}
                aria-describedby={
                  fieldErrors.has("dryBulb") ? errorId("dryBulb") : undefined
                }
                onChange={(event) => updateField("dryBulb", event.target.value)}
              />
              {fieldErrors.get("dryBulb") ? (
                <small id={errorId("dryBulb")} className={styles.fieldError}>
                  {fieldErrors.get("dryBulb")}
                </small>
              ) : null}
            </label>

            <label className={styles.field} htmlFor="psychrometric-moisture-value">
              <span>{`${MOISTURE_LABELS[form.moistureMode]} (${secondPropertyUnit})`}</span>
              <input
                id="psychrometric-moisture-value"
                type="number"
                inputMode="decimal"
                step="any"
                value={form.moistureValue}
                aria-invalid={fieldErrors.has("moistureValue") || undefined}
                aria-describedby={
                  fieldErrors.has("moistureValue")
                    ? errorId("moistureValue")
                    : undefined
                }
                onChange={(event) => updateField("moistureValue", event.target.value)}
              />
              {fieldErrors.get("moistureValue") ? (
                <small id={errorId("moistureValue")} className={styles.fieldError}>
                  {fieldErrors.get("moistureValue")}
                </small>
              ) : null}
            </label>

            <label className={styles.field}>
              <span>Pressure input</span>
              <select
                value={form.pressureMode}
                onChange={(event) =>
                  setForm((current) =>
                    switchPressureMode(
                      current,
                      state,
                      event.target.value as PressureMode,
                    ),
                  )
                }
              >
                <option value="elevation">Elevation</option>
                <option value="manual">Manual Pressure</option>
              </select>
            </label>

            <label className={styles.field} htmlFor="psychrometric-pressure-value">
              <span>
                {form.pressureMode === "elevation"
                  ? `Elevation (${form.unitSystem === "IP" ? "ft" : "m"})`
                  : `Pressure (${form.unitSystem === "IP" ? "psi" : "kPa"})`}
              </span>
              <input
                id="psychrometric-pressure-value"
                type="number"
                inputMode="decimal"
                step="any"
                value={
                  form.pressureMode === "elevation" ? form.elevation : form.pressure
                }
                aria-invalid={pressureError ? true : undefined}
                aria-describedby={pressureError ? errorId(pressureField) : undefined}
                onChange={(event) =>
                  updateField(
                    form.pressureMode === "elevation" ? "elevation" : "pressure",
                    event.target.value,
                  )
                }
              />
              {pressureError ? (
                <small id={errorId(pressureField)} className={styles.fieldError}>
                  {pressureError}
                </small>
              ) : null}
            </label>
          </div>

          {!calculation.ok ? (
            <div className={styles.errorSummary} role="alert">
              Correct the highlighted input to calculate and plot the state.
            </div>
          ) : null}
        </section>

        {state ? (
          <PsychrometricResults state={state} />
        ) : (
          <section className={styles.resultsPlaceholder} aria-live="polite">
            <div className={styles.sectionHeading}>
              <p>Calculated state</p>
              <h2>Results unavailable</h2>
            </div>
            <p>Enter a valid state to view calculated properties.</p>
          </section>
        )}
      </div>

      {chartGeometry.ok ? (
        <section className={styles.chartSection} aria-labelledby="chart-heading">
          <div className={styles.chartHeading}>
            <div className={styles.sectionHeading}>
              <p>Interactive chart</p>
              <h2 id="chart-heading">{`${form.unitSystem} psychrometric chart`}</h2>
            </div>
            {state && !stateInsideChart ? (
              <p className={styles.chartNotice} role="status">
                The calculated state is outside the current chart range and is not plotted.
              </p>
            ) : null}
          </div>
          <PsychrometricChart
            geometry={chartGeometry.value}
            title={`${form.unitSystem} psychrometric chart with selected state`}
            idPrefix={`psychrometric-chart-${form.unitSystem.toLowerCase()}`}
            selectedState={
              stateInsideChart && state
                ? {
                    dryBulb: state.dryBulb,
                    humidityRatio: state.humidityRatio,
                    accessibleLabel: `Selected state: ${state.dryBulb.toFixed(1)} ${temperatureUnit} dry bulb and ${state.relativeHumidity.toFixed(1)}% relative humidity`,
                  }
                : undefined
            }
          />
        </section>
      ) : (
        <section className={styles.chartUnavailable} role="alert">
          <div className={styles.sectionHeading}>
            <p>Interactive chart</p>
            <h2>Chart unavailable</h2>
          </div>
          <p>Enter a valid elevation or atmospheric pressure to regenerate the chart.</p>
        </section>
      )}
    </div>
  );
}
