export type CurrentWeather = {
  locationLabel: string;
  locationName: string;
  region: string;
  country: string;
  latitude: number;
  longitude: number;
  temperatureCelsius: number;
  temperatureFahrenheit: number;
  relativeHumidity: number;
  observedAt: string;
  provider: "WeatherAPI.com";
};

export interface WeatherProvider {
  getCurrentWeather(query: string, signal?: AbortSignal): Promise<CurrentWeather>;
}
