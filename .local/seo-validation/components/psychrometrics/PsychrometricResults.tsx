import {
  humidityRatioToGrainsPerPound,
  humidityRatioToGramsPerKilogram,
  pascalsToKilopascals,
  type PsychrometricState,
} from "../../lib/psychrometrics";

import styles from "./PsychrometricCalculator.module.css";

type PsychrometricResultsProps = {
  state: PsychrometricState;
};

type ResultItem = {
  label: string;
  value: string;
};

export function formatPsychrometricResults(
  state: PsychrometricState,
): ResultItem[] {
  const isIP = state.unitSystem === "IP";
  const temperatureUnit = isIP ? "°F" : "°C";
  const humidityRatio = isIP
    ? `${humidityRatioToGrainsPerPound(state.humidityRatio).toFixed(1)} grains/lb`
    : `${humidityRatioToGramsPerKilogram(state.humidityRatio).toFixed(2)} g/kg`;
  const vaporPressure = isIP
    ? `${state.vaporPressure.toFixed(4)} psi`
    : `${pascalsToKilopascals(state.vaporPressure).toFixed(3)} kPa`;
  const atmosphericPressure = isIP
    ? `${state.atmosphericPressure.toFixed(3)} psi`
    : `${pascalsToKilopascals(state.atmosphericPressure).toFixed(2)} kPa`;

  return [
    { label: "Dry Bulb", value: `${state.dryBulb.toFixed(1)} ${temperatureUnit}` },
    { label: "Wet Bulb", value: `${state.wetBulb.toFixed(1)} ${temperatureUnit}` },
    { label: "Dew Point", value: `${state.dewPoint.toFixed(1)} ${temperatureUnit}` },
    { label: "Relative Humidity", value: `${state.relativeHumidity.toFixed(1)}%` },
    { label: "Humidity Ratio", value: humidityRatio },
    {
      label: "Enthalpy",
      value: `${state.enthalpy.toFixed(1)} ${isIP ? "Btu/lb" : "kJ/kg"}`,
    },
    {
      label: "Specific Volume",
      value: `${state.specificVolume.toFixed(isIP ? 2 : 3)} ${isIP ? "ft³/lb" : "m³/kg"}`,
    },
    { label: "Vapor Pressure", value: vaporPressure },
    {
      label: "Degree of Saturation",
      value: `${(state.degreeOfSaturation * 100).toFixed(1)}%`,
    },
    { label: "Atmospheric Pressure", value: atmosphericPressure },
  ];
}

export function PsychrometricResults({ state }: PsychrometricResultsProps) {
  return (
    <section className={styles.results} aria-labelledby="psychrometric-results-heading">
      <div className={styles.sectionHeading}>
        <p>Calculated state</p>
        <h2 id="psychrometric-results-heading">Results</h2>
      </div>
      <dl className={styles.resultGrid}>
        {formatPsychrometricResults(state).map((item) => (
          <div key={item.label}>
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
