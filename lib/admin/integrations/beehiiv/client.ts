import type { BeehiivNewsletterMetrics } from "@/lib/admin/integrations/beehiiv/types";

export const BEEHIIV_API_BASE = "https://api.beehiiv.com/v2/publications";
export const BEEHIIV_TIMEOUT_MS = 5_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function parseRate(value: unknown): number | null | undefined {
  if (value === null || value === undefined) return null;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
    return undefined;
  }
  return value * 100;
}

export function parseBeehiivPublication(
  value: unknown,
  publicationId: string,
): BeehiivNewsletterMetrics | null {
  if (!isRecord(value) || !isRecord(value.data)) return null;
  const publication = value.data;
  if (publication.id !== publicationId || !isRecord(publication.stats)) return null;
  const stats = publication.stats;
  if (!isNonNegativeInteger(stats.active_subscriptions) || !isNonNegativeInteger(stats.total_sent)) {
    return null;
  }

  const averageOpenRate = parseRate(stats.average_open_rate);
  const averageClickRate = parseRate(stats.average_click_rate);
  if (averageOpenRate === undefined || averageClickRate === undefined) return null;

  return {
    activeSubscribers: stats.active_subscriptions,
    averageOpenRate: stats.total_sent === 0 ? null : averageOpenRate,
    averageClickRate: stats.total_sent === 0 ? null : averageClickRate,
  };
}

export async function retrieveBeehiivNewsletterMetrics({
  apiKey,
  publicationId,
  fetcher = fetch,
}: {
  apiKey: string;
  publicationId: string;
  fetcher?: typeof fetch;
}): Promise<BeehiivNewsletterMetrics> {
  const url = new URL(`${BEEHIIV_API_BASE}/${encodeURIComponent(publicationId)}`);
  url.searchParams.append("expand[]", "stats");

  const response = await fetcher(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: "no-store",
    signal: AbortSignal.timeout(BEEHIIV_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error("Beehiiv publication request was not accepted.");

  const body: unknown = await response.json().catch(() => null);
  const metrics = parseBeehiivPublication(body, publicationId);
  if (!metrics) throw new Error("Beehiiv publication response was invalid.");
  return metrics;
}
