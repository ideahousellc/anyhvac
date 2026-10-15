# Production instrumentation result

October 6, 2026. LOCAL UNCOMMITTED RECORD. Owner subsequently authorized staged production migration, commit/push and instrumentation deployment. This record supersedes earlier preparation documents' pending-authorization status only for those authorized stages. Content/CTA/cross-link refinement, Duct SEO title, Beehiiv form setup, Buffer posts, payments and outreach remain outside this deployment.

## Applied schema and source revision

Root reports the reviewed migration was applied to the existing linked production database in one transaction with its migration-history row. The private schema verification passed: both tables initially had **zero rows**; RLS enabled on both; anonymous/authenticated SELECT/INSERT/RPC privileges denied; service-role SELECT/INSERT/RPC privileges granted and BYPASSRLS true; function security invoker with empty search path; required columns and primary-key/CHECK constraints matched the reviewed migration. No QA or genuine traffic count is inferred from this initial schema snapshot.

Migration: `supabase/migrations/20261006000100_resource_growth_measurement.sql`. Local applied-file raw SHA-256: `67b0bfd4b846b87813803cb62cedc4bfd0945a24f62d5dda478a4501f573080e`. Windows CRLF bytes differ from Git-normalized LF bytes, so compare normalized content when validating the commit against applied SQL; raw-byte hash differences alone do not establish a SQL change.

Committed and pushed source: **`fdcb707be4125baa12e7be909c01dd007b3e3b22`**, title `Add gated resource growth measurement and validated fixtures`. William verified the exact committed file inventory using `git show --name-only`. The commit contains these **30 files**:

```text
app/api/growth/events/route.test.ts
app/api/growth/events/route.ts
app/resources/__tests__/growthMeasurementScope.test.tsx
app/resources/duct-design-quick-reference/page.tsx
components/BeehiivSubscribeEmbed.tsx
components/Footer.tsx
components/ModalProvider.tsx
components/ModalTriggers.tsx
components/NewsletterCTA.tsx
components/NewsletterModal.tsx
components/ResourceGrowthMeasurement.tsx
components/__tests__/BeehiivSourceSwitch.test.tsx
components/__tests__/ResourceGrowthMeasurement.test.tsx
docs/measurement/resource-growth.md
growth/distribution/buffer/__tests__/scheduler.test.mjs
growth/distribution/buffer/scheduler.mjs
growth/reports/2026-10-06-first-growth-experiment/validation/application-server.mjs
growth/reports/2026-10-06-first-growth-experiment/validation/assertions.sql
growth/reports/2026-10-06-first-growth-experiment/validation/browser-database.mjs
growth/reports/2026-10-06-first-growth-experiment/validation/browser.mjs
growth/reports/2026-10-06-first-growth-experiment/validation/concurrency.mjs
growth/reports/2026-10-06-first-growth-experiment/validation/database-bridge.mjs
lib/growth/__tests__/measurement.test.ts
lib/growth/__tests__/repository.test.ts
lib/growth/browser.ts
lib/growth/events.ts
lib/growth/newsletter-source.ts
lib/growth/repository.ts
supabase/migrations/20261006000100_resource_growth_measurement.sql
types/supabase.ts
```

Buffer changes are test-root isolation plumbing; production default publication roots and duplicate safeguards remain intact. No existing posts, queue entries, captions, media or publication records were changed.

## Staged deployment status

| Stage | Current evidence | Status |
| --- | --- | --- |
| Production schema | Root's private transaction/schema/grant verification | APPLIED / VERIFIED |
| Exact source commit/push | Git inventory above; root reports push succeeded | COMPLETE |
| Stage 1: instrumentation deployed disabled | Exact commit `fdcb707â€¦`; deployment `dpl_6J3sRMX3Rp96faGjfQXP51fEve4y` READY; browser/readout checks below | COMPLETE / VERIFIED |
| Stage 2: enable collection with rebuilt browser/server flags | Exact-commit deployment `dpl_5H4XL7TxKGkiMyaf3cf7o3zUzstT` READY and canonical aliases verified; actual receipt/export QA passed | COMPLETE / VERIFIED |
| Canonical-host ingestion, exclusion and private export QA | Eleven browser checks and private service-role PostgREST reconciliation passed | COMPLETE / VERIFIED |
| Baseline | Collection verified October 6; October 7 at 00:00 EDT selected as first eligible full baseline day | FUTURE BOUNDARY; NO BASELINE VALUES YET |
| Confirmed newsletter source conversion | Shared form/source limitations unchanged | NOT VERIFIED |

Stage 1 verification at **2026-10-06T17:50:30.666Z** (October 6, 1:50 p.m. EDT): **11 production browser checks passed**. Opted-out QA emitted zero collector requests. One bounded synthetic disabled-endpoint probe returned **503**, verifying collection remained disabled. The free resource PDF, actual Beehiiv iframe/default form, calculator controls, native keyboard navigation and unchanged Duct title passed. Private service-role PostgREST aggregate read succeeded with **zero rows**; this is an initial instrumentation readout, not a genuine zero-audience claim. Actual Vercel measurement-flag list was empty at this stage.

At **2026-10-06T17:51:55.200Z** (1:51 p.m. EDT), root configured only `NEXT_PUBLIC_GROWTH_MEASUREMENT_ENABLED=true` and `GROWTH_MEASUREMENT_ENABLED=true` in production. Fingerprints of every unrelated environment entry remained unchanged. Activation rebuild/deployment `dpl_5H4XL7TxKGkiMyaf3cf7o3zUzstT` targeted the same exact commit; the subsequent READY status and production receipt checks below established activation. Configuration alone would not establish that result.

Stage 2 deployment was READY on the canonical production aliases at **2026-10-06T17:53:24.730Z**, using the same exact commit. Measurement remains enabled. Eleven production browser checks passed: exactly one accepted view UUID produced four bounded events (view, both calculator placements, footer newsletter open), all HTTP 204; one separate admin-cookie request was intentionally excluded with 204; owner opt-out generated zero collector requests. The actual Beehiiv default iframe/form remained unchanged; no form was submitted. Cloudflare owner QA beacon traffic was blocked. No inline or automatic signup event was introduced by this minimal QA.

Private read-only service-role PostgREST reconciliation passed at **2026-10-06T17:54:59.993Z = October 6, 13:54:59.993 EDT**. The accepted sample receipt had exactly the expected six keys: `resource_view`, `calculator_any`, `calculator_top`, `calculator_contextual`, `newsletter_any`, `newsletter_footer`; its client-start timestamp matched, its server first-receipt timestamp was valid and its Eastern metric day was **2026-10-06**. The admin-cookie UUID was absent. Daily counters supported every expected key at least once; counters were retained unchanged. Those values establish synthetic QA persistence, not business activity or a zero audience baseline. Receipt schema had only the reviewed five columns and browser payloads only the reviewed four fields.

William independently reviewed the production smoke evidence, reconciliation summary and read-only script. The script performs only SELECT requests through the existing server-side service-role credentials, comparing sample IDs/keys/status/timestamp and preserving all counters. Private receipt IDs remain in ignored local reconciliation evidence, not this report. Supporting ignored artifacts: `production-stage2-smoke-evidence.json`, `production-reconciliation-summary.json` and `production-private-reconciliation.json` under `growth/.generated/measurement-validation/`.
## Baseline handling and final verdict

**Collection verified:** October 6, 2026 at **13:54:59.993 EDT / 2026-10-06T17:54:59.993Z**. **Exclude October 6 in full** because accepted synthetic QA belongs to that first-server-receipt Eastern day. Counters remain unchanged; no QA subtraction or production deletion occurred.

**Selected first eligible complete baseline day:** October 7, 2026 at **00:00 EDT / 2026-10-07T04:00:00Z**. This boundary is still future at verification; collection being enabled does not mean fourteen baseline days have elapsed. No actual baseline outcomes have yet been reported. Avoid new accepted QA during baseline, preserve owner opt-out/admin exclusions and document any interrupted or contaminated day before extending windows.

- Resource conversion baseline: **October 7–20**, fourteen complete Eastern days. Earliest separate owner-approved conversion change: **October 21**. Preserve at least 28 complete post-change measurement days relative to the actual approved launch, excluding any partial launch day and allowing the seven-day newsletter confirmation maturation period.
- SEO prospective baseline: **October 7–November 3**, 28 complete days using Search Console's native Pacific reporting dates and finalized data. Earliest separate owner-approved title change: **November 4**, subject to finalized baseline availability and indexing/adoption checks. Preserve 28 complete post-change provider days relative to actual verified title fetch, with finalization lag; later fetch moves the observation window.

The November 1 DST transition means Eastern midnight changes from 04:00 UTC to 05:00 UTC. Derive each resource reporting boundary in America/New_York rather than using a fixed UTC offset; do not combine Eastern traffic dates with Search Console Pacific dates.

**Final verdict: page-view, two-placement calculator-activation and existing newsletter-intent production collection are verified and left enabled. The full-day baseline is selected but has not yet begun at verification. Neither conversion copy nor SEO experiment has launched.** Genuine new/confirmed newsletter cohorts and future-CTA source conversion remain UNKNOWN until separately authorized dedicated-form/provider acquisition/confirmation evidence is supplied. The actual default signup remains operational; opening it is intent, not subscription completion.

The proposed cleanup of receipts older than 48 hours remains **unscheduled and unrun in production**. Daily aggregates must survive any later authorized cleanup. No additional configuration, payment, Buffer or outreach action is implied by this readiness result. This result document remains local/uncommitted to avoid triggering another deployment.

Final Git verification: main and origin/main both point to fdcb707be4125baa12e7be909c01dd007b3e3b22; tracked worktree is clean. Local review and copy drafts and this result remain untracked and uncommitted. Nine production routes returned HTTP 200. Validated source passed 545 tests across 54 files, TypeScript, production build and whitespace checks. Lint had zero errors and three existing unrelated warnings. No runtime code changed after validation.
