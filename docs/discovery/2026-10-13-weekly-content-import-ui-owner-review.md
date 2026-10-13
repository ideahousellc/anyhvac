# Temporary Weekly Content file import — owner review

Implemented locally on October 13, 2026. No production changes, migration, commit, push or deployment were performed. Existing production and local main remain at `9dd65b19b050a6488d9809fca67e0224f9721bc4`.

## Owner workflow after an approved deployment

1. Sign in normally and open `/admin/agents/george/weekly`.
2. Choose `weekly-content-original-v1.json` from `.local/agent-inbox/weekly-production/`. No browser-console JavaScript or production credentials are needed.
3. Check the validated counts: **5 packages, 13 posts, 20 original media assets**, approximately 17.2 MB.
4. Check the explicit private-import confirmation and click **Import privately once**.
5. Check the result, refresh, and inspect the existing private media previews and history. Import does not approve, schedule or publish the batch.

The form is not deployed yet. Local browser evidence: [confirmation screenshot](../../.local/agent-inbox/import-ui-review/01-confirm-import.png), [persisted import result](../../.local/agent-inbox/import-ui-review/02-import-result.png). Evidence and test credentials remain ignored/local.

## Scope and safeguards

The existing reviewed `/api/admin/weekly/import` endpoint is reused. A gated GET reports import status; the existing POST performs import. Signed owner sessions, same-origin POST validation, server-only storage access and private/no-store responses remain enforced. No authentication or database schema changes are required.

Only the expected JSON filename, bounded file size, historical batch identity and exact original canonical content digest are accepted. Native JSON parsing is used; no imported HTML or code executes. The browser and server both reject altered content. The expected digest is `bf590a8eec33de4c4c6627c2fab6053fe71f5827c7698adbe18600e2743bd433`.

An existing-row check prevents repeat media uploads; the existing database compare-and-swap prevents a second batch creation. A synchronous UI guard prevents double-click submission. Refresh checks persisted status and blocks another import. An ambiguous request is recorded in tab session storage and permits status checks only, never automatic resubmission; an operator must reconcile an unresolved result. No credentials enter imported content or browser-accessible database records.

The temporary UI and both import methods use the existing `WEEKLY_CONTENT_IMPORT_ENABLED` flag, together with the existing Weekly Content/hosted-storage gates. After successful production import, count/hash/private-preview and persistence verification, set this import flag to `false` and perform the required rebuild. This removes the form and disables import endpoints while preserving Weekly Content review. Do not disable it or change production configuration in this local implementation task.

## Exact proposed inventory — 13 files

Modified:

- `app/admin/agents/george/weekly/page.tsx`
- `app/api/admin/weekly/import/route.ts`
- `components/admin/WeeklyReview.module.css`
- `components/admin/WeeklyReview.tsx`
- `lib/weekly/__tests__/hosted.test.ts`
- `lib/weekly/__tests__/routes.test.ts`
- `lib/weekly/hosted.ts`
- `lib/weekly/ingest.ts`
- `lib/weekly/storage.ts`

Added:

- `components/admin/WeeklyFixtureImport.tsx`
- `lib/weekly/fixture-file.ts`
- `lib/weekly/__tests__/fixture-file.test.ts`
- `docs/discovery/2026-10-13-weekly-content-import-ui-owner-review.md`

No private input JSON, screenshots, harnesses, credentials or generated artifacts belong in the proposed commit.

## Validation

- Real local Chrome: authenticated file picker; wrong-file rejection; confirmation required; double-click produced one import; result contained 5/13/20; refresh preserved history and blocked repeat import. No approval was created.
- Browser harness used isolated PostgreSQL and an in-memory private Storage/REST test transport, not production Supabase. Existing local/test data and source media were preserved.
- Weekly focused tests: **19 passed**. Includes owner/flag gates, altered-content rejection, private storage, repeat import and replay/concurrency checks.
- Full suite with isolated Weekly Content database validation enabled: **583 passed, 1 skipped** across 62 files. The skipped test is the independent existing Agent Inbox database opt-in test.
- TypeScript and production build passed. ESLint: **0 errors, 4 pre-existing warnings** in unrelated growth/reference files. `git diff --check` passed.
- Local browser/server and isolated database processes are stopped after validation.

## Rollout and limitations

### Final-validation repair

The subsequent predeployment run reproduced an HTTP 503 in `lib/weekly/__tests__/hosted.test.ts` at the first valid import. PostgreSQL logs showed the isolated cluster listening on default port 5432, while the test's psql adapter connects to 55443. Direct psql confirmed connection refusal on 55443. The adapter converted the database error to HTTP 400; the Supabase SDK reported an error and `HostedReviewStore.exists()` correctly returned fail-closed HTTP 503. Authentication, fixture validation and production Storage were not the cause.

Correct isolated startup explicitly specifies the loopback address and test port:

```powershell
& 'growth/.generated/measurement-validation/pgsql/bin/pg_ctl.exe' -D '.local/agent-inbox/weekly-hosted-validation/pgdata' -o '-h 127.0.0.1 -p 55443' -l '.local/agent-inbox/weekly-hosted-validation/repair.log' start
```

The existing hosted test now runs `select 1` before constructing the HTTP adapter, so a database connection failure is visible as a setup error rather than an unexplained endpoint 503. This is the only code repair; application safeguards are unchanged. The hosted test passed three consecutive standalone runs after correcting startup, followed by a full-suite pass (583 passed, 1 existing opt-in test skipped). The repair and this record remain within the approved 13-file inventory. Renewed deployment authorization is required; no production operation was performed during diagnosis.

Owner approval is required before committing, pushing or deploying this inventory. After approval, deploy only these files, verify the deployment and owner gates, then let the owner perform the normal file-picker workflow above. Stop on ambiguous import results; do not blindly retry. After verification, disable the temporary import flag with the reviewed rebuild mechanism. No migration or new service is needed. Rollback can disable the import flag; existing imported history must not be deleted or overwritten.

This is a single historical fixture importer, not a general upload or media-replacement interface. Web Crypto requires HTTPS or localhost. Actual hosted UI import and media-preview verification remain pending the approved deployment and owner's authenticated browser participation. Preparation, publication, Buffer execution, media cleanup and new agent permissions remain disabled. Analytics, baseline collection, Beehiiv, Stripe and the conversation runner are unchanged.
