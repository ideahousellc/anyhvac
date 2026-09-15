import type {
  ResendEmailMetrics,
  ResendMetricsApiResponse,
} from "@/lib/admin/integrations/resend/types";

export const RESEND_METRICS_ENDPOINT = "https://api.resend.com/emails/metrics";
export const RESEND_METRICS_TIMEOUT_MS = 5_000;
export const RESEND_METRIC_NAMES = [
  "sent",
  "delivered",
  "failed",
  "bounced",
  "delivery_rate",
] as const;

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export function getResendMetricsRange(now = new Date()) {
  const end = new Date(now);
  const start = new Date(end.getTime() - THIRTY_DAYS_MS);
  return { startDate: start.toISOString(), endDate: end.toISOString() };
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isValidRate(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100;
}

export function parseResendMetricsResponse(value: unknown): ResendEmailMetrics | null {
  if (typeof value !== "object" || value === null) return null;
  const response = value as Partial<ResendMetricsApiResponse>;
  if (
    response.object !== "metrics" ||
    typeof response.start_date !== "string" ||
    !Number.isFinite(Date.parse(response.start_date)) ||
    typeof response.end_date !== "string" ||
    !Number.isFinite(Date.parse(response.end_date)) ||
    !Array.isArray(response.metrics) ||
    !RESEND_METRIC_NAMES.every((metric) => response.metrics?.includes(metric)) ||
    typeof response.totals !== "object" ||
    response.totals === null
  ) {
    return null;
  }

  const totals = response.totals;
  if (
    !isNonNegativeInteger(totals.sent) ||
    !isNonNegativeInteger(totals.delivered) ||
    !isNonNegativeInteger(totals.failed) ||
    !isNonNegativeInteger(totals.bounced) ||
    !isValidRate(totals.delivery_rate)
  ) {
    return null;
  }

  return {
    sent: totals.sent,
    delivered: totals.delivered,
    failed: totals.failed,
    bounced: totals.bounced,
    deliveryRate: totals.sent === 0 ? null : totals.delivery_rate,
    period: "last-30-days",
  };
}

export async function retrieveResendEmailMetrics({
  apiKey,
  fetcher = fetch,
  now = new Date(),
}: {
  apiKey: string;
  fetcher?: typeof fetch;
  now?: Date;
}) {
  const range = getResendMetricsRange(now);
  const url = new URL(RESEND_METRICS_ENDPOINT);
  url.searchParams.set("start_date", range.startDate);
  url.searchParams.set("end_date", range.endDate);
  url.searchParams.set("timezone", "UTC");
  url.searchParams.set("metrics", RESEND_METRIC_NAMES.join(","));

  const response = await fetcher(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: "no-store",
    signal: AbortSignal.timeout(RESEND_METRICS_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error("Resend metrics request was not accepted.");

  const body: unknown = await response.json().catch(() => null);
  const metrics = parseResendMetricsResponse(body);
  if (!metrics) throw new Error("Resend metrics response was invalid.");
  return metrics;
}
