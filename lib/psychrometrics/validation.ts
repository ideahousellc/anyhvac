import type {
  ManualPressureUnit,
  MoistureMode,
  PressureMode,
  PsychrometricInput,
  PsychrometricValidationError,
  UnitSystem,
} from "./types";

const UNIT_SYSTEMS = new Set<UnitSystem>(["IP", "SI"]);
const MOISTURE_MODES = new Set<MoistureMode>([
  "relativeHumidity",
  "wetBulb",
  "dewPoint",
]);
const PRESSURE_MODES = new Set<PressureMode>(["elevation", "manual"]);

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function validatePsychrometricInput(
  input: PsychrometricInput,
): PsychrometricValidationError[] {
  const errors: PsychrometricValidationError[] = [];
  const unitSystem = input.unitSystem;

  if (!UNIT_SYSTEMS.has(unitSystem)) {
    errors.push({
      field: "unitSystem",
      code: "INVALID_UNIT_SYSTEM",
      message: 'Unit system must be "IP" or "SI".',
    });
  }

  if (!isFiniteNumber(input.dryBulb)) {
    errors.push({
      field: "dryBulb",
      code: "NOT_FINITE",
      message: "Dry-bulb temperature must be a finite number.",
    });
  }

  if (!MOISTURE_MODES.has(input.moistureMode)) {
    errors.push({
      field: "moistureMode",
      code: "INVALID_MOISTURE_MODE",
      message: "Moisture mode is not supported.",
    });
  }

  if (!isFiniteNumber(input.moistureValue)) {
    errors.push({
      field: "moistureValue",
      code: "NOT_FINITE",
      message: "Moisture value must be a finite number.",
    });
  } else if (input.moistureMode === "relativeHumidity") {
    if (input.moistureValue < 0 || input.moistureValue > 100) {
      errors.push({
        field: "moistureValue",
        code: "OUT_OF_RANGE",
        message: "Relative humidity must be between 0% and 100%.",
      });
    }
  } else if (
    isFiniteNumber(input.dryBulb) &&
    input.moistureMode === "wetBulb" &&
    input.moistureValue > input.dryBulb
  ) {
    errors.push({
      field: "moistureValue",
      code: "WET_BULB_ABOVE_DRY_BULB",
      message: "Wet-bulb temperature must not exceed dry-bulb temperature.",
    });
  } else if (
    isFiniteNumber(input.dryBulb) &&
    input.moistureMode === "dewPoint" &&
    input.moistureValue > input.dryBulb
  ) {
    errors.push({
      field: "moistureValue",
      code: "DEW_POINT_ABOVE_DRY_BULB",
      message: "Dew-point temperature must not exceed dry-bulb temperature.",
    });
  }

  if (!PRESSURE_MODES.has(input.pressureMode)) {
    errors.push({
      field: "pressureMode",
      code: "INVALID_PRESSURE_MODE",
      message: "Pressure mode is not supported.",
    });
  } else if (input.pressureMode === "elevation") {
    if (!isFiniteNumber(input.elevation)) {
      errors.push({
        field: "elevation",
        code: input.elevation === undefined ? "REQUIRED" : "NOT_FINITE",
        message: "Elevation must be a finite number.",
      });
    }
  } else {
    if (!isFiniteNumber(input.pressure)) {
      errors.push({
        field: "pressure",
        code: input.pressure === undefined ? "REQUIRED" : "NOT_FINITE",
        message: "Manual atmospheric pressure must be a finite number.",
      });
    } else if (input.pressure <= 0) {
      errors.push({
        field: "pressure",
        code: "NON_POSITIVE_PRESSURE",
        message: "Manual atmospheric pressure must be positive.",
      });
    }

    const expectedUnits: ManualPressureUnit[] =
      unitSystem === "IP" ? ["psi"] : ["Pa", "kPa"];
    const pressureUnit = input.pressureUnit ?? (unitSystem === "IP" ? "psi" : "Pa");
    if (!expectedUnits.includes(pressureUnit)) {
      errors.push({
        field: "pressureUnit",
        code: "INVALID_PRESSURE_UNIT",
        message:
          unitSystem === "IP"
            ? "IP manual pressure must use psi."
            : "SI manual pressure must use Pa or kPa.",
      });
    } else if (
      pressureUnit === "kPa" &&
      isFiniteNumber(input.pressure) &&
      !Number.isFinite(input.pressure * 1_000)
    ) {
      errors.push({
        field: "pressure",
        code: "OUT_OF_RANGE",
        message: "Manual atmospheric pressure is too large to convert to Pa.",
      });
    }

    if (input.elevation !== undefined && !isFiniteNumber(input.elevation)) {
      errors.push({
        field: "elevation",
        code: "NOT_FINITE",
        message: "Elevation must be a finite number when supplied.",
      });
    }
  }

  return errors;
}
