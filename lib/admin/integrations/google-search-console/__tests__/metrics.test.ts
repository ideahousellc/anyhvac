import { afterEach, describe, expect, it, vi } from "vitest";

import {
  GOOGLE_SEARCH_API_BASE,
  GOOGLE_SEARCH_SCOPE,
  GOOGLE_SEARCH_TIMEOUT_MS,
  normalizeGooglePrivateKey,
  parseGoogleSearchResponses,
} from "@/lib/admin/integrations/google-search-console/client";
import { getGoogleSearchDateWindow } from "@/lib/admin/integrations/google-search-console/dates";
import {
  GOOGLE_SEARCH_CACHE_SECONDS,
  loadGoogleSearchMetricsUncached,
} from "@/lib/admin/integrations/google-search-console/metrics";
import { loadControlRoomIntegrations } from "@/lib/admin/integrations/load";

const NOW = new Date("2026-09-16T12:00:00.000Z");
const PROPERTY = "sc-domain:anyhvac.net";
const CONFIG = {
  clientEmail: "search-console@example.iam.gserviceaccount.com",
  privateKey: "private-key-test-value",
  property: PROPERTY,
};
const tokenProvider = vi.fn().mockResolvedValue("access-token-test-value");

function aggregateRow(overrides: Record<string, unknown> = {}) {
  return { clicks: 10, impressions: 100, ctr: 0.1, position: 5.25, ...overrides };
}

function dailyRow(date: string, impressions: number, clicks: number) {
  return { keys: [date], impressions, clicks, ctr: 0.1, position: 5.25 };
}

function queryFetch(aggregate: unknown = { rows: [aggregateRow()] }, daily: unknown = {
  rows: [dailyRow("2026-09-12", 40, 4), dailyRow("2026-09-11", 60, 6)],
}) {
  return vi.fn().mockImplementation((_url: string, options: RequestInit) => {
    const body = JSON.parse(String(options.body));
    return Promise.resolve(new Response(JSON.stringify(body.dimensions ? daily : aggregate), {
      status: 200,
    }));
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.useRealTimers();
  tokenProvider.mockClear();
});

describe("Google Search Console integration", () => {
  it.each(["clientEmail", "privateKey", "property"] as const)(
    "returns Not connected when %s is missing", async (missing) => {
      vi.stubEnv("GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL", "");
      vi.stubEnv("GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY", "");
      vi.stubEnv("GOOGLE_SEARCH_CONSOLE_PROPERTY", "");
      const fetcher = vi.fn();
      const result = await loadGoogleSearchMetricsUncached({
        ...CONFIG, [missing]: undefined, fetcher, tokenProvider, now: NOW,
      });
      expect(result).toEqual({ state: "not-connected", data: null });
      expect(fetcher).not.toHaveBeenCalled();
      expect(tokenProvider).not.toHaveBeenCalled();
    },
  );

  it("normalizes escaped private-key newlines and uses the read-only scope", () => {
    expect(normalizeGooglePrivateKey("line-one\\nline-two\nline-three"))
      .toBe("line-one\nline-two\nline-three");
    expect(GOOGLE_SEARCH_SCOPE).toBe("https://www.googleapis.com/auth/webmasters.readonly");
  });

  it("uses a 28-day finalized Pacific Time window across UTC and DST boundaries", () => {
    expect(getGoogleSearchDateWindow(NOW)).toEqual({
      startDate: "2026-08-17", endDate: "2026-09-13",
    });
    expect(getGoogleSearchDateWindow(new Date("2026-03-09T06:30:00Z")))
      .toEqual({ startDate: "2026-02-06", endDate: "2026-03-05" });
    expect(getGoogleSearchDateWindow(new Date("2026-03-09T07:30:00Z")))
      .toEqual({ startDate: "2026-02-07", endDate: "2026-03-06" });
  });

  it("requests only aggregate totals and date rows for the exact domain property", async () => {
    const fetcher = queryFetch();
    const result = await loadGoogleSearchMetricsUncached({
      ...CONFIG, fetcher, tokenProvider, now: NOW,
    });
    expect(result).toEqual({
      state: "connected",
      data: {
        impressions: 100, clicks: 10, ctr: 10, averagePosition: 5.25,
        daily: [
          { date: "2026-09-11", impressions: 60, clicks: 6 },
          { date: "2026-09-12", impressions: 40, clicks: 4 },
        ],
        startDate: "2026-08-17", endDate: "2026-09-13", period: "last-28-days",
      },
    });
    expect(tokenProvider).toHaveBeenCalledWith(CONFIG.clientEmail, CONFIG.privateKey);
    expect(fetcher).toHaveBeenCalledTimes(2);
    const requests = fetcher.mock.calls as [string, RequestInit][];
    for (const [url, options] of requests) {
      expect(url).toBe(`${GOOGLE_SEARCH_API_BASE}/sc-domain%3Aanyhvac.net/searchAnalytics/query`);
      expect(options.method).toBe("POST");
      expect(options.cache).toBe("no-store");
      expect(options.signal).toBeInstanceOf(AbortSignal);
      expect(new Headers(options.headers).get("Authorization"))
        .toBe("Bearer access-token-test-value");
      const body = JSON.parse(String(options.body));
      expect(body).toMatchObject({
        startDate: "2026-08-17", endDate: "2026-09-13",
        type: "web", aggregationType: "byProperty", dataState: "final",
      });
      expect(JSON.stringify(body)).not.toMatch(/query|country|device|page/);
    }
    expect(requests.map(([, options]) => JSON.parse(String(options.body)).dimensions))
      .toEqual([undefined, ["date"]]);
    expect(GOOGLE_SEARCH_TIMEOUT_MS).toBe(5_000);
    expect(GOOGLE_SEARCH_CACHE_SECONDS).toBe(900);
  });

  it("keeps a valid zero-row response Connected with neutral rates", async () => {
    const result = await loadGoogleSearchMetricsUncached({
      ...CONFIG, fetcher: queryFetch({}, {}), tokenProvider, now: NOW,
    });
    expect(result).toMatchObject({
      state: "connected",
      data: { impressions: 0, clicks: 0, ctr: null, averagePosition: null, daily: [] },
    });
  });

  it("keeps zero counts Connected and neutralizes denominator-free metrics", async () => {
    const result = await loadGoogleSearchMetricsUncached({
      ...CONFIG,
      fetcher: queryFetch({ rows: [aggregateRow({
        clicks: 0, impressions: 0, ctr: 0, position: 0,
      })] }, { rows: [dailyRow("2026-09-12", 0, 0)] }),
      tokenProvider, now: NOW,
    });
    expect(result).toMatchObject({
      state: "connected",
      data: { impressions: 0, clicks: 0, ctr: null, averagePosition: null },
    });
  });

  it("rejects authentication and permission failures without exposing details", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const fetcher = vi.fn();
    const result = await loadGoogleSearchMetricsUncached({
      ...CONFIG, fetcher,
      tokenProvider: vi.fn().mockRejectedValue(new Error("private credential detail")),
      now: NOW,
    });
    expect(result).toEqual({ state: "unavailable", data: null });
    expect(fetcher).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith(
      "Google Search metrics are temporarily unavailable.",
    );
  });

  it.each([401, 403, 429, 500])("degrades HTTP %s to Unavailable", async (status) => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status }));
    await expect(loadGoogleSearchMetricsUncached({
      ...CONFIG, fetcher, tokenProvider, now: NOW,
    })).resolves.toEqual({ state: "unavailable", data: null });
  });

  it("bounds authentication delay to five seconds", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.useFakeTimers();
    const result = loadGoogleSearchMetricsUncached({
      ...CONFIG,
      fetcher: vi.fn(),
      tokenProvider: vi.fn().mockReturnValue(new Promise<string>(() => {})),
      now: NOW,
    });
    await vi.advanceTimersByTimeAsync(5_000);
    await expect(result).resolves.toEqual({ state: "unavailable", data: null });
  });

  it("degrades malformed JSON to Unavailable", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const fetcher = vi.fn().mockResolvedValue(new Response("not json", { status: 200 }));
    await expect(loadGoogleSearchMetricsUncached({
      ...CONFIG, fetcher, tokenProvider, now: NOW,
    })).resolves.toEqual({ state: "unavailable", data: null });
  });

  it.each([
    [{ rows: "bad" }, {}],
    [{ rows: [aggregateRow({ impressions: -1 })] }, {}],
    [{ rows: [aggregateRow({ ctr: 2 })] }, {}],
    [{ rows: [aggregateRow({ position: "5" })] }, {}],
    [{ rows: [aggregateRow(), aggregateRow()] }, {}],
    [{ rows: [aggregateRow()] }, { rows: [dailyRow("2026-09-14", 1, 1)] }],
    [{ rows: [aggregateRow()] }, { rows: [dailyRow("2026-09-12", 1, 1), dailyRow("2026-09-12", 2, 1)] }],
    [{ rows: [aggregateRow()] }, { rows: [{ keys: ["2026-09-12"], impressions: "1", clicks: 1 }] }],
  ])("degrades invalid Search Analytics responses", async (aggregate, daily) => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    await expect(loadGoogleSearchMetricsUncached({
      ...CONFIG, fetcher: queryFetch(aggregate, daily), tokenProvider, now: NOW,
    })).resolves.toEqual({ state: "unavailable", data: null });
  });

  it("returns only normalized aggregate and date metrics", () => {
    const window = getGoogleSearchDateWindow(NOW);
    const result = parseGoogleSearchResponses(
      { rows: [{ ...aggregateRow(), keys: [], secret: "should-not-render" }] },
      { rows: [{ ...dailyRow("2026-09-12", 40, 4), secret: "should-not-render" }] },
      window,
    );
    expect(JSON.stringify(result)).not.toContain("should-not-render");
  });
});

describe("Google Search provider isolation", () => {
  const resend = {
    state: "connected" as const,
    data: { sent: 1, delivered: 1, failed: 0, bounced: 0,
      deliveryRate: 100, period: "last-30-days" as const },
  };
  const beehiiv = {
    state: "connected" as const,
    data: { activeSubscribers: 1, averageOpenRate: null, averageClickRate: null },
  };

  it("keeps Resend and Beehiiv connected when Google rejects", async () => {
    const result = await loadControlRoomIntegrations({
      loadGoogleSearch: vi.fn().mockRejectedValue(new Error("provider failed")),
      loadResend: vi.fn().mockResolvedValue(resend),
      loadBeehiiv: vi.fn().mockResolvedValue(beehiiv),
    });
    expect(result).toEqual({
      googleSearch: { state: "unavailable", data: null }, resend, beehiiv,
    });
  });
});
