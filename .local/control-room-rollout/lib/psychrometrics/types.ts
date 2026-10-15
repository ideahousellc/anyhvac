export type UnitSystem = "IP" | "SI";

export type MoistureMode =
  | "relativeHumidity"
  | "wetBulb"
  | "dewPoint";

export type PressureMode = "elevation" | "manual";
export type ManualPressureUnit = "psi" | "Pa" | "kPa";

type PsychrometricInputBase = {
  unitSystem: UnitSystem;
  dryBulb: number;
  moistureMode: MoistureMode;
  moistureValue: number;
};

export type PsychrometricInput = PsychrometricInputBase &
  (
    | {
        pressureMode: "elevation";
        /** Elevation in ft for IP or m for SI. */
        elevation: number;
        pressure?: never;
        pressureUnit?: never;
      }
    | {
        pressureMode: "manual";
        /** Actual barometric pressure, not sea-level-adjusted pressure. */
        pressure: number;
        /** Defaults to psi for IP and Pa for SI. */
        pressureUnit?: ManualPressureUnit;
        elevation?: number;
      }
  );

export type PsychrometricState = {
  unitSystem: UnitSystem;
  dryBulb: number;
  wetBulb: number;
  dewPoint: number;
  /** Percentage on the inclusive 0-100 scale. */
  relativeHumidity: number;
  /** lb water/lb dry air in IP; kg/kg in SI. */
  humidityRatio: number;
  /** psi in IP; Pa in SI. */
  vaporPressure: number;
  /** Btu/lb dry air in IP; kJ/kg dry air in SI. */
  enthalpy: number;
  /** ft³/lb dry air in IP; m³/kg dry air in SI. */
  specificVolume: number;
  degreeOfSaturation: number;
  /** psi in IP; Pa in SI. */
  atmosphericPressure: number;
};

export type PsychrometricValidationField =
  | "unitSystem"
  | "dryBulb"
  | "moistureMode"
  | "moistureValue"
  | "pressureMode"
  | "elevation"
  | "pressure"
  | "pressureUnit"
  | "calculation";

export type PsychrometricValidationCode =
  | "INVALID_UNIT_SYSTEM"
  | "INVALID_MOISTURE_MODE"
  | "INVALID_PRESSURE_MODE"
  | "NOT_FINITE"
  | "REQUIRED"
  | "OUT_OF_RANGE"
  | "WET_BULB_ABOVE_DRY_BULB"
  | "DEW_POINT_ABOVE_DRY_BULB"
  | "NON_POSITIVE_PRESSURE"
  | "INVALID_PRESSURE_UNIT"
  | "INVALID_DERIVED_PRESSURE"
  | "CALCULATION_FAILED";

export type PsychrometricValidationError = {
  field: PsychrometricValidationField;
  code: PsychrometricValidationCode;
  message: string;
};

export type PsychrometricCalculationResult =
  | { ok: true; value: PsychrometricState }
  | { ok: false; errors: PsychrometricValidationError[] };
