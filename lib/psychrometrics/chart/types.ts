import type {
  ManualPressureUnit,
  PsychrometricValidationError,
  UnitSystem,
} from "../types";

export type NumericDomain = {
  min: number;
  max: number;
};

export type ChartPressureCondition =
  | {
      pressureMode: "elevation";
      /** Feet in IP and metres in SI. */
      elevation: number;
    }
  | {
      pressureMode: "manual";
      /** Actual barometric pressure. Defaults to psi in IP and Pa in SI. */
      pressure: number;
      pressureUnit?: ManualPressureUnit;
      /** Ignored for pressure calculation, matching the engine contract. */
      elevation?: number;
    };

export type PsychrometricChartConfig = {
  unitSystem: UnitSystem;
  pressureCondition: ChartPressureCondition;
  dryBulbDomain: NumericDomain;
  /** Canonical lb/lb or kg/kg ratio; display units are boundary concerns. */
  humidityRatioDomain: NumericDomain;
  temperatureSampleInterval: number;
  dryBulbGridInterval: number;
  /** Canonical humidity ratio interval. */
  humidityRatioGridInterval: number;
  intersectionTolerance: number;
  /** Sampling interval for smooth Phase 2B line interiors. */
  derivedLineTemperatureInterval: number;
  /** Native °F or °C spacing. */
  wetBulbLineInterval: number;
  /** Native Btu/lb (IP) or kJ/kg (SI) spacing. */
  enthalpyLineInterval: number;
  /** Native ft³/lb (IP) or m³/kg (SI) spacing. */
  specificVolumeLineInterval: number;
  enthalpySolverTolerance: number;
  specificVolumeSolverTolerance: number;
  /** Native °F or °C tolerance for refined dry-bulb boundary positions. */
  dryBulbBoundaryTolerance: number;
  maxPropertySolverIterations: number;
  /** Optional explicit native-unit targets, primarily for focused geometry. */
  wetBulbLineValues?: number[];
  enthalpyLineValues?: number[];
  specificVolumeLineValues?: number[];
};

export type PsychrometricChartPoint = {
  dryBulb: number;
  humidityRatio: number;
};

export type NormalizedChartPoint = {
  x: number;
  y: number;
};

export type ChartCurve = {
  points: PsychrometricChartPoint[];
};

export type RelativeHumidityCurve = ChartCurve & {
  /** Percentage on the 0-100 scale. */
  relativeHumidity: number;
};

export type DryBulbGridLine = {
  dryBulb: number;
  points: [PsychrometricChartPoint, PsychrometricChartPoint];
};

export type HumidityRatioGridLine = {
  humidityRatio: number;
  points: [PsychrometricChartPoint, PsychrometricChartPoint];
};

export type WetBulbLine = ChartCurve & {
  /** °F in IP and °C in SI. */
  wetBulb: number;
};

export type EnthalpyLine = ChartCurve & {
  /** Btu/lb dry air in IP and kJ/kg dry air in SI. */
  enthalpy: number;
};

export type SpecificVolumeLine = ChartCurve & {
  /** ft³/lb dry air in IP and m³/kg dry air in SI. */
  specificVolume: number;
};

export type PsychrometricChartGeometry = {
  unitSystem: UnitSystem;
  /** psi in IP and Pa in SI. */
  atmosphericPressure: number;
  pressureCondition: ChartPressureCondition;
  dryBulbDomain: NumericDomain;
  humidityRatioDomain: NumericDomain;
  saturationCurve: ChartCurve;
  relativeHumidityCurves: RelativeHumidityCurve[];
  dryBulbGridLines: DryBulbGridLine[];
  humidityRatioGridLines: HumidityRatioGridLine[];
  wetBulbLines: WetBulbLine[];
  enthalpyLines: EnthalpyLine[];
  specificVolumeLines: SpecificVolumeLine[];
  /** Number of calls made to calculatePsychrometricState for this geometry. */
  stateEvaluationCount: number;
  stateEvaluationBreakdown: {
    phase2A: number;
    wetBulbLines: number;
    enthalpyLines: number;
    specificVolumeLines: number;
  };
};

export type ChartGeometryErrorCode =
  | "INVALID_CONFIG"
  | "ENGINE_CALCULATION_FAILED"
  | "PROPERTY_SOLVER_FAILED"
  | "EMPTY_GEOMETRY";

export type ChartGeometryError = {
  code: ChartGeometryErrorCode;
  message: string;
  dryBulb?: number;
  relativeHumidity?: number;
  engineErrors?: PsychrometricValidationError[];
};

export type PsychrometricChartGeometryResult =
  | { ok: true; value: PsychrometricChartGeometry }
  | { ok: false; errors: ChartGeometryError[] };
