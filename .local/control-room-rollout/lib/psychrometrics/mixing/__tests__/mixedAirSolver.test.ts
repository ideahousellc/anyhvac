import { describe, expect, it } from "vitest";

import { calculatePsychrometricState } from "../../engine";
import { calculateMixedAir } from "../mixedAirSolver";
import type { MixedAirInput } from "../types";

const base: MixedAirInput = {
  unitSystem: "IP",
  outdoorAir: { airflow: 500, dryBulb: 90, relativeHumidity: 50 },
  returnAir: { airflow: 1500, dryBulb: 75, relativeHumidity: 50 },
  pressureMode: "elevation",
  elevation: 0,
};

function valid(input: MixedAirInput = base) {
  const result = calculateMixedAir(input);
  expect(result.ok, result.ok ? undefined : JSON.stringify(result.errors)).toBe(true);
  if (!result.ok) throw new Error("Expected valid mixed air");
  return result.value;
}

describe("mixed-air engineering solver", () => {
  it("returns the same state for identical incoming conditions", () => {
    const value = valid({ ...base, outdoorAir: { airflow: 400, dryBulb: 74, relativeHumidity: 42 }, returnAir: { airflow: 900, dryBulb: 74, relativeHumidity: 42 } });
    expect(value.mixedState.dryBulb).toBeCloseTo(74, 8);
    expect(value.mixedState.relativeHumidity).toBeCloseTo(42, 7);
  });

  it("conserves humidity ratio and enthalpy for equal dry-air mass flows", () => {
    const oa = calculatePsychrometricState({ unitSystem: "IP", dryBulb: 95, moistureMode: "relativeHumidity", moistureValue: 35, pressureMode: "elevation", elevation: 0 });
    const ra = calculatePsychrometricState({ unitSystem: "IP", dryBulb: 68, moistureMode: "relativeHumidity", moistureValue: 55, pressureMode: "elevation", elevation: 0 });
    if (!oa.ok || !ra.ok) throw new Error("Expected valid states");
    const value = valid({ ...base, outdoorAir: { airflow: oa.value.specificVolume * 100, dryBulb: 95, relativeHumidity: 35 }, returnAir: { airflow: ra.value.specificVolume * 100, dryBulb: 68, relativeHumidity: 55 } });
    expect(value.mixedHumidityRatio).toBeCloseTo((oa.value.humidityRatio + ra.value.humidityRatio) / 2, 10);
    expect(value.mixedEnthalpy).toBeCloseTo((oa.value.enthalpy + ra.value.enthalpy) / 2, 10);
  });

  it("weights different specific volumes by dry-air mass", () => {
    const value = valid({ ...base, outdoorAir: { airflow: 1000, dryBulb: 110, relativeHumidity: 20 }, returnAir: { airflow: 1000, dryBulb: 55, relativeHumidity: 80 } });
    const volumetricAverage = (value.outdoorState.humidityRatio + value.returnState.humidityRatio) / 2;
    expect(value.outdoorState.specificVolume).not.toBeCloseTo(value.returnState.specificVolume, 3);
    expect(value.mixedHumidityRatio).not.toBeCloseTo(volumetricAverage, 6);
  });

  it("does not average relative humidity", () => {
    const value = valid(base);
    expect(value.mixedState.relativeHumidity).not.toBeCloseTo(50, 1);
  });

  it("reports volumetric percentages", () => {
    const value = valid(base);
    expect(value.outdoorAirPercent).toBe(25);
    expect(value.returnAirPercent).toBe(75);
  });

  it("reports total input airflow", () => expect(valid(base).totalInputAirflow).toBe(2000));
  it("calculates IP states", () => expect(valid(base).mixedState.atmosphericPressure).toBeCloseTo(14.696, 3));

  it("calculates SI states", () => {
    const value = valid({ unitSystem: "SI", outdoorAir: { airflow: 235.9737, dryBulb: 32.2222, relativeHumidity: 50 }, returnAir: { airflow: 707.9212, dryBulb: 23.8889, relativeHumidity: 50 }, pressureMode: "elevation", elevation: 0 });
    expect(value.mixedState.unitSystem).toBe("SI");
    expect(value.mixedState.atmosphericPressure).toBeCloseTo(101325, 0);
  });

  it("is consistent across IP and SI conversions", () => {
    const ip = valid(base);
    const si = valid({ unitSystem: "SI", outdoorAir: { airflow: 500 * .47194745, dryBulb: (90 - 32) * 5 / 9, relativeHumidity: 50 }, returnAir: { airflow: 1500 * .47194745, dryBulb: (75 - 32) * 5 / 9, relativeHumidity: 50 }, pressureMode: "elevation", elevation: 0 });
    expect(si.mixedState.dryBulb * 9 / 5 + 32).toBeCloseTo(ip.mixedState.dryBulb, 3);
    expect(si.mixedState.humidityRatio).toBeCloseTo(ip.mixedState.humidityRatio, 6);
  });

  it("uses elevation-derived pressure", () => expect(valid({ ...base, elevation: 5000 }).mixedState.atmosphericPressure).toBeLessThan(valid(base).mixedState.atmosphericPressure));
  it("uses manual pressure", () => expect(valid({ ...base, pressureMode: "manual", pressure: 13.5, pressureUnit: "psi" }).mixedState.atmosphericPressure).toBe(13.5));
  it.each([-1, 101])("rejects invalid relative humidity %s", (relativeHumidity) => expect(calculateMixedAir({ ...base, outdoorAir: { ...base.outdoorAir, relativeHumidity } }).ok).toBe(false));
  it("rejects negative airflow", () => expect(calculateMixedAir({ ...base, outdoorAir: { ...base.outdoorAir, airflow: -1 } }).ok).toBe(false));
  it("rejects invalid pressure", () => expect(calculateMixedAir({ ...base, pressureMode: "manual", pressure: 0 }).ok).toBe(false));
  it("rejects zero total airflow", () => expect(calculateMixedAir({ ...base, outdoorAir: { ...base.outdoorAir, airflow: 0 }, returnAir: { ...base.returnAir, airflow: 0 } }).ok).toBe(false));
  it("rejects non-finite values", () => expect(calculateMixedAir({ ...base, returnAir: { ...base.returnAir, dryBulb: Number.NaN } }).ok).toBe(false));

  it("handles a near-saturation valid condition", () => {
    const value = valid({ ...base, outdoorAir: { airflow: 500, dryBulb: 70, relativeHumidity: 98 }, returnAir: { airflow: 500, dryBulb: 70, relativeHumidity: 98 } });
    expect(value.mixedState.relativeHumidity).toBeCloseTo(98, 5);
  });

  it("returns a structured error when the mixture reaches saturation", () => {
    const result = calculateMixedAir({ ...base, outdoorAir: { airflow: 500, dryBulb: 35, relativeHumidity: 100 }, returnAir: { airflow: 500, dryBulb: 95, relativeHumidity: 100 } });
    expect(result).toMatchObject({ ok: false, errors: [{ code: "SATURATION_REACHED" }] });
  });

  it("is deterministic", () => expect(calculateMixedAir(base)).toEqual(calculateMixedAir(base)));

  it("does not mutate inputs or leak the locked engine unit state", () => {
    const frozen = structuredClone(base);
    calculateMixedAir(base);
    expect(base).toEqual(frozen);
    const state = calculatePsychrometricState({ unitSystem: "IP", dryBulb: 75, moistureMode: "relativeHumidity", moistureValue: 50, pressureMode: "elevation", elevation: 0 });
    expect(state.ok && state.value.atmosphericPressure).toBeCloseTo(14.696, 3);
  });
});
