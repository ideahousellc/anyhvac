# Measurement instrumentation readiness

William review, October 6, 2026. Local instrumentation work only. The conversion content and SEO title remain separate drafts; no launch or production measurement is established by this document.

## Minimum compatible contract

Use the existing server-only `lib/supabase/server.ts` client/repository conventions and a local migration. Provider schema/configuration changes remain unapplied pending explicit authorization. Client and server measurement switches default off; lack of credentials/schema must produce unavailable measurement rather than fabricated counts or block calculator navigation.

The resource-only collector supplements Cloudflare because Cloudflare does not collect these custom events. Fixed events: `resource_view`, `resource_calculator_click`, `resource_newsletter_open`. Fixed calculator placements: `duct-reference-top`, `duct-reference-contextual`. Future inline newsletter placement: `duct-reference-inline`; existing footer/automatic entries must have distinct source labels, with automatic openings never represented as explicit CTA clicks. No new CTA or experiment copy is part of instrumentation.

Each mounted resource page view gets an ephemeral, random page-view receipt identifier; no persistent cookie/localStorage or cross-page visitor identity. Reloads/remounts create new views. Server receipt deduplication must handle retries, not rely solely on client state. Count each view once, each calculator placement once per view, combined activated views once regardless of both placements. Expose daily aggregates only. Server supplies date/time with documented America/New_York reporting boundaries. Retain any receipt identifiers only as necessary for bounded deduplication; state the proposed retention in the owner review rather than silently apply cleanup.

Calculator activation rate = resource views with at least one calculator activation / eligible resource views from the same collector and exclusions. Placement rates use each placement's activated-view count / the same resource-view denominator. This is page-view activation, not session conversion or unique people. Newsletter open counts measure intent only; a shared form does not establish confirmed conversion.

Accept only the fixed source/destination/event/placement/version contract, bounded bodies and valid receipt IDs. Reject malformed or incompatible combinations and cross-origin submissions. Do not store email, subscriber IDs, arbitrary URLs/query strings, referrers or IP addresses in measurement tables or custom logs. Preserve existing admin/public separation. Provide a documented owner/development/test opt-out. Anonymous client receipts cannot prove genuine humans; blockers, disabled JavaScript, lost requests, synthetic clients and bot contamination remain limitations.

## Beehiiv baseline and conversion readiness

The existing server-only Beehiiv integration can read publication active subscription totals when already configured, but no provider call was made for this review. Runtime connectivity and current counts are UNKNOWN. Its aggregate open/click rates are newsletter campaign metrics, not website CTA metrics. Active-total snapshots cannot isolate genuine new subscribers, confirmations, acquisitions by form or tests.

Baseline requires dated owner/provider aggregates: opening and closing active totals, genuine new acquisition-date cohorts, confirmation dates/status, unsubscribes and known owner/test exclusions. Confirm each acquisition cohort within seven days after acquisition and mature the period through seven days after its final day; later confirmations remain separate. No automatic local subscription-completion signal is supported by present source. Do not infer one from modal DOM changes or suppressing a prompt.

Future inline CTA source plumbing may accept a dedicated named Beehiiv form only after authorized provider setup and QA verifies acquisition/confirmation reporting. No guessed form ID, signup callback or UTM guarantee. Existing footer/automatic paths retain the existing form. Without that evidence, confirmed attributable conversions remain UNKNOWN even if collector events are healthy.

## Acceptance checks

- Disabled by default on browser and server; no public event requests when disabled.
- Resource direct loads and App Router revisits each report once; admin/other paths do not report resource activity.
- Both native calculator links report their own placement without preventing normal keyboard/click/new-tab navigation; repeat activations and retries do not inflate activated-view rates.
- Footer versus automatic newsletter opens are distinguished; no future-inline event exists without its future trigger.
- Repository failures and invalid payloads return safe responses without leaking credentials or customer data.
- Local migration constraints, receipt deduplication and aggregate calculation agree on the selected page-view definitions.
- No tests or development activity become claimed audience; production readiness is UNKNOWN until an approved migration/configuration/deployment and excluded QA establish live receipt/export.

## Private readout and exact exclusions

Run the following read-only SQL only in an owner-approved private database context after the migration is applied. No production database command was run; later isolated validation uses synthetic fixtures only. Missing days/rows are UNKNOWN until collection coverage is verified; absence is not proof of zero traffic.

```sql
select metric_day, metric, count
from public.resource_growth_daily
where metric_day between date '2026-10-12' and date '2026-10-25'
order by metric_day, metric;
```

For comparable period totals and calculator activation rates, change only the two dates after fixing reporting windows:

```sql
with totals as (
  select
    sum(count) filter (where metric = 'resource_view') as views,
    sum(count) filter (where metric = 'calculator_any') as calculator_any,
    sum(count) filter (where metric = 'calculator_top') as calculator_top,
    sum(count) filter (where metric = 'calculator_contextual') as calculator_contextual,
    sum(count) filter (where metric = 'newsletter_any') as newsletter_any,
    sum(count) filter (where metric = 'newsletter_footer') as newsletter_footer,
    sum(count) filter (where metric = 'newsletter_automatic') as newsletter_automatic,
    sum(count) filter (where metric = 'newsletter_other') as newsletter_other,
    sum(count) filter (where metric = 'newsletter_inline') as newsletter_inline
  from public.resource_growth_daily
  where metric_day between date '2026-10-12' and date '2026-10-25'
)
select *,
  100.0 * calculator_any / nullif(views, 0) as calculator_activation_percent,
  100.0 * calculator_top / nullif(views, 0) as top_activation_percent,
  100.0 * calculator_contextual / nullif(views, 0) as contextual_activation_percent
from totals;
```

SQL intentionally preserves NULL for absent metric rows. Only after receipt/export and coverage checks demonstrate genuine zero activity may the owner label an absent counter zero. Never sum placement activation counts to calculate combined activation; one view can activate both links. `newsletter_any` includes automatic opens and is not explicit CTA intent; use placement-specific counters. All counters represent deduplicated page views with that activity, not raw action frequency.

The RPC automatically establishes the one-view denominator when a valid click/open arrives before, or instead of, the initial view event. Thus `resource_view` means observed page views supported by any valid receipt, not the number of delivered view requests. Every activity for a view is attributed to the Eastern calendar day of its first server receipt; a later-day activity on the same mounted page remains in that earlier day. Client timestamps only bound replay age and match receipts; server receipt determines reporting dates.

Owner/development/test opt-out before visiting the production resource: run `localStorage.setItem("anyhvac-growth-measurement-opt-out", "true")` in that site's browser console. Repeat for each production hostname/browser/profile used for owner activity. This setting remains local; it is not a subscriber or visitor identifier sent to the server. Existing admin-session cookies also cause the server to ignore events, even if expired; signed-out owner activity requires opt-out. The browser gate excludes development and noncanonical hosts; storage access failure disables collection. No exclusion establishes complete bot or owner removal.

## Independent local review

Reviewed client collector, parser, POST route, Supabase repository/RPC draft, modal/trigger source plumbing and embed selection. Existing resource copy and calculator metadata remain unchanged. Collection switches default off; client navigation is preserved, and source-aware form configuration emits no subscription-completion signal. RPC row locking and per-receipt keys are designed to make duplicate delivery atomic while durable daily counters survive proposed receipt pruning. Receipt validity is limited to 24 hours with one-minute future clock allowance; cleanup draft is 48 hours and is not scheduled or executed.

Remaining limits: isolated native PostgreSQL execution and concurrency validation passed as recorded below; production grants/configuration and excluded live receipt checks remain unverified. The API's 120-requests-per-minute per-instance cap can lose genuine burst traffic and does not prevent distributed abuse. Required Origin/Fetch Metadata headers can exclude incompatible clients; failures, blockers and disabled JavaScript lose events. In-memory browser deduplication does not retry failed requests. Anonymous submissions cannot prove humans. No current measured baseline or source-confirmed conversion was collected. Root owns full-suite, TypeScript, lint and build evidence in [the instrumentation owner review](instrumentation-owner-review.md); the focused independent evidence below covers the reviewed collector contract.

Independent focused validation: `npx.cmd vitest run lib/growth/__tests__/measurement.test.ts app/api/growth/events/route.test.ts components/__tests__/ResourceGrowthMeasurement.test.tsx` passed **3 files / 11 tests**. Coverage includes strict payload/privacy validation, production/path/host/opt-out gating, malformed/oversized/admin/cross-origin ingestion, unavailable persistence, default/dedicated form selection, collector placement deduplication, primary/middle activation handling, distinct newsletter sources, route changes, cleanup and crypto failure. Collector tests use mocked effect/DOM listeners; actual App Router/browser navigation and provider delivery still require excluded QA after authorized deployment. `git diff --check` passed. The focused Vitest tests do not execute PostgreSQL or certify live Beehiiv attribution; the separate native database results below address SQL execution.

## Authorized isolated PostgreSQL verification

Root executed the unchanged migration in a fresh native PostgreSQL **17.11** database `anyhvac_measurement_validation`, bound to loopback port **55439**, using `psql -1 -f` transaction application. Isolated bootstrap roles: `anon`/`authenticated` NOLOGIN and `service_role` NOLOGIN BYPASSRLS with schema usage. These are disposable role fixtures modeling the existing Supabase privilege convention, not production configuration changes.

**PASS:** [assertions.sql](validation/assertions.sql) executed actual anonymous/authenticated denied reads, writes and RPC calls; checked privilege matrix and enabled RLS; verified service-role reads/RPC writes; exercised invalid-metric and negative-count CHECK constraints plus unique receipt primary key; repeat-event and two-placement deduplication; first-click recovered-view denominator; Eastern receipt dates; rejection without mutation for invalid placement, mismatched timestamp, stale replay and excessive future timestamp; and 48-hour receipt cleanup preserving daily history and rejecting stale replay. SQL fixtures roll back. William independently reran the expanded assertions against the same isolated loopback database and confirmed PASS.

**PASS:** [concurrency.mjs](validation/concurrency.mjs) executed 40 simultaneous duplicate/racing events against one view, followed by 20 simultaneous distinct view activations. Exact final counts: resource views **21**, any calculator activation **21**, top activation **21**, contextual activation **1**, any newsletter open **1**, footer **1**, automatic **1**, and receipts **21**. Fixtures are synthetic and remain exclusively in the disposable database; they are never business baseline data.

This closes the local SQL-execution and concurrency gap. It does not prove deployed Supabase grants, PostgREST/service-role integration, provider availability or actual audience measurements. Production remains disabled and unchanged. Production application still requires explicit migration/configuration/deployment authorization, followed by private exports and excluded QA. Browser results and their isolation limits are recorded below.

## Isolated real-browser result and readiness verdict

Root/George's isolated production-build run passed **15 real-Chrome checks**, producing **9 browser event requests**. William independently reviewed the successful browser evidence and [database reconciliation script](validation/browser-database.mjs): the three accepted view UUIDs imply views **3**, combined calculator activation **2**, top **2**, contextual **1**, combined newsletter opens **2**, footer **1**, automatic **1**. Persisted counters matched those exact values; the admin-cookie UUID was absent from receipts, so its 204 response did not conceal a write. These synthetic values are validation fixtures, never business measurements.

Browser checks verified unchanged resource copy/two calculator links, unchanged Duct title, per-placement repeated-action deduplication, owner opt-out, nonresource exclusion, footer/automatic intent, bounded payloads, default-form dataset/mount and existing mounted-embed lifecycle. Native Chrome keyboard Enter preserved actual calculator navigation while recording its click. Primary and middle/right button cases used DOM dispatch in hydrated Chrome; this distinction is recorded in the evidence. App requests were fulfilled from loopback; the exact Beehiiv loader URL was fulfilled from a deterministic local script, and all other external requests were blocked. No form was submitted, live provider contacted or production setting changed. The isolated application used a local SQL bridge rather than production Supabase/PostgREST, so production service-role transport remains a later QA check.

Evidence files are generated local artifacts: `growth/.generated/measurement-validation/browser-evidence.json` and `browser-database-evidence.json`. William's attempted second read-only reconciliation occurred after the isolated server was stopped and returned connection refused; it did not rerun database assertions or change the evidence. The independently executed earlier SQL assertions and the successful original browser reconciliation remain the supporting results.

**Verdict:** the local page-view, two-link activation and newsletter-intent instrumentation passes isolated database/concurrency/browser validation and is ready for owner review of production application. Baseline collection becomes ready only after separately authorized production migration, deployment/enabling and excluded QA verify service-role receipt/export, production host gates, owner exclusions and collection coverage. Start on the next complete verified reporting day; local validation does not start the baseline or either content/SEO experiment.

**Confirmed newsletter conversions remain unverified.** The existing shared form and active-total snapshots cannot reconstruct genuine acquisition/confirmation cohorts or attribute them to the future CTA. Dedicated-form setup, provider source/confirmation evidence and private test-account reconciliation remain required before calling the full conversion experiment measurable. Missing baseline and confirmed conversion values remain UNKNOWN. The CTA, cross-link copy and SEO title are still unapplied drafts.
