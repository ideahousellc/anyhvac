// Local reporting only. No routes, UI, cache or provider settings are changed.
import {
  GOOGLE_SEARCH_API_BASE, getGoogleSearchAccessToken, parseGoogleSearchResponses,
} from "@/lib/admin/integrations/google-search-console/client";
import { getGoogleSearchReportWindows } from "@/lib/admin/integrations/google-search-console/dates";

export const ANYHVAC_URL_PREFIX_PROPERTY = "https://www.anyhvac.net/";
export const ANYHVAC_DOMAIN_PROPERTY = "sc-domain:anyhvac.net";
export const GOOGLE_SEARCH_REPORT_TIMEOUT_MS = 15_000;
export const GOOGLE_SEARCH_TOP_ROWS = 10;
const SETTINGS = ["GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL", "GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY", "GOOGLE_SEARCH_CONSOLE_PROPERTY"] as const;
type Window = { startDate: string; endDate: string };
type Stats = { clicks: number; impressions: number; ctr: number | null; averagePosition: number | null };
type Breakdown = Stats & { key: string };
type Day = Stats & { date: string };
type Failure = "authentication-failed" | "unauthorized" | "forbidden" | "rate-limited" | "provider-error" | "invalid-response" | "timeout";
export type GoogleSearchReport = {
  source: "Google Search Console Search Analytics API";
  retrievedAt: string;
  property: string;
  timezone: "America/Los_Angeles";
  searchType: "web";
  dataState: "final";
  finalizationLagDays: 3;
  current: Stats & Window;
  previous: Stats & Window;
  context: Stats & Window;
  daily: Day[];
  contextWeeks: (Window & { clicks: number; impressions: number; returnedDays: number })[];
  comparison: {
    clicks: { absolute: number; percent: number | null };
    impressions: { absolute: number; percent: number | null };
    ctrPercentagePoints: number | null;
    positionChange: number | null;
  };
  topQueries: Breakdown[];
  topPages: Breakdown[];
};
export type GoogleSearchReportSnapshot =
  | { state: "connected"; data: GoogleSearchReport; checkedAt: string }
  | { state: "not-connected"; data: null; checkedAt: string; reason: "missing-configuration"; missingSettings: string[] }
  | { state: "unavailable"; data: null; checkedAt: string; reason: Failure | "unsupported-property" };

class ReportFailure extends Error {
  readonly code: Failure;
  constructor(code: Failure) { super(code); this.code = code; }
}
function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function rows(value: unknown): unknown[] {
  if (!record(value) || (value.rows !== undefined && !Array.isArray(value.rows))) throw new ReportFailure("invalid-response");
  return value.rows === undefined ? [] : value.rows as unknown[];
}
function stats(value: unknown): Stats {
  if (!record(value) || typeof value.clicks !== "number" || !Number.isSafeInteger(value.clicks) || value.clicks < 0
    || typeof value.impressions !== "number" || !Number.isSafeInteger(value.impressions) || value.impressions < 0) throw new ReportFailure("invalid-response");
  if (value.impressions === 0) return { clicks: value.clicks, impressions: 0, ctr: null, averagePosition: null };
  if (typeof value.ctr !== "number" || !Number.isFinite(value.ctr) || value.ctr < 0 || value.ctr > 1
    || typeof value.position !== "number" || !Number.isFinite(value.position) || value.position < 0) throw new ReportFailure("invalid-response");
  return { clicks: value.clicks, impressions: value.impressions, ctr: value.ctr * 100, averagePosition: value.position };
}
function aggregate(value: unknown, window: Window): Stats & Window {
  const parsed = parseGoogleSearchResponses(value, {}, window);
  if (!parsed) throw new ReportFailure("invalid-response");
  return { clicks: parsed.clicks, impressions: parsed.impressions, ctr: parsed.ctr, averagePosition: parsed.averagePosition, ...window };
}
function breakdown(value: unknown, page: boolean): Breakdown[] {
  const list = rows(value);
  if (list.length > GOOGLE_SEARCH_TOP_ROWS) throw new ReportFailure("invalid-response");
  const seen = new Set<string>();
  return list.map((row) => {
    if (!record(row) || !Array.isArray(row.keys) || row.keys.length !== 1
      || typeof row.keys[0] !== "string" || !row.keys[0].trim() || seen.has(row.keys[0])) throw new ReportFailure("invalid-response");
    const key = row.keys[0]; seen.add(key);
    if (page) {
      try { if (!["http:", "https:"].includes(new URL(key).protocol)) throw new Error(); }
      catch { throw new ReportFailure("invalid-response"); }
    }
    return { key, ...stats(row) };
  }).sort((a, b) => b.clicks - a.clicks || a.key.localeCompare(b.key));
}
export function compareGoogleSearchPeriods(current: Stats, previous: Stats) {
  const change = (key: "clicks" | "impressions") => ({
    absolute: current[key] - previous[key],
    percent: previous[key] === 0 ? null : (current[key] - previous[key]) / previous[key] * 100,
  });
  return {
    clicks: change("clicks"), impressions: change("impressions"),
    ctrPercentagePoints: current.ctr === null || previous.ctr === null ? null : current.ctr - previous.ctr,
    positionChange: current.averagePosition === null || previous.averagePosition === null ? null : current.averagePosition - previous.averagePosition,
  };
}

export async function loadGoogleSearchReport({
  clientEmail = process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL,
  privateKey = process.env.GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY,
  property = process.env.GOOGLE_SEARCH_CONSOLE_PROPERTY,
  fetcher = fetch, tokenProvider = getGoogleSearchAccessToken, now = new Date(),
}: {
  clientEmail?: string; privateKey?: string; property?: string;
  fetcher?: typeof fetch; tokenProvider?: typeof getGoogleSearchAccessToken; now?: Date;
} = {}): Promise<GoogleSearchReportSnapshot> {
  const checkedAt = now.toISOString();
  const values = [clientEmail, privateKey, property];
  const missingSettings = SETTINGS.filter((_, i) => !values[i]?.trim());
  if (missingSettings.length || !clientEmail || !privateKey || !property) return { state: "not-connected", data: null, checkedAt, reason: "missing-configuration", missingSettings };
  if (![ANYHVAC_URL_PREFIX_PROPERTY, ANYHVAC_DOMAIN_PROPERTY].includes(property)) return { state: "unavailable", data: null, checkedAt, reason: "unsupported-property" };
  const windows = getGoogleSearchReportWindows(now);
  const controller = new AbortController();
  let rejectTimeout: () => void = () => {};
  const timeout = new Promise<never>((_, reject) => { rejectTimeout = () => { controller.abort(); reject(new ReportFailure("timeout")); }; });
  const timer = setTimeout(rejectTimeout, GOOGLE_SEARCH_REPORT_TIMEOUT_MS);
  try {
    const retrieve = async (): Promise<GoogleSearchReport> => {
      let token: string;
      try { token = await tokenProvider(clientEmail, privateKey); }
      catch { throw new ReportFailure("authentication-failed"); }
      if (controller.signal.aborted) throw new ReportFailure("timeout");
      const query = async (window: Window, dimension?: "date" | "query" | "page") => {
        const response = await fetcher(`${GOOGLE_SEARCH_API_BASE}/${encodeURIComponent(property)}/searchAnalytics/query`, {
          method: "POST", redirect: "error", cache: "no-store", signal: controller.signal,
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ ...window, type: "web", dataState: "final",
            aggregationType: dimension === "page" ? "byPage" : "byProperty",
            rowLimit: dimension === "date" ? 28 : dimension ? GOOGLE_SEARCH_TOP_ROWS : 1,
            ...(dimension ? { dimensions: [dimension] } : {}),
          }),
        });
        if (!response.ok) throw new ReportFailure(response.status === 401 ? "unauthorized" : response.status === 403 ? "forbidden" : response.status === 429 ? "rate-limited" : "provider-error");
        try { return await response.json() as unknown; }
        catch { throw new ReportFailure("invalid-response"); }
      };
      const [contextValue, dailyValue, currentValue, previousValue, queriesValue, pagesValue] = await Promise.all([
        query(windows.context), query(windows.context, "date"), query(windows.current), query(windows.previous),
        query(windows.current, "query"), query(windows.current, "page"),
      ]);
      if (!parseGoogleSearchResponses(contextValue, dailyValue, windows.context)) throw new ReportFailure("invalid-response");
      const daily = rows(dailyValue).map((r) => ({ date: (r as { keys: string[] }).keys[0], ...stats(r) })).sort((a, b) => a.date.localeCompare(b.date));
      const current = aggregate(currentValue, windows.current), previous = aggregate(previousValue, windows.previous);
      return {
        source: "Google Search Console Search Analytics API", retrievedAt: new Date().toISOString(),
        property, timezone: "America/Los_Angeles", searchType: "web", dataState: "final", finalizationLagDays: 3,
        current, previous, context: aggregate(contextValue, windows.context), daily,
        contextWeeks: windows.contextWeeks.map((window) => {
          const days = daily.filter(d => d.date >= window.startDate && d.date <= window.endDate);
          return { ...window, clicks: days.reduce((n, d) => n + d.clicks, 0), impressions: days.reduce((n, d) => n + d.impressions, 0), returnedDays: days.length };
        }),
        comparison: compareGoogleSearchPeriods(current, previous), topQueries: breakdown(queriesValue, false), topPages: breakdown(pagesValue, true),
      };
    };
    return { state: "connected", data: await Promise.race([retrieve(), timeout]), checkedAt };
  } catch (error) {
    // Never include provider response bodies, tokens, private keys or raw exceptions.
    return { state: "unavailable", data: null, checkedAt, reason: error instanceof ReportFailure ? error.code : "provider-error" };
  } finally { clearTimeout(timer); controller.abort(); }
}
