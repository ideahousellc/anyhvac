# Buffer distribution boundary

## Controlled scheduler (local draft, live execution not authorized)

```text
node growth/distribution/buffer/scheduler.mjs --example growth/distribution/buffer/dry-run-example.json
node growth/distribution/buffer/scheduler.mjs --dry-run path/to/owner-approved-package.json
```

Both commands are read-only. `--dry-run` refuses an unapproved package;
`--example` labels the operation UNAPPROVED / NOT EXECUTABLE and can only print
a proposed request. There is no live CLI switch. Neither command uploads assets,
creates drafts, publishes, modifies existing posts or writes scheduling records.
`client.mjs` also serves the existing connection test and blocks mutations by default.

The package schema is illustrated by `dry-run-example.json`. Use `schema_version: 1`,
an exact batch ID/version, `America/New_York`, and `kind: single-test` (one post) or
`weekly` (five packages, 5 LinkedIn / 5 Instagram / 3 YouTube posts, with `week_start`).
Convert calendar `youtube-short` entries to API platform `youtube`. Preserve the
owner-reviewed dates, captions, ordered images, rendered MP4/audio, alt text, CTA,
destinations and channel IDs. The October 5–11 source calendar is still OWNER REVIEW;
it is not an approved scheduling input. This example is a separate single-post
proposal, not an alteration or approval of that weekly calendar.

An approved package additionally needs an `approval` object:

```json
{
  "decision": "APPROVED",
  "owner": "Cesar",
  "approved_at": "OWNER-SUPPLIED ISO TIMESTAMP",
  "evidence": "Exact owner decision/reference for this batch/version and media",
  "package_sha256": "Reviewed content digest"
}
```

Obtain the digest with `packageDigest(package)` from `scheduler.mjs`, or from the
read-only example output. It covers all package content except the approval object.
Do not manufacture an approval from a successful check, standing instructions or
a previous campaign approval. This local file records an actual owner decision;
it is not an identity-verification system or cryptographic signature. Any edit to
copy, link, media/hash, platform metadata, time, channel or batch version requires
new approval. Require PASS technical/rights checks and final preview/crop/audio
review evidence; preserve the existing owner-review and Content Factory quality gate.

Each run discovers accessible channels and reads complete queue/history pages before
constructing a proposed operation. It refuses disconnected, locked, paused or
timezone-changed channels, occupied exact timestamps, matching normalized captions,
reused media URLs, local post IDs and locally recorded media hashes. Existing manual
publication records are imported without rewriting them. Duplicate detection is
conservative: reuse on the same platform requires owner review/reconciliation,
not a bypass flag. Missing hashes/captions in older manual records limit comparison;
Buffer history and known manual times supplement them. Incomplete queue data or
pagination fails closed. A shared destination link alone is not a duplicate.

Media paths stay inside repository `growth/` or `public/`. Each approved asset has
a local SHA-256, stable direct HTTPS URL, and preview-review evidence. The current
host allowlist is only `www.anyhvac.net`; adding a third-party host requires owner
approval and a reviewed code change. Preflight checks the destination, downloads
the hosted PNG/MP4 without authentication or redirects, and matches its bytes to
the approved hash. A 100 MiB download cap is a local safety limit, not a provider
limit. Network format/duration/aspect-ratio rules and final crops remain part of
technical/media QA and must be verified before first live use.

The reusable `scheduleApprovedBatch` library function is implemented for later use
but is not invoked by either command. It additionally requires an authorization
object with decision `AUTHORIZE LIVE SCHEDULING`, owner `Cesar`, `authorized_at`,
actual owner `evidence`, and the exact `package_sha256`. No live authorization file
has been created. It preflights the whole batch, takes an exclusive local lock and
refreshes the queue and media before each create. It sends only `createPost` with
`customScheduled`, never edit/delete/move/publish-now operations. Instagram requires
explicit post/reel, feed-sharing and AI disclosure settings. YouTube requires one
video, title, category, privacy, kids, notification, embedding, license and disclosure
settings. Unsupported metadata is rejected rather than silently applied.

The append-only `records.jsonl` journal uses the existing Buffer post-record field
names and records durable ATTEMPTING intent before the single mutation. Confirmed
results retain Buffer IDs, exact Eastern ISO times including DST offset, status,
approval digest and queue-check time. Provider draft/error/changed results remain
RECONCILIATION REQUIRED; network ambiguity retains the attempt and blocks retries.
Do not retry automatically. Check queue/history and reconcile the journal first;
never delete an attempt simply to bypass a duplicate check. A stale lock likewise
requires inspection. Back up this ignored local operational journal; it is not
disposable `growth/.generated` media. Multiple machines or manual dashboard edits
can still race the queue read; this local lock cannot reserve a provider slot.
Partial batches stop on the first failure and preserve earlier confirmations.
SCHEDULED never means PUBLISHED; live publication verification remains separate.

Focused offline tests (synthetic approvals and mocked writes only):

```text
npx vitest run growth/distribution/buffer/__tests__/scheduler.test.mjs
```

## Media hosting recommendation (no uploads or hosting changes made)

Buffer has no file-upload endpoint: images and videos are supplied through ordered
`assets` entries such as `{ image: { url } }` or `{ video: { url } }`. Files must be
public, direct and stable through publication; avoid signed/expiring and share-page
URLs. Link cards cannot be combined with media assets. See Buffer's official
[hosting guide](https://developers.buffer.com/guides/hosting-media.html),
[image example](https://developers.buffer.com/examples/create-image-post.html),
[video example](https://developers.buffer.com/examples/create-video-post.html) and
[creation schema](https://developers.buffer.com/reference.html).

Simplest first test: reuse an already deployed, owner-approved website image. The
read-only check of `https://www.anyhvac.net/images/hero/Ductwork.png` returned HTTP
200, `image/png`, and bytes matching `public/images/hero/Ductwork.png`. The proposed
example uses that file, so it has no media-hosting blocker; its caption/crop/time
still need explicit owner approval. Local reachability does not establish that
Buffer's fetcher will pass all hosting/network checks; first live use must confirm it.

For new final PNGs and small MP4s, recommend content-hashed names under a future
`public/social/` directory served at `https://www.anyhvac.net/social/...`. The installed
Next.js public-folder guide confirms that `public/` files map directly to root URLs.
Keep them available through confirmed publication. This needs an explicitly
authorized production deployment; no files were copied into `public/` in this task.
The prepared October 5–11 assets remain local and have no verified public URLs.
Vercel documents CLI source-upload limits of 100 MB on Hobby and 1 GB on Pro; these
are total deployment source limits, not individual media limits. Current production
plan/remaining allowances were not inspected. See [Vercel limits](https://vercel.com/docs/limits).

If repeated video hosting makes deployment coupling inconvenient, Buffer recommends
Cloudinary or Cloudflare R2 free tiers. Neither is presently established as approved
media hosting by this repository. Cloudinary is the simpler separate media service;
R2 fits existing Cloudflare ownership but adds bucket/public-access configuration.
Both need explicit setup/hosting authorization and quota review. They are not
unlimited free hosting, and no account, bucket, connection, upload or purchase was
made. See [Cloudinary onboarding](https://cloudinary.com/documentation/developer_onboarding_faq)
and [R2 pricing](https://developers.cloudflare.com/r2/pricing/).

## Read-only API connection test

Run from the repository root with Node.js 22.9 or newer:

```text
node growth/distribution/buffer/connection-test.mjs
```

The local script reads only `BUFFER_API_KEY` from the existing, Git-ignored
`.env.local`. Use the owner's `account:read` and `posts:read` key. It sends only
GraphQL queries to `https://api.buffer.com`; HTTP POST is the query transport,
not a publishing operation. It adds no dependencies or website integration.

It lists accessible channel IDs, connection/queue state, recurring posting slots
(in each channel's configured timezone), and all scheduled posts for LinkedIn,
Instagram and YouTube using cursor pagination. Post timestamps display in
`America/New_York` with the applicable timezone abbreviation. Queue counts are
derived from the retrieved scheduled posts; drafts, sent and failed posts are
excluded. Inspection does not confirm successful publication or guarantee a slot
is available. No response data is saved. Missing channels, request/permission
errors and incomplete pagination produce a nonzero exit status; unknown queues
are not reported as empty. The script never creates or changes posts.

Official API documentation verified October 2, 2026:
[organizations](https://developers.buffer.com/examples/get-organizations.html),
[channels](https://developers.buffer.com/examples/get-channels.html),
[posts and pagination](https://developers.buffer.com/guides/posts-and-scheduling.html),
and [schema reference](https://developers.buffer.com/reference.html).

## Verified manual distribution state

Owner-reported state on 2026-09-30:

- Buffer Free is active with 3 of 3 channel slots connected.
- LinkedIn: AnyHVAC company page.
- Instagram: AnyHVAC.
- YouTube: @AnyHVAC.
- Scheduling timezone: New York / Eastern.

This is documentation of owner-verified state only. No account was opened, inspected, connected, or changed by the repository workflow.

## Campaign #002 handoff

Campaign #002 is prepared for owner review across all three channels. A later manual Buffer workflow may accept only an owner-approved final asset and channel copy. Before scheduling, the owner should preview the final crop, caption/title, link wording, sound, date, time, and timezone in Buffer.

## October 2–3 promotional package

On October 1, 2026, the owner confirmed approval and manual scheduling of all three posts in Buffer:

- LinkedIn: October 2 at 3 PM America/New_York.
- Instagram: October 2 at 6 PM America/New_York.
- YouTube Shorts: October 3 at 7 PM America/New_York.

Status is **SCHEDULED**, not PUBLISHED. This records the owner's confirmation; the queue has not been independently retrieved. Per-platform successful publication, actual publication timestamps and public URLs are still pending. The record is `growth/promotions/2026-10-02-03/publication-record.json`. George made no provider calls or external changes.

## Standing batch authority

George may inspect the existing queue, identify available slots and prepare complete
weekly batches independently within available access. Weekly batch: two 5–6-slide
educational carousels, two promotional graphics and one main video, adapted into
five LinkedIn posts, five Instagram posts and three YouTube Shorts. Promotional
Shorts reuse approved artwork as static vertical images with comfortable instrumental
music. See `docs/agents/george.md` and `growth/templates/owner-review.md`.

Once Cesar explicitly approves a batch, George is authorized to schedule those exact
approved posts in Buffer without asking again for each upload. Approval must identify
the batch/version, final media/captions/hashtags/destinations, channels and proposed
times/timezone. Saving these instructions is not batch approval and starts no action.

Before each schedule, verify the current queue, destination channel, exact approved
caption/media/link/crop/audio and time/timezone. Prevent duplicates; never replace
queued posts, alter unapproved content or silently change slots. Changed posts or
times return to owner review. Reconcile ambiguous API results before retrying and
report partial success accurately.

Record returned Buffer post IDs, confirmed scheduled times and provider confirmation
using `growth/templates/buffer-post-record.json`. Remain SCHEDULED until Buffer
confirms successful publication per platform. Verify live status and save public URLs
and actual publication times for William. Do not invent missing IDs or confirmation.
Label owner-confirmed manual scheduling separately from independent queue verification.

If API credentials, approved media hosting or required publishing permissions are
unavailable, report the specific blocker and prepare manual scheduling files; do not
claim success. Do not expose credentials or establish new connections/hosting/permissions
without applicable authorization. This grant covers approved scheduling, not publish-now,
expenses, commits, pushes, deployments or other external actions.

## Integration availability

The October 1 repository inspection found no Buffer credentials or approved media
hosting configuration and no SDK, queue reader, uploader or scheduling implementation.
That is a recorded inspection result, not a permanent assertion about future setup.
These documentation updates add no integration and do not establish provider access.
Recheck availability when performing an approved scheduling task. Batch approval
grants authority for the exact approved posts; it does not supply missing capabilities
or imply that any provider action succeeded.
