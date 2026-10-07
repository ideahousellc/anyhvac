# Pre-deployment measurement validation

Owner review, October 6, 2026. **Local validation passed. Production remains unchanged; measurement defaults off.** No commit, push, deployment, CTA, SEO-title change, Beehiiv configuration change or Buffer publication action was performed.

## Migration and browser results

The unchanged migration [20261006000100_resource_growth_measurement.sql](../../../supabase/migrations/20261006000100_resource_growth_measurement.sql) applied transactionally to isolated native PostgreSQL 17.11 on loopback. Disposable roles modeled Supabase anon/authenticated/service_role permissions. [SQL assertions](validation/assertions.sql) passed RLS/grant restrictions, actual denied public access, service-role writes, primary-key/CHECK constraints, repeat and placement deduplication, recovered view denominators, Eastern receipt dates, timestamp bounds and cleanup preservation. William independently reran the expanded SQL assertions. [Concurrency validation](validation/concurrency.mjs) passed 40 racing duplicate events and 20 distinct view activations without lost or inflated counters.

[Real Chrome validation](validation/browser.mjs) passed **15 checks / 9 requests** against a disposable production-mode application copy. Canonical-origin requests were intercepted and routed exclusively to loopback; external origins were blocked. A local REST adapter exercised the existing Supabase client against real PostgreSQL. This validates the application/RPC contract, but is not a deployed Supabase PostgREST verification. Test-only process switches enabled the disposable copy; repository defaults and production configuration were untouched.

Verified resource views, both existing calculator-link placements, primary/middle/keyboard activation, repeated-click deduplication, right-click exclusion, footer and automatic newsletter sources, owner opt-out, admin exclusion, nonresource exclusion, unchanged content/title, bounded payloads and successful responses. [Database reconciliation](validation/browser-database.mjs) matched exactly: views **3**, calculator-any **2**, top **2**, contextual **1**, newsletter-any **2**, footer **1**, automatic **1**. The synthetic admin receipt was absent. **These are synthetic test counts, not audience or baseline measurements.** William reviewed the successful browser evidence and reconciliation; his later independent rerun encountered the already stopped database, rather than independently repeating that reconciliation.

Temporary servers were stopped and the disposable application copy removed. No production credentials or environment files were copied into the test application. Reproduction scripts are retained under `validation/`; binaries, database files and machine-specific evidence stay in ignored `growth/.generated/measurement-validation/`.

## Provider verification and limitations

Beehiiv loader selection, iframe mounting, source plumbing and cleanup passed using a deterministic local stub. Existing footer/automatic entries retained the default form; no new resource CTA exists. Focused tests cover future dedicated-form selection and switching. No live provider request, signup or configuration change occurred. Actual Beehiiv acquisition/confirmation reporting, runtime provider connectivity and historically attributable conversions remain **UNKNOWN**. Newsletter-open counters measure intent, including automatic opens; they cannot prove subscription completion. A future dedicated resource form requires separately authorized setup and provider reporting QA before confirmed CTA attribution is claimed.

Native PostgreSQL does not certify actual production Supabase role grants, PostgREST exposure, proxy headers or credentials. Excluded production QA remains necessary. Client blockers, disabled JavaScript, request loss, anonymous/bot submissions, per-instance rate limits and remounts affect coverage; the denominator is observed page views, not unique visitors. [William's specification and readout SQL](measurement-readiness.md) define metrics and exclusions.

## Buffer fixtures and final checks

Only `growth/distribution/buffer/scheduler.mjs` and its test file changed during this validation to isolate the three fixture collisions. Publication-root injection is allowed only under `NODE_ENV=test`, with default production history scans preserved; fixture-local publication and ledger duplicate checks remain exercised. No actual publication records or queued posts were edited. Buffer's focused suite passed **25 tests**.

- Full suite: **54 files / 545 tests passed**.
- TypeScript: `npx.cmd tsc --noEmit` passed.
- ESLint: passed with zero errors and three existing warnings in unrelated promotion/reference files.
- Isolated production-mode build: passed.
- Final repository production build: passed, with measurement switches absent/default off.
- Whitespace check: passed. Final Git status: `main...origin/main`, 10 modified tracked files plus untracked instrumentation/tests/migration/review documents; no commit or push.

The earlier [instrumentation owner review](instrumentation-owner-review.md) records the previous validation stage; its pending SQL/browser checks and three Buffer failures are superseded by this package. Instrumentation event names and files remain documented there.

## Exact proposed production sequence — authorization still required

1. Review the instrumentation diff and this migration specifically. Privately confirm current Supabase role privileges, schema compatibility and available recovery procedure. Apply only this migration transactionally; do not blindly apply unrelated pending migrations. Verify RLS, grants and RPC via the existing server-only service-role connection. Reuse existing Supabase infrastructure and credentials; no paid service or new analytics provider is needed.
2. Deploy the reviewed application instrumentation with both `NEXT_PUBLIC_GROWTH_MEASUREMENT_ENABLED` and `GROWTH_MEASUREMENT_ENABLED` absent/false initially. No CTA, experiment copy or calculator title changes accompany it.
3. After separate authorization to collect, rebuild/deploy with public switch `true` and server switch `true`. The public flag is compiled into the browser build; changing it requires a rebuild. Perform excluded QA of actual canonical-host ingestion and private aggregate readout. Use owner opt-out/admin exclusion before testing; any deliberately accepted synthetic events must be identified and reconciled privately before selecting the baseline window.
4. Start baseline on the first complete Eastern day after successful collection QA. Preserve at least 14 complete baseline days, then separately approved conversion changes and at least 28 complete post-change days. Move calendar dates forward with readiness; October 12/26/November 9 are not deadlines. SEO launch remains separately approved. No measurement activation authorizes experiment activation.
5. Receipt retention cleanup older than 48 hours is only proposed in the migration comments. Establish an explicitly approved operational cleanup mechanism; it must retain durable daily aggregates. No production cleanup or scheduler was added. Do not expose receipt tables or reporting through a public endpoint.

Future confirmed newsletter attribution requires a separately authorized named Beehiiv resource form and verified acquisition/confirmation export. Only then set `NEXT_PUBLIC_BEEHIIV_DUCT_REFERENCE_FORM_ID` to its real ID and rebuild. This is not required for page/click/intent baseline collection and is not part of the current authorized implementation.

## Rollback

If transaction application fails, roll back that transaction; do not proceed to enable collection. If application or measurement QA fails after schema application, leave the private schema inert and disable collection. On Vercel, changing environment values requires a new deployment to affect running code: deploy with server switch false to stop accepted writes, and rebuild with browser switch false to stop event requests. A previous application release with measurement disabled is also a safe application rollback. Keep the approved schema and historical counters intact. Dropping tables/RPC or deleting aggregate data is not the normal rollback and requires separate explicit authorization and a recovery/export plan.

## William's readiness verdict

**Technically ready for prospective page-view, calculator-activation and newsletter-open baseline collection, conditional on approved production migration/deployment/enabling and excluded QA. Not collecting now. Confirmed newsletter conversion attribution is not yet ready.** No actual baseline values are established by this validation.

Stop for owner approval before commit, push, migration, production configuration or deployment.
