import { afterEach, describe, expect, it, vi } from "vitest";

import {
  RESEND_METRICS_ENDPOINT,
  RESEND_METRICS_TIMEOUT_MS,
  RESEND_METRIC_NAMES,
  getResendMetricsRange,
} from "@/lib/admin/integrations/resend/client";
import {
  RESEND_METRICS_CACHE_SECONDS,
  loadResendEmailMetricsUncached,
} from "@/lib/admin/integrations/resend/metrics";
import { loadControlRoomIntegrations } from "@/lib/admin/integrations/load";

const NOW = new Date("2026-09-15T16:30:00.000Z");
const API_KEY = "re_admin_metrics_test_secret";

function metricsResponse(overrides: Record<string, unknown> = {}) {
  return {
    object: "metrics",
    start_date: "2026-08-16T16:30:00.000Z",
    end_date: "2026-09-15T16:30:00.000Z",
    metrics: [...RESEND_METRIC_NAMES],
    dimensions: [],
    granularity: "daily",
    totals: {
      sent: 42,
      delivered: 40,
      failed: 1,
      bounced: 1,
      delivery_rate: 95.2,
    },
    ...overrides,
  };
}

function successfulFetch(body: unknown = metricsResponse()) {
  return vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Resend email metrics integration", () => {
  it("returns Not connected without RESEND_ADMIN_API_KEY", async () => {
    const fetcher = vi.fn();
    const result = await loadResendEmailMetricsUncached({
      apiKey: undefined,
      fetcher,
      now: NOW,
    });
    expect(result).toEqual({ state: "not-connected", data: null });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("loads and normalizes the documented metrics response", async () => {
    const fetcher = successfulFetch();
    const result = await loadResendEmailMetricsUncached({
      apiKey: API_KEY,
      fetcher,
      now: NOW,
    });

    expect(result).toEqual({
      state: "connected",
      data: {
        sent: 42,
        delivered: 40,
        failed: 1,
        bounced: 1,
        deliveryRate: 95.2,
        period: "last-30-days",
      },
    });

    const [requestUrl, requestOptions] = fetcher.mock.calls[0] as [URL, RequestInit];
    expect(requestUrl.origin + requestUrl.pathname).toBe(RESEND_METRICS_ENDPOINT);
    expect(requestUrl.searchParams.get("start_date")).toBe("2026-08-16T16:30:00.000Z");
    expect(requestUrl.searchParams.get("end_date")).toBe("2026-09-15T16:30:00.000Z");
    expect(requestUrl.searchParams.get("timezone")).toBe("UTC");
    expect(requestUrl.searchParams.get("metrics")).toBe(RESEND_METRIC_NAMES.join(","));
    expect(new Headers(requestOptions.headers).get("Authorization")).toBe(`Bearer ${API_KEY}`);
    expect(requestOptions.cache).toBe("no-store");
    expect(requestOptions.signal).toBeInstanceOf(AbortSignal);
  });

  it("treats zero activity as Connected without a misleading rate", async () => {
    const fetcher = successfulFetch(
      metricsResponse({
        totals: { sent: 0, delivered: 0, failed: 0, bounced: 0, delivery_rate: 0 },
      }),
    );
    const result = await loadResendEmailMetricsUncached({ apiKey: API_KEY, fetcher, now: NOW });
    expect(result).toMatchObject({
      state: "connected",
      data: { sent: 0, deliveryRate: null },
    });
  });

  it.each([500, 429])("degrades HTTP %s to Unavailable", async (status) => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status }));
    await expect(
      loadResendEmailMetricsUncached({ apiKey: API_KEY, fetcher, now: NOW }),
    ).resolves.toEqual({ state: "unavailable", data: null });
  });

  it("degrades a timeout to Unavailable", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const fetcher = vi.fn().mockRejectedValue(new DOMException("Timed out", "TimeoutError"));
    await expect(
      loadResendEmailMetricsUncached({ apiKey: API_KEY, fetcher, now: NOW }),
    ).resolves.toEqual({ state: "unavailable", data: null });
  });

  it.each([
    null,
    {},
    metricsResponse({ object: "emails" }),
    metricsResponse({ totals: { sent: "42" } }),
    metricsResponse({ totals: { sent: 1, delivered: 1, failed: 0, bounced: 0, delivery_rate: 101 } }),
    metricsResponse({ metrics: ["sent", "delivered"] }),
  ])("degrades malformed metrics to Unavailable", async (body) => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const result = await loadResendEmailMetricsUncached({
      apiKey: API_KEY,
      fetcher: successfulFetch(body),
      now: NOW,
    });
    expect(result).toEqual({ state: "unavailable", data: null });
  });

  it("uses an exact UTC 30-day range and a five-minute application cache", () => {
    const range = getResendMetricsRange(NOW);
    expect(Date.parse(range.endDate) - Date.parse(range.startDate)).toBe(
      30 * 24 * 60 * 60 * 1000,
    );
    expect(RESEND_METRICS_TIMEOUT_MS).toBe(5_000);
    expect(RESEND_METRICS_CACHE_SECONDS).toBe(300);
  });

  it("isolates an unexpected provider rejection", async () => {
    await expect(
      loadControlRoomIntegrations({
        loadResend: vi.fn().mockRejectedValue(new Error("provider failed")),
        loadBeehiiv: vi.fn().mockResolvedValue({ state: "not-connected", data: null }),
      }),
    ).resolves.toEqual({
      resend: { state: "unavailable", data: null },
      beehiiv: { state: "not-connected", data: null },
    });
  });
});
