import {
  calculatePsychrometricState,
  type MoistureMode,
  type PsychrometricCalculationResult,
  type PsychrometricInput,
  type PsychrometricState,
  type PressureMode,
  type UnitSystem,
} from "../../lib/psychrometrics";
import {
  createDefaultChartConfig,
  generatePsychrometricChartGeometry,
  type PsychrometricChartGeometry,
  type PsychrometricChartGeometryResult,
} from "../../lib/psychrometrics/chart";

const PASCALS_PER_PSI = 6_894.757293168;
const METRES_PER_FOOT = 0.3048;

export type CalculatorFormState = {
  unitSystem: UnitSystem;
  moistureMode: MoistureMode;
  dryBulb: string;
  moistureValue: string;
  pressureMode: PressureMode;
  elevation: string;
  pressure: string;
};

export const DEFAULT_CALCULATOR_FORM: CalculatorFormState = {
  unitSystem: "IP",
  moistureMode: "relativeHumidity",
  dryBulb: "75",
  moistureValue: "50",
  pressureMode: "elevation",
  elevation: "0",
  pressure: "14.696",
};

function parseNumber(value: string): number {
  return value.trim() === "" ? Number.NaN : Number(value);
}

function formatInput(value: number): string {
  return String(Number(value.toFixed(6)));
}

export function fahrenheitToCelsius(value: number): number {
  return (value - 32) * (5 / 9);
}

export function celsiusToFahrenheit(value: number): number {
  return value * (9 / 5) + 32;
}

export function buildPsychrometricInput(
  form: CalculatorFormState,
): PsychrometricInput {
  const common = {
    unitSystem: form.unitSystem,
    dryBulb: parseNumber(form.dryBulb),
    moistureMode: form.moistureMode,
    moistureValue: parseNumber(form.moistureValue),
  };

  return form.pressureMode === "elevation"
    ? {
        ...common,
        pressureMode: "elevation",
        elevation: parseNumber(form.elevation),
      }
    : {
        ...common,
        pressureMode: "manual",
        pressure: parseNumber(form.pressure),
        pressureUnit: form.unitSystem === "IP" ? "psi" : "kPa",
      };
}

export function calculateSelectedState(
  form: CalculatorFormState,
): PsychrometricCalculationResult {
  return calculatePsychrometricState(buildPsychrometricInput(form));
}

export function generateChartForForm(
  form: CalculatorFormState,
): PsychrometricChartGeometryResult {
  return generateChartForPressure(
    form.unitSystem,
    form.pressureMode,
    form.elevation,
    form.pressure,
  );
}

export function generateChartForPressure(
  unitSystem: UnitSystem,
  pressureMode: PressureMode,
  elevation: string,
  pressure: string,
): PsychrometricChartGeometryResult {
  const pressureCondition =
    pressureMode === "elevation"
      ? {
          pressureMode: "elevation" as const,
          elevation: parseNumber(elevation),
        }
      : {
          pressureMode: "manual" as const,
          pressure: parseNumber(pressure),
          pressureUnit: unitSystem === "IP" ? ("psi" as const) : ("kPa" as const),
        };

  return generatePsychrometricChartGeometry(
    createDefaultChartConfig(unitSystem, pressureCondition),
  );
}

function temperatureForMode(
  state: PsychrometricState,
  mode: MoistureMode,
): number {
  if (mode === "relativeHumidity") return state.relativeHumidity;
  if (mode === "wetBulb") return state.wetBulb;
  return state.dewPoint;
}

export function switchMoistureMode(
  form: CalculatorFormState,
  state: PsychrometricState | undefined,
  moistureMode: MoistureMode,
): CalculatorFormState {
  return {
    ...form,
    moistureMode,
    moistureValue: state
      ? formatInput(temperatureForMode(state, moistureMode))
      : form.moistureValue,
  };
}

export function switchUnitSystem(
  form: CalculatorFormState,
  state: PsychrometricState | undefined,
  unitSystem: UnitSystem,
): CalculatorFormState {
  if (form.unitSystem === unitSystem) return form;

  const toSI = unitSystem === "SI";
  const sourceDryBulb = state?.dryBulb ?? parseNumber(form.dryBulb);
  const sourceMoisture = state
    ? temperatureForMode(state, form.moistureMode)
    : parseNumber(form.moistureValue);
  const convertedDryBulb = toSI
    ? fahrenheitToCelsius(sourceDryBulb)
    : celsiusToFahrenheit(sourceDryBulb);
  const convertedMoisture =
    form.moistureMode === "relativeHumidity"
      ? sourceMoisture
      : toSI
        ? fahrenheitToCelsius(sourceMoisture)
        : celsiusToFahrenheit(sourceMoisture);
  const sourceElevation = parseNumber(form.elevation);
  const convertedElevation = toSI
    ? sourceElevation * METRES_PER_FOOT
    : sourceElevation / METRES_PER_FOOT;
  const sourcePressure = state?.atmosphericPressure ?? parseNumber(form.pressure);
  const convertedPressure = toSI
    ? sourcePressure * PASCALS_PER_PSI / 1_000
    : sourcePressure / PASCALS_PER_PSI;

  return {
    ...form,
    unitSystem,
    dryBulb: formatInput(convertedDryBulb),
    moistureValue: formatInput(convertedMoisture),
    elevation: formatInput(convertedElevation),
    pressure: formatInput(convertedPressure),
  };
}

export function switchPressureMode(
  form: CalculatorFormState,
  state: PsychrometricState | undefined,
  pressureMode: PressureMode,
): CalculatorFormState {
  if (form.pressureMode === pressureMode) return form;

  const pressure = state
    ? form.unitSystem === "IP"
      ? state.atmosphericPressure
      : state.atmosphericPressure / 1_000
    : parseNumber(form.pressure);

  return {
    ...form,
    pressureMode,
    pressure: formatInput(pressure),
  };
}

export function isStateInsideChart(
  state: PsychrometricState,
  geometry: PsychrometricChartGeometry,
): boolean {
  return (
    state.dryBulb >= geometry.dryBulbDomain.min &&
    state.dryBulb <= geometry.dryBulbDomain.max &&
    state.humidityRatio >= geometry.humidityRatioDomain.min &&
    state.humidityRatio <= geometry.humidityRatioDomain.max
  );
}
