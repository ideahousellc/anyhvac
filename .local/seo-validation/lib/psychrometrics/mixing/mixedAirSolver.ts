import psychrolib from "psychrolib";

import { calculatePsychrometricState } from "../engine";
import type { PsychrometricInput } from "../types";
import type {
  MixedAirError,
  MixedAirInput,
  MixedAirResult,
  MixedAirStreamInput,
} from "./types";
import { validateMixedAirInput } from "./validation";

const SATURATION_TOLERANCE = 1e-9;

function pressureCondition(input: MixedAirInput): Pick<
  PsychrometricInput,
  "pressureMode" | "elevation" | "pressure" | "pressureUnit"
> {
  return input.pressureMode === "elevation"
    ? { pressureMode: "elevation", elevation: input.elevation }
    : {
        pressureMode: "manual",
        pressure: input.pressure,
        pressureUnit: input.pressureUnit ?? (input.unitSystem === "IP" ? "psi" : "Pa"),
      };
}

function stateInput(input: MixedAirInput, stream: MixedAirStreamInput): PsychrometricInput {
  return {
    unitSystem: input.unitSystem,
    dryBulb: stream.dryBulb,
    moistureMode: "relativeHumidity",
    moistureValue: stream.relativeHumidity,
    ...pressureCondition(input),
  } as PsychrometricInput;
}

function calculationError(code: MixedAirError["code"], message: string): MixedAirResult {
  return { ok: false, errors: [{ field: "calculation", code, message }] };
}

export function calculateMixedAir(input: MixedAirInput): MixedAirResult {
  const errors = validateMixedAirInput(input);
  if (errors.length > 0) return { ok: false, errors };

  const outdoorResult = calculatePsychrometricState(stateInput(input, input.outdoorAir));
  const returnResult = calculatePsychrometricState(stateInput(input, input.returnAir));
  if (!outdoorResult.ok || !returnResult.ok) {
    return calculationError(
      "INVALID_STATE",
      "One or both incoming air states could not be calculated.",
    );
  }

  const outdoorState = outdoorResult.value;
  const returnState = returnResult.value;
  const airflowScale = input.unitSystem === "SI" ? 1 / 1_000 : 1;
  const outdoorDryAirMassFlow =
    input.outdoorAir.airflow * airflowScale / outdoorState.specificVolume;
  const returnDryAirMassFlow =
    input.returnAir.airflow * airflowScale / returnState.specificVolume;
  const totalDryAirMassFlow = outdoorDryAirMassFlow + returnDryAirMassFlow;

  if (!Number.isFinite(totalDryAirMassFlow) || totalDryAirMassFlow <= 0) {
    return calculationError("INVALID_STATE", "Dry-air mass flow could not be calculated.");
  }

  const mixedHumidityRatio =
    (outdoorDryAirMassFlow * outdoorState.humidityRatio +
      returnDryAirMassFlow * returnState.humidityRatio) /
    totalDryAirMassFlow;
  const mixedEnthalpy =
    (outdoorDryAirMassFlow * outdoorState.enthalpy +
      returnDryAirMassFlow * returnState.enthalpy) /
    totalDryAirMassFlow;

  try {
    psychrolib.SetUnitSystem(input.unitSystem === "IP" ? psychrolib.IP : psychrolib.SI);
    const backendEnthalpy = input.unitSystem === "SI" ? mixedEnthalpy * 1_000 : mixedEnthalpy;
    const mixedDryBulb = psychrolib.GetTDryBulbFromEnthalpyAndHumRatio(
      backendEnthalpy,
      mixedHumidityRatio,
    );
    const relativeHumidityFraction = psychrolib.GetRelHumFromHumRatio(
      mixedDryBulb,
      mixedHumidityRatio,
      outdoorState.atmosphericPressure,
    );

    if (
      !Number.isFinite(mixedDryBulb) ||
      !Number.isFinite(relativeHumidityFraction) ||
      relativeHumidityFraction >= 1 - SATURATION_TOLERANCE
    ) {
      return calculationError(
        "SATURATION_REACHED",
        "The calculated mixture reaches or exceeds saturation. Condensation may occur, so the standard two-stream adiabatic mixing model is not sufficient for this condition.",
      );
    }

    const mixedResult = calculatePsychrometricState({
      unitSystem: input.unitSystem,
      dryBulb: mixedDryBulb,
      moistureMode: "relativeHumidity",
      moistureValue: relativeHumidityFraction * 100,
      ...pressureCondition(input),
    } as PsychrometricInput);
    if (!mixedResult.ok) {
      return calculationError("INVALID_STATE", "The mixed-air state could not be recovered.");
    }

    const totalInputAirflow = input.outdoorAir.airflow + input.returnAir.airflow;
    return {
      ok: true,
      value: {
        unitSystem: input.unitSystem,
        pressureMode: input.pressureMode,
        outdoorState,
        returnState,
        mixedState: mixedResult.value,
        outdoorDryAirMassFlow,
        returnDryAirMassFlow,
        totalDryAirMassFlow,
        totalInputAirflow,
        outdoorAirPercent: input.outdoorAir.airflow / totalInputAirflow * 100,
        returnAirPercent: input.returnAir.airflow / totalInputAirflow * 100,
        mixedHumidityRatio,
        mixedEnthalpy,
      },
    };
  } catch {
    return calculationError("INVALID_STATE", "The mixed-air state could not be recovered.");
  }
}
