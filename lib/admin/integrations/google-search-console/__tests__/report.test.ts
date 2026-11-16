import { afterEach, describe, expect, it, vi } from "vitest";
import { getGoogleSearchReportWindows } from "@/lib/admin/integrations/google-search-console/dates";
import { ANYHVAC_URL_PREFIX_PROPERTY, GOOGLE_SEARCH_REPORT_TIMEOUT_MS, loadGoogleSearchReport } from "@/lib/admin/integrations/google-search-console/report";
const NOW = new Date("2026-11-16T18:00:00Z");
const config = { clientEmail: "report@example.invalid", privateKey: "test-private-value", property: ANYHVAC_URL_PREFIX_PROPERTY, now: NOW };
const tokenProvider = async () => "test-access-value";
const row = (clicks = 2, impressions = 40, position = 60) => ({ clicks, impressions, ctr: clicks / impressions, position });
function mockFetch(override?: (body: { dimensions?: string[]; endDate?: string }) => unknown) {
  return vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body));
    let result: unknown;
    if (body.dimensions?.[0] === "date") result = { rows: [{ ...row(), keys: ["2026-11-13"] }] };
    else if (body.dimensions?.[0] === "query") result = { rows: [{ ...row(), keys: ["duct friction calculator"] }] };
    else if (body.dimensions?.[0] === "page") result = { rows: [{ ...row(), keys: ["https://www.anyhvac.net/tools/duct-calculator"] }] };
    else result = { rows: [body.endDate === "2026-11-06" ? row(0, 30, 80) : row()] };
    return new Response(JSON.stringify(override ? override(body) : result), { status: 200 });
  });
}
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); });
describe("local Search Console reporting", () => {
  it("uses adjacent equal seven-day windows within the 28-day Pacific context", () => {
    expect(getGoogleSearchReportWindows(NOW)).toEqual({
      context: { startDate: "2026-10-17", endDate: "2026-11-13" },
      current: { startDate: "2026-11-07", endDate: "2026-11-13" },
      previous: { startDate: "2026-10-31", endDate: "2026-11-06" },
      contextWeeks: [
        { startDate: "2026-10-17", endDate: "2026-10-23" },
        { startDate: "2026-10-24", endDate: "2026-10-30" },
        { startDate: "2026-10-31", endDate: "2026-11-06" },
        { startDate: "2026-11-07", endDate: "2026-11-13" },
      ],
    });
    expect(getGoogleSearchReportWindows(new Date("2026-11-02T07:30:00Z")).current.endDate).toBe("2026-10-29");
    expect(getGoogleSearchReportWindows(new Date("2026-11-02T08:30:00Z")).current.endDate).toBe("2026-10-30");
  });
  it("does not attempt authentication or fetch when configuration is absent", async () => {
    for (const name of ["CLIENT_EMAIL", "PRIVATE_KEY", "PROPERTY"]) vi.stubEnv("GOOGLE_SEARCH_CONSOLE_" + name, "");
    const auth = vi.fn(), fetcher = vi.fn();
    expect(await loadGoogleSearchReport({ tokenProvider: auth, fetcher, now: NOW })).toMatchObject({ state: "not-connected", reason: "missing-configuration", missingSettings: expect.arrayContaining(["GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY"]) });
    expect(auth).not.toHaveBeenCalled(); expect(fetcher).not.toHaveBeenCalled();
  });
  it.each(["https://anyhvac.net/", "https://www.anyhvac.net", "https://other.invalid/"])("rejects an unconfirmed identifier %s before networking", async property => {
    const auth = vi.fn();
    expect(await loadGoogleSearchReport({ ...config, property, tokenProvider: auth })).toMatchObject({ state: "unavailable", reason: "unsupported-property" });
    expect(auth).not.toHaveBeenCalled();
  });
  it("retrieves period aggregates, daily data and separately aggregated top queries/pages", async () => {
    const fetcher = mockFetch();
    const result = await loadGoogleSearchReport({ ...config, fetcher, tokenProvider });
    expect(result.state).toBe("connected");
    if (result.state !== "connected") throw Error("Expected fixture connection");
    expect(result.data.current).toMatchObject({ clicks: 2, impressions: 40, ctr: 5, averagePosition: 60 });
    expect(result.data.comparison).toMatchObject({ clicks: { absolute: 2, percent: null }, impressions: { absolute: 10 }, ctrPercentagePoints: 5, positionChange: -20 });
    expect(result.data.comparison.impressions.percent).toBeCloseTo(100 / 3);
    expect(result.data.daily).toHaveLength(1); // No invented zero days.
    expect(result.data.contextWeeks.at(-1)).toMatchObject({ clicks: 2, impressions: 40, returnedDays: 1 });
    expect(result.data.topQueries[0].key).toBe("duct friction calculator");
    expect(fetcher).toHaveBeenCalledTimes(6);
    for (const [url, options] of fetcher.mock.calls) {
      expect(String(url)).toContain("https%3A%2F%2Fwww.anyhvac.net%2F/searchAnalytics/query");
      const body = JSON.parse(String(options?.body));
      expect(body).toMatchObject({ dataState: "final", type: "web", aggregationType: body.dimensions?.[0] === "page" ? "byPage" : "byProperty" });
      expect(options?.redirect).toBe("error");
    }
  });
  it("supports an existing domain property without silently replacing its scope", async () => {
    const fetcher = mockFetch();
    const result = await loadGoogleSearchReport({ ...config, property: "sc-domain:anyhvac.net", fetcher, tokenProvider });
    expect(result.state).toBe("connected");
    expect(String(fetcher.mock.calls[0][0])).toContain("sc-domain%3Aanyhvac.net");
  });
  it.each([[401, "unauthorized"], [403, "forbidden"], [429, "rate-limited"], [500, "provider-error"]] as const)("reports HTTP %s without response-body secrets", async (status, reason) => {
    const result = await loadGoogleSearchReport({ ...config, tokenProvider, fetcher: vi.fn(async () => new Response("test-private-value", { status })) });
    expect(result).toMatchObject({ state: "unavailable", reason });
    expect(JSON.stringify(result)).not.toContain(config.privateKey);
  });
  it("does not surface private authentication exceptions", async () => {
    const fetcher = vi.fn();
    const result = await loadGoogleSearchReport({ ...config, fetcher, tokenProvider: async () => { throw Error(config.privateKey); } });
    expect(result).toMatchObject({ reason: "authentication-failed" });
    expect(JSON.stringify(result)).not.toContain(config.privateKey); expect(fetcher).not.toHaveBeenCalled();
  });
  it("bounds authentication delay and does not fetch after timeout", async () => {
    vi.useFakeTimers();const fetcher = vi.fn();
    const promise = loadGoogleSearchReport({ ...config, fetcher, tokenProvider: () => new Promise<string>(() => {}) });
    await vi.advanceTimersByTimeAsync(GOOGLE_SEARCH_REPORT_TIMEOUT_MS);
    expect(await promise).toMatchObject({ reason: "timeout" });expect(fetcher).not.toHaveBeenCalled();
  });
  it.each([
    { rows: "bad" }, { rows: [{ ...row(), keys: ["a", "b"] }] },
    { rows: [{ ...row(), keys: ["a"] }, { ...row(), keys: ["a"] }] },
    { rows: [{ ...row(), ctr: 2, keys: ["a"] }] },
    { rows: [{ ...row(), impressions: -1, keys: ["a"] }] },
  ])("rejects malformed or duplicate breakdowns", async bad => {
    expect(await loadGoogleSearchReport({ ...config, tokenProvider, fetcher: mockFetch(body => body.dimensions?.[0] === "query" ? bad : {}) })).toMatchObject({ reason: "invalid-response" });
  });
  it("keeps successful empty data separate from unavailable data", async () => {
    const result = await loadGoogleSearchReport({ ...config, tokenProvider, fetcher: mockFetch(() => ({})) });
    expect(result).toMatchObject({ state: "connected", data: { current: { clicks: 0, impressions: 0, ctr: null, averagePosition: null }, daily: [], topPages: [], topQueries: [], comparison: { clicks: { absolute: 0, percent: null } } } });
  });
});
