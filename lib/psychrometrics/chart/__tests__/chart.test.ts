import { beforeAll, describe, expect, it } from "vitest";

import { calculatePsychrometricState } from "../../engine";
import type { PsychrometricState } from "../../types";
import {
  createDefaultChartConfig,
  DEFAULT_MAX_HUMIDITY_RATIO,
  generatePsychrometricChartGeometry,
  normalizedToPhysical,
  physicalToNormalized,
  type PsychrometricChartConfig,
  type PsychrometricChartGeometry,
} from "..";

function generate(config: PsychrometricChartConfig): PsychrometricChartGeometry {
  const result = generatePsychrometricChartGeometry(config);
  expect(result.ok, result.ok ? undefined : JSON.stringify(result.errors)).toBe(true);
  if (!result.ok) throw new Error("Expected chart generation to succeed.");
  return result.value;
}

function calculateState(
  unitSystem: "IP" | "SI",
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
  if (!result.ok) throw new Error("Expected engine calculation to succeed.");
  return result.value;
}

function pointAt(
  geometry: PsychrometricChartGeometry,
  relativeHumidity: number,
  dryBulb: number,
) {
  const curve = geometry.relativeHumidityCurves.find(
    (candidate) => candidate.relativeHumidity === relativeHumidity,
  );
  expect(curve).toBeDefined();
  const point = curve?.points.find(
    (candidate) => Math.abs(candidate.dryBulb - dryBulb) < 1e-9,
  );
  expect(point).toBeDefined();
  if (!point) throw new Error("Expected sampled curve point.");
  return point;
}

let ipGeometry: PsychrometricChartGeometry;
let siGeometry: PsychrometricChartGeometry;

beforeAll(() => {
  ipGeometry = generate(createDefaultChartConfig("IP"));
  siGeometry = generate(createDefaultChartConfig("SI"));
});

describe("default configuration and saturation", () => {
  it("uses the requested IP and SI chart domains", () => {
    expect(ipGeometry.dryBulbDomain).toEqual({ min: -20, max: 130 });
    expect(siGeometry.dryBulbDomain).toEqual({ min: -30, max: 55 });
    expect(ipGeometry.humidityRatioDomain).toEqual({
      min: 0,
      max: 200 / 7_000,
    });
    expect(siGeometry.humidityRatioDomain.max * 1_000).toBeCloseTo(28.571, 3);
  });

  it("generates a nonempty saturation curve", () => {
    expect(ipGeometry.saturationCurve.points.length).toBeGreaterThan(2);
    expect(siGeometry.saturationCurve.points.length).toBeGreaterThan(2);
  });

  it("keeps visible saturation geometry monotonically increasing", () => {
    for (const geometry of [ipGeometry, siGeometry]) {
      const points = geometry.saturationCurve.points;
      for (let index = 1; index < points.length; index += 1) {
        expect(points[index].dryBulb).toBeGreaterThan(points[index - 1].dryBulb);
        expect(points[index].humidityRatio).toBeGreaterThanOrEqual(
          points[index - 1].humidityRatio,
        );
      }
    }
  });

  it("clips saturation at the configured humidity-ratio maximum", () => {
    const last = ipGeometry.saturationCurve.points.at(-1);
    expect(last?.humidityRatio).toBe(DEFAULT_MAX_HUMIDITY_RATIO);
    expect(last?.dryBulb).toBeLessThan(ipGeometry.dryBulbDomain.max);
  });
});

describe("relative-humidity geometry", () => {
  it("generates exactly the 10-90% curves", () => {
    expect(ipGeometry.relativeHumidityCurves.map((curve) => curve.relativeHumidity)).toEqual([
      10, 20, 30, 40, 50, 60, 70, 80, 90,
    ]);
  });

  it("keeps every RH sample at or below saturation", () => {
    for (const curve of siGeometry.relativeHumidityCurves) {
      for (const point of curve.points) {
        const saturation = calculateState(
          "SI",
          point.dryBulb,
          100,
          siGeometry.atmosphericPressure,
        );
        expect(point.humidityRatio).toBeLessThanOrEqual(
          saturation.humidityRatio + 1e-12,
        );
      }
    }
  });

  it("orders 90%, 50%, and 10% curves at the same dry bulb", () => {
    const dryBulb = 20;
    const ten = pointAt(siGeometry, 10, dryBulb);
    const fifty = pointAt(siGeometry, 50, dryBulb);
    const ninety = pointAt(siGeometry, 90, dryBulb);
    expect(ninety.humidityRatio).toBeGreaterThan(fifty.humidityRatio);
    expect(fifty.humidityRatio).toBeGreaterThan(ten.humidityRatio);
  });

  it("passes through the locked-engine 75 F / 50% RH state", () => {
    const expected = calculateState("IP", 75, 50, 14.696);
    const actual = pointAt(ipGeometry, 50, 75);
    expect(actual.humidityRatio).toBe(expected.humidityRatio);
  });
});

describe("grid geometry and physical clipping", () => {
  it("terminates each dry-bulb grid line at saturation or the chart maximum", () => {
    for (const line of ipGeometry.dryBulbGridLines) {
      const saturation = calculateState(
        "IP",
        line.dryBulb,
        100,
        ipGeometry.atmosphericPressure,
      );
      expect(line.points[0].humidityRatio).toBe(0);
      expect(line.points[1].humidityRatio).toBeCloseTo(
        Math.min(saturation.humidityRatio, DEFAULT_MAX_HUMIDITY_RATIO),
        12,
      );
    }
  });

  it("starts horizontal lines at a numerically interpolated saturation intersection", () => {
    for (const line of ipGeometry.humidityRatioGridLines.slice(1)) {
      const start = line.points[0];
      const end = line.points[1];
      const saturationAtStart = calculateState(
        "IP",
        start.dryBulb,
        100,
        ipGeometry.atmosphericPressure,
      );
      expect(line.humidityRatio).toBeLessThanOrEqual(saturationAtStart.humidityRatio);
      expect(end.dryBulb).toBe(ipGeometry.dryBulbDomain.max);
      expect(start.humidityRatio).toBe(end.humidityRatio);
    }
  });

  it("contains no curve or grid point outside the visible domain", () => {
    const pointCollections = [
      ipGeometry.saturationCurve.points,
      ...ipGeometry.relativeHumidityCurves.map((curve) => curve.points),
      ...ipGeometry.dryBulbGridLines.map((line) => line.points),
      ...ipGeometry.humidityRatioGridLines.map((line) => line.points),
    ];
    for (const points of pointCollections) {
      for (const point of points) {
        expect(point.dryBulb).toBeGreaterThanOrEqual(ipGeometry.dryBulbDomain.min);
        expect(point.dryBulb).toBeLessThanOrEqual(ipGeometry.dryBulbDomain.max);
        expect(point.humidityRatio).toBeGreaterThanOrEqual(0);
        expect(point.humidityRatio).toBeLessThanOrEqual(DEFAULT_MAX_HUMIDITY_RATIO);
      }
    }
  });

  it("contains no point above the physical saturation boundary", () => {
    const pointCollections = [
      ipGeometry.saturationCurve.points,
      ...ipGeometry.relativeHumidityCurves.map((curve) => curve.points),
      ...ipGeometry.dryBulbGridLines.map((line) => line.points),
      ...ipGeometry.humidityRatioGridLines.map((line) => line.points),
    ];
    for (const points of pointCollections) {
      for (const point of points) {
        const saturation = calculateState(
          "IP",
          point.dryBulb,
          100,
          ipGeometry.atmosphericPressure,
        );
        expect(point.humidityRatio).toBeLessThanOrEqual(
          saturation.humidityRatio + 1e-12,
        );
      }
    }
  });
});

describe("coordinate transforms", () => {
  const domains = {
    dryBulbDomain: { min: -20, max: 130 },
    humidityRatioDomain: { min: 0, max: 200 / 7_000 },
  };

  it("maps physical coordinates to normalized coordinates", () => {
    expect(
      physicalToNormalized({ dryBulb: 55, humidityRatio: 100 / 7_000 }, domains),
    ).toEqual({ x: 0.5, y: 0.5 });
  });

  it("round-trips normalized and physical coordinates", () => {
    const normalized = { x: 0.3125, y: 0.78125 };
    const roundTrip = physicalToNormalized(
      normalizedToPhysical(normalized, domains),
      domains,
    );
    expect(roundTrip.x).toBeCloseTo(normalized.x, 14);
    expect(roundTrip.y).toBeCloseTo(normalized.y, 14);
  });

  it("maps left/right and bottom/top without screen-space Y inversion", () => {
    expect(
      physicalToNormalized({ dryBulb: -20, humidityRatio: 0 }, domains),
    ).toEqual({ x: 0, y: 0 });
    expect(
      physicalToNormalized(
        { dryBulb: 130, humidityRatio: 200 / 7_000 },
        domains,
      ),
    ).toEqual({ x: 1, y: 1 });
  });
});

describe("pressure, units, and determinism", () => {
  it("uses sea-level standard atmospheric pressure by default", () => {
    expect(ipGeometry.atmosphericPressure).toBe(14.696);
    expect(siGeometry.atmosphericPressure).toBe(101_325);
  });

  it("regenerates for elevated standard-atmosphere pressure", () => {
    const elevated = generate(
      createDefaultChartConfig("SI", {
        pressureMode: "elevation",
        elevation: 1_500,
      }),
    );
    expect(elevated.atmosphericPressure).toBeLessThan(siGeometry.atmosphericPressure);
    expect(pointAt(elevated, 50, 20).humidityRatio).not.toBe(
      pointAt(siGeometry, 50, 20).humidityRatio,
    );
  });

  it("uses manual pressure", () => {
    const manual = generate(
      createDefaultChartConfig("SI", {
        pressureMode: "manual",
        pressure: 90,
        pressureUnit: "kPa",
      }),
    );
    expect(manual.atmosphericPressure).toBe(90_000);
  });

  it("produces equivalent IP/SI humidity ratios at equivalent states", () => {
    const ipPoint = pointAt(ipGeometry, 50, 75);
    const siPoint = pointAt(siGeometry, 50, (75 - 32) * (5 / 9));
    expect(ipPoint.humidityRatio).toBeCloseTo(siPoint.humidityRatio, 6);
  });

  it("is deterministic and reports the expected evaluation count", () => {
    const config = createDefaultChartConfig("IP");
    const first = generate(config);
    const second = generate(config);
    expect(second).toEqual(first);
    expect(first.stateEvaluationCount).toBeGreaterThanOrEqual(3_010);
    expect(siGeometry.stateEvaluationCount).toBeGreaterThanOrEqual(3_070);
  });
});

describe("numerical safety and engine lock", () => {
  it("contains neither NaN nor Infinity", () => {
    const inspect = (value: unknown): void => {
      if (typeof value === "number") expect(Number.isFinite(value)).toBe(true);
      else if (Array.isArray(value)) value.forEach(inspect);
      else if (value && typeof value === "object") Object.values(value).forEach(inspect);
    };
    inspect(ipGeometry);
    inspect(siGeometry);
  });

  it("returns structured errors for invalid geometry configuration", () => {
    const config = createDefaultChartConfig("SI");
    config.temperatureSampleInterval = 0;
    expect(generatePsychrometricChartGeometry(config)).toMatchObject({
      ok: false,
      errors: [{ code: "INVALID_CONFIG" }],
    });
  });

  it("does not mutate engine behavior across alternating chart unit systems", () => {
    const input = {
      unitSystem: "SI" as const,
      dryBulb: 23.88888888888889,
      moistureMode: "relativeHumidity" as const,
      moistureValue: 50,
      pressureMode: "manual" as const,
      pressure: 101_325,
    };
    const before = calculatePsychrometricState(input);
    generate(createDefaultChartConfig("IP"));
    generate(createDefaultChartConfig("SI"));
    generate(createDefaultChartConfig("IP"));
    const after = calculatePsychrometricState(input);
    expect(after).toEqual(before);
  });
});
