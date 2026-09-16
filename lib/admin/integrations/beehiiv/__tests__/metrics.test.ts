import { afterEach, describe, expect, it, vi } from "vitest";

import {
  BEEHIIV_API_BASE,
  BEEHIIV_TIMEOUT_MS,
  parseBeehiivPublication,
} from "@/lib/admin/integrations/beehiiv/client";
import {
  BEEHIIV_METRICS_CACHE_SECONDS,
  loadBeehiivNewsletterMetricsUncached,
} from "@/lib/admin/integrations/beehiiv/metrics";
import { loadControlRoomIntegrations } from "@/lib/admin/integrations/load";

const PUBLICATION_ID = "pub_00000000-0000-0000-0000-000000000000";
const API_KEY = "beehiiv_admin_test_secret";

function publicationResponse(stats: Record<string, unknown> = {}) {
  return {
    data: {
      id: PUBLICATION_ID,
      stats: {
        active_subscriptions: 1234,
        average_open_rate: 0.8,
        average_click_rate: 0.45,
        total_sent: 12,
        ...stats,
      },
    },
  };
}

function successfulFetch(body: unknown = publicationResponse()) {
  return vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status: 200 }));
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("Beehiiv publication metrics", () => {
  it.each([
    [undefined, PUBLICATION_ID],
    [API_KEY, undefined],
    [undefined, undefined],
  ])("returns Not connected when configuration is incomplete", async (apiKey, publicationId) => {
    vi.stubEnv("BEEHIIV_ADMIN_API_KEY", "");
    vi.stubEnv("BEEHIIV_PUBLICATION_ID", "");
    const fetcher = vi.fn();
    await expect(loadBeehiivNewsletterMetricsUncached({ apiKey, publicationId, fetcher }))
      .resolves.toEqual({ state: "not-connected", data: null });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("loads only the selected publication's aggregate statistics", async () => {
    const fetcher = successfulFetch();
    const result = await loadBeehiivNewsletterMetricsUncached({
      apiKey: API_KEY, publicationId: PUBLICATION_ID, fetcher,
    });
    expect(result).toEqual({
      state: "connected",
      data: { activeSubscribers: 1234, averageOpenRate: 80, averageClickRate: 45 },
    });

    expect(fetcher).toHaveBeenCalledTimes(1);
    const [url, options] = fetcher.mock.calls[0] as [URL, RequestInit];
    expect(url.origin + url.pathname).toBe(`${BEEHIIV_API_BASE}/${PUBLICATION_ID}`);
    expect(url.searchParams.getAll("expand[]")).toEqual(["stats"]);
    expect(url.pathname).not.toContain("subscriptions");
    expect(options.method).toBe("GET");
    expect(options.body).toBeUndefined();
    expect(new Headers(options.headers).get("Authorization")).toBe(`Bearer ${API_KEY}`);
    expect(options.cache).toBe("no-store");
    expect(options.signal).toBeInstanceOf(AbortSignal);
    expect(BEEHIIV_TIMEOUT_MS).toBe(5_000);
    expect(BEEHIIV_METRICS_CACHE_SECONDS).toBe(900);
  });

  it("keeps zero subscribers Connected and omits rates without sends", async () => {
    const result = await loadBeehiivNewsletterMetricsUncached({
      apiKey: API_KEY,
      publicationId: PUBLICATION_ID,
      fetcher: successfulFetch(publicationResponse({
        active_subscriptions: 0, total_sent: 0,
        average_open_rate: 0, average_click_rate: 0,
      })),
    });
    expect(result).toEqual({
      state: "connected",
      data: { activeSubscribers: 0, averageOpenRate: null, averageClickRate: null },
    });
  });

  it("keeps absent engagement rates neutral with a valid subscriber count", () => {
    const response = publicationResponse({ average_open_rate: null, average_click_rate: null });
    expect(parseBeehiivPublication(response, PUBLICATION_ID)).toEqual({
      activeSubscribers: 1234, averageOpenRate: null, averageClickRate: null,
    });
  });

  it.each([500, 401, 404, 429])("degrades HTTP %s to Unavailable", async (status) => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status }));
    await expect(loadBeehiivNewsletterMetricsUncached({
      apiKey: API_KEY, publicationId: PUBLICATION_ID, fetcher,
    })).resolves.toEqual({ state: "unavailable", data: null });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("degrades a timeout to Unavailable without retrying", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const fetcher = vi.fn().mockRejectedValue(new DOMException("Timed out", "TimeoutError"));
    await expect(loadBeehiivNewsletterMetricsUncached({
      apiKey: API_KEY, publicationId: PUBLICATION_ID, fetcher,
    })).resolves.toEqual({ state: "unavailable", data: null });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("degrades malformed JSON to Unavailable", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const fetcher = vi.fn().mockResolvedValue(new Response("not json", { status: 200 }));
    await expect(loadBeehiivNewsletterMetricsUncached({
      apiKey: API_KEY, publicationId: PUBLICATION_ID, fetcher,
    })).resolves.toEqual({ state: "unavailable", data: null });
  });

  it.each([
    null,
    {},
    { data: { id: PUBLICATION_ID } },
    { data: { id: "pub_other", stats: publicationResponse().data.stats } },
    publicationResponse({ active_subscriptions: "1234" }),
    publicationResponse({ active_subscriptions: -1 }),
    publicationResponse({ total_sent: "12" }),
    publicationResponse({ average_open_rate: 80 }),
    publicationResponse({ average_click_rate: -0.1 }),
  ])("degrades an invalid publication response to Unavailable", async (body) => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    await expect(loadBeehiivNewsletterMetricsUncached({
      apiKey: API_KEY, publicationId: PUBLICATION_ID, fetcher: successfulFetch(body),
    })).resolves.toEqual({ state: "unavailable", data: null });
  });

  it("discards unrelated fields including any unexpected subscriber data", () => {
    const response = publicationResponse();
    const withUnexpectedData = {
      ...response,
      data: { ...response.data, subscribers: [{ email: "private@example.com" }] },
    };
    const normalized = parseBeehiivPublication(withUnexpectedData, PUBLICATION_ID);
    expect(JSON.stringify(normalized)).not.toContain("private@example.com");
    expect(normalized).toEqual({
      activeSubscribers: 1234, averageOpenRate: 80, averageClickRate: 45,
    });
  });
});

describe("independent Control Room providers", () => {
  const connectedBeehiiv = {
    state: "connected" as const,
    data: { activeSubscribers: 0, averageOpenRate: null, averageClickRate: null },
  };
  const connectedResend = {
    state: "connected" as const,
    data: {
      sent: 42, delivered: 40, failed: 1, bounced: 1,
      deliveryRate: 95.2, period: "last-30-days" as const,
    },
  };

  it("keeps Resend connected when Beehiiv rejects", async () => {
    const result = await loadControlRoomIntegrations({
      loadBeehiiv: vi.fn().mockRejectedValue(new Error("provider failed")),
      loadResend: vi.fn().mockResolvedValue(connectedResend),
    });
    expect(result).toEqual({
      beehiiv: { state: "unavailable", data: null }, resend: connectedResend,
    });
  });

  it("keeps Beehiiv connected when Resend rejects", async () => {
    const result = await loadControlRoomIntegrations({
      loadBeehiiv: vi.fn().mockResolvedValue(connectedBeehiiv),
      loadResend: vi.fn().mockRejectedValue(new Error("provider failed")),
    });
    expect(result).toEqual({
      beehiiv: connectedBeehiiv, resend: { state: "unavailable", data: null },
    });
  });
});
