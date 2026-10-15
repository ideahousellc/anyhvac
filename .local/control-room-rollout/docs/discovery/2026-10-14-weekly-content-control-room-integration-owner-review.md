# October 19–25 Control Room integration — local owner review

Implemented locally. No commit, push, deployment, production configuration change,
production upload/import, scheduling, publishing, runner activation or startup task.
Approved media/captions and both source review directories remain unchanged.

## Ready

- Owner-authenticated batch selection at `/admin/agents/george/weekly`: October 12–17
  historical batch or October 19–25 approved revision 5. No arbitrary owner/batch IDs.
- A separate owner-only `/api/admin/weekly/approved-import` interface with same-origin
  POST checks, dedicated enablement, bounded streaming uploads and no-store responses.
- Server-pinned content, full five-version history and approval audit. The browser
  cannot provide substitute content, approval claims, owner identity or storage paths.
- Twenty current assets plus the original revision-3 video are required: **21 private
  uploads**, all with exact hashes, types and byte counts. The largest is 1,883,182 bytes.
  Each request is capped at its known size and at 2 MB; the route duration is 60 seconds.
  This fits the documented [Vercel request limit](https://vercel.com/docs/functions/limitations).
- File-picker selection verifies every file locally before upload. Explicit owner
  confirmation is required. A ref guard prevents double submission. Unconfirmed writes
  survive refresh in session storage; a status check precedes explicit same-file resume.
  No automatic retry, overwrite or cleanup. Already-imported rows block further writes.
- Private storage enforces bucket privacy, no-upsert uploads and exact-object recovery.
  Finalization verifies the archived original and all current objects before revision-zero
  CAS creates the new row. The final request does not re-upload the entire batch.
- Private previews and byte ranges are scoped to the selected batch and authenticated
  owner. The approved snapshot rejects edit/review/approval/revision mutations in both
  route and storage layers. Historical owner review controls remain unchanged.
- Original historical pending-save keys are retained; new batch state is separate.

Approved identity: `anyhvac-week-2026-10-19-v2`, review revision 5, batch ID
`anyhvac-week-2026-10-19`, content digest
`bf8488e8273cb40ca0456c632f1680ebcea7a23d4dc112a17e8109539c694975`.
New Bass video SHA-256:
`296114e1c4489c48e7e60169f4060af5ee2242ff575b7ce5db761341f00ef409`.
Approved state digest including audit:
`70b3a29f3733d40a806c4caa87e4746a39d5b46a86683703ad6a64d4e670d397`.

## Verification

- Full Vitest: **628 passed, 4 skipped**; 67 files passed, 2 skipped.
- TypeScript and production build passed. ESLint: zero errors and five existing
  warnings outside this integration. Whitespace check passed.
- Tests cover owner/flag/origin gates; spoofed fields; unknown assets/batches; bounded
  streams; media corruption; public-storage rejection; lost acknowledgements; all-21-file
  requirement; pinned approval/history; CAS concurrency; repeat-import prevention;
  approval replay; private video ranges; approved immutability; selector and disabled
  upload markup. API/storage tests use isolated in-memory transports, not production writes.
- A read-only production SELECT before/after confirmed the October 12 row remains
  revision 2 with payload digest
  `f17e87324ecc9a2dc945f10731c009b63d499e2d056f0dfb9f675e3115e1e20d`.
  The October 19 row is absent. The current review bucket metadata reports private.
- Existing migration reviewed: owner/batch primary key, FORCE RLS, browser-role table/RPC
  revocations, service-only CAS, immutable history trigger and restrictive private-bucket
  browser policies. No schema change is needed. Recheck live permissions before import.
- Private packet ACLs and all 21 hashes verified under the designated standard user.
  Packet: `%LOCALAPPDATA%\AnyHVAC\AgentInbox\weekly-content\anyhvac-week-2026-10-19-revision-5\media`.
- Build traces checked for private/local/generated assets; approval payload is absent
  from browser chunks. Only the reviewed state JSON is intentionally bundled server-side.
- Manual interactive browser verification remains pending. No owner browser connection
  was attempted. Automated SSR checks are not presented as full browser execution.

## Operational concerns

The approved revision 3 and revision 5 previews are supported, including both video
versions. Earlier preapproval drafts 1–2 contain some obsolete intermediate media
hashes whose exact bytes were not retained during initial preparation. Their immutable
text/history is preserved; missing draft media fails closed and is not substituted.
This does not affect the approved 20-asset batch or prior approved revision-3 media.

Network interruptions can leave immutable staged objects without a review row.
After checking status, the owner may explicitly resume the same reverified files;
existing exact objects are recovered without replacement. A changed object or uncertain
status stops import. No deletion/cleanup is authorized. Production latency/quota and
manual owner-file-picker behavior must be verified during controlled rollout.

## Exact proposed rollout inventory — 20 files

Modified tracked files (includes necessary previously prepared ingestion validation):

1. `.gitignore` — private music source exclusion only
2. `app/admin/agents/george/weekly/page.tsx`
3. `app/api/admin/weekly/route.ts`
4. `app/api/admin/weekly/media/[id]/route.ts`
5. `components/admin/WeeklyReview.tsx`
6. `lib/weekly/domain.ts`
7. `lib/weekly/storage.ts`
8. `lib/weekly/types.ts`
9. `lib/weekly/__tests__/routes.test.ts`

Added:

10. `app/api/admin/weekly/approved-import/route.ts`
11. `components/admin/WeeklyApprovedImport.tsx`
12. `lib/weekly/approved-batch.ts`
13. `lib/weekly/approved-ingest.ts`
14. `lib/weekly/approved-source.ts`
15. `lib/weekly/selection.ts`
16. `lib/weekly/__tests__/approved-ingest.test.ts`
17. `lib/weekly/__tests__/approved-import-route.test.ts`
18. `lib/weekly/__tests__/selection-ui.test.tsx`
19. `growth/promotions/2026-10-19-25-approved/approved-review-state.json`
20. `docs/discovery/2026-10-14-weekly-content-control-room-integration-owner-review.md`

Do not include unrelated runner drafts, source MP3s, local credentials, private packets,
generated media, other campaign preparation files or real personal Windows paths.
The checked inventory hashes are retained privately in the integration-review evidence.

## Required environment settings — future approval only

Preserve existing `ADMIN_USERNAME`, `ADMIN_SESSION_SECRET`, `SUPABASE_URL` and
`SUPABASE_SECRET_KEY`; no values belong in chat or source control.
Existing `WEEKLY_CONTENT_ENABLED=true` and `WEEKLY_CONTENT_STORAGE=supabase` remain.
Keep `WEEKLY_CONTENT_BATCH_ID` at the historical value; query selection is allowlisted
and does not require changing this default. Preserve the historical import flag.

New `WEEKLY_CONTENT_APPROVED_IMPORT_ENABLED` defaults disabled. Initially deploy with
it absent/false. Enable it only for the separately authorized private import window,
with the required rebuild; afterward set false and rebuild. This hides the new form
and disables both new import methods, while selector, review history and private
previews remain available. Do not enable the historical importer to ingest this batch.
No new service, paid plan, public bucket, browser database key or signed upload token.

## Exact deployment/import sequence — not performed

1. Owner separately authorizes the reviewed 20-file commit/push/deployment inventory.
   Isolate it from the mixed worktree; recheck pins, credentials, raw-media exclusion,
   tests and build. Deploy with the new flag false; verify Vercel READY for that commit.
2. Verify public pages/admin boundary and authenticated historical selection, payload
   fingerprint, existing approvals and preview ranges. Unauthenticated new APIs must
   return 401; approved mutation requests must return 409. Verify private bucket and
   live table/RPC/storage permissions, project/owner identity and quota before import.
3. Under separate owner import/configuration authorization, enable only the new flag
   and rebuild. Confirm the new batch row is absent (or reconcile an exact existing
   approved row). Sign in normally and select October 19–25 in Weekly Content.
4. Choose all **21** files from the protected packet's `media` folder. Browser filenames
   may be hashes; identity is based on verified bytes. Check counts and explicit private
   import confirmation. Import once; do not approve again, schedule or publish.
5. Refresh and verify 5 packages, 13 posts, 20 current assets plus original archived video,
   five-version history, exact revision-5 digest and the single owner approval action.
   Check all private previews, main-video music and revision-3 original. Reconfirm the
   historical row fingerprint and existing schedule remain untouched.
6. Disable the new flag and rebuild after successful verification. Preserve approval
   audit, source licensing evidence and private packet; do not run cleanup.
7. Stop for owner review. Publication media hosting and Buffer queue/collision checks
   require subsequent authorization; this private import is not scheduling permission.

## Rollback

First disable the new import flag and rebuild. If necessary restore the previous Vercel
deployment. Keep the historical default environment value unchanged. Do not delete or
modify either review row, approvals, histories, staged objects or bucket settings.
An older deployment may hide the new selector, but the new private review remains intact
for a later corrected rollout. There is no migration to reverse. Reconcile partial or
ambiguous imports read-only before any explicit resume; never retry with altered media.

Git remains main tracking origin/main with local drafts only. Production remains at its
existing deployment. The runner is not activated and no paid service is introduced.
