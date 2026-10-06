# Resource growth measurement

Measures the existing Duct Design Quick Reference resource without changing copy, calculator SEO or signup content. Both measurement switches default off. Uses existing server-only Supabase; public/admin separation and shared Beehiiv form behavior are preserved.

## Contract and reporting

`POST /api/growth/events` accepts exactly `event`, `placement`, `viewId` (random UUID for this mounted page view), `viewStartedAt` (milliseconds). Measurement tables do not store email, IP, referrer, arbitrary URL, subscriber ID or persistent visitor identity. Hosting/provider operational logs are separate.

| Event | Placement |
| --- | --- |
| `resource_view` | `null` |
| `resource_calculator_click` | `duct-reference-top`, `duct-reference-contextual` |
| `resource_newsletter_open` | `footer`, `automatic`, `other`; future `duct-reference-inline` |

Future inline plumbing adds no CTA or dedicated form. Opens measure intent, not confirmed signups; automatic opens are not explicit clicks. Per-view row locking deduplicates repeat delivery and placements; combined calculator activation counts once even when both links activate. First-click/open delivery recovers the same view denominator. Activity belongs to the Eastern day of its first server receipt. Replay is bounded to 24 hours with one-minute future allowance.

William reads privately through existing authorized database access:

```sql
select metric_day, metric, count
from public.resource_growth_daily
where metric_day between :start_date and :end_date
order by metric_day, metric;
```

Bind dates in the private client. Activation rate is `calculator_any / resource_view` for the same eligible period; do not sum placements. These are observed page views with an action, not unique people or raw action frequency. Missing rows remain unknown until coverage is verified. Document interruptions and compare Cloudflare exact-path traffic independently.

## Deployment and exclusions

1. Transactionally apply only `supabase/migrations/20261006000100_resource_growth_measurement.sql` and record its exact version in existing migration history. Verify private RLS tables, service-role permissions, anon/authenticated denial and security-invoker RPC with empty search path. Reuse existing server-only Supabase credentials.
2. Deploy with `NEXT_PUBLIC_GROWTH_MEASUREMENT_ENABLED` and `GROWTH_MEASUREMENT_ENABLED` absent/false. Verify healthy calculators, resources and existing newsletter behavior before activation.
3. Authorized activation sets both switches `true` in production and rebuilds/redeploys. Public switch is compiled into the browser. Verify actual canonical-host events against private receipts; HTTP 204 alone is insufficient. No Beehiiv configuration change is required or authorized for baseline collection.
4. Before ordinary owner/test visits set `localStorage.setItem("anyhvac-growth-measurement-opt-out", "true")` on the canonical site in each profile. Any admin-session cookie suppresses server writes, including expired cookies. Development/noncanonical clients do not collect; storage failures fail closed.
5. Record accepted QA receipt IDs privately. Exclude every Eastern day touched by accepted QA in full; never subtract/delete counters to claim a clean day. Record actual activation verification timestamp and select the first complete Eastern day after final QA as baseline boundary. Preserve 14 complete baseline days and 28 complete post-change days; previously estimated dates are conditional. Instrumentation activation does not launch experiments.

Receipt cleanup older than 48 hours is proposed, not scheduled. It must retain daily aggregates; an approved retention mechanism remains necessary. Avoid accepted QA during baseline. Confirmed newsletter attribution still needs separately authorized Beehiiv setup and acquisition/confirmation evidence.

## Validation and rollback

Pre-deployment verification: isolated PostgreSQL 17.11 migration, grants/RLS/constraints/deduplication/concurrency passed; 15 real Chrome checks with local provider stub and exact database reconciliation passed; 545 tests across 54 files, TypeScript and production build passed. Lint had zero errors and three existing unrelated warnings. Buffer fixture-root override is test-only; production duplicate scans and actual posts/records remain unchanged.

Synthetic reproduction fixtures are in `growth/reports/2026-10-06-first-growth-experiment/validation/`: `assertions.sql`, `concurrency.mjs`, `browser.mjs`, `browser-database.mjs`, `database-bridge.mjs`, `application-server.mjs`. These do not certify deployed Supabase PostgREST or live Beehiiv reporting and never establish audience counts.

If migration/deployment results fail or are ambiguous, stop and reconcile before retry. Failed transaction leaves no partial migration. After successful schema application, disable collection on application/QA failure and leave schema inert. Deploy server switch false to stop accepted writes; rebuild browser switch false to stop requests. Vercel environment changes affect new deployments, not existing instances. A known previous release with measurement off is also a safe application rollback. Preserve schema and counters; destructive schema/data rollback requires separate authorization and recovery planning.

Coverage limits: blockers, disabled JavaScript, lost requests without retry, bots/anonymous submissions, per-instance rate limits, clock bounds, remounts and incomplete owner exclusion. Page/click/intent readiness is separate from confirmed newsletter conversion readiness.
