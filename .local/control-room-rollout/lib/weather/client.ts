import type { CurrentWeather } from "./types";
import { isCurrentWeather, normalizeLocationQuery } from "./validation";

export async function requestCurrentWeather(
  location: string,
  signal?: AbortSignal,
): Promise<CurrentWeather> {
  const query = normalizeLocationQuery(location);
  if (!query) throw new Error("INVALID_LOCATION");
  const response = await fetch(`/api/weather/current?q=${encodeURIComponent(query)}`, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  });
  if (!response.ok) throw new Error("WEATHER_UNAVAILABLE");
  const weather: unknown = await response.json();
  if (!isCurrentWeather(weather)) throw new Error("WEATHER_UNAVAILABLE");
  return weather;
}

export function formatWeatherObservationTime(value: string): string {
  const match = value.match(/(?:^|\s)(\d{1,2}):(\d{2})$/);
  if (!match) return value;
  const hour = Number(match[1]);
  const suffix = hour >= 12 ? "PM" : "AM";
  const twelveHour = hour % 12 || 12;
  return `${twelveHour}:${match[2]} ${suffix} local time`;
}
