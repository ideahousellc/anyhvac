/** Converts a humidity ratio to the common IP display unit. */
export function humidityRatioToGrainsPerPound(humidityRatio: number): number {
  return humidityRatio * 7_000;
}

/** Converts a humidity ratio to the common SI display unit. */
export function humidityRatioToGramsPerKilogram(humidityRatio: number): number {
  return humidityRatio * 1_000;
}

export function pascalsToKilopascals(pressure: number): number {
  return pressure / 1_000;
}
