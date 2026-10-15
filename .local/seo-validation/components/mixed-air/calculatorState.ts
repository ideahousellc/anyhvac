import type { PressureMode, UnitSystem } from "../../lib/psychrometrics";
import type { CurrentWeather } from "../../lib/weather";
import {
  calculateMixedAir,
  type MixedAirInput,
  type MixedAirResult,
  type MixedAirValidationField,
} from "../../lib/psychrometrics/mixing";

const METRES_PER_FOOT = 0.3048;
const PASCALS_PER_PSI = 6_894.757293168;

export type OutdoorInputMode = "manual" | "weather";

export type MixedAirFormState = {
  unitSystem: UnitSystem;
  outdoorMode: OutdoorInputMode;
  outdoorAirflow: string;
  outdoorDryBulb: string;
  outdoorRelativeHumidity: string;
  returnAirflow: string;
  returnDryBulb: string;
  returnRelativeHumidity: string;
  pressureMode: PressureMode;
  elevation: string;
  pressure: string;
};

export const DEFAULT_MIXED_AIR_FORM: MixedAirFormState = {
  unitSystem: "IP",
  outdoorMode: "manual",
  outdoorAirflow: "500",
  outdoorDryBulb: "90",
  outdoorRelativeHumidity: "50",
  returnAirflow: "1500",
  returnDryBulb: "75",
  returnRelativeHumidity: "50",
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
  return (value - 32) * 5 / 9;
}

export function celsiusToFahrenheit(value: number): number {
  return value * 9 / 5 + 32;
}

export function buildMixedAirInput(form: MixedAirFormState): MixedAirInput {
  const base = {
    unitSystem: form.unitSystem,
    outdoorAir: {
      airflow: parseNumber(form.outdoorAirflow),
      dryBulb: parseNumber(form.outdoorDryBulb),
      relativeHumidity: parseNumber(form.outdoorRelativeHumidity),
    },
    returnAir: {
      airflow: parseNumber(form.returnAirflow),
      dryBulb: parseNumber(form.returnDryBulb),
      relativeHumidity: parseNumber(form.returnRelativeHumidity),
    },
  };
  return form.pressureMode === "elevation"
    ? { ...base, pressureMode: "elevation", elevation: parseNumber(form.elevation) }
    : {
        ...base,
        pressureMode: "manual",
        pressure: parseNumber(form.pressure),
        pressureUnit: form.unitSystem === "IP" ? "psi" : "kPa",
      };
}

export function calculateMixedAirForm(form: MixedAirFormState): MixedAirResult {
  return calculateMixedAir(buildMixedAirInput(form));
}

export function switchMixedAirUnits(
  form: MixedAirFormState,
  unitSystem: UnitSystem,
): MixedAirFormState {
  if (form.unitSystem === unitSystem) return form;
  const toSI = unitSystem === "SI";
  const convertTemperature = (value: string) => {
    const parsed = parseNumber(value);
    return Number.isFinite(parsed)
      ? formatInput(toSI ? fahrenheitToCelsius(parsed) : celsiusToFahrenheit(parsed))
      : value;
  };
  const elevation = parseNumber(form.elevation);
  const pressure = parseNumber(form.pressure);

  return {
    ...form,
    unitSystem,
    outdoorAirflow: Number.isFinite(parseNumber(form.outdoorAirflow))
      ? formatInput(toSI ? parseNumber(form.outdoorAirflow) * 0.47194745 : parseNumber(form.outdoorAirflow) / 0.47194745)
      : form.outdoorAirflow,
    outdoorDryBulb: convertTemperature(form.outdoorDryBulb),
    returnAirflow: Number.isFinite(parseNumber(form.returnAirflow))
      ? formatInput(toSI ? parseNumber(form.returnAirflow) * 0.47194745 : parseNumber(form.returnAirflow) / 0.47194745)
      : form.returnAirflow,
    returnDryBulb: convertTemperature(form.returnDryBulb),
    elevation: Number.isFinite(elevation)
      ? formatInput(toSI ? elevation * METRES_PER_FOOT : elevation / METRES_PER_FOOT)
      : form.elevation,
    pressure: Number.isFinite(pressure)
      ? formatInput(toSI ? pressure * PASCALS_PER_PSI / 1_000 : pressure * 1_000 / PASCALS_PER_PSI)
      : form.pressure,
  };
}

export function fieldErrors(result: MixedAirResult): Map<MixedAirValidationField, string> {
  return result.ok
    ? new Map()
    : new Map(result.errors.map((error) => [error.field, error.message]));
}

export function airflowStrokeWidths(outdoorAirflow: number, returnAirflow: number) {
  const total = Math.max(0, outdoorAirflow) + Math.max(0, returnAirflow);
  const share = (value: number) => total > 0 ? Math.max(0, value) / total : 0.5;
  const width = (value: number) => 7 + Math.min(1, Math.max(0, share(value))) * 15;
  return { outdoor: width(outdoorAirflow), return: width(returnAirflow), mixed: 22 };
}

export function weatherAutofillValues(
  weather: CurrentWeather,
  unitSystem: UnitSystem,
): Pick<MixedAirFormState, "outdoorDryBulb" | "outdoorRelativeHumidity"> {
  return {
    outdoorDryBulb: String(
      unitSystem === "IP"
        ? weather.temperatureFahrenheit
        : weather.temperatureCelsius,
    ),
    outdoorRelativeHumidity: String(weather.relativeHumidity),
  };
}
