export const MAX_LOCATION_LENGTH = 100;

export function normalizeLocationQuery(value: string): string | null {
  if (/[\u0000-\u001f\u007f]/.test(value)) return null;
  const query = value.trim().replace(/\s+/g, " ");
  if (
    query.length < 2 ||
    query.length > MAX_LOCATION_LENGTH
  ) {
    return null;
  }
  return query;
}

export function isCurrentWeather(value: unknown): value is import("./types").CurrentWeather {
  if (!value || typeof value !== "object") return false;
  const weather = value as Record<string, unknown>;
  return (
    typeof weather.locationLabel === "string" &&
    typeof weather.locationName === "string" &&
    typeof weather.region === "string" &&
    typeof weather.country === "string" &&
    typeof weather.observedAt === "string" &&
    weather.provider === "WeatherAPI.com" &&
    [
      weather.latitude,
      weather.longitude,
      weather.temperatureCelsius,
      weather.temperatureFahrenheit,
      weather.relativeHumidity,
    ].every((item) => typeof item === "number" && Number.isFinite(item)) &&
    (weather.relativeHumidity as number) >= 0 &&
    (weather.relativeHumidity as number) <= 100
  );
}
