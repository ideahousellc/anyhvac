import { JWT } from "google-auth-library";

import { getGoogleSearchDateWindow } from "@/lib/admin/integrations/google-search-console/dates";
import type {
  GoogleSearchDay,
  GoogleSearchMetrics,
} from "@/lib/admin/integrations/google-search-console/types";

export const GOOGLE_SEARCH_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
export const GOOGLE_SEARCH_TIMEOUT_MS = 5_000;
export const GOOGLE_SEARCH_API_BASE = "https://www.googleapis.com/webmasters/v3/sites";

type DateWindow = ReturnType<typeof getGoogleSearchDateWindow>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isDateInWindow(value: unknown, window: DateWindow): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value
    && value >= window.startDate && value <= window.endDate;
}

function parseRows(value: unknown): unknown[] | null {
  if (!isRecord(value)) return null;
  if (value.rows === undefined) return [];
  return Array.isArray(value.rows) ? value.rows : null;
}

export function parseGoogleSearchResponses(
  aggregateResponse: unknown,
  dailyResponse: unknown,
  window: DateWindow,
): GoogleSearchMetrics | null {
  const aggregateRows = parseRows(aggregateResponse);
  const dailyRows = parseRows(dailyResponse);
  if (!aggregateRows || !dailyRows || aggregateRows.length > 1 || dailyRows.length > 28) {
    return null;
  }

  let impressions = 0;
  let clicks = 0;
  let ctr: number | null = null;
  let averagePosition: number | null = null;
  if (aggregateRows.length === 1) {
    const row = aggregateRows[0];
    if (!isRecord(row) || !isCount(row.impressions) || !isCount(row.clicks)) return null;
    if (row.keys !== undefined && (!Array.isArray(row.keys) || row.keys.length !== 0)) {
      return null;
    }
    impressions = row.impressions;
    clicks = row.clicks;
    if (impressions > 0) {
      if (typeof row.ctr !== "number" || !Number.isFinite(row.ctr)
        || row.ctr < 0 || row.ctr > 1
        || typeof row.position !== "number" || !Number.isFinite(row.position)
        || row.position < 0) return null;
      ctr = row.ctr * 100;
      averagePosition = row.position;
    }
  }

  const daily: GoogleSearchDay[] = [];
  const dates = new Set<string>();
  for (const item of dailyRows) {
    if (!isRecord(item) || !Array.isArray(item.keys) || item.keys.length !== 1
      || !isDateInWindow(item.keys[0], window)
      || !isCount(item.impressions) || !isCount(item.clicks)) return null;
    const date = item.keys[0];
    if (dates.has(date)) return null;
    dates.add(date);
    daily.push({ date, impressions: item.impressions, clicks: item.clicks });
  }
  daily.sort((a, b) => a.date.localeCompare(b.date));

  return {
    impressions,
    clicks,
    ctr,
    averagePosition,
    daily,
    ...window,
    period: "last-28-days",
  };
}

export function normalizeGooglePrivateKey(privateKey: string) {
  return privateKey.replace(/\\n/g, "\n");
}

export async function getGoogleSearchAccessToken(clientEmail: string, privateKey: string) {
  const client = new JWT({
    email: clientEmail,
    key: normalizeGooglePrivateKey(privateKey),
    scopes: [GOOGLE_SEARCH_SCOPE],
  });
  const result = await client.getAccessToken();
  if (!result.token) throw new Error("Google Search authentication failed.");
  return result.token;
}

export async function retrieveGoogleSearchMetrics({
  clientEmail,
  privateKey,
  property,
  fetcher = fetch,
  tokenProvider = getGoogleSearchAccessToken,
  now = new Date(),
}: {
  clientEmail: string;
  privateKey: string;
  property: string;
  fetcher?: typeof fetch;
  tokenProvider?: typeof getGoogleSearchAccessToken;
  now?: Date;
}): Promise<GoogleSearchMetrics> {
  const window = getGoogleSearchDateWindow(now);
  const url = `${GOOGLE_SEARCH_API_BASE}/${encodeURIComponent(property)}/searchAnalytics/query`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GOOGLE_SEARCH_TIMEOUT_MS);
  let onAbort = () => {};
  const timeout = new Promise<never>((_, reject) => {
    onAbort = () => reject(new Error("Google Search request timed out."));
    controller.signal.addEventListener("abort", onAbort, { once: true });
  });

  try {
    const operation = async () => {
      const accessToken = await tokenProvider(clientEmail, privateKey);
      if (controller.signal.aborted) throw new Error("Google Search request timed out.");
      const base = {
        startDate: window.startDate,
        endDate: window.endDate,
        type: "web",
        aggregationType: "byProperty",
        dataState: "final",
      };
      const query = async (body: Record<string, unknown>) => {
        const response = await fetcher(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Google Search query was not accepted.");
        return response.json() as Promise<unknown>;
      };
      const [aggregate, daily] = await Promise.all([
        query({ ...base, rowLimit: 1 }),
        query({ ...base, dimensions: ["date"], rowLimit: 28 }),
      ]);
      const metrics = parseGoogleSearchResponses(aggregate, daily, window);
      if (!metrics) throw new Error("Google Search response was invalid.");
      return metrics;
    };
    return await Promise.race([operation(), timeout]);
  } finally {
    clearTimeout(timer);
    controller.signal.removeEventListener("abort", onAbort);
  }
}
