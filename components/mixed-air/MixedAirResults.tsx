import {
  humidityRatioToGrainsPerPound,
  humidityRatioToGramsPerKilogram,
  pascalsToKilopascals,
} from "../../lib/psychrometrics";
import type { MixedAirSolution } from "../../lib/psychrometrics/mixing";

import styles from "./MixedAirCalculator.module.css";

export function formatMixedAirResults(solution: MixedAirSolution) {
  const state = solution.mixedState;
  const isIP = state.unitSystem === "IP";
  const temperatureUnit = isIP ? "°F" : "°C";
  return [
    { label: "Total Input Airflow", value: `${solution.totalInputAirflow.toLocaleString(undefined, { maximumFractionDigits: 1 })} ${isIP ? "CFM" : "L/s"}` },
    { label: "Outdoor Air", value: `${solution.outdoorAirPercent.toFixed(1)}%` },
    { label: "Return Air", value: `${solution.returnAirPercent.toFixed(1)}%` },
    { label: "Mixed Dry Bulb", value: `${state.dryBulb.toFixed(1)} ${temperatureUnit}` },
    { label: "Mixed Wet Bulb", value: `${state.wetBulb.toFixed(1)} ${temperatureUnit}` },
    { label: "Mixed Dew Point", value: `${state.dewPoint.toFixed(1)} ${temperatureUnit}` },
    { label: "Mixed Relative Humidity", value: `${state.relativeHumidity.toFixed(1)}%` },
    {
      label: "Mixed Humidity Ratio",
      value: isIP
        ? `${humidityRatioToGrainsPerPound(state.humidityRatio).toFixed(1)} grains/lb`
        : `${humidityRatioToGramsPerKilogram(state.humidityRatio).toFixed(2)} g/kg`,
    },
    { label: "Mixed Enthalpy", value: `${state.enthalpy.toFixed(1)} ${isIP ? "Btu/lb" : "kJ/kg"}` },
    { label: "Mixed Specific Volume", value: `${state.specificVolume.toFixed(isIP ? 2 : 3)} ${isIP ? "ft³/lb" : "m³/kg"}` },
    { label: "Atmospheric Pressure", value: isIP ? `${state.atmosphericPressure.toFixed(3)} psi` : `${pascalsToKilopascals(state.atmosphericPressure).toFixed(2)} kPa` },
  ];
}

export function MixedAirResults({ solution }: { solution: MixedAirSolution }) {
  return (
    <section className={styles.results} aria-labelledby="mixed-air-results-heading" aria-live="polite">
      <div className={styles.resultsHeading}>
        <p>Calculated state</p>
        <h2 id="mixed-air-results-heading">Mixed-air results</h2>
      </div>
      <dl className={styles.resultGrid}>
        {formatMixedAirResults(solution).map((item) => (
          <div key={item.label}>
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
