export type CurrentWeather = {
  locationLabel: string;
  latitude: number;
  longitude: number;
  temperatureCelsius: number;
  relativeHumidity: number;
  observedAt: string;
  provider: string;
};

export interface WeatherProvider {
  getCurrentWeather(query: string, signal?: AbortSignal): Promise<CurrentWeather>;
}
