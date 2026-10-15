# Final approved October 19–25 batch and ingestion preparation

Owner explicitly approved original v1/revision 3 plus the music-only v2/revision 5.
Approval recorded locally from that instruction; it does not authorize publication.

## Final identity

- Batch ID: `anyhvac-week-2026-10-19`
- Final label/revision: `anyhvac-week-2026-10-19-v2`, revision **5**
- Approved canonical content digest:
  `bf8488e8273cb40ca0456c632f1680ebcea7a23d4dc112a17e8109539c694975`
- Approved video: `main-airflow-area-new-bass.mp4`
- Approved video SHA-256:
  `296114e1c4489c48e7e60169f4060af5ee2242ff575b7ce5db761341f00ef409`
- Soundtrack: **New Bass 01 — Lily J**, Mixkit; licensed continuous 24–52-second
  excerpt, with the reviewed fades and levels.

[Approval audit](approval-audit.json), [approved review state](approved-review-state.json)
and [final media manifest](final-media-manifest.json) bind the decision to the exact
content, history, media IDs and twenty byte-verified assets. The thirteen post references
were checked; all three main-video adaptations use the approved replacement. Ten other
posts and nineteen other assets remain unchanged. Slots remain proposed, not scheduled.

Five review revisions are preserved. The original source directories and their existing
history files remain unchanged; approval was added only to this separate final bundle.
The original immutable content's descriptive NOT APPROVED field was not edited: the
version/digest-bound approval audit action is authoritative. The final state has one
owner approval action and the preceding revision-request history, no execution action.

## Secure ingestion readiness

**Prepared and tested locally; not deployed or imported into production Control Room.**

The packet resides under the existing restrictive user-owned directory:
`%LOCALAPPDATA%\AnyHVAC\AgentInbox\weekly-content\anyhvac-week-2026-10-19-revision-5`.
It contains approved content/state, approval audit, licensing metadata, a packet manifest
and twenty hash-addressed media files. ACLs were verified before and after copying.
No credentials, source MP3s, public URLs or signed-storage links enter the packet.
Original music/license proof remains preserved in the ignored shared library and the
existing campaign records. Nothing was placed in public assets or uploaded.

New server-only ingestion code accepts ONLY the pinned content and full approved-state
digest. It does not enable arbitrary uploads or treat imported approval claims as proof.
All history digests, owner approval and media bytes must match before the first upload.
Existing reviews are never overwritten. Private hosted storage must enforce private-bucket
checks, no-upsert object writes and exact-object recovery; downloads are verified before
the revision-zero CAS creates the new review. Repeats verify the exact saved state/media;
changed reviews or ambiguous/concurrent writes stop for reconciliation.

The hosted wrapper reuses existing Weekly Content, Supabase and import-enabled gates,
server credentials and owner identity. It targets this new batch ID explicitly, without
changing the historical configured batch. No production route invokes it yet. Existing
authenticated owner routes, same-origin POST checks and private preview controls remain
unchanged. Historical fixture imports retain their original exact-identity/digest gates.
The validator admits only this exact approved nonfixture digest; edits or future batches
require separately reviewed allowlisting rather than inheriting approval.

No database schema change was prepared: the existing owner/batch key and compare-and-swap
store can hold a separate batch. Production permission/schema compatibility must still be
rechecked before an authorized import. No production migration or data write occurred.

## Required next steps before scheduling

1. Review the local ingestion changes and explicitly authorize any commit/push/deployment.
2. Prepare the owner-only operator invocation and batch selection/viewing path. The current
   production browser importer is still historical-only; do not relabel this packet as that
   fixture, send it to the old endpoint, or overwrite the historical batch/configuration.
   Reuse signed owner sessions/same-origin validation for any future browser mutation path.
3. Separately authorize production private ingestion. Recheck owner/project identity,
   Supabase permissions/RLS, bucket privacy, configuration gates and new-row absence; run
   only the pinned importer against the verified packet. Reconcile ambiguity before retry.
4. In the owner's authenticated Control Room, verify persistence after refresh, exact
   5/13/20 counts, five-version history, approval action, all private previews and hashes.
   Operator credentials, session cookies or tokens must never be supplied in chat.
5. Separately prepare/authorize publication-media hosting and verify the approved URLs.
   This private review import creates no publicly usable Buffer media URLs.
6. Before any separately authorized scheduling, recheck the live queue for collisions,
   historical scheduled posts, correct channels, exact captions/assets and EDT slots.
   Do not duplicate or alter existing scheduled posts. No scheduling authority was granted.

## Validation

- Full Vitest: **619 passed, 4 skipped**, 65 files passed, 2 skipped.
- Focused review/import regressions before the final two tests: 23 passed, 1 skipped.
  The final full run includes approval replay and hosted-disabled-gate tests too.
- TypeScript and production build passed. ESLint: zero errors, five existing warnings
  outside this stage. Whitespace checks passed.
- Tests reject content/history/approval tampering, missing/corrupt bytes, mismatched
  existing reviews and uploaded corruption; cover concurrent CAS, no replacement,
  repeat import and idempotent owner-approval replay. Tests use isolated in-memory
  stores; production ingestion was not exercised or claimed successful.
- All 43 build traces contain zero private/local/generated media paths.
- Protected packet ACL/hash checks passed under the actual standard Windows user,
  without administrator elevation or execution-policy bypass.

## Exact changes in this stage

Modified application files:

- `lib/weekly/domain.ts`
- `lib/weekly/types.ts`

Added application/test files:

- `lib/weekly/approved-batch.ts`
- `lib/weekly/approved-ingest.ts`
- `lib/weekly/__tests__/approved-ingest.test.ts`

Added approved bundle files:

- `growth/promotions/2026-10-19-25-approved/approved-content.json`
- `growth/promotions/2026-10-19-25-approved/approved-review-state.json`
- `growth/promotions/2026-10-19-25-approved/approval-audit.json`
- `growth/promotions/2026-10-19-25-approved/final-media-manifest.json`
- `growth/promotions/2026-10-19-25-approved/owner-review.md`

Outside Git: protected packet and media copies. Earlier uncommitted runner/campaign
drafts remain in the worktree. Git is main tracking origin/main; no commit/push/deploy.
No approved content, original revision, Buffer post, runner/startup configuration,
analytics, Stripe, production configuration or authentication token was changed.
