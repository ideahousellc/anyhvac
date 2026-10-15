# Measurement implementation — owner review

October 6, 2026. Local instrumentation only. This document and [William's readiness review](measurement-readiness.md) supersede the measurement implementation assumptions in the original [experiment proposal](owner-review.md). The approved copy, cross-link refinement and title remain unlaunched drafts.

## Existing infrastructure and scope

Inspection found the Cloudflare beacon at the existing public/admin boundary, a shared Beehiiv form and server-only publication-total integration, and the existing typed Supabase server client plus repository/migration conventions. Cloudflare remains the traffic corroboration source. It has no custom-event reporting, so the smallest necessary supplement is a resource-only first-party collector backed by existing Supabase. There is no new provider, paid service, public dashboard or authentication change.

Only the existing resource's two calculator links receive invisible placement markers. The collector renders no visible UI. Existing copy, PDF download, modal copy/timing/suppression, Duct Calculator metadata, calculations, Buffer posts, payments and ads are outside the patch.

## Reading measurements

William uses the private daily aggregate SQL readout in his readiness review, or an owner-supplied export of those results. No anonymous data-read endpoint is added. Record reporting period, extraction timestamp, Eastern daily boundaries, collection switch state, exclusions, outages and provider sampling. Reconcile the resource's exact-path Cloudflare view counts independently; provider definitions and exclusion coverage differ, so the two totals need not match.

Existing Beehiiv publication statistics provide active-subscriber snapshots through the unchanged Control Room integration where it is configured. They cannot reconstruct historical new confirmed subscribers, test exclusions or per-CTA acquisitions. Obtain dated provider aggregates from existing Beehiiv acquisition records/subscriber reporting where available; keep subscriber identities private. Modal-open events are intent only. Current genuine counts and source-attributed confirmations remain UNKNOWN until actual provider evidence is supplied.

For the future CTA, source-aware embed selection supports an owner-created dedicated Beehiiv form. Do not create the CTA or provider form during this task. A configured form ID does not itself prove acquisition or confirmation reporting. Beehiiv documents named embeds in subscriber acquisition details; verify the current account and an excluded QA subscription before any conversion experiment. [Beehiiv embedded-form documentation](https://www.beehiiv.com/support/article/12977090590487).

## Proposed deployment sequence — requires explicit owner approval

1. Owner reviews the exact local patch, William's contract, SQL schema/permissions, retention, environment switches and validation limits. Approval must explicitly identify commit, push, schema/configuration changes and deployment if those actions are intended; none have been performed.
2. Validate the migration and event aggregation against a disposable local or approved isolated database before applying it to production. Existing mock repository tests do not validate PostgreSQL execution. Confirm grants restrict reads/writes/RPC access to the existing server-only service role. Review free-tier capacity; do not buy or upgrade anything.
3. After separate authorization, apply only the reviewed measurement migration to the existing Supabase project. Do not change mail tables, admin authentication or other provider settings. If any readiness check fails, leave collection disabled.
4. Configure the reviewed server and build-time browser measurement switches for the Vercel production target, initially disabled. Deploy only the instrumentation patch after explicit deployment authorization. Keep the experiment content and SEO unchanged. Build-time public switches require a new build when changed.
5. Perform excluded QA with an opted-out owner browser for ordinary navigation. Any controlled test events must be isolated from the real baseline, reconciled and documented. Verify persisted daily views, separate link activations, combined deduplication, existing footer/automatic newsletter intent and exports before declaring collection usable. A production smoke test is a provider write and needs the owner's deployment/QA authorization.
6. When separately authorized and verified, enable baseline collection. Set owner/test opt-outs before baseline; no tests become genuine traffic. Start the next complete reporting day and preserve the agreed 14-day conversion/28-day SEO baseline windows. The earlier proposed calendar is conditional, not a promise to start October 12.
7. A dedicated Beehiiv form may be created/configured only with separate authorization and verified before the later CTA launch. The current shared form remains in use for existing triggers. Neither conversion nor SEO experiment launches as part of deploying instrumentation.

Rollback: disable both collection switches and rebuild if the public switch changes; leave existing audience counters intact for review. Revert the instrumentation application patch if necessary. Do not drop tables or permanently delete provider/customer data as a routine rollback. Existing signup and calculator paths must continue working while collection is disabled or unavailable.

## Exact implementation and configuration

Endpoint: `POST /api/growth/events`. No public read endpoint. JSON contains exactly `event`, `placement`, `viewId` (random UUID v4 for this mounted view only), and `viewStartedAt` (milliseconds, replay bound only). Source resource and calculator destination are fixed by the collector/placement contract; arbitrary paths, emails and extra fields are rejected. Instrumentation v1 is defined by this schema/migration, not a user-supplied version parameter.

| Event | Placement | Meaning |
| --- | --- | --- |
| `resource_view` | `null` | One observed mounted resource view |
| `resource_calculator_click` | `duct-reference-top`, `duct-reference-contextual` | Once per view per existing link; combined activation counted once |
| `resource_newsletter_open` | `footer`, `automatic`, `other`, future `duct-reference-inline` | Once per view per source; automatic opening is not a CTA click |

Internal browser notification: `anyhvac:growth-newsletter-open`, with one allowlisted source label. Only the mounted resource collector persists it; newsletter events on other pages are not collected. No conversion-completed event is implemented. Activity received before the initial view event establishes the same observed-view denominator. All activity is assigned to the Eastern day of the first server receipt, including later-day activity for that view.

Collection gates, neither configured by this task:

```text
NEXT_PUBLIC_GROWTH_MEASUREMENT_ENABLED=true   # build-time browser opt-in
GROWTH_MEASUREMENT_ENABLED=true               # server opt-in
NEXT_PUBLIC_BEEHIIV_DUCT_REFERENCE_FORM_ID=   # future dedicated-form UUID, optional
```

Absent or non-`true` collection switches disable collection. Browser collection requires production mode, the exact resource path and a canonical hostname; the server requires production mode, canonical HTTPS, matching Origin and same-origin Fetch Metadata. Local development and ordinary preview hosts are excluded. Any existing admin-session cookie suppresses writes without changing authentication. Signed-out owner browsers use the local opt-out documented by William. The existing `SUPABASE_URL` and `SUPABASE_SECRET_KEY` stay server-only; no credentials were read, copied or changed.

The dedicated-form ID must be a valid UUID distinct from the current shared ID. Missing/invalid/default IDs preserve existing signup behavior and report `data-dedicated-form-configured="false"`; they cannot provide confirmed CTA attribution. Form changes destroy the previous controller and clear generated embed nodes. There is no new trigger for the future source in this patch.

The migration prepares private `resource_growth_receipts` and `resource_growth_daily` tables and a service-role-only atomic RPC. Receipt row locks plus counted metric keys prevent duplicate view/placement/combined increments; durable daily counts survive receipt cleanup. Valid view age is at most 24 hours, with a one-minute future allowance. Proposed daily cleanup removes receipts older than 48 hours; it is a commented operation, **not applied or scheduled**, so retention depends on separately approved execution. Missing schema/credentials/RPC acceptance produces 503 rather than claimed successful persistence. Client delivery is best effort with no retry. A 512-byte body cap and 120 requests/minute per-instance cap constrain ingestion; the latter is not a distributed abuse guarantee and can drop legitimate bursts.

## Files changed

Existing runtime files:

- `app/resources/duct-design-quick-reference/page.tsx`: invisible collector mount and two existing link markers.
- `components/Footer.tsx`, `components/NewsletterCTA.tsx`: label existing footer signup entry points.
- `components/ModalTriggers.tsx`, `components/ModalProvider.tsx`: source plumbing and source-specific open notifications.
- `components/NewsletterModal.tsx`, `components/BeehiivSubscribeEmbed.tsx`: optional dedicated-form selection and cleanup.
- `types/supabase.ts`: typed measurement RPC signature, locally maintained pending applied-schema generation.

New runtime/schema files:

- `components/ResourceGrowthMeasurement.tsx`.
- `lib/growth/browser.ts`, `events.ts`, `newsletter-source.ts`, `repository.ts`.
- `app/api/growth/events/route.ts`.
- `supabase/migrations/20261006000100_resource_growth_measurement.sql` (unapplied).

New tests:

- `lib/growth/__tests__/measurement.test.ts`, `repository.test.ts`.
- `app/api/growth/events/route.test.ts`.
- `components/__tests__/ResourceGrowthMeasurement.test.tsx`, `BeehiivSourceSwitch.test.tsx`.
- `app/resources/__tests__/growthMeasurementScope.test.tsx`.

Documentation: this package and William's readiness review are new. The earlier George copy proposal is annotated for this authorized instrumentation phase and now specifies the future source prop; its public copy/SEO snippets remain unapplied. Other original experiment drafts remain from the preceding preparation turn.

## Validation and remaining gates

- Focused instrumentation and scope tests: **6 files / 17 tests passed**. Covers payload privacy/age/enum rejection, collection gates, native link activations and client dedup/cleanup, source/form selection and old-controller cleanup, ingestion origin/host/Fetch Metadata/body/rate gates, admin exclusion, repository mapping and failure reporting, and unchanged experiment copy/title.
- Full `npm test`: **540 passed / 3 failed, 54 files**. Failures are in unchanged Buffer scheduler tests at lines 131, 144 and 155. Synthetic fixtures reuse `buffer-first-test-linkedin-v2`; the scheduler's existing local-record scan finds the previously scheduled publication record and rejects it before the mocked creation assertions. No Buffer code/record was changed or external Buffer call made. This unrelated fixture isolation problem remains outside the measurement patch.
- `npx tsc --noEmit`: passed. Production build's TypeScript step also passed.
- `npm run lint`: passed with **three warnings in unchanged files** (`growth/promotions/2026-10-02-03/produce.mjs`, `reference/duct-calculator-original/script.js`).
- `npm run build`: passed with no concurrent Next development server.
- Diff/whitespace and local document-link validation: checked at delivery.

Hook/DOM tests use mocked browser primitives; no real-browser provider signup or PostgreSQL execution/concurrency test was performed. Live counts, clean baseline traffic and confirmed CTA acquisitions are still UNKNOWN. The patch is ready for local owner review, **not a declaration that production measurement or the experiments are ready to launch**. Before production, validate SQL grants/RPC concurrency in an isolated database, explicitly authorize schema/configuration/deployment and excluded QA, verify daily exports, and separately validate dedicated-form acquisition/confirmation evidence. Unknown baseline newsletter conversions cannot be reconstructed from the current shared form or active-total snapshots.
