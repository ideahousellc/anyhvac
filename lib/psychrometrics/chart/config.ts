import type {
  ChartPressureCondition,
  PsychrometricChartConfig,
} from "./types";
import type { UnitSystem } from "../types";

export const DEFAULT_MAX_HUMIDITY_RATIO = 200 / 7_000;

const DEFAULT_PRESSURE_CONDITION: ChartPressureCondition = {
  pressureMode: "elevation",
  elevation: 0,
};

export function createDefaultChartConfig(
  unitSystem: UnitSystem,
  pressureCondition: ChartPressureCondition = DEFAULT_PRESSURE_CONDITION,
): PsychrometricChartConfig {
  if (unitSystem === "IP") {
    return {
      unitSystem,
      pressureCondition: { ...pressureCondition },
      dryBulbDomain: { min: -20, max: 130 },
      humidityRatioDomain: { min: 0, max: DEFAULT_MAX_HUMIDITY_RATIO },
      temperatureSampleInterval: 0.5,
      dryBulbGridInterval: 10,
      humidityRatioGridInterval: 20 / 7_000,
      intersectionTolerance: 1e-10,
    };
  }

  return {
    unitSystem,
    pressureCondition: { ...pressureCondition },
    dryBulbDomain: { min: -30, max: 55 },
    humidityRatioDomain: { min: 0, max: DEFAULT_MAX_HUMIDITY_RATIO },
    // 0.5 F expressed as an exact Celsius interval.
    temperatureSampleInterval: 5 / 18,
    dryBulbGridInterval: 5,
    humidityRatioGridInterval: 0.002,
    intersectionTolerance: 1e-10,
  };
}
