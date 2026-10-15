import type {
  PressureMode,
  PsychrometricState,
  UnitSystem,
} from "../types";

export type MixedAirStreamInput = {
  airflow: number;
  dryBulb: number;
  relativeHumidity: number;
};

type MixedAirInputBase = {
  unitSystem: UnitSystem;
  outdoorAir: MixedAirStreamInput;
  returnAir: MixedAirStreamInput;
};

export type MixedAirInput = MixedAirInputBase &
  (
    | { pressureMode: "elevation"; elevation: number }
    | { pressureMode: "manual"; pressure: number; pressureUnit?: "psi" | "Pa" | "kPa" }
  );

export type MixedAirValidationField =
  | "outdoorAir.airflow"
  | "outdoorAir.dryBulb"
  | "outdoorAir.relativeHumidity"
  | "returnAir.airflow"
  | "returnAir.dryBulb"
  | "returnAir.relativeHumidity"
  | "elevation"
  | "pressure"
  | "calculation";

export type MixedAirErrorCode =
  | "NOT_FINITE"
  | "NEGATIVE_AIRFLOW"
  | "ZERO_TOTAL_AIRFLOW"
  | "INVALID_RELATIVE_HUMIDITY"
  | "INVALID_PRESSURE"
  | "INVALID_STATE"
  | "SATURATION_REACHED";

export type MixedAirError = {
  field: MixedAirValidationField;
  code: MixedAirErrorCode;
  message: string;
};

export type MixedAirSolution = {
  unitSystem: UnitSystem;
  pressureMode: PressureMode;
  outdoorState: PsychrometricState;
  returnState: PsychrometricState;
  mixedState: PsychrometricState;
  outdoorDryAirMassFlow: number;
  returnDryAirMassFlow: number;
  totalDryAirMassFlow: number;
  totalInputAirflow: number;
  outdoorAirPercent: number;
  returnAirPercent: number;
  mixedHumidityRatio: number;
  mixedEnthalpy: number;
};

export type MixedAirResult =
  | { ok: true; value: MixedAirSolution }
  | { ok: false; errors: MixedAirError[] };
