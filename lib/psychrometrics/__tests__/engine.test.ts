import { describe, expect, it } from "vitest";

import {
  calculatePsychrometricState,
  humidityRatioToGrainsPerPound,
  humidityRatioToGramsPerKilogram,
  pascalsToKilopascals,
  type PsychrometricInput,
  type PsychrometricState,
} from "..";

function calculate(input: PsychrometricInput): PsychrometricState {
  const result = calculatePsychrometricState(input);
  expect(result.ok, result.ok ? undefined : JSON.stringify(result.errors)).toBe(true);
  if (!result.ok) throw new Error("Expected a successful calculation.");
  return result.value;
}

const siBase = {
  unitSystem: "SI" as const,
  dryBulb: 25,
  pressureMode: "manual" as const,
  pressure: 101_325,
};

describe("psychrometric input modes", () => {
  it("matches the published PsychroLib 25 C / 80% RH reference", () => {
    const state = calculate({
      ...siBase,
      moistureMode: "relativeHumidity",
      moistureValue: 80,
    });

    expect(state.dewPoint).toBeCloseTo(21.3094, 3);
    expect(state.relativeHumidity).toBe(80);
    expect(state.enthalpy).toBeGreaterThan(0);
  });

  it("calculates from wet bulb", () => {
    const state = calculate({
      ...siBase,
      moistureMode: "wetBulb",
      moistureValue: 20,
    });
    expect(state.wetBulb).toBe(20);
    expect(state.relativeHumidity).toBeGreaterThan(0);
    expect(state.relativeHumidity).toBeLessThan(100);
  });

  it("calculates from dew point", () => {
    const state = calculate({
      ...siBase,
      moistureMode: "dewPoint",
      moistureValue: 12,
    });
    expect(state.dewPoint).toBe(12);
    expect(state.wetBulb).toBeLessThan(state.dryBulb);
  });
});

describe("unit and pressure systems", () => {
  it("returns SI units and accepts kPa manual pressure", () => {
    const state = calculate({
      unitSystem: "SI",
      dryBulb: 25,
      moistureMode: "relativeHumidity",
      moistureValue: 50,
      pressureMode: "manual",
      pressure: 101.325,
      pressureUnit: "kPa",
    });
    expect(state.atmosphericPressure).toBe(101_325);
    expect(state.enthalpy).toBeCloseTo(50.321, 2);
    expect(state.specificVolume).toBeCloseTo(0.858, 2);
  });

  it("returns IP units", () => {
    const state = calculate({
      unitSystem: "IP",
      dryBulb: 77,
      moistureMode: "relativeHumidity",
      moistureValue: 50,
      pressureMode: "manual",
      pressure: 14.696,
    });
    expect(state.atmosphericPressure).toBe(14.696);
    expect(state.enthalpy).toBeCloseTo(29.30, 1);
    expect(state.specificVolume).toBeCloseTo(13.73, 1);
  });

  it("derives standard atmospheric pressure from elevation", () => {
    const seaLevel = calculate({
      unitSystem: "SI",
      dryBulb: 20,
      moistureMode: "relativeHumidity",
      moistureValue: 50,
      pressureMode: "elevation",
      elevation: 0,
    });
    const elevated = calculate({
      unitSystem: "SI",
      dryBulb: 20,
      moistureMode: "relativeHumidity",
      moistureValue: 50,
      pressureMode: "elevation",
      elevation: 1_000,
    });
    expect(seaLevel.atmosphericPressure).toBe(101_325);
    expect(elevated.atmosphericPressure).toBeLessThan(seaLevel.atmosphericPressure);
  });

  it("uses manual pressure even if an elevation is also supplied", () => {
    const state = calculate({
      unitSystem: "SI",
      dryBulb: 20,
      moistureMode: "relativeHumidity",
      moistureValue: 50,
      pressureMode: "manual",
      pressure: 90_000,
      elevation: 3_000,
    });
    expect(state.atmosphericPressure).toBe(90_000);
  });

  it("produces equivalent SI and IP physical states", () => {
    const si = calculate({
      ...siBase,
      moistureMode: "relativeHumidity",
      moistureValue: 50,
    });
    const ip = calculate({
      unitSystem: "IP",
      dryBulb: 77,
      moistureMode: "relativeHumidity",
      moistureValue: 50,
      pressureMode: "manual",
      pressure: 101_325 / 6_894.757293168,
    });

    expect((ip.dewPoint - 32) * (5 / 9)).toBeCloseTo(si.dewPoint, 3);
    expect(ip.humidityRatio).toBeCloseTo(si.humidityRatio, 6);
    // IP and SI enthalpy use different zero-temperature reference points.
    expect(ip.enthalpy * 2.326 - 17.86).toBeCloseTo(si.enthalpy, 1);
    expect(ip.specificVolume * 0.0624279606).toBeCloseTo(si.specificVolume, 4);
  });

  it("does not leak unit state between alternating calls", () => {
    for (let index = 0; index < 10; index += 1) {
      const ip = calculate({
        unitSystem: "IP",
        dryBulb: 77,
        moistureMode: "relativeHumidity",
        moistureValue: 50,
        pressureMode: "manual",
        pressure: 14.696,
      });
      const si = calculate({
        ...siBase,
        moistureMode: "relativeHumidity",
        moistureValue: 50,
      });
      expect(ip.dewPoint).toBeGreaterThan(50);
      expect(si.dewPoint).toBeLessThan(20);
      expect(si.atmosphericPressure).toBe(101_325);
    }
  });
});

describe("validation", () => {
  it.each([-0.01, 100.01])("rejects invalid relative humidity %s", (rh) => {
    const result = calculatePsychrometricState({
      ...siBase,
      moistureMode: "relativeHumidity",
      moistureValue: rh,
    });
    expect(result).toMatchObject({
      ok: false,
      errors: [{ field: "moistureValue", code: "OUT_OF_RANGE" }],
    });
  });

  it("rejects wet bulb above dry bulb", () => {
    const result = calculatePsychrometricState({
      ...siBase,
      moistureMode: "wetBulb",
      moistureValue: 26,
    });
    expect(result).toMatchObject({
      ok: false,
      errors: [{ code: "WET_BULB_ABOVE_DRY_BULB" }],
    });
  });

  it("rejects dew point above dry bulb", () => {
    const result = calculatePsychrometricState({
      ...siBase,
      moistureMode: "dewPoint",
      moistureValue: 26,
    });
    expect(result).toMatchObject({
      ok: false,
      errors: [{ code: "DEW_POINT_ABOVE_DRY_BULB" }],
    });
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects invalid pressure %s",
    (pressure) => {
      const result = calculatePsychrometricState({
        ...siBase,
        moistureMode: "relativeHumidity",
        moistureValue: 50,
        pressure,
      });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.errors[0].field).toBe("pressure");
    },
  );

  it("rejects non-finite temperatures and elevation", () => {
    const result = calculatePsychrometricState({
      unitSystem: "SI",
      dryBulb: Number.NaN,
      moistureMode: "relativeHumidity",
      moistureValue: Number.POSITIVE_INFINITY,
      pressureMode: "elevation",
      elevation: Number.NEGATIVE_INFINITY,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.map(({ field }) => field)).toEqual([
        "dryBulb",
        "moistureValue",
        "elevation",
      ]);
    }
  });

  it("rejects a non-finite ignored elevation in manual mode", () => {
    const result = calculatePsychrometricState({
      ...siBase,
      moistureMode: "relativeHumidity",
      moistureValue: 50,
      elevation: Number.NaN,
    });
    expect(result).toMatchObject({
      ok: false,
      errors: [{ field: "elevation", code: "NOT_FINITE" }],
    });
  });
});

describe("physical consistency", () => {
  it("converges at saturation", () => {
    const state = calculate({
      ...siBase,
      dryBulb: 18,
      moistureMode: "relativeHumidity",
      moistureValue: 100,
    });
    expect(state.wetBulb).toBeCloseTo(state.dryBulb, 3);
    expect(state.dewPoint).toBeCloseTo(state.dryBulb, 3);
    expect(state.degreeOfSaturation).toBeCloseTo(1, 8);
  });

  it("recovers RH through a wet-bulb round trip", () => {
    const initial = calculate({
      ...siBase,
      moistureMode: "relativeHumidity",
      moistureValue: 63,
    });
    const recovered = calculate({
      ...siBase,
      moistureMode: "wetBulb",
      moistureValue: initial.wetBulb,
    });
    expect(recovered.relativeHumidity).toBeCloseTo(63, 3);
  });

  it("recovers RH through a dew-point round trip", () => {
    const initial = calculate({
      ...siBase,
      moistureMode: "relativeHumidity",
      moistureValue: 63,
    });
    const recovered = calculate({
      ...siBase,
      moistureMode: "dewPoint",
      moistureValue: initial.dewPoint,
    });
    expect(recovered.relativeHumidity).toBeCloseTo(63, 6);
  });

  it.each([
    { dryBulb: -10, moistureMode: "relativeHumidity" as const, moistureValue: 70 },
    { dryBulb: 5, moistureMode: "wetBulb" as const, moistureValue: -1 },
    { dryBulb: -5, moistureMode: "dewPoint" as const, moistureValue: -12 },
  ])("calculates across freezing-region case %#", (moisture) => {
    const state = calculate({ ...siBase, ...moisture });
    expect(state.wetBulb).toBeLessThanOrEqual(state.dryBulb);
    expect(state.dewPoint).toBeLessThanOrEqual(state.dryBulb);
    expect(state.humidityRatio).toBeGreaterThan(0);
  });
});

describe("display conversion helpers", () => {
  it("converts humidity ratio and pressure without rounding", () => {
    expect(humidityRatioToGrainsPerPound(0.01)).toBe(70);
    expect(humidityRatioToGramsPerKilogram(0.01)).toBe(10);
    expect(pascalsToKilopascals(101_325)).toBe(101.325);
  });
});
