import { describe, expect, it } from "vitest";
import { getWeeklyReportingWindow, parseSuppliedEvidence, renderWeeklyReport, type Evidence, type WeeklyReportInput } from "@/lib/admin/reporting/weekly";
const window = { startDate: "2026-11-09", endDate: "2026-11-15", timezone: "America/New_York" };
const base: Evidence = { ...window, source: "Provider fixture", checkedAt: "2026-11-16T18:00:00Z", state: "available", values: {}, notes: ["Test exclusions unverified."] };
function input(): WeeklyReportInput {
  return { generatedAt: base.checkedAt, window, search: { state: "not-connected", data: null, checkedAt: base.checkedAt, reason: "missing-configuration", missingSettings: [] }, buffer: { ...base, values: { linkedinSentInWeek: 0, linkedinUpcomingScheduled: 5 } }, engagement: { ...base, values: { resource_view: 2 } } };
}
describe("weekly evidence report", () => {
  it("uses seven completed Eastern calendar days rather than the current partial day", () => {
    expect(getWeeklyReportingWindow(new Date("2026-11-16T18:00:00Z"))).toEqual(window);
    expect(getWeeklyReportingWindow(new Date("2026-11-16T02:00:00Z"))).toMatchObject({ startDate: "2026-11-08", endDate: "2026-11-14" });
  });
  it("retains provenance and known zero publication counts without inventing missing subscribers or revenue", () => {
    const out = renderWeeklyReport(input());
    expect(out).toContain("linkedinSentInWeek: 0"); expect(out).toContain("resource_view: 2");
    expect(out).toContain("Beehiiv subscribers: unavailable");expect(out).toContain("Stripe actual revenue: unavailable");
    expect(out).toContain(base.checkedAt);expect(out).toContain("America/New_York");
    expect(out).toContain("no weekly percentage comparison is valid");expect(out).toContain("not published reach");
  });
  it("preserves a supplied provider's distinct reporting period and freshness", () => {
    const supplied = parseSuppliedEvidence({ cloudflare: { ...base, startDate: "2026-11-01", values: { visits: 0 } } });
    const out = renderWeeklyReport({ ...input(), supplied });
    expect(out).toContain("2026-11-01–2026-11-15");expect(out).toContain("visits: 0");
  });
  it.each([
    { stripe: { ...base, values: { earnedRevenue: 1 } } },
    { cloudflare: { ...base, checkedAt: "unknown", values: { visits: 1 } } },
    { cloudflare: { ...base, notes: [], values: { visits: 1 } } },
    { cloudflare: { ...base, startDate: "2026-02-30", values: { visits: 1 } } },
    { cloudflare: { ...base, values: { token: "do-not-read" } } },
  ])("rejects supplied evidence without currency, dates, quality or allowed metrics", bad => {
    expect(() => parseSuppliedEvidence(bad)).toThrow();
  });
  it("keeps actual supplied revenue and confirmed non-test subscriber evidence distinct", () => {
    const supplied = parseSuppliedEvidence({ stripe: { ...base, values: { earnedRevenue: 0, currency: "USD" }, notes: ["Actual provider total; excludes tests; refunds reconciled."] }, beehiiv: { ...base, values: { confirmedNonTestSubscribers: 0 } } });
    const out = renderWeeklyReport({ ...input(), supplied });
    expect(out).toContain("earnedRevenue: 0");expect(out).toContain("currency: USD");
    expect(out).toContain("confirmedNonTestSubscribers: 0");
  });
  it("escapes supplied markup and preserves exactly three next actions", () => {
    const out = renderWeeklyReport({ ...input(), supplied: { cloudflare: { ...base, values: { topLandingPages: "<script> | line\nnext" } } } });
    expect(out).not.toContain("<script>");expect(out).toContain("&lt;script&gt; \\| line next");
    expect(out.match(/^\d\. /gm)).toHaveLength(3);
  });
  it("renders connected search rates and period comparisons without re-averaging positions", () => {
    const report = input();
    const stats = { clicks: 2, impressions: 100, ctr: 2, averagePosition: 42.5 };
    report.search = { state: "connected", checkedAt: base.checkedAt, data: {
      source: "Google Search Console Search Analytics API", retrievedAt: base.checkedAt,
      property: "https://www.anyhvac.net/", timezone: "America/Los_Angeles", searchType: "web", dataState: "final", finalizationLagDays: 3,
      current: { ...stats, startDate: "2026-11-07", endDate: "2026-11-13" },
      previous: { ...stats, clicks: 0, ctr: 0, startDate: "2026-10-31", endDate: "2026-11-06" },
      context: { ...stats, startDate: "2026-10-17", endDate: "2026-11-13" },
      comparison: { clicks: { absolute: 2, percent: null }, impressions: { absolute: 0, percent: 0 }, ctrPercentagePoints: 2, positionChange: 0 },
      daily: [{ ...stats, averagePosition: 10, date: "2026-11-13" }],
      contextWeeks: [{ startDate: "2026-11-07", endDate: "2026-11-13", clicks: 2, impressions: 100, returnedDays: 1 }],
      topQueries: [{ ...stats, key: "duct | <query>" }], topPages: [],
    } };
    const out = renderWeeklyReport(report);
    expect(out).toContain("2026-11-07–2026-11-13 | 2 | 100 | 2 | 42.5");
    expect(out).toContain("2026-11-13 | 2 | 100 | 2 | 10");
    expect(out).toContain("undefined; prior count is zero");
    expect(out).toContain("duct \\| &lt;query&gt;");
    expect(out).toContain("No rows returned");
  });
  it("keeps separate native social snapshots in their own date ranges", () => {
    const supplied = parseSuppliedEvidence({
      bufferLinkedin: { ...base, values: { linkClicks: 1 } },
      bufferInstagram: { ...base, startDate: "2026-11-10", values: { saves: 2 } },
      bufferYoutube: { ...base, values: { views: 3 } },
    });
    const out = renderWeeklyReport({ ...input(), supplied });
    expect(out).toContain("bufferLinkedin: available");
    expect(out).toContain("2026-11-10–2026-11-15");
    expect(out).toContain("bufferYoutube: available");
    expect(out).toContain("views: 3");
  });
});
