import { beforeAll, describe, expect, it } from "vitest";

import { calculatePsychrometricState } from "../../engine";
import type { PsychrometricState, UnitSystem } from "../../types";
import {
  createDefaultChartConfig,
  generatePsychrometricChartGeometry,
  type PsychrometricChartConfig,
  type PsychrometricChartGeometry,
  type PsychrometricChartPoint,
} from "..";

function generate(config: PsychrometricChartConfig): PsychrometricChartGeometry {
  const result = generatePsychrometricChartGeometry(config);
  expect(result.ok, result.ok ? undefined : JSON.stringify(result.errors)).toBe(true);
  if (!result.ok) throw new Error("Expected chart generation to succeed.");
  return result.value;
}

function calculate(
  unitSystem: UnitSystem,
  dryBulb: number,
  relativeHumidity: number,
  pressure: number,
): PsychrometricState {
  const result = calculatePsychrometricState({
    unitSystem,
    dryBulb,
    moistureMode: "relativeHumidity",
    moistureValue: relativeHumidity,
    pressureMode: "manual",
    pressure,
  });
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("Expected state calculation to succeed.");
  return result.value;
}

function recoverStateAtPoint(
  geometry: PsychrometricChartGeometry,
  point: PsychrometricChartPoint,
): PsychrometricState {
  let lowerRh = 0;
  let upperRh = 100;
  let state = calculate(
    geometry.unitSystem,
    point.dryBulb,
    50,
    geometry.atmosphericPressure,
  );
  for (let iteration = 0; iteration < 50; iteration += 1) {
    const relativeHumidity = (lowerRh + upperRh) / 2;
    state = calculate(
      geometry.unitSystem,
      point.dryBulb,
      relativeHumidity,
      geometry.atmosphericPressure,
    );
    if (Math.abs(state.humidityRatio - point.humidityRatio) <= 1e-11) return state;
    if (state.humidityRatio < point.humidityRatio) lowerRh = relativeHumidity;
    else upperRh = relativeHumidity;
  }
  return state;
}

function pointAtDryBulb(
  points: readonly PsychrometricChartPoint[],
  dryBulb: number,
): PsychrometricChartPoint {
  const point = points.find(
    (candidate) => Math.abs(candidate.dryBulb - dryBulb) <= 1e-9,
  );
  expect(point).toBeDefined();
  if (!point) throw new Error("Expected line point at dry bulb.");
  return point;
}

function focusedConfig(
  unitSystem: UnitSystem,
  pressure: number,
  targets: { wetBulb: number; enthalpy: number; specificVolume: number },
): PsychrometricChartConfig {
  const config = createDefaultChartConfig(unitSystem, {
    pressureMode: "manual",
    pressure,
  });
  config.wetBulbLineValues = [targets.wetBulb];
  config.enthalpyLineValues = [targets.enthalpy];
  config.specificVolumeLineValues = [targets.specificVolume];
  return config;
}

let ipGeometry: PsychrometricChartGeometry;
let siGeometry: PsychrometricChartGeometry;

beforeAll(() => {
  ipGeometry = generate(createDefaultChartConfig("IP"));
  siGeometry = generate(createDefaultChartConfig("SI"));
});

describe("constant wet-bulb lines", () => {
  it("generates valid native-unit line families", () => {
    expect(ipGeometry.wetBulbLines.length).toBeGreaterThan(5);
    expect(siGeometry.wetBulbLines.length).toBeGreaterThan(5);
    expect(ipGeometry.wetBulbLines.every((line) => line.points.length >= 2)).toBe(
      true,
    );
  });

  it("never emits dry bulb below the target wet bulb", () => {
    for (const geometry of [ipGeometry, siGeometry]) {
      for (const line of geometry.wetBulbLines) {
        for (const point of line.points) {
          expect(point.dryBulb).toBeGreaterThanOrEqual(line.wetBulb);
        }
      }
    }
  });

  it("starts at saturation when the endpoint is visible", () => {
    const line = ipGeometry.wetBulbLines.find(({ wetBulb }) => wetBulb === 50);
    expect(line).toBeDefined();
    const first = line!.points[0];
    const saturation = calculate(
      "IP",
      first.dryBulb,
      100,
      ipGeometry.atmosphericPressure,
    );
    expect(first.dryBulb).toBe(50);
    expect(first.humidityRatio).toBeCloseTo(saturation.humidityRatio, 12);
  });

  it("terminates at the refined zero-humidity boundary without a floor tail", () => {
    const line = ipGeometry.wetBulbLines.find(({ wetBulb }) => wetBulb === -20)!;
    expect(line.points.at(-1)?.humidityRatio).toBe(0);
    expect(
      line.points.at(-1)!.dryBulb - line.points.at(-2)!.dryBulb,
    ).toBeLessThanOrEqual(1.001);
  });

  it("changes with pressure", () => {
    const seaLevel = generate(
      focusedConfig("SI", 101_325, {
        wetBulb: 10,
        enthalpy: 40,
        specificVolume: 0.85,
      }),
    );
    const lowerPressure = generate(
      focusedConfig("SI", 95_000, {
        wetBulb: 10,
        enthalpy: 40,
        specificVolume: 0.9,
      }),
    );
    const first = pointAtDryBulb(seaLevel.wetBulbLines[0].points, 20);
    const second = pointAtDryBulb(lowerPressure.wetBulbLines[0].points, 20);
    expect(second.humidityRatio).not.toBe(first.humidityRatio);
  });

  it("matches equivalent SI/IP wet-bulb states", () => {
    const ip = generate(
      focusedConfig("IP", 14.6959487755, {
        wetBulb: 50,
        enthalpy: 30,
        specificVolume: 14,
      }),
    );
    const si = generate(
      focusedConfig("SI", 101_325, {
        wetBulb: 10,
        enthalpy: 50,
        specificVolume: 0.85,
      }),
    );
    const ipPoint = pointAtDryBulb(ip.wetBulbLines[0].points, 75);
    const siPoint = pointAtDryBulb(
      si.wetBulbLines[0].points,
      (75 - 32) * (5 / 9),
    );
    expect(Math.abs(ipPoint.humidityRatio - siPoint.humidityRatio)).toBeLessThan(
      0.00001,
    );
  });
});

describe("constant enthalpy lines", () => {
  it("generates smooth, ordered line families", () => {
    expect(ipGeometry.enthalpyLines.length).toBeGreaterThan(5);
    for (const line of ipGeometry.enthalpyLines) {
      for (let index = 1; index < line.points.length; index += 1) {
        expect(line.points[index].dryBulb).toBeGreaterThan(
          line.points[index - 1].dryBulb,
        );
      }
    }
    const lower = siGeometry.enthalpyLines.find(({ enthalpy }) => enthalpy === 30)!;
    const upper = siGeometry.enthalpyLines.find(({ enthalpy }) => enthalpy === 40)!;
    expect(pointAtDryBulb(upper.points, 20).humidityRatio).toBeGreaterThan(
      pointAtDryBulb(lower.points, 20).humidityRatio,
    );
  });

  it("matches target enthalpy within the configured tolerance", () => {
    const line = siGeometry.enthalpyLines.find(({ enthalpy }) => enthalpy === 40)!;
    for (const point of line.points.slice(1, -1).filter((_, index) => index % 8 === 0)) {
      const state = recoverStateAtPoint(siGeometry, point);
      expect(Math.abs(state.enthalpy - line.enthalpy)).toBeLessThanOrEqual(
        0.0011,
      );
    }
  });

  it("refines a saturation endpoint within tolerance", () => {
    const line = siGeometry.enthalpyLines.find(({ enthalpy }) => enthalpy === 30)!;
    const endpointState = recoverStateAtPoint(siGeometry, line.points[0]);
    expect(Math.abs(endpointState.enthalpy - line.enthalpy)).toBeLessThanOrEqual(
      siGeometry.unitSystem === "SI" ? 0.0011 : 0.0011,
    );
    expect(endpointState.relativeHumidity).toBeCloseTo(100, 3);
  });

  it("keeps chart-ceiling intersections within enthalpy tolerance", () => {
    for (const line of siGeometry.enthalpyLines) {
      for (const point of line.points.filter(
        ({ humidityRatio }) =>
          humidityRatio === siGeometry.humidityRatioDomain.max,
      )) {
        const state = recoverStateAtPoint(siGeometry, point);
        expect(Math.abs(state.enthalpy - line.enthalpy)).toBeLessThanOrEqual(
          0.0011,
        );
      }
    }
  });

  it("changes geometry with pressure", () => {
    const seaLevel = generate(
      focusedConfig("SI", 101_325, {
        wetBulb: 10,
        enthalpy: 40,
        specificVolume: 0.85,
      }),
    );
    const lowerPressure = generate(
      focusedConfig("SI", 95_000, {
        wetBulb: 10,
        enthalpy: 40,
        specificVolume: 0.9,
      }),
    );
    expect(lowerPressure.enthalpyLines[0].points).not.toEqual(
      seaLevel.enthalpyLines[0].points,
    );
  });

  it("matches equivalent SI/IP physical states", () => {
    const ipReference = calculate("IP", 75, 50, 14.6959487755);
    const siReference = calculate("SI", (75 - 32) * (5 / 9), 50, 101_325);
    const ip = generate(
      focusedConfig("IP", 14.6959487755, {
        wetBulb: 50,
        enthalpy: ipReference.enthalpy,
        specificVolume: ipReference.specificVolume,
      }),
    );
    const si = generate(
      focusedConfig("SI", 101_325, {
        wetBulb: 10,
        enthalpy: siReference.enthalpy,
        specificVolume: siReference.specificVolume,
      }),
    );
    const ipPoint = pointAtDryBulb(ip.enthalpyLines[0].points, 75);
    const siPoint = pointAtDryBulb(
      si.enthalpyLines[0].points,
      (75 - 32) * (5 / 9),
    );
    expect(ipPoint.humidityRatio).toBeCloseTo(siPoint.humidityRatio, 5);
  });
});

describe("constant specific-volume lines", () => {
  it("generates smooth line families", () => {
    expect(ipGeometry.specificVolumeLines.length).toBeGreaterThan(3);
    for (const line of siGeometry.specificVolumeLines) {
      expect(line.points.length).toBeGreaterThanOrEqual(2);
      for (let index = 1; index < line.points.length; index += 1) {
        expect(line.points[index].dryBulb).toBeGreaterThan(
          line.points[index - 1].dryBulb,
        );
      }
    }
  });

  it("matches target volume within the configured tolerance", () => {
    const line = siGeometry.specificVolumeLines.find(
      ({ specificVolume }) => Math.abs(specificVolume - 0.85) < 1e-12,
    )!;
    for (const point of line.points.slice(1, -1).filter((_, index) => index % 4 === 0)) {
      const state = recoverStateAtPoint(siGeometry, point);
      expect(Math.abs(state.specificVolume - line.specificVolume)).toBeLessThan(
        0.000011,
      );
    }
  });

  it("keeps chart-ceiling intersections within volume tolerance", () => {
    for (const line of siGeometry.specificVolumeLines) {
      for (const point of line.points.filter(
        ({ humidityRatio }) =>
          humidityRatio === siGeometry.humidityRatioDomain.max,
      )) {
        const state = recoverStateAtPoint(siGeometry, point);
        expect(
          Math.abs(state.specificVolume - line.specificVolume),
        ).toBeLessThanOrEqual(0.000011);
      }
    }
  });

  it("changes geometry with pressure", () => {
    const first = generate(
      focusedConfig("SI", 101_325, {
        wetBulb: 10,
        enthalpy: 40,
        specificVolume: 0.85,
      }),
    );
    const second = generate(
      focusedConfig("SI", 95_000, {
        wetBulb: 10,
        enthalpy: 40,
        specificVolume: 0.85,
      }),
    );
    expect(second.specificVolumeLines[0].points).not.toEqual(
      first.specificVolumeLines[0].points,
    );
  });

  it("matches equivalent SI/IP physical states", () => {
    const ipReference = calculate("IP", 75, 50, 14.6959487755);
    const siReference = calculate("SI", (75 - 32) * (5 / 9), 50, 101_325);
    const ip = generate(
      focusedConfig("IP", 14.6959487755, {
        wetBulb: 50,
        enthalpy: ipReference.enthalpy,
        specificVolume: ipReference.specificVolume,
      }),
    );
    const si = generate(
      focusedConfig("SI", 101_325, {
        wetBulb: 10,
        enthalpy: siReference.enthalpy,
        specificVolume: siReference.specificVolume,
      }),
    );
    const ipPoint = pointAtDryBulb(ip.specificVolumeLines[0].points, 75);
    const siPoint = pointAtDryBulb(
      si.specificVolumeLines[0].points,
      (75 - 32) * (5 / 9),
    );
    expect(ipPoint.humidityRatio).toBeCloseTo(siPoint.humidityRatio, 5);
  });
});

describe("Phase 2B clipping, determinism, and engine isolation", () => {
  it("regenerates every new family for elevation-derived pressure", () => {
    const config = createDefaultChartConfig("SI", {
      pressureMode: "elevation",
      elevation: 1_500,
    });
    config.wetBulbLineValues = [10];
    config.enthalpyLineValues = [40];
    config.specificVolumeLineValues = [0.95];
    const elevated = generate(config);
    expect(elevated.atmosphericPressure).toBeLessThan(siGeometry.atmosphericPressure);
    expect(elevated.wetBulbLines[0].points).not.toEqual(
      siGeometry.wetBulbLines.find(({ wetBulb }) => wetBulb === 10)!.points,
    );
    expect(elevated.enthalpyLines[0].points).not.toEqual(
      siGeometry.enthalpyLines.find(({ enthalpy }) => enthalpy === 40)!.points,
    );
    expect(elevated.specificVolumeLines[0].points).not.toEqual(
      siGeometry.specificVolumeLines.find(
        ({ specificVolume }) => Math.abs(specificVolume - 0.95) < 1e-12,
      )!.points,
    );
  });

  it("keeps all new geometry inside chart and saturation bounds", () => {
    const lines = [
      ...ipGeometry.wetBulbLines,
      ...ipGeometry.enthalpyLines,
      ...ipGeometry.specificVolumeLines,
    ];
    for (const line of lines) {
      for (const point of line.points) {
        expect(point.dryBulb).toBeGreaterThanOrEqual(ipGeometry.dryBulbDomain.min);
        expect(point.dryBulb).toBeLessThanOrEqual(ipGeometry.dryBulbDomain.max);
        expect(point.humidityRatio).toBeGreaterThanOrEqual(0);
        expect(point.humidityRatio).toBeLessThanOrEqual(
          ipGeometry.humidityRatioDomain.max,
        );
        const saturation = calculate(
          "IP",
          point.dryBulb,
          100,
          ipGeometry.atmosphericPressure,
        );
        expect(point.humidityRatio).toBeLessThanOrEqual(
          saturation.humidityRatio + 1e-10,
        );
      }
    }
  });

  it("contains no NaN or Infinity", () => {
    const inspect = (value: unknown): void => {
      if (typeof value === "number") expect(Number.isFinite(value)).toBe(true);
      else if (Array.isArray(value)) value.forEach(inspect);
      else if (value && typeof value === "object") Object.values(value).forEach(inspect);
    };
    inspect(ipGeometry.wetBulbLines);
    inspect(ipGeometry.enthalpyLines);
    inspect(ipGeometry.specificVolumeLines);
  });

  it("is deterministic", () => {
    const config = focusedConfig("SI", 101_325, {
      wetBulb: 10,
      enthalpy: 40,
      specificVolume: 0.85,
    });
    expect(generate(config)).toEqual(generate(config));
  });

  it("keeps default engine-call volume practical", () => {
    expect(ipGeometry.stateEvaluationCount).toBeLessThan(15_000);
    expect(siGeometry.stateEvaluationCount).toBeLessThan(15_000);
    expect(
      Object.values(ipGeometry.stateEvaluationBreakdown).reduce(
        (total, count) => total + count,
        0,
      ),
    ).toBe(ipGeometry.stateEvaluationCount);
  });

  it("preserves engine output after alternating SI/IP generation", () => {
    const input = {
      unitSystem: "SI" as const,
      dryBulb: 25,
      moistureMode: "relativeHumidity" as const,
      moistureValue: 50,
      pressureMode: "manual" as const,
      pressure: 101_325,
    };
    const before = calculatePsychrometricState(input);
    generate(createDefaultChartConfig("IP"));
    generate(createDefaultChartConfig("SI"));
    const after = calculatePsychrometricState(input);
    expect(after).toEqual(before);
  });
});
