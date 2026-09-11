import type { Metadata } from "next";

import { PsychrometricChart } from "@/components/psychrometrics/PsychrometricChart";
import {
  createDefaultChartConfig,
  generatePsychrometricChartGeometry,
  type ChartPressureCondition,
} from "@/lib/psychrometrics/chart";
import type { UnitSystem } from "@/lib/psychrometrics";

import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Psychrometric Chart Development",
  robots: { index: false, follow: false, nocache: true },
};

type PageSearchParams = Promise<
  Record<string, string | string[] | undefined>
>;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function finiteNumber(value: string | undefined, fallback: number): number {
  const parsed = value === undefined ? Number.NaN : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export default async function PsychrometricChartDevPage({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) {
  const params = await searchParams;
  const unitSystem: UnitSystem = firstValue(params.unit) === "SI" ? "SI" : "IP";
  const pressureMode =
    firstValue(params.pressureMode) === "manual" ? "manual" : "elevation";
  const elevation = finiteNumber(firstValue(params.elevation), 0);
  const manualPressure = finiteNumber(
    firstValue(params.pressure),
    unitSystem === "IP" ? 14.696 : 101.325,
  );
  const pressureCondition: ChartPressureCondition =
    pressureMode === "manual"
      ? {
          pressureMode: "manual",
          pressure: manualPressure,
          pressureUnit: unitSystem === "IP" ? "psi" : "kPa",
        }
      : { pressureMode: "elevation", elevation };
  const result = generatePsychrometricChartGeometry(
    createDefaultChartConfig(unitSystem, pressureCondition),
  );

  return (
    <main className={styles.page}>
      <header className={styles.intro}>
        <p className={styles.eyebrow}>Internal development route</p>
        <h1>Psychrometric chart renderer</h1>
        <p>
          Responsive SVG preview of the locked Phase 2B geometry output. Change
          the engineering context, then regenerate the chart.
        </p>
      </header>

      <form className={styles.controls} method="get">
        <label>
          <span>Unit system</span>
          <select name="unit" defaultValue={unitSystem}>
            <option value="IP">IP</option>
            <option value="SI">SI</option>
          </select>
        </label>
        <label>
          <span>Pressure input</span>
          <select name="pressureMode" defaultValue={pressureMode}>
            <option value="elevation">Elevation</option>
            <option value="manual">Manual pressure</option>
          </select>
        </label>
        {pressureMode === "elevation" ? (
          <label>
            <span>{`Elevation (${unitSystem === "IP" ? "ft" : "m"})`}</span>
            <input
              name="elevation"
              type="number"
              step="any"
              defaultValue={elevation}
            />
          </label>
        ) : (
          <label>
            <span>{`Pressure (${unitSystem === "IP" ? "psi" : "kPa"})`}</span>
            <input
              name="pressure"
              type="number"
              min="0.001"
              step="any"
              defaultValue={manualPressure}
            />
          </label>
        )}
        <button type="submit">Regenerate</button>
      </form>

      {result.ok ? (
        <section className={styles.chartSection} aria-labelledby="chart-heading">
          <div className={styles.chartHeading}>
            <div>
              <p className={styles.context}>Generated geometry</p>
              <h2 id="chart-heading">{`${unitSystem} psychrometric chart`}</h2>
            </div>
            <p className={styles.pressureSummary}>
              {pressureMode === "elevation"
                ? `${elevation.toLocaleString()} ${unitSystem === "IP" ? "ft" : "m"} elevation`
                : `${manualPressure.toLocaleString()} ${unitSystem === "IP" ? "psi" : "kPa"}`}
            </p>
          </div>
          <PsychrometricChart
            geometry={result.value}
            title={`${unitSystem} psychrometric chart`}
            idPrefix={`psychrometric-chart-${unitSystem.toLowerCase()}`}
          />
        </section>
      ) : (
        <section className={styles.error} role="alert">
          <h2>Geometry could not be generated</h2>
          <ul>
            {result.errors.map((error, index) => (
              <li key={`${error.code}-${index}`}>{error.message}</li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
