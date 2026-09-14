import type { CurrentWeather } from "./types";
import { normalizeLocationQuery } from "./validation";

const WEATHER_API_ENDPOINT = "https://api.weatherapi.com/v1/current.json";
const REQUEST_TIMEOUT_MS = 7_000;

type WeatherApiResponse = {
  location?: {
    name?: unknown;
    region?: unknown;
    country?: unknown;
    lat?: unknown;
    lon?: unknown;
  };
  current?: {
    last_updated?: unknown;
    temp_c?: unknown;
    temp_f?: unknown;
    humidity?: unknown;
  };
};

export class WeatherProviderError extends Error {
  constructor(public readonly kind: "configuration" | "location" | "provider") {
    super("Current weather is unavailable.");
  }
}

export async function getWeatherApiCurrent(
  location: string,
  {
    apiKey,
    fetchImpl = fetch,
  }: {
    apiKey: string | undefined;
    fetchImpl?: typeof fetch;
  },
): Promise<CurrentWeather> {
  const query = normalizeLocationQuery(location);
  if (!query) throw new WeatherProviderError("location");
  if (!apiKey?.trim()) throw new WeatherProviderError("configuration");

  const url = new URL(WEATHER_API_ENDPOINT);
  url.searchParams.set("key", apiKey.trim());
  url.searchParams.set("q", query);
  url.searchParams.set("aqi", "no");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetchImpl(url, {
      method: "GET",
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new WeatherProviderError(response.status === 400 ? "location" : "provider");
    }

    const raw = (await response.json()) as WeatherApiResponse;
    const locationData = raw.location;
    const current = raw.current;
    if (
      !locationData ||
      !current ||
      typeof locationData.name !== "string" ||
      typeof locationData.region !== "string" ||
      typeof locationData.country !== "string" ||
      typeof locationData.lat !== "number" ||
      typeof locationData.lon !== "number" ||
      typeof current.last_updated !== "string" ||
      typeof current.temp_c !== "number" ||
      typeof current.temp_f !== "number" ||
      typeof current.humidity !== "number" ||
      ![
        locationData.lat,
        locationData.lon,
        current.temp_c,
        current.temp_f,
        current.humidity,
      ].every(Number.isFinite) ||
      current.humidity < 0 ||
      current.humidity > 100
    ) {
      throw new WeatherProviderError("provider");
    }

    const locationLabel = [locationData.name, locationData.region, locationData.country]
      .filter(Boolean)
      .join(", ");
    return {
      locationLabel,
      locationName: locationData.name,
      region: locationData.region,
      country: locationData.country,
      latitude: locationData.lat,
      longitude: locationData.lon,
      temperatureCelsius: current.temp_c,
      temperatureFahrenheit: current.temp_f,
      relativeHumidity: current.humidity,
      observedAt: current.last_updated,
      provider: "WeatherAPI.com",
    };
  } catch (error) {
    if (error instanceof WeatherProviderError) throw error;
    throw new WeatherProviderError("provider");
  } finally {
    clearTimeout(timeout);
  }
}
