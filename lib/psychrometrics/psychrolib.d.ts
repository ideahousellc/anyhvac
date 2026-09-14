declare module "psychrolib" {
  type PsychrometricValues = [
    humidityRatio: number,
    secondaryTemperature: number,
    relativeHumidityOrDewPoint: number,
    vaporPressure: number,
    moistAirEnthalpy: number,
    moistAirVolume: number,
    degreeOfSaturation: number,
  ];

  interface PsychroLib {
    readonly IP: 1;
    readonly SI: 2;
    SetUnitSystem(unitSystem: 1 | 2): void;
    GetStandardAtmPressure(elevation: number): number;
    GetTDryBulbFromEnthalpyAndHumRatio(
      moistAirEnthalpy: number,
      humidityRatio: number,
    ): number;
    GetRelHumFromHumRatio(
      dryBulb: number,
      humidityRatio: number,
      pressure: number,
    ): number;
    CalcPsychrometricsFromRelHum(
      dryBulb: number,
      relativeHumidity: number,
      pressure: number,
    ): PsychrometricValues;
    CalcPsychrometricsFromTWetBulb(
      dryBulb: number,
      wetBulb: number,
      pressure: number,
    ): PsychrometricValues;
    CalcPsychrometricsFromTDewPoint(
      dryBulb: number,
      dewPoint: number,
      pressure: number,
    ): PsychrometricValues;
  }

  const psychrolib: PsychroLib;
  export default psychrolib;
}
