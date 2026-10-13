# George Weekly Content: Stage 1 owner review

Implemented and validated **locally only** on October 8, 2026. George has a Weekly Content link in Agent Inbox when the local review feature is enabled. Five package cards, all thirteen platform adaptations/calendar entries, three playable videos with audio, ordered carousels, exact captions/titles, destinations/slots, provenance, licensing, purpose and metrics are displayed. No source batch, production data, media deployment, scheduled post or agent permission was changed.

## Review locally

Start `node scripts/weekly/local-review.mjs`, sign into `http://localhost:3016/admin` with the existing private local test credentials in `.local/agent-inbox/review-config.json`, select Agents / Team, George, then Weekly Content. Direct route: `http://localhost:3016/admin/agents/george/weekly`. The server is stopped after validation; starting it creates no worker and performs no inference. The helper reuses the isolated Phase 1 test environment, blanks provider configuration and disables local growth collection without editing `.env.local`.

Screenshots, kept private/local:

- [Five-package desktop review](../../.local/agent-inbox/weekly-browser/01-five-package-review.png)
- [Approved test version](../../.local/agent-inbox/weekly-browser/03-approved-version.png)
- [Mobile review](../../.local/agent-inbox/weekly-browser/02-mobile-review.png)

Allow 20–30 minutes. LinkedIn adaptations are expanded initially; Instagram and YouTube copy/media/settings expand per package. Carousel slides remain ordered and horizontally scrollable. Play all three videos with sound. The calendar retains America/New_York offsets. No current queue availability is implied by these historical dates.

The source directory is `growth/promotions/2026-10-12-18/`; the actual thirteen recorded slots span **October 12–17**. Imported source captions, slots and ordered media hashes were compared against `execution-package.json` and publication records. The recorded state is SCHEDULED; neither this implementation nor the fixture claims the future posts have already published. Original source review files contain earlier status labels, so the importer deliberately uses durable scheduling records for displayed historical state.

## Versioning and owner approval

The imported fixture starts with no new approvals. Browser validation created **three local test versions and five actions**: v1 approval, revision request, v2 caption edit, v3 technical/rights review, and v3 approval. The repeated final approval request was deduplicated. These are synthetic local validation decisions, not authorization to change the real approved batch.

Revision requests select a platform adaptation and retain a timestamped reason. A caption edit produces a cloned immutable version, preserves prior versions and marks technical QA NEEDS REVIEW. It cannot inherit approval. Owner review of changed claims/attribution is separately recorded as evidence in a new version; exact batch approval follows. Old versions and action history remain viewable. Open revision requests block approval of their version. An old historical approval never approves a newer version.

Canonical SHA-256 covers the entire structured review content, including agent/batch identity, package context, caption/title, destination, ordered media IDs/hashes/bytes/types, slots, channel IDs, alt text, Instagram/YouTube settings, licensing/provenance and QA evidence. Object key order is normalized; arrays retain order. This is a review digest, not the existing scheduler's execution-package digest. No conversion into executable authorization is implemented.

Approval occurs only through a signed-owner, same-origin JSON action and records the exact version and digest. Required package/media/provenance/licensing/QA fields are validated, and **every physical media hash and size is rechecked before approval**. Stale version submissions and changed stored content fail closed. Content and approvals are not cryptographically protected against an operator with direct filesystem access; immutability is enforced by application operations, with digest checks on every read.

## Storage and security

Private owner-scoped local directory: `.local/agent-inbox/weekly/<existing-owner-hash>/`. `state.json` contains bounded versions/actions; `media/<sha256>` contains copied, unchanged asset bytes. The fixture has **20 assets / 17,158,980 bytes**. Original public assets remain public because they were deployed previously; only the review copies and revised drafts are private. Nothing new was placed under `public/`.

Current Supabase Free allowances checked against official documentation: **1 GB file storage**, **5 GB uncached plus 5 GB cached egress**, and no Free overage pricing. Sources: [Storage pricing](https://supabase.com/docs/guides/storage/pricing), [Bandwidth](https://supabase.com/docs/guides/storage/serving/bandwidth). These are plan limits, not measured remaining project allowance. This Stage 1 uses local disk to avoid consuming production storage, adding services or claiming quota availability. No bucket, database schema or Supabase adapter was created.

Local storage uses an exclusive lock and atomic replacement. Busy/stale locks fail closed; an operator must inspect an interrupted lock rather than deleting it blindly. State is bounded to 50 versions and 200 actions. The UI preserves unconfirmed requests in tab-scoped storage, offers an explicit exact-request retry, and retains the same request ID. Replays of identical actions are idempotent; changed bodies with the same ID are rejected. Save failures leave existing records intact. Do not include credentials/private customer information in revision text or captions.

Each page/API/media request independently uses existing owner authorization. Media IDs are fixed SHA-256 identifiers resolved only through stored manifests; no arbitrary file path, URL proxy or directory listing. Invalid IDs return 404; missing/tampered media fails closed. Responses use private/no-store/noindex headers, typed PNG/MP4 and nosniff. Video ranges return 206; invalid ranges return 416. Images use Next Image with optimization disabled so private bytes are not sent through a public optimization/cache path. UI renders escaped text, never imported HTML or executable content.

`WEEKLY_CONTENT_ENABLED` defaults off and is **hard-disabled under NODE_ENV=production**, even if the flag is set. Existing public/admin analytics separation is preserved. There is no worker endpoint, renderer execution, Buffer import, credential access, public hosting, deployment or scheduling action in this feature. Phase 1 runner files and permissions are unchanged. The review approval response explicitly reports `executionEnabled:false`.

## Validation

| Check | Result |
| --- | --- |
| Focused review/domain/routes | 14 tests passed |
| Full application suite | **578 passed, 1 skipped; 59 passing files, 1 skipped** |
| Skipped test | Existing opt-in Phase 1 PostgreSQL adapter test; isolated DB not running in this stage |
| TypeScript | Passed |
| Lint | Zero errors; four existing warnings in unrelated growth/reference files |
| Production build | Passed with review/Inbox disabled and provider credentials blanked only in the build process |
| Real Chrome | Existing local sign-in, George navigation, accurate five/thirteen import, all twenty authenticated media hashes, video playback and audio streams, anonymous media denial, rejected execution action, refresh persistence |
| Browser revision/approval flow | Original immutable v1 preserved; open revision blocked approval; edited copy required fresh QA; authenticated review/approval succeeded; duplicate final approval retained one action |
| Safe failure/security tests | Unauthorized reads/actions/media, cross-origin writes, unknown actions/fields, traversal, invalid video ranges, missing media/provenance/licensing/QA, stale submissions, corrupted state, production disablement, stale-lock preservation |
| Visual QA | Loaded-media desktop and mobile screenshots reviewed; viewport overflow fixed and browser rechecked |

Browser evidence: `.local/agent-inbox/weekly-browser/verification.json`; final read-only browser run rechecked three retained versions. Initial mutation run exercised the full five-action flow without repeating real publication actions. Screenshots/config/copies/history remain ignored local artifacts. No packages installed and no model executions incurred.

## Files changed: 16

Modified:

```text
app/admin/agents/page.tsx
components/admin/AgentInbox.tsx
```

Added:

```text
app/admin/agents/george/weekly/page.tsx
app/api/admin/weekly/route.ts
app/api/admin/weekly/media/[id]/route.ts
components/admin/WeeklyReview.tsx
components/admin/WeeklyReview.module.css
lib/weekly/types.ts
lib/weekly/domain.ts
lib/weekly/storage.ts
lib/weekly/__tests__/review.test.ts
lib/weekly/__tests__/routes.test.ts
scripts/weekly/import-fixture.mjs
scripts/weekly/local-review.mjs
scripts/weekly/browser-review.mjs
docs/discovery/2026-10-08-weekly-content-stage1-owner-review.md
```

The importer refuses to overwrite an existing review. It reuses unchanged public fixture bytes, checks hashes before copying, validates source scheduling records and writes only ignored local state. Do not run it merely to clear review history. The browser mutation test requires a pristine fixture; `--verify-only` rechecks the existing state without further approvals/revisions.

## Limitations and proposed Stage 1 rollout

This is a **local/test foundation, not yet deployable private persistence**. Vercel cannot use local disk for durable review state. Caption edits are the only direct structured edits implemented; requests can describe other changes, but media replacement, rendering and general batch creation belong to later preparation integration. QA combines imported historical evidence and explicit owner review; it does not automatically verify engineering claims or newly acquired licenses.

Proposed next sequence, subject to owner approval:

1. Review this local experience and version/approval semantics. Keep all execution capabilities disabled.
2. Confirm actual Supabase storage usage, retention and upload limits; implement a private Storage adapter and small owner-scoped review/version/action tables as a separate reviewed change. Preserve these domain checks, action IDs, optimistic version fences and private media routes. Draft migration/RLS and validate against an isolated database before requesting production application.
3. Inspect exact commit inventory and exclude all local credentials/evidence/media and existing scheduling journals. Deploy with review disabled only after authorization, then privately import the historical fixture without rescheduling or changing its original approval.
4. Enable owner-only review after hosted persistence, authorization, range playback, refresh, stale actions and rollback/export checks pass. Approval continues to mean review only; no Buffer or production execution permissions added.
5. Roll back by disabling review, retaining/exporting private history and media, then reverting code if needed. No deletion or rollback of existing posts, original public media or Phase 1 conversations.

No commit, push, migration or deployment performed. Final Git scope is the two modified tracked files and fourteen new files listed above; index is empty. Production Inbox, runner configuration, Buffer, analytics/baseline, Beehiiv and CTA/SEO experiments remain unchanged. Stopped for owner review.
