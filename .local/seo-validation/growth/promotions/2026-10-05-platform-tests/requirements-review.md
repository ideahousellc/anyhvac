# Controlled platform test requirements review

**Audio revision supersedes the original soundtrack/export references below.** See [audio revision review](audio-revision-v2/owner-review.md), its license provenance and measured verification. The revised video preserves all approved video packets but replaces the rejected original synth audio with an existing licensed Mixkit recording. The pending package has no approval; historical dry-run results require rerunning after authorized hosting.

Status: OWNER REVIEW; approval objects are null. No provider mutations made.

The existing scheduler already supports separate single-test packages for
Instagram images and YouTube videos. It validates local media hashes, exact
Eastern timestamps, technical/rights checks and platform metadata. Its preflight
reads complete live queue/history, compares captions/media/times/local records,
checks destinations, and requires a public PNG/MP4 with matching bytes. Its live
library requires exact content approval plus scheduling authorization and writes
a durable intent before creating a post. No scheduler change or bypass was needed.

Instagram: use the existing final 1080x1350 PNG (4:5, 1,458,712 bytes, under 8 MB).
Four hashtags; caption counts line breaks as two UTF-16 units and remains below
Buffer's 2,196-unit cap. Set type=post, shouldShareToFeed=true,
isAiGenerated=false, automatic/customScheduled; no music, stickers, shop-grid
link, first comment or user tags. The inspected channel is active, unlocked,
unpaused, Eastern, and defaultToReminders=false. Professional account eligibility
is not exposed in the inspected channel metadata; confirm automatic publishing
capability before any authorized live execution. Source asset approval does not
approve this new Instagram copy/time or provider crop.

YouTube: one 1080x1920 (exact 9:16), 15-second H.264/yuv420p MP4, AAC stereo audio
at 128 kbps, fast-start encoding. Actual export is 788,052 bytes, below the
scheduler's 100 MiB download cap and Buffer's documented 10 GB platform limit.
All decoded audio samples were checked; no clipping. Existing owner-approved
original instrumental is reused at 0.8 gain. No AI image or new music generation,
samples, spending or external audio provider. Owner must view the finished full
video with sound; objective audio measurements are not a listening approval.

Proposed metadata: title="Two Air Streams, One Mixed State | Free AnyHVAC Tool",
categoryId=28 (Science & Technology), privacy=public, madeForKids=false,
notifySubscribers=true, embeddable=true, license=youtube, isAiGenerated=false.
Title is under 100 characters; description is under 5,000. No custom thumbnail
URL or unsupported thumbnail-offset setting. The static promotional format is
intentional; this is not the main weekly story video. Photograph is illustrative
and does not assert this equipment has the depicted mixing arrangement.

Slots are the first configured recurring slots within October 5–11: Instagram
Monday 19:00 and YouTube Thursday 19:00, both Eastern. Instagram's earlier local
calendar draft proposed 18:00; 19:00 is a new proposal for owner review, aligned
with the live channel schedule. YouTube matches the existing Mixed Air calendar
entry. Neither time is claimed to be performance-proven or reserved.

Measured dry-run results are in `dry-run-results.json`. Instagram public-media
and queue preflight passed without approval. YouTube local schema/media and live
queue/duplicate checks passed; the complete preflight is BLOCKED because its
proposed MP4 URL returns 404. The operation in the report is a proposal, never
a submitted Buffer validation or create request. Re-run full preflight after
authorized hosting and obtain explicit content/time/settings approval before
scheduling either post.

Official Buffer sources checked October 2, 2026:
- https://developers.buffer.com/types/InstagramPostMetadataInput.html
- https://developers.buffer.com/types/YoutubePostMetadataInput.html
- https://developers.buffer.com/guides/character-limits.html
- https://developers.buffer.com/guides/hosting-media.html
- https://support.buffer.com/en-us/articles/instagrams-accepted-aspect-ratio-ranges-Frc2Xqewbd
- https://support.buffer.com/en-us/articles/troubleshooting-video-uploads-in-buffer-LK0CldlFNB
- https://support.buffer.com/en-us/articles/sharing-videos-through-buffer-LOe2p2rnAI

Buffer's aspect-ratio help pages disagree about 3:4 Instagram images. This test
uses 4:5, within both documented ranges, rather than relying on that discrepancy.
