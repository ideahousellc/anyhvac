# Buffer distribution boundary

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
