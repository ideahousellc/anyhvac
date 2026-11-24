# AnyHVAC weekly publishing procedure

Owner standing direction, November 24, 2026: approval of a finished weekly batch authorizes routine promotional-media hosting, uploads, scheduling, publication and verification through the established AnyHVAC hosting and Buffer workflow. Do not ask again for each file or post. This authority covers approved media and captions; it does not authorize website behavior, engineering, navigation, credentials, permissions, production configuration, paid services or unrelated deployments.

Reuse this established process for future approved weekly batches. Change it only
when a genuine technical problem requires a correction; routine publishing is
not a reason to introduce another tool, host or production method.

## Prepare one weekly package

Reuse the five approved packages and their final channel captions, titles, hashtags, destinations, ordered media, alt text and engineering qualifications. Preserve visual diversity and the approved files; do not redesign or regenerate them during publishing. Deliver one consolidated review package before approval. Make ordinary creative and production decisions independently, choosing existing tools to suit the content.

Read the latest William handoff and record its date, search period and limitations in the batch's analytics checkpoint. Preserve the owner-approved calendar in America/New_York with explicit UTC offset. Custom timestamps can differ from recurring Buffer slots without changing channel settings. If the owner authorizes replacement of elapsed times, choose an available reasonable slot in the approved week and record the original and replacement. Otherwise escalate an elapsed time or conflict rather than silently moving a post.

After approval, bind the final content to a batch/version digest and local SHA-256 hashes. Record the actual approval wording and its scope, not an invented approval timestamp. Keep the review snapshot unchanged; store the execution calendar and approval separately.

## Complete quality checks

Check all exact caption/title lengths, destinations and technical qualifications. Preserve required photograph source/license/credit links. Verify music rights and source hashes. Decode every full MP4, check H.264/AAC compatibility, dimensions, duration, frame rate, audio presence, sample clipping and levels. Inspect final encoded frames and image/carousel order. Do not treat sample measurements as a subjective listening pass. Listen to the full final mixes when supported; otherwise record an actual owner listening confirmation. Do not falsely claim to hear audio or pass a check that is unavailable.

Use the existing batch validator on the unchanged preparation snapshot where applicable. For the November 24 premium batch this is:

```text
node growth/promotions/2026-11-23-29/premium-batch/validate.mjs
```

That historical validator also checks the original draft calendar and writes stale pending-review labels. Run it before updating the analytics checkpoint, and preserve its numerical findings in the separate final-quality record. Do not rerun production/render/assembly scripts as part of scheduling.

## Host approved public media

Reuse `public/social/<batch-dates>/` on `https://www.anyhvac.net/`, the existing GitHub main branch and Vercel Git deployment. No new hosting account, bucket or deployment configuration is needed. One verified deployment serves the entire batch.

1. Build an allowlisted hosting manifest containing only unique final publication PNG/MP4 files, local paths, full SHA-256, size, MIME type and stable direct URL. Use hash-suffixed filenames for new assets; never overwrite an existing hashed file. Reuse already hosted bytes where appropriate.
2. Copy only those approved files into the batch's public folder and compare their hashes again. Never publish editable scenes, review galleries, source captures, private analytics, operational records, license-evidence HTML, environment files or credentials.
3. Confirm the staged index is empty of unrelated work. Stage only the exact new media paths, inspect the complete staged file list and diff, then commit and push one asset-only commit to the existing main branch. This commit/push is part of the owner's authorized asset deployment. Keep documentation and operational drafts out of that commit. Do not force-push or resolve unrelated remote changes by overwriting them.
4. Verify the pushed commit and allow Vercel's existing build to finish. Fetch every canonical production media URL without authentication or redirects. Require HTTP 200, correct `image/png` or `video/mp4`, exact byte count and exact SHA-256. Check the actual destination links. Do not schedule based on push success alone.
5. Preserve the deployment commit and verification time in the private batch records. Do not describe a provider deployment as READY without provider evidence; successful canonical asset downloads independently establish media availability.

Retain media through confirmed publication and later retention review. An elapsed due time is not permission to delete it. Do not change configuration, security or credentials to work around an access failure. Report an unexpected cost, hosting failure or unsafe deployment condition.

## Schedule through the established Buffer API

Use `growth/distribution/buffer/client.mjs` and the existing `BUFFER_API_KEY`; never print it. Reuse `operation`, `digest`, `duplicateReasons`, `readRecords` and `CHANNELS` from `scheduler.mjs`. Default clients reject mutations. A live client must authorize only the exact digests of approved `createPost` inputs; no edit, delete, publish-now or configuration mutations.

The proven November 16 runner is `growth/promotions/2026-11-17-23/execute-approved-batch.mjs`. The November 24 adaptation is `growth/promotions/2026-11-23-29/execute-approved-batch.mjs`, paired with `prepare-approved-batch.mjs`, `execution-package.json`, `hosting-plan.json` and `final-quality-check.json`. Adapt batch inventory assertions and source hashes for the next approved batch; do not execute a prior week's hardcoded script against current dates.

Before any create, preflight the whole batch:

- Confirm the exact AnyHVAC channel IDs, America/New_York timezone, connected/unlocked/unpaused state and capacity. The existing workflow conservatively limits pending posts to ten per channel.
- Read complete queue/history pagination and durable local records. Reject duplicate normalized captions, reused media on the same channel, matching local post IDs and occupied exact timestamps. A shared destination link alone is not a duplicate.
- Check all dates are at least five minutes in the future, media hashes match, URLs are available and captions/settings match approval. Check internal batch slot collisions too.
- Preserve the proven Instagram `post`/`reel`, feed-sharing and generated-media flags. Preserve the proven public YouTube Science & Technology category 28, not-made-for-kids, notifications off, embedding on, standard YouTube license, and generated-media flag unless the approved package changes them. `aiAssisted` for assisted copy is separate from generated-media disclosure.

For the current batch:

```text
node growth/promotions/2026-11-23-29/execute-approved-batch.mjs preflight
node growth/promotions/2026-11-23-29/execute-approved-batch.mjs schedule
node growth/promotions/2026-11-23-29/execute-approved-batch.mjs verify
node growth/promotions/2026-11-23-29/verify-platform-settings.mjs
```

The scheduler takes an exclusive shared journal lock, refreshes queue/history before each post, writes and flushes `ATTEMPTING` to `growth/distribution/buffer/records.jsonl`, and makes one create request. Save each returned ID immediately, then independently re-read the queue to require exact channel, scheduled status, timestamp, caption and ordered asset URLs. Preserve the publication record after each success. If a response or verification is ambiguous, stop and reconcile queue plus journal before any retry; never remove a record merely to bypass duplicate checks.

After scheduling, independently verify all thirteen queue entries, including YouTube titles and platform metadata. Report counts by channel, dates/times in Eastern, exact media/caption confirmation, and errors. Scheduled is not published. On a later authorized status check, record actual sent status, sent time and public URL where returned; keep unavailable fields unknown.

## Escalation and records

Escalate only material engineering errors, uncertain rights, significant content changes, unresolved scheduling conflicts, unexpected costs, access failures or publication failures. Do not make the owner supervise routine file preparation or individual uploads. Routine scheduling/hosting within an approved batch needs no extra approval.

Keep execution packages, approval evidence, final QA, hosted-media checks, IDs, queue verification and William handoff local/private. Commit the permanent SOP and agent instructions separately from the asset-only media commit when authorized. Stage exact paths and inspect the entire staged diff; never add the whole worktree. End each run with validation results and actual Git status. Do not use Computer Use when it has stopped for a security restriction; the established Git and Buffer API paths are independent supported workflows.
