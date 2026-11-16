import type { GoogleSearchReportSnapshot } from "@/lib/admin/integrations/google-search-console/report";
export type ReportingWindow = { startDate: string; endDate: string; timezone: string };
export type Evidence = ReportingWindow & {
  source: string; checkedAt: string; state: "available" | "unavailable";
  values: Record<string, string | number | null>; notes: string[];
};
export type WeeklyReportInput = {
  generatedAt: string; window: ReportingWindow; search: GoogleSearchReportSnapshot;
  buffer: Evidence; engagement: Evidence;
  supplied?: Partial<Record<"cloudflare" | "bufferInsights" | "bufferLinkedin" | "bufferInstagram" | "bufferYoutube" | "beehiiv" | "stripe" | "adsense" | "indexing", Evidence>>;
};
export function getWeeklyReportingWindow(now = new Date()): ReportingWindow {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const date = new Date(`${today}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  const endDate = date.toISOString().slice(0, 10);
  date.setUTCDate(date.getUTCDate() - 6);
  return { startDate: date.toISOString().slice(0, 10), endDate, timezone: "America/New_York" };
}
const ALLOWED = {
  cloudflare: ["visits", "pageViews", "topLandingPages", "topTrafficSources"],
  bufferInsights: ["channel", "reach", "impressions", "engagements", "linkClicks", "saves"],
  bufferLinkedin: ["reach", "impressions", "engagements", "linkClicks", "saves"],
  bufferInstagram: ["reach", "impressions", "engagements", "linkClicks", "saves"],
  bufferYoutube: ["views", "impressions", "engagements", "linkClicks", "watchTimeMinutes"],
  beehiiv: ["activeSubscribers", "confirmedNonTestSubscribers", "netChange"],
  stripe: ["earnedRevenue", "donations", "refunds", "currency"],
  adsense: ["status", "earnedRevenue", "currency"],
  indexing: ["indexed", "excluded", "redirects", "requestedUrlsStatus"],
} as const;
function validDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}
export function parseSuppliedEvidence(value: unknown): NonNullable<WeeklyReportInput["supplied"]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Supplied evidence must be an object.");
  const parsed: NonNullable<WeeklyReportInput["supplied"]> = {};
  for (const [provider, raw] of Object.entries(value)) {
    if (!Object.hasOwn(ALLOWED, provider) || !raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Unknown supplied provider or invalid evidence.");
    const item = raw as Record<string, unknown>;
    if (Object.keys(item).some(k => !["source", "checkedAt", "state", "startDate", "endDate", "timezone", "values", "notes"].includes(k))
      || item.state !== "available" || typeof item.source !== "string" || !item.source.trim()
      || typeof item.checkedAt !== "string" || !Number.isFinite(Date.parse(item.checkedAt))
      || !validDate(item.startDate) || !validDate(item.endDate) || item.startDate > item.endDate
      || typeof item.timezone !== "string" || !item.timezone.trim()
      || !Array.isArray(item.notes) || !item.notes.length || item.notes.some(n => typeof n !== "string" || !n.trim())
      || !item.values || typeof item.values !== "object" || Array.isArray(item.values) || !Object.keys(item.values).length) throw new Error("Supplied evidence needs source, dates, timezone, freshness, values and quality notes.");
    const keys: readonly string[] = ALLOWED[provider as keyof typeof ALLOWED];
    for (const [key, metric] of Object.entries(item.values)) {
      if (!keys.includes(key) || (typeof metric !== "string" && typeof metric !== "number" && metric !== null)
        || (typeof metric === "number" && !Number.isFinite(metric))) throw new Error("Unsupported supplied metric.");
    }
    if ((provider === "stripe" || (provider === "adsense" && "earnedRevenue" in item.values))
      && !/^[A-Z]{3}$/.test(String((item.values as Record<string, unknown>).currency))) throw new Error("Revenue requires an explicit currency.");
    parsed[provider as keyof typeof parsed] = item as Evidence;
  }
  return parsed;
}
function text(value: unknown) {
  return String(value).replace(/[\r\n]+/g, " ").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\|/g, "\\|").replace(/`/g, "'");
}
function number(value: number | null) { return value === null ? "Unavailable / no denominator" : Number(value.toFixed(2)).toString(); }
function evidence(label: string, item?: Evidence): string[] {
  if (!item) return [`${label}: unavailable; no current provider evidence supplied. No zero or estimate substituted.`, ""];
  return [
    `${label}: ${text(item.state)}. Source: ${text(item.source)}. Period: ${item.startDate}–${item.endDate} (${text(item.timezone)}). Checked: ${text(item.checkedAt)}.`, "",
    ...Object.entries(item.values).map(([key, value]) => `- ${text(key)}: ${value === null ? "Unavailable" : text(value)}`),
    ...item.notes.map(note => `- Quality: ${text(note)}`), "",
  ];
}
export function renderWeeklyReport(input: WeeklyReportInput) {
  const { search } = input;
  const lines = ["# ANYHVAC WEEKLY BRIEF", "", `Generated: ${input.generatedAt}. Audience/social week: ${input.window.startDate}–${input.window.endDate} (${input.window.timezone}).`, "", "## Discovery", ""];
  if (search.state !== "connected") {
    lines.push(`Search Console: ${search.state}; ${search.reason}. Checked: ${search.checkedAt}. Current search metrics, queries, landing pages and trends unavailable.`, "");
  } else {
    const g = search.data;
    lines.push(`Source: ${g.source}; property: ${text(g.property)}; retrieved: ${g.retrievedAt}. Web search, final data, ${g.timezone}; three-day lag is a reporting policy, not proof all dates have data.`, "", "| Period | Dates | Clicks | Impressions | CTR (%) | Average position |", "|---|---|---:|---:|---:|---:|");
    for (const [name, p] of [["Current 7 days", g.current], ["Previous 7 days", g.previous], ["28-day context", g.context]] as const) lines.push(`| ${name} | ${p.startDate}–${p.endDate} | ${p.clicks} | ${p.impressions} | ${number(p.ctr)} | ${number(p.averagePosition)} |`);
    const percent = (value: number | null) => value === null ? "undefined; prior count is zero" : `${number(value)}%`;
    lines.push("", `DERIVED week-over-week: clicks ${g.comparison.clicks.absolute} (${percent(g.comparison.clicks.percent)}); impressions ${g.comparison.impressions.absolute} (${percent(g.comparison.impressions.percent)}); CTR ${number(g.comparison.ctrPercentagePoints)} percentage points; position change ${number(g.comparison.positionChange)} (negative means improvement). Percent change is undefined when the prior count is zero.`, "");
    for (const [label, rows] of [["Top queries", g.topQueries], ["Top landing pages", g.topPages]] as const) {
      lines.push(`${label}: ${g.current.startDate}–${g.current.endDate}; top 10 by clicks, not an exhaustive inventory.`, "", "| Query/page | Clicks | Impressions | CTR (%) | Position |", "|---|---:|---:|---:|---:|");
      for (const row of rows) lines.push(`| ${text(row.key)} | ${row.clicks} | ${row.impressions} | ${number(row.ctr)} | ${number(row.averagePosition)} |`);
      if (!rows.length) lines.push("| No rows returned | — | — | — | — |");
      lines.push("");
    }
    lines.push("28-day trend (sums of returned daily rows; omitted dates are not synthesized):", "", "| Dates | Clicks | Impressions | Returned days |", "|---|---:|---:|---:|");
    for (const w of g.contextWeeks) lines.push(`| ${w.startDate}–${w.endDate} | ${w.clicks} | ${w.impressions} | ${w.returnedDays} |`);
    lines.push("", "Daily returned rows:", "", "| Date (Pacific) | Clicks | Impressions | CTR (%) | Position |", "|---|---:|---:|---:|---:|");
    for (const d of g.daily) lines.push(`| ${d.date} | ${d.clicks} | ${d.impressions} | ${number(d.ctr)} | ${number(d.averagePosition)} |`);
    lines.push("", "Query privacy omissions, API top-row limits and page-versus-property aggregation mean breakdown totals need not match property totals. CTR and position come from provider period aggregates; they are not averages of daily rates.", "");
  }
  lines.push("Historical owner-supplied baseline: trailing three months as of November 9, 2026: 743 impressions, 2 clicks, 0.3% CTR, average position 70.4. Exact start date was not supplied; no weekly percentage comparison is valid.", "", "## Audience", "", ...evidence("Buffer publications", input.buffer), ...evidence("Buffer native performance", input.supplied?.bufferInsights), ...["bufferLinkedin", "bufferInstagram", "bufferYoutube"].flatMap(provider => input.supplied?.[provider as "bufferLinkedin" | "bufferInstagram" | "bufferYoutube"] ? evidence(provider, input.supplied[provider as "bufferLinkedin" | "bufferInstagram" | "bufferYoutube"]) : []), ...evidence("Cloudflare audience", input.supplied?.cloudflare), ...evidence("Recorded website engagement", input.engagement), ...evidence("Beehiiv subscribers", input.supplied?.beehiiv), "## Revenue", "", ...evidence("Stripe actual revenue", input.supplied?.stripe), ...evidence("AdSense status/revenue", input.supplied?.adsense), "## Operations", "", ...evidence("Search indexing", input.supplied?.indexing), "Historical owner note, November 16: AdSense Getting ready; not a live authenticated status check. Historical November 9 indexing: 12 indexed, 6 excluded, including 3 redirects. Current status requires dated provider evidence.", "", "## Notable Changes", "", "Scheduled posts are upcoming activity, not published reach or audience growth. Unknown subscribers and revenue remain unknown. Do not combine provider time zones or lifetime social metrics into a single weekly total.", "", "## Opportunities / Recommended Next Actions for George", "", ...(search.state === "connected" ? ["1. Review the returned query/page evidence for a qualified HVAC use case before selecting next week's topic; validate relevance rather than promoting a weak statistical signal."] : ["1. Obtain the finalized Search Console week and query/page export before choosing search-led topics; current search demand is unverified."]), "2. Confirm scheduled posts were actually sent, then use free native Buffer Insights snapshots to compare available clicks, saves and reach by format; do not rank formats from publication counts alone.", "3. Reuse one existing tool/reference with clear engineering value; assess recorded engagement and confirmed subscriber outcomes without treating modal opens or owner activity as conversions.", "", "## Data Quality / Limitations", "", "MEASURED: provider-returned observations; DERIVED: counts and comparisons calculated from them. Supplied snapshots retain their own dates and quality notes. Recorded resource events are not unique visitors, sitewide calculator usage or confirmed subscriptions. No forecasts or missing-data estimates.", "");
  return lines.join("\n");
}
