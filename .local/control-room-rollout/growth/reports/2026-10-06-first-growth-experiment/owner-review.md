# First growth experiment — owner review v1

Prepared October 6, 2026 by George and William. Status: LOCAL DRAFT / OWNER REVIEW. No experiment has launched. This package supersedes the October 2 report's E1/E2 dates and selects **Duct Design Quick Reference**, rather than the measurement resource, for the conversion test. Outreach and support/monetization experiments are outside this package.

**Recommendation:** prioritize the resource conversion test. Prepare the Duct Calculator title test separately. Approve measurement before the baseline starts; approve the exact content before publication. Current evidence cannot measure the complete proposed conversion path.

## Exact copy and placement

On `/resources/duct-design-quick-reference`, directly below the free-PDF download panel and before “What's inside”:

> Get new free HVAC tools and practical references in your inbox.

Body: **Optional newsletter. The PDF and calculators stay free, with no signup required.**

Button: **Get free tool updates**. Opens the existing newsletter modal. Retain “No signup required” and the direct PDF download. Keep the current eight-second automatic prompt and suppression rules.

The page already has two calculator links. Retain the download panel's **Open Duct Calculator** link. Refine the existing “Explore the calculator” section after “What's inside”; do not add a third calculator link.

Replacement paragraph: **Use your airflow and design friction rate to explore round and rectangular duct sizes with the free HVAC Duct Calculator. Check fittings, noise, available space, and project requirements before final design.**

Link: **Open HVAC Duct Calculator**, retaining the decorative arrow, to `/tools/duct-calculator`. George's [copy and code proposal](george-copy-and-code-proposal.md) contains the draft implementation.

On `/tools/duct-calculator`, the exact current repository metadata title is:

> HVAC Duct Calculator | AnyHVAC

Proposed:

> HVAC Duct Size Calculator: Round & Rectangular | AnyHVAC

Change only the `title` argument in `app/tools/duct-calculator/page.tsx`. The established metadata helper also updates Open Graph/Twitter titles from that argument. Keep the description, canonical, visible H1, calculator, formulas, and other calculator content stable. This is a repository verification; the live title and Google's displayed title must be recorded before launch rather than assumed to match.

## Measurement decision before implementation

William's [measurement audit and baseline register](william-measurement.md) is the source of truth for capabilities and missing values. The September site totals are contaminated and cannot establish this experiment's baseline. No page-specific baseline value is assumed to be zero.

| Outcome | Current readiness | Required before launch |
| --- | --- | --- |
| Resource and calculator page views | Public Cloudflare beacon exists; clean counts and exclusions not supplied | Dated path-filtered provider exports, host filters, sampling context, QA of direct loads and App Router navigation |
| Resource-to-calculator clicks | No persisted event collector found | Both existing links instrumented, separate placement labels, server receipt and aggregate export verified |
| Newsletter CTA opens | Existing modal works; no attributed reporting | Explicit CTA source carried through trigger and modal, separately from footer/header/automatic prompt |
| Genuine confirmed CTA subscribers | Shared form and list totals cannot identify this CTA | Provider-confirmed signup date/status and unique CTA acquisition source; known tests excluded |
| Calculator SEO | Existing Control Room uses property totals | Page-filtered Search Console export with query, country/device, finalized dates and indexing evidence |

Cloudflare explicitly does not support custom events or query-string UTM reporting; adding data attributes or internal UTMs does not solve clicks. [Cloudflare FAQ](https://developers.cloudflare.com/web-analytics/faq/).

Proposed measurement implementation for a later authorized change:

1. Add a small first-party collector for `resource_view`, `resource_calculator_click`, and `resource_newsletter_open`, limited to this resource and the two named calculator-link placements. Use the same collector for the page-view denominator and click numerator. Keep Cloudflare page views as a separate corroborating metric. Count at most one calculator activation per rendered resource page view, reporting placement totals separately. A reload is a new page view; this is not unique people or a session conversion rate.
2. Persist daily aggregate counts in approved existing infrastructure only after the owner approves the exact storage/configuration design. Proposed payload: event enum, fixed experiment/version, fixed source path, fixed destination, fixed placement. Server supplies date/time. No emails, subscriber IDs, arbitrary URLs/query strings, stored IP addresses, cross-site identity, or persistent visitor identifiers. Client deduplication uses page-local state; document loss, retries, blockers, and bot limitations. A collector has not been implemented or provisioned, and anonymous client events cannot prove genuine human activity.
3. Give this explicit CTA a dedicated named Beehiiv form, proposed name `duct-reference-inline-v1`, rendered through the existing modal with its default form for all other entry points. Beehiiv documents named embed acquisition details; validate account access and export availability before selecting this method. [Beehiiv embedded-form documentation](https://www.beehiiv.com/support/article/12977090590487). Creating/configuring the form requires further owner authorization. Do not reuse its ID for the automatic prompt. Do not overwrite external acquisition UTMs or guess a subscription-completion callback.
4. Count only unique new external subscribers confirmed by Beehiiv, attributed to that dedicated form. A modal open, success redirect, local-storage flag, pending signup, existing subscriber resubmission, or list-total increase does not establish a confirmed conversion. Keep private subscriber reconciliation with the owner/provider; put aggregates only in this package. Capture unsubscribe counts separately.

If storage or named-form reporting is unavailable, present the exact alternative for approval and postpone the affected test. Do not silently downgrade to aggregate list growth. No new vendor or third-party customer-data transfer is proposed. Public/admin analytics separation remains mandatory.

Proposed code scope for measurement: a narrow client component such as `components/ResourceGrowthTracking.tsx` mounted only on the resource page; shared event enums/validation in `lib/growth-measurement.ts`; a same-origin ingestion route such as `app/api/growth-events/route.ts`; and a server-only aggregate repository under `lib/`. The ingestion route must allowlist events/placements, cap request size, reject arbitrary data, use an approved abuse-control strategy, and keep storage credentials server-only. Its exact storage schema and rate-limit backing remain implementation decisions requiring review, not assumed existing capabilities. Update `ModalTriggers.tsx`, `ModalProvider.tsx`, `NewsletterModal.tsx`, and `BeehiivSubscribeEmbed.tsx` to carry a fixed signup source and select the approved form. The embed's effect/cleanup must respond correctly to source/form changes; a previous auto-open must not leave the wrong form mounted for an explicit CTA. An `onClick` supplied to the current trigger is overwritten, so simply passing a tracking handler is insufficient.

Before a runtime draft is accepted, verify persisted/exportable counts, route-change and repeated-click deduplication, keyboard activation, unchanged native navigation/download, source switching between auto/footer/inline signup, one excluded confirmed test signup, duplicate/existing/pending handling, and public/admin isolation. Follow with focused regressions, full Vitest, TypeScript, ESLint, production build without concurrent dev, and diff checks. Do not count QA requests or test subscriptions as audience activity.

## Joint measurement plan

**Resource package:** one contextual newsletter CTA plus refinement of one existing calculator cross-link. Treat this as a bundled before/after test, not a claim about which element caused a change. Primary learning gate: at least one provider-confirmed, genuine external signup attributed to the CTA. Secondary outcome: calculator activation rate = resource page views with a calculator-link activation / eligible resource page views, from the same collector and exclusions. Report each placement and combined deduplicated totals. Signup yield = attributed confirmed new signups / eligible resource page views; label it a period yield, not a user funnel probability. Confirmations can lag visits; report late confirmations separately and do not match them to an earlier period without cohort evidence. The absent baseline CTA has no historical CTA-specific conversion rate; measure pre-change resource activity and existing newsletter paths without inventing one.

**SEO:** nonbrand clicks to the exact calculator canonical, supported by impressions, weighted CTR (`total clicks / total impressions`), query-matched CTR and position, country/device mix, and branded counts separately. Use fixed relevant nonbrand query groups from baseline evidence; report new queries separately. Preserve the prior report's chosen gate of at least 100 relevant impressions in each period. Below that, extend in complete weeks and label inconclusive. Higher clicks with stable/improved comparable-query CTR is a directional signal, not causal proof. Google may rewrite titles; record displayed-title observations and recrawl evidence. Page totals and disclosed query rows differ when queries are omitted; do not invent missing query data. [Search Console query documentation](https://developers.google.com/webmaster-tools/v1/searchanalytics/query).

William records source, period, timezone, extraction time, exclusions, raw counts, missing values and provider sampling/finalization. George interprets results and recommends retain/revise/extend. Owner/admin/dev/tests must be excluded where possible; irrecoverable noise must be disclosed. Require a genuine-public-quality assessment before calling the baseline clean. Do not change tracking definitions between baseline and post-change.

Collector aggregates use America/New_York date boundaries. Signup cohorts use acquisition dates within the observation window, with confirmation within seven days of acquisition; the last cohort matures seven days after the window ends. Confirmations for earlier acquisitions belong to the earlier cohort. Report later confirmations separately. Collector delivery must either avoid automatic retries or use approved short-lived idempotency handling; page-local click deduplication alone cannot prevent duplicate server receipts from retries. Record any delivery loss or unresolved duplication.

Record campaigns as confounders from supplied publication evidence. Local records describe October 5 Duct LinkedIn/Instagram schedules and an October 8 Mixed Air YouTube schedule; they do not verify live publication. Leave all Buffer posts, links, queue slots, captions and media untouched. Separate supplied referral traffic from organic search where provider data permits; unexplained direct traffic remains unexplained. The resource change can affect later calculator traffic and indexing; annotate it in the SEO series.

## Revised dates and readiness gates

These are earliest **proposed** dates, not scheduled actions. Assumption: separately authorized tracking is validated by October 11. Dates below are inclusive full reporting days; deployment/check/review dates use America/New_York. Preserve Search Console's native Pacific date boundaries in its exports rather than merging them with local daily traffic totals.

| Milestone | Resource conversion | Duct Calculator SEO |
| --- | --- | --- |
| Tracking and exclusions verified | By October 11 | Page/query export and indexing checks by October 11 |
| Prospective baseline | October 12–25: 14 complete days | October 12–November 8: 28 complete days |
| Earliest approved change | October 26 | November 9, after complete baseline and readiness review |
| Post-change window | October 26–November 8: 14 complete days | November 9–December 6: 28 complete days, only if the changed title has been fetched before the window |
| Interim check | November 2: tracking health; no early uplift verdict | November 23: recrawl/displayed-title and data check |
| Earliest final review | November 16, after seven-day confirmation reconciliation through November 15 | December 10, subject to finalized Search Console data |

If a deployment occurs mid-day, exclude that transition day and start on the next complete reporting day. If Google fetches later, begin the SEO post window on the next complete provider day after verified updated-title fetch; retain transition data separately and move the review accordingly. A fetch does not guarantee Google displays the proposed title. If readiness slips, baseline begins on the next full day after validation; preserve 14/28 baseline days and 14/28 post days, plus finalization. Do not compress windows to recover October 12/26/November 9 deadlines. Verified equivalent historical 28-day SEO data could replace the prospective baseline only after William documents its quality and the owner accepts the revised calendar.

## Owner decision and validation

Review v1 as **APPROVE FOR LOCAL IMPLEMENTATION**, **REVISE**, or **DEFER**, identifying (a) exact copy/title, (b) measurement collector/storage and dedicated Beehiiv form, and (c) dates conditional on readiness. Approval of a draft does not authorize a commit, push, deployment, provider configuration, or publication unless explicitly stated. No permission question is needed to complete this preparation; the next external actions remain governed by `AGENTS.md`.

Current deliverables are Markdown drafts only. Necessary app changes and later validation are specified in George's proposal and William's audit. No runnable application change has been applied. Documentation validation and final Git status are recorded in the delivery message; runtime tests/build are deferred until an authorized runtime change exists.
