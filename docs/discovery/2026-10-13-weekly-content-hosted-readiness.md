# Weekly Content hosted persistence: owner review

October 13, 2026. Prepared and validated locally/non-production. **No production migration, bucket, configuration, commit, push, deployment or enablement occurred.** The accepted five-package/13-post interface is preserved. Generation, public media hosting, Buffer scheduling and agent execution permissions remain disabled/unchanged.

This supersedes the October 8 report's statement that there is no hosted adapter. The earlier report remains the local design/validation record.

## Architecture and exact changes

The existing signed owner session and same-origin JSON checks remain the sole browser authorization mechanism. `WEEKLY_CONTENT_ENABLED` still defaults off. Hosted use additionally requires `WEEKLY_CONTENT_STORAGE=supabase`; production cannot use local storage. Batch selection is server configuration (`WEEKLY_CONTENT_BATCH_ID`, default historical fixture), never a browser-supplied owner identity. Owner hashes reuse the Phase 1 convention; renaming ADMIN_USERNAME requires a data-transfer plan.

The existing Supabase SDK and server-only configuration conventions are reused. No dependency, account, key or paid service was added. One `weekly_content_reviews` row per owner/batch stores bounded immutable versions/actions, a revision and update timestamp. Composite `(owner_id,batch_id)` primary key provides lookup/uniqueness. JSON envelope checks enforce 1–50 versions and up to 200 actions. This is a small document architecture, not normalized task/version tables.

Database guards require stable owner/batch/George identity, sequential version numbers, digest format, unique UUID request IDs, allowed review actions and action/version/digest correspondence. Updates must increment revision once and preserve prior versions and actions **exactly, in order**. CAS serializes writes; application code enforces legal review transitions, recomputes canonical hashes and validates 5/5/3 content/QA. PostgreSQL checks digest references; it does not independently recompute the JavaScript canonical hash or assess HVAC claims/licenses.

RLS is enabled and forced with no browser-role allow policy. Anonymous/authenticated privileges are revoked. Server service role may SELECT/INSERT/UPDATE and invoke the security-invoker CAS RPC, not DELETE. Service-role access bypasses RLS as in existing infrastructure; owner isolation depends on authenticated server code selecting owner/batch, not on RLS isolating that privileged key. Credentials stay exclusively server-side.

Private bucket: `weekly-content-review`, PNG/MP4 only, 50,000,000-byte file cap. Objects use `<owner-hash>/<batch-id>/<media-sha256>`. A restrictive policy denies every anon/authenticated operation for this bucket even if an existing broad permissive Storage policy exists; it preserves other buckets' policies. Existing Supabase Storage schema/RLS are assumed; migration does not reset global storage roles/policies.

Previews use the existing authenticated application media route. No public/signed Storage URL, upload token or service credential is sent to the browser. The adapter verifies the bucket remains private, downloads server-side, checks exact media size/hash and returns existing private/no-store/noindex/nosniff PNG/MP4 responses and video ranges. Missing/changed media or a public bucket stops preview/approval. Uploads never overwrite existing objects; an existing exact object can be verified during recovery.

`POST /api/admin/weekly/import` is a **separately disabled** private historical-fixture ingestion path (`WEEKLY_CONTENT_IMPORT_ENABLED` absent/false by default). It requires owner authentication, same-origin JSON and hosted review enablement. It accepts structured content only, validates the fixed October 12 fixture and its exact known asset inventory, copies existing server-side fixture files into the private bucket, and creates v1 with **no approvals/actions**. It accepts no path, owner ID, executable HTML, command or production authorization. Existing hosted history cannot be replaced. It is not preparation, public hosting or scheduling. No new UI import control was added.

## Isolated validation results

Native PostgreSQL **17.11**, fresh database `anyhvac_weekly_validation_final`, bound to `127.0.0.1:55443`, ignored cluster directory `.local/agent-inbox/weekly-hosted-validation/`. Supabase browser/service roles and minimal Storage metadata/RLS were modeled; no production data/configuration was loaded.

| Check | Result |
| --- | --- |
| Clean migration in transaction | Passed |
| Rollback and clean reapply | Passed; unrelated Storage sentinel preserved |
| Constraints/index/identity/action relationships | Passed; invalid digest linkage, duplicate requests, missing versions rejected |
| Immutable versions/actions | Overwrite, history deletion and changed approval rejected |
| CAS contention | 12 simultaneous same-revision calls; exactly one winner |
| RLS/browser/service grants | Browser read/write/RPC denied; service DELETE denied; forced RLS verified |
| Storage policy | Private bucket flag verified; restrictive policy blocked private reads/inserts despite an existing broad allow policy; other bucket remained visible |
| Actual Supabase SDK adapter | Passed against loopback REST transport backed by real PostgreSQL |
| Authenticated private import | Historical five/thirteen fixture ingested without approval carryover; repeat import preserved existing review; auth/origin/extra-owner fields rejected |
| Concurrent revision/replay | Racing unique actions preserved; duplicate request produced one action |
| Version/approval/refresh | Original version unchanged; edited copy required QA; exact approval persisted across new reads |
| Private previews | Owner video range 206; unauthenticated denied; missing/changed objects and public bucket rejected |
| Lost acknowledgement | Database commit followed by simulated 500; read confirmed saved action; exact request replay added no duplicate |
| Credential canaries | Test service/session values absent from persisted content/actions |
| Real Chrome regression | Accepted local UI, 5/13 original copy/slots/media order, 20 private media hashes, video playback/audio, anonymous denial and refresh passed |
| Full suite | **580 passed, 1 skipped; 60 passing files, 1 skipped** |
| TypeScript | Passed |
| Lint | Zero errors; four existing unrelated warnings |
| Production build, features disabled | Passed |
| Build file tracing | Fixed manifest and all 20 fixture assets included in private-import function trace |

The one skipped test is the earlier opt-in Phase 1 database adapter test; its independent database was not started. The new hosted integration test **was enabled and passed**. REST/Storage transport is a validation model, **not actual Supabase PostgREST/Storage/S3**. SQL uses a minimal Storage metadata schema to test policies; platform-specific roles, Storage API behavior and hosted request durations remain deployment smoke checks.

Reproduction: initialize an isolated cluster with existing PostgreSQL binaries; start only loopback port 55443. Run `node scripts/weekly/validate-database.mjs PATH_TO_PSQL`, then set `WEEKLY_VALIDATION_PSQL=PATH_TO_PSQL` only in the test process and run `npm test` (Windows npm.cmd). Script creates a fresh database and refuses an existing database; do not blindly repeat a partially completed run. It requires the existing ignored local fixture for source content. SQL evidence: `.local/agent-inbox/weekly-hosted-validation/sql-result.json`. Servers were stopped after validation.

## Storage and bandwidth

Official limits checked October 13: [1 GB Free file storage](https://supabase.com/docs/guides/storage/pricing), [5 GB cached + 5 GB uncached bandwidth](https://supabase.com/docs/guides/storage/serving/bandwidth), and [50 MB maximum Free upload size](https://supabase.com/docs/guides/storage/uploads/file-limits). These are plan allowances, **not measured remaining project quotas**. Production usage was not queried in this preparation.

Fixture: **20 objects, 17,158,980 bytes total; largest 3,893,429 bytes**. Revised captions/version metadata reuse media instead of duplicating bytes. No image transformations or paid features. Fully loading all assets once costs approximately 17.2 MB of upstream transfer; reloading and approval revalidation add downloads. Conservative sizing should use uncached quota because app responses are private/no-store.

Current video ranges intentionally download/hash the entire object upstream before returning a range. Multiple video range requests can multiply egress and latency. For this small fixture that is simple and integrity-preserving; do not extrapolate to large weekly video libraries. Confirm actual quota headroom, request duration/memory and a retention/export policy before enabling production. Stop rather than upgrade automatically if limits cannot accommodate it.

## Exact proposed implementation inventory: 23 files

This includes the accepted but still uncommitted local foundation plus hosted preparation; no unrelated paths.

```text
app/admin/agents/page.tsx
components/admin/AgentInbox.tsx
app/admin/agents/george/weekly/page.tsx
app/api/admin/weekly/route.ts
app/api/admin/weekly/media/[id]/route.ts
app/api/admin/weekly/import/route.ts
components/admin/WeeklyReview.tsx
components/admin/WeeklyReview.module.css
lib/weekly/types.ts
lib/weekly/domain.ts
lib/weekly/storage.ts
lib/weekly/hosted.ts
lib/weekly/ingest.ts
lib/weekly/__tests__/review.test.ts
lib/weekly/__tests__/routes.test.ts
lib/weekly/__tests__/hosted.test.ts
scripts/weekly/import-fixture.mjs
scripts/weekly/local-review.mjs
scripts/weekly/browser-review.mjs
scripts/weekly/validate-database.mjs
supabase/migrations/20261013000100_weekly_content_review.sql
docs/discovery/2026-10-08-weekly-content-stage1-owner-review.md
docs/discovery/2026-10-13-weekly-content-hosted-readiness.md
```

Only the first two paths are tracked modifications at the current checkpoint; the other 21 are new/untracked. Relative to the accepted local design, seven new files were added; storage/domain/routes tests/local launcher and the notice wording were updated. Exclude `.local/`, test credentials, browser profiles/screenshots, cluster/logs, temporary media, `.env.local`, caches and generated files. No package/dependency, existing scheduler, publication record, public asset or Phase 1 runner file changes.

## Proposed rollout, separately authorized

**Storage lifecycle addendum:** apply the temporary-media policy below before expanding weekly production. The current controlled rollout is still paused at Stage A pending actual organization quota/bandwidth confirmation. This addendum authorizes no cleanup or new media hosting.

1. Confirm backups, actual quota usage, stable owner username, existing Storage policy interactions and platform schema compatibility. Keep both WEEKLY_CONTENT_ENABLED and WEEKLY_CONTENT_IMPORT_ENABLED absent/false. Stop any related local preview/worker.
2. Apply **only** `20261013000100_weekly_content_review.sql` in a transaction. Inspect schema, forced RLS/grants, exact guard/RPC, private bucket/type/size restrictions and restrictive policy. Test browser access denial against actual Supabase; verify unrelated buckets unchanged. Stop on ambiguity; migration is not idempotent.
3. After exact inventory/secret review and separate commit/push authorization, deploy code with review/import disabled. Confirm normal public/admin behavior, Phase 1 conversations and baseline/provider settings unchanged. Verify fixture assets are present in the actual deployed function trace.
4. Configure server-only WEEKLY_CONTENT_STORAGE=supabase and WEEKLY_CONTENT_BATCH_ID=anyhvac-week-2026-10-12. Temporarily enable private import and review under owner authorization, with the required rebuild. Through the owner's normal authenticated browser session, submit **only the imported original v1 content**, not local synthetic approvals/actions, to the owner-only import endpoint. Inspect stored row and all twenty private object hashes; disable private import afterward. No production token/cookie sharing or invented approval.
5. Owner smoke test: five/thirteen actual previews, audio/ranges, calendar, exact-digest approval, revision/stale-action handling and refresh; anonymous/browser database and object access denied. Existing public historical assets remain unchanged. All execution responses remain false; no Buffer operations.
6. Record actual hosted verification and leave review enabled only after checks pass. If hosted import times out or CAS acknowledgement is ambiguous, inspect history/objects first. Partial private objects may remain before the row exists; recover exact objects without overwrite, or remove only confirmed orphan objects under authorization. Never create approvals from a migration or successful import.

## Rollback and remaining limits

Disable review/import and redeploy configuration first. Preserve/export private review rows and objects before deletion. Application rollback can leave storage intact. Under separate destructive rollback authorization, remove only this bucket's objects using **Supabase Storage API**, then delete the empty bucket through that API; do not delete production storage metadata directly with SQL. Keep the restrictive policy until the bucket has been removed so existing broad browser policies never gain access during rollback.

Then database rollback, transactionally:

```sql
begin;
drop policy weekly_review_browser_deny on storage.objects;
drop function public.weekly_content_compare_swap(text,text,bigint,jsonb);
drop table public.weekly_content_reviews;
drop function public.guard_weekly_content_review();
commit;
```

No CASCADE, existing table deletion, unrelated bucket changes or Phase 1 rollback. SQL-only Storage metadata deletion occurred solely in the disposable policy model; it is not the production Storage rollback procedure. Reapplying creates empty records/bucket, not prior history; restore retained exports if needed.

Remaining limits: actual hosted Supabase service not contacted; one server-selected batch in current UI; 50 versions/200 actions per batch; private ingestion supports only the historical fixture. Caption revisions are the only direct structured edits; general media replacement/production is still outside scope. QA evidence is imported/owner-reviewed, not automatic engineering/license certification. A compromised service credential or privileged database operator remains outside application immutability protection. Owner-entered text may contain sensitive information; no semantic secret detector is claimed. Distributed database/object writes are not one transaction, so import can leave private orphans and needs inspection after interruption.

Final main and origin/main both remain `9c063242a0ca9d5e5f675ff09df21883023759ed`. Index empty; only the exact listed implementation work is modified/untracked. Production, Buffer, analytics/William baseline, Beehiiv, authentication, public hosting and existing runners were untouched. Stopped for owner review before any production action.

## Storage lifecycle addendum — October 13, 2026

Owner requirement: production media is **temporary by default**, with no automatic paid-storage upgrade and no indefinite full-resolution archive. Metadata survives byte retirement. Existing assets remain untouched. Cleanup is a separately validated and authorized future capability, disabled initially.

### Retention and eligibility

| Media class | Required hold | When cleanup can be proposed |
| --- | --- | --- |
| Private Supabase review copies | Preparation, revisions, pending approval, active review, unresolved publishing issues or owner hold | Batch is closed, publication dependencies satisfied, no active/shared review reference and no explicit hold |
| Public Vercel-hosted assets already deployed | Every dependent post's successful publication; any reuse, embed, download, rollback or unresolved execution dependency | All references reconciled and no longer require source URL; removal requires a separately authorized deployment |
| Future public object-hosted delivery assets | Same publishing/reference checks as existing public assets | Verified successful publication and confirmed platform independence from the source URL; no ongoing use/hold |
| Local intermediate renders, staging/export copies, browser captures | Active job/revision, resumable execution and any sole-source dependency | Job settled; no process/lock/journal needs bytes; required final artifacts exist and have verified hashes |
| Shared source photography/music/brand assets | Every dependent batch and ongoing render use; licensing evidence always preserved | No active dependency and no planned/approved reuse; otherwise keep as a small curated shared library with an explicit purpose |

Scheduling, a passed timestamp, an empty queue or Buffer `sent` alone is insufficient. For each asset, identify **all** referring packages, batch versions and platform adaptations—not just its original week. Use durable Buffer ID, provider-confirmed publication status, published_at, public_url and live_verified_at. A public post must work without fetching the removable source asset; if platform source-retention behavior is unknown, keep the asset and stop cleanup for that dependency. Failed, deleted, cancelled or withdrawn posts do not count as successful publication; reconcile explicitly with the owner before releasing their hold.

Once all dependencies are satisfied, classify the asset **ELIGIBLE**, not immediately deleted. Proposed default: wait a further **7 days after the last verified publication**, allowing delivery/reconciliation checks. This grace is a proposal requiring owner acceptance, not an existing automatic deletion rule. Closed never-published drafts need an explicit owner closure and no remaining dependencies; orphan imports need reconciliation first. Neither age nor quota pressure overrides a hold. Routine metadata-only measurements do not require full-resolution bytes, but any William task explicitly needing media adds a temporary hold.

### Preserve lightweight records

Keep captions/titles, platform settings and scheduled/actual timestamps; immutable approval decisions/version digests; ordered media IDs, original hashes, type/dimensions/duration/byte count; Buffer and native publication IDs/URLs; attribution, licensing/provenance and compact evidence; William's metrics with period/source/quality; lifecycle decisions and deletion receipts. Avoid embedding base64 media, full render output or large downloaded source pages in metadata records. Retain sufficient license evidence even when original media is removed.

An immutable reviewed manifest is never rewritten to pretend bytes still exist or to erase its media hashes. Availability/retirement belongs in a separate mutable lifecycle ledger. Review UI should show **Media retired — metadata retained** with original hash and publication links, not broken players. Archived versions cease to be active review references only after explicit batch closure. Reopening or trying to approve a retired version requires restoring exact hash-matching bytes (if available) or preparing a new version and fresh approval; do not silently substitute a thumbnail/new render. Existing approval checks must continue rejecting missing/changed media.

### Reference ledger and safe cleanup worker design

The smallest addition is an owner-scoped asset lifecycle ledger separate from current immutable review payloads. It records each physical location (`private-storage`, `public-vercel`, future `public-storage`, `local`), canonical asset/hash/bytes, batch/version/post references, publication-verification evidence, owner holds, closed_at, eligible_after, state and deletion receipt. A shared logical asset can have multiple copies with different retention needs. Deleting an intermediate copy is safe only if a required verified copy remains; metadata references alone do not require bytes forever, but active review/render/delivery references do.

Worker states: **RETAINED → ELIGIBLE → DELETE_INTENT → DELETED**, with **BLOCKED / RECONCILIATION_REQUIRED** for uncertainty. Default operation is a read-only cleanup report. No inferred publication success and no blanket age-based bucket/folder deletion.

1. Enumerate only recorded objects in the dedicated review/media namespace; inspect all known manifests, immutable versions, publication journals and external-use holds. Unindexed objects are potential orphans, not automatically eligible. Never scan/delete mail attachments, arbitrary buckets, unrelated public files or brand assets.
2. Refresh provider publication evidence read-only and validate every shared reference. If any status, source-dependency behavior, hash/location or provider response is ambiguous, stop the affected cleanup run before deletion and report the blocker.
3. Produce an exact candidate plan: owner/batch/asset/location/hash, reasons, dependencies, verification timestamp, grace/holds and current object byte size. Sum distinct physical objects once. Distinguish **logical bytes eligible** from **actual recoverable provider storage**; deleting one Git-served path does not reclaim Git history or retained Vercel deployment snapshots.
4. Require separately authorized cleanup and a non-model worker credential restricted to the intended scope. Use an exclusive lease/fence and conditional ledger revision to claim the plan. Block new references/holds during deletion; recheck dependencies immediately before deletion. Reference creation must participate in the same ledger gate so approval/reuse cannot race a delete. Legacy records outside that gate block eligibility until reconciled.
5. Persist DELETE_INTENT before the one provider delete. Supabase deletion uses its Storage API and exact recorded object path, never SQL metadata removal. For local files, validate resolved paths remain inside the intended workspace/output directory and verify no process/lock needs them. Vercel assets use the separately authorized deployment procedure, not a filesystem delete against production.
6. Confirm absence and record provider result, bytes, asset/hash, actor, plan ID and timestamp. Repeated DELETED entries are no-ops; a matching intent with an already-absent object can be reconciled idempotently. A timeout or ambiguous delete leaves RECONCILIATION_REQUIRED: inspect existence/reference state before any retry. Do not remove a lock/intent merely to make cleanup run again. Record partial completion and stop on the first ambiguous result.

The model cannot turn a conversation or batch approval into cleanup permission. No cleanup endpoint, worker, delete credential, cron or schema change is implemented in this addendum. Future cleanup feature defaults off and requires isolated failure/replay/reference-race tests and explicit production authorization before use.

### Public hosting and Git history

**Do not commit new weekly media as the permanent hosting strategy.** Existing Vercel-hosted October assets and Git history are grandfathered and untouched. A future removal commit/deployment removes files from the current alias but does not erase historical Git blobs or retained deployments; do not rewrite repository history or delete deployment snapshots as part of routine cleanup. Account for shared assets and rollback holds before any separately authorized public removal. Unknown downstream consumers/embeds mean retain and reconcile, not assume no dependency.

Before Phase 2 public publishing expands, prefer quota-verified object storage in the existing Supabase infrastructure: private review bucket plus a separate, explicitly approved public delivery bucket for exact owner-approved exports. Public release and later deletion are publication actions, distinct from private ingestion and review approval. This is a design choice only; no public bucket, URL, policy or upload is created now. Reuse immutable content-addressed keys and update the scheduler's currently AnyHVAC-only host allowlist narrowly under review; never make private review objects public or broaden it to arbitrary hosts. Validate the exact public URLs/hashes before scheduling.

Both buckets share the existing free allowances; there is no assumption that a second bucket adds quota. Check actual storage and both egress budgets before each upload, with headroom for private review, retained delivery objects, retries and playback/hash downloads. If headroom is insufficient, stop preparation/uploads and present a verified cleanup plan; never auto-delete dependencies, purchase capacity or change billing. Current private preview downloads/hash-verifies full video objects even for ranges, so bandwidth must also be budgeted. No paid service is proposed.

### Smallest integration changes and current inventory impact

**Now:** documentation only in this existing report. The reviewed inventory remains **23 paths**, but this report's content has changed and should be included in final owner review. No migration/runtime/approval digest/media changes. Current Stage A quota confirmation remains outstanding; this addendum does not override that stop condition.

**Before new weekly production:** add batch closure/owner holds and the small asset/reference ledger; teach private import and later approved public hosting/scheduling to register references and immutable location/hash records. Import legacy references without inventing publication success. Add archived-preview tombstones and a storage-headroom preflight; keep metadata exports and William handoff intact. These are separately reviewed code/schema changes and will expand the future inventory.

**Before deletion:** implement only the dry-run eligibility/size report first. Validate shared references, provider-independent delivery, stale/missing publication evidence, cancelled posts, interrupted jobs, ambiguous deletes, duplicate cleanup requests and concurrent reuse in isolation. Only then add narrowly scoped deletion under separate authorization. Sunday preparation automation and cleanup cron are not needed now. The current review-only historical fixture should remain available for owner review; do not retire it based solely on its recorded SCHEDULED status or dates.
