import { getWeatherApiCurrent, WeatherProviderError } from "@/lib/weather/weatherApiProvider";
import { normalizeLocationQuery } from "@/lib/weather/validation";

const PUBLIC_ERROR = "Current weather is unavailable. Enter outdoor conditions manually.";

export async function GET(request: Request) {
  const query = normalizeLocationQuery(new URL(request.url).searchParams.get("q") ?? "");
  if (!query) {
    return Response.json({ error: PUBLIC_ERROR }, { status: 400 });
  }

  try {
    const weather = await getWeatherApiCurrent(query, {
      apiKey: process.env.WEATHERAPI_KEY,
    });
    return Response.json(weather, {
      headers: { "Cache-Control": "private, max-age=0" },
    });
  } catch (error) {
    const status =
      error instanceof WeatherProviderError && error.kind === "configuration"
        ? 503
        : error instanceof WeatherProviderError && error.kind === "location"
          ? 404
          : 502;
    return Response.json({ error: PUBLIC_ERROR }, { status });
  }
}
