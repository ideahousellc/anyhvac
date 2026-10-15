# October 19–25 — music-only owner review

Open [the revised video preview](review.html), or play
[the final MP4](../../.generated/weekly/2026-10-19-25-music-v2/media/main-airflow-area-new-bass.mp4).

Decision: **APPROVE / REVISE / REJECT** `anyhvac-week-2026-10-19-v2`, review revision 5.
Canonical digest:
`bf8488e8273cb40ca0456c632f1680ebcea7a23d4dc112a17e8109539c694975`.

## What changed

Only the 28-second main educational video's background music and its three platform
music credits/media references changed. George selected **New Bass 01 — Lily J**.
The selected continuous excerpt is 00:24–00:52, with a 0.35-second smooth entry and
two-second exit. The opening of the source is quieter; the selected section has more
consistent measured energy. This is a creative/level-based selection, not a claim
of human listening or improved performance.

The original H.264 visual stream is bit-for-bit identical. Original visuals, timing,
on-screen text and engineering explanation are preserved. There was no separate
narration in the original music-only audio stream. The final portrait 1080×1920
H.264/AAC MP4 is suitable for the three existing LinkedIn, Instagram Reel and YouTube
Short adaptations; no extra crop or re-encoding of visuals was needed.

All 29 original campaign files, nineteen other media assets, ten other posts,
publication slots and original review revisions 1–3 remain unchanged. The approved
v1/revision 3 directory was never written. Its existing review preview still plays
the original Sleepy Cat music. The two promotional Shorts retain their approved music.
New draft revision 4 and William-reviewed revision 5 are in a separate review state;
only the owner-requested revision action is recorded, with no approval action.

## Shared library and licensing

Both owner-supplied files decoded successfully and matched the exact official Mixkit
downloads byte for byte:

| Track | Creator | Source | Duration | Attribution |
|---|---|---|---|---|
| New Bass 01, ID 720 | Lily J | [Mixkit News catalog](https://mixkit.co/free-stock-music/tag/news/) | 96 seconds | Not required; optional credit retained |
| Chicken Out, ID 1166 | Michael Ramir C. | [Mixkit Corporate Music catalog](https://mixkit.co/free-stock-music/corporate-music/) | About 120.4 seconds | Not required; optional credit retained |

William verified their catalog title/artist/download/license associations and source
hashes. Both are licensed for commercial synchronized social/web/YouTube videos under
the [Mixkit Stock Music Free License](https://mixkit.co/license/modal/musicFree/),
subject to its limitations and [User Terms](https://mixkit.co/terms/).
Do not redistribute the source MP3s or internal audio excerpts standalone, present
them as owned music, register them for rights management or use them in prohibited
TV/radio, game or CD/DVD contexts. No claim-free platform guarantee is implied.

Raw music, exact identity comparisons, acoustic inspection, license snapshots and
the shared registry are in `.local/media-library/music/`. That directory was initially
not ignored; a specific Git ignore rule now excludes it, and no file there is tracked.
The source recordings were not copied into public assets or this review directory.

[Shared-library workflow](../../../docs/media/shared-music-library-workflow.md),
[George's selection](../../../docs/media/music-library-george-selection.md), and
[William's license review](../../../docs/media/music-library-william-review.md)
record selection and verification responsibilities. George may alternate candidates
when they suit a future authorized video; William verifies identity/license before
use. Eligibility is not permission to publish. The Suno song was not used.

## Validation and owner action

[William's derivative review](william-review.md) and [snapshot signoff](qa-signoff.json)
passed licensing, integrity, unchanged-visual and audio-record checks. Original and
revised elementary H.264 hashes match. The final container is 28 seconds; decoded
audio includes normal codec padding (about 28.003 seconds). It has zero clipped PCM
samples, measured RMS −22.033 dBFS and sample peak −2.802 dBFS.

The −3 dBFS preparation constraint applies before AAC encoding; the encoded sample
peak is reported separately above. No new LUFS, true-peak or subjective listening
claim is made. Watch/listen to the entire revised export for opening, ending, volume
and fit, then approve or request changes to the exact new revision above.

The source MP3s, approved originals and revised files remain local. No website/runtime
code changed. Revision scripts passed ESLint; hashes, history digests, media registry
and Git exclusion were checked. No runner activation, startup task, scheduling,
publication, production import/configuration change, paid service, commit, push or
deployment occurred. The historical-only Weekly Content ingestion limitation remains.
