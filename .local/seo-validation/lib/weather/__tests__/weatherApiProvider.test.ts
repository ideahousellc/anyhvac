import { afterEach, describe, expect, it, vi } from "vitest";

import { GET } from "../../../app/api/weather/current/route";
import { requestCurrentWeather } from "../client";
import {
  getWeatherApiCurrent,
  WeatherProviderError,
} from "../weatherApiProvider";
import { normalizeLocationQuery } from "../validation";

const providerPayload = {
  location: {
    name: "Cleveland",
    region: "Ohio",
    country: "USA",
    lat: 41.5,
    lon: -81.7,
  },
  current: {
    last_updated: "2026-09-14 15:05",
    temp_c: 21.1,
    temp_f: 70,
    humidity: 56,
    pressure_mb: 1017,
  },
};

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("WeatherAPI server integration", () => {
  it("normalizes normal city, state, and country queries", () => {
    expect(normalizeLocationQuery("  Cleveland,   OH ")).toBe("Cleveland, OH");
    expect(normalizeLocationQuery("Madrid, Spain")).toBe("Madrid, Spain");
  });

  it.each(["", "x", "a".repeat(101), "bad\nlocation"])(
    "rejects invalid location input without a provider call: %s",
    async (query) => {
      const fetchImpl = vi.fn();
      await expect(getWeatherApiCurrent(query, { apiKey: "secret", fetchImpl })).rejects.toMatchObject({ kind: "location" });
      expect(fetchImpl).not.toHaveBeenCalled();
    },
  );

  it("handles a missing API key without making a provider request", async () => {
    const fetchImpl = vi.fn();
    await expect(getWeatherApiCurrent("Cleveland, OH", { apiKey: undefined, fetchImpl })).rejects.toEqual(new WeatherProviderError("configuration"));
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("calls only the fixed WeatherAPI current endpoint and normalizes needed fields", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response(providerPayload));
    const weather = await getWeatherApiCurrent("Cleveland, OH", { apiKey: "server-secret", fetchImpl });
    const requestUrl = fetchImpl.mock.calls[0][0] as URL;
    expect(requestUrl.origin + requestUrl.pathname).toBe("https://api.weatherapi.com/v1/current.json");
    expect(requestUrl.searchParams.get("q")).toBe("Cleveland, OH");
    expect(requestUrl.searchParams.get("key")).toBe("server-secret");
    expect(weather).toEqual({
      locationLabel: "Cleveland, Ohio, USA",
      locationName: "Cleveland",
      region: "Ohio",
      country: "USA",
      latitude: 41.5,
      longitude: -81.7,
      temperatureCelsius: 21.1,
      temperatureFahrenheit: 70,
      relativeHumidity: 56,
      observedAt: "2026-09-14 15:05",
      provider: "WeatherAPI.com",
    });
    expect(weather).not.toHaveProperty("pressure_mb");
  });

  it.each([500, 503, 429])("handles provider failure status %s safely", async (status) => {
    await expect(getWeatherApiCurrent("Chicago, IL", { apiKey: "secret", fetchImpl: vi.fn().mockResolvedValue(response({ error: "raw provider detail" }, status)) })).rejects.toMatchObject({ kind: "provider" });
  });

  it("classifies an unknown provider location without exposing its message", async () => {
    await expect(getWeatherApiCurrent("Not A Place", { apiKey: "secret", fetchImpl: vi.fn().mockResolvedValue(response({ error: { message: "No matching location" } }, 400)) })).rejects.toMatchObject({ kind: "location", message: "Current weather is unavailable." });
  });

  it.each([
    {},
    { location: providerPayload.location, current: { temp_c: 10 } },
    { ...providerPayload, current: { ...providerPayload.current, humidity: 120 } },
    { ...providerPayload, current: { ...providerPayload.current, temp_f: "70" } },
  ])("rejects malformed provider responses", async (payload) => {
    await expect(getWeatherApiCurrent("Toronto, Canada", { apiKey: "secret", fetchImpl: vi.fn().mockResolvedValue(response(payload)) })).rejects.toMatchObject({ kind: "provider" });
  });

  it("returns a safe missing-key route response and does not require the key at import", async () => {
    vi.stubEnv("WEATHERAPI_KEY", "");
    const result = await GET(new Request("http://localhost/api/weather/current?q=Cleveland%2C%20OH"));
    expect(result.status).toBe(503);
    expect(await result.json()).toEqual({ error: "Current weather is unavailable. Enter outdoor conditions manually." });
  });

  it("keeps the API key and provider pressure out of the browser response", async () => {
    vi.stubEnv("WEATHERAPI_KEY", "server-only-secret");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(providerPayload)));
    const result = await GET(new Request("http://localhost/api/weather/current?q=Cleveland%2C%20OH"));
    const text = await result.text();
    expect(result.status).toBe(200);
    expect(text).not.toContain("server-only-secret");
    expect(text).not.toContain("pressure_mb");
    expect(text).not.toContain("1017");
  });

  it("returns a safe invalid-location route response", async () => {
    vi.stubEnv("WEATHERAPI_KEY", "server-only-secret");
    const result = await GET(new Request("http://localhost/api/weather/current?q=x"));
    expect(result.status).toBe(400);
    expect(await result.json()).not.toHaveProperty("stack");
  });

  it("client requests the AnyHVAC route only on explicit invocation", async () => {
    const normalized = {
      locationLabel: "Madrid, Madrid, Spain", locationName: "Madrid", region: "Madrid", country: "Spain",
      latitude: 40.4, longitude: -3.7, temperatureCelsius: 25, temperatureFahrenheit: 77,
      relativeHumidity: 40, observedAt: "2026-09-14 18:00", provider: "WeatherAPI.com",
    };
    const fetchMock = vi.fn().mockResolvedValue(response(normalized));
    vi.stubGlobal("fetch", fetchMock);
    expect(fetchMock).not.toHaveBeenCalled();
    await expect(requestCurrentWeather("Madrid, Spain")).resolves.toEqual(normalized);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0]).toBe("/api/weather/current?q=Madrid%2C%20Spain");
  });

  it("client rejects malformed normalized responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ temperatureCelsius: 25 })));
    await expect(requestCurrentWeather("Madrid, Spain")).rejects.toThrow("WEATHER_UNAVAILABLE");
  });
});
