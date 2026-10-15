import psychrolib from "psychrolib";

import type {
  PsychrometricCalculationResult,
  PsychrometricInput,
  PsychrometricState,
  PsychrometricValidationError,
} from "./types";
import { validatePsychrometricInput } from "./validation";

type BackendValues = readonly [
  humidityRatio: number,
  secondaryTemperature: number,
  relativeHumidityOrDewPoint: number,
  vaporPressure: number,
  enthalpy: number,
  specificVolume: number,
  degreeOfSaturation: number,
];

function calculationError(
  code: "INVALID_DERIVED_PRESSURE" | "CALCULATION_FAILED",
  message: string,
): PsychrometricCalculationResult {
  const error: PsychrometricValidationError = {
    field: code === "INVALID_DERIVED_PRESSURE" ? "elevation" : "calculation",
    code,
    message,
  };
  return { ok: false, errors: [error] };
}

function normalizeManualPressure(input: PsychrometricInput): number {
  if (input.pressureMode !== "manual") {
    throw new Error("Manual pressure requested for an elevation input.");
  }

  return input.unitSystem === "SI" && input.pressureUnit === "kPa"
    ? input.pressure * 1_000
    : input.pressure;
}

function assertFiniteState(state: PsychrometricState): void {
  for (const value of Object.values(state)) {
    if (typeof value === "number" && !Number.isFinite(value)) {
      throw new Error("PsychroLib returned a non-finite value.");
    }
  }
}

/**
 * Calculates one complete state without exposing PsychroLib or its mutable unit
 * setting. The unit selection and all backend calls form one synchronous section,
 * so request callbacks cannot interleave inside it in a JavaScript isolate.
 */
export function calculatePsychrometricState(
  input: PsychrometricInput,
): PsychrometricCalculationResult {
  const errors = validatePsychrometricInput(input);
  if (errors.length > 0) {
    return { ok: false, errors };
  }

  try {
    psychrolib.SetUnitSystem(input.unitSystem === "IP" ? psychrolib.IP : psychrolib.SI);

    const atmosphericPressure =
      input.pressureMode === "manual"
        ? normalizeManualPressure(input)
        : psychrolib.GetStandardAtmPressure(input.elevation);

    if (!Number.isFinite(atmosphericPressure) || atmosphericPressure <= 0) {
      return calculationError(
        "INVALID_DERIVED_PRESSURE",
        "Elevation does not produce a finite, positive standard atmospheric pressure.",
      );
    }

    let values: BackendValues;
    let wetBulb: number;
    let dewPoint: number;
    let relativeHumidity: number;

    if (input.moistureMode === "relativeHumidity") {
      values = psychrolib.CalcPsychrometricsFromRelHum(
        input.dryBulb,
        input.moistureValue / 100,
        atmosphericPressure,
      );
      wetBulb = values[1];
      dewPoint = values[2];
      relativeHumidity = input.moistureValue;
    } else if (input.moistureMode === "wetBulb") {
      values = psychrolib.CalcPsychrometricsFromTWetBulb(
        input.dryBulb,
        input.moistureValue,
        atmosphericPressure,
      );
      wetBulb = input.moistureValue;
      dewPoint = values[1];
      relativeHumidity = values[2] * 100;
    } else {
      values = psychrolib.CalcPsychrometricsFromTDewPoint(
        input.dryBulb,
        input.moistureValue,
        atmosphericPressure,
      );
      wetBulb = values[1];
      dewPoint = input.moistureValue;
      relativeHumidity = values[2] * 100;
    }

    const state: PsychrometricState = {
      unitSystem: input.unitSystem,
      dryBulb: input.dryBulb,
      wetBulb,
      dewPoint,
      relativeHumidity,
      humidityRatio: values[0],
      vaporPressure: values[3],
      // PsychroLib returns J/kg for SI; the AnyHVAC contract uses kJ/kg.
      enthalpy: input.unitSystem === "SI" ? values[4] / 1_000 : values[4],
      specificVolume: values[5],
      degreeOfSaturation: values[6],
      atmosphericPressure,
    };
    assertFiniteState(state);
    return { ok: true, value: state };
  } catch {
    return calculationError(
      "CALCULATION_FAILED",
      "The psychrometric state could not be calculated for the supplied inputs.",
    );
  }
}
