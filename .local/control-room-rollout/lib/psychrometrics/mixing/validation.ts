import type { MixedAirError, MixedAirInput } from "./types";

export function validateMixedAirInput(input: MixedAirInput): MixedAirError[] {
  const errors: MixedAirError[] = [];
  const streams = [
    ["outdoorAir", input.outdoorAir],
    ["returnAir", input.returnAir],
  ] as const;

  for (const [name, stream] of streams) {
    for (const property of ["airflow", "dryBulb", "relativeHumidity"] as const) {
      if (!Number.isFinite(stream[property])) {
        errors.push({
          field: `${name}.${property}`,
          code: "NOT_FINITE",
          message: `${name === "outdoorAir" ? "Outdoor" : "Return"} air ${property === "dryBulb" ? "dry bulb" : property === "relativeHumidity" ? "relative humidity" : "airflow"} must be a finite number.`,
        });
      }
    }
    if (Number.isFinite(stream.airflow) && stream.airflow < 0) {
      errors.push({
        field: `${name}.airflow`,
        code: "NEGATIVE_AIRFLOW",
        message: `${name === "outdoorAir" ? "Outdoor" : "Return"} airflow cannot be negative.`,
      });
    }
    if (
      Number.isFinite(stream.relativeHumidity) &&
      (stream.relativeHumidity < 0 || stream.relativeHumidity > 100)
    ) {
      errors.push({
        field: `${name}.relativeHumidity`,
        code: "INVALID_RELATIVE_HUMIDITY",
        message: "Relative humidity must be between 0% and 100%.",
      });
    }
  }

  if (
    Number.isFinite(input.outdoorAir.airflow) &&
    Number.isFinite(input.returnAir.airflow) &&
    input.outdoorAir.airflow + input.returnAir.airflow <= 0
  ) {
    errors.push({
      field: "calculation",
      code: "ZERO_TOTAL_AIRFLOW",
      message: "Total input airflow must be greater than zero.",
    });
  }

  const pressureValue = input.pressureMode === "elevation" ? input.elevation : input.pressure;
  if (!Number.isFinite(pressureValue)) {
    errors.push({
      field: input.pressureMode === "elevation" ? "elevation" : "pressure",
      code: "NOT_FINITE",
      message: `${input.pressureMode === "elevation" ? "Elevation" : "Pressure"} must be a finite number.`,
    });
  } else if (input.pressureMode === "manual" && input.pressure <= 0) {
    errors.push({
      field: "pressure",
      code: "INVALID_PRESSURE",
      message: "Manual atmospheric pressure must be positive.",
    });
  }

  return errors;
}
