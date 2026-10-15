# AnyHVAC October 19–25, 2026 — owner review

The complete local batch is ready for review: five content packages, thirteen
platform adaptations and twenty final publication/preview media files. The production
conversation runner remains offline. Nothing was imported, approved, hosted, scheduled
or published; existing October 12–17 content remains unchanged.

Open [the private local preview](review.html). It uses local media, contains no
tracking or publication actions, and includes every exact caption and proposed slot.

## Decision identity

Batch `anyhvac-week-2026-10-19-v1`, **review revision 3**.

Canonical content SHA-256:
`2ecee5b1d5348e1c2fc3f2b3a9ccd4a5e169fa26ce8b88c6694454270e11d9eb`.

[Review state](review-state.json) preserves the three preparation revisions and
contains zero approval actions. The current owner-review media also has immutable
content-addressed copies under `growth/.generated/weekly/2026-10-19-25/media-archive`.
Earlier intermediate preparation revisions were never approved. Future edits to this
reviewed version must preserve its media archive and create a new digest/revision.

## Five finished packages

| Package | Audience and purpose | Final format / destination |
|---|---|---|
| Compare the duct. Not just the diameter. | Designers comparing round/rectangular options; introduce the free decision aid | Branded real-duct photo graphic, plus 16-second static musical Short; Duct Calculator |
| Equal area does not establish equal friction | Designers/technicians avoiding area-only substitutions | Six-slide educational carousel; Duct Calculator |
| Two air streams. One checked air state. | Engineers checking outdoor/return-air mixing inputs | Branded real-air-handler photo graphic, plus 16-second static musical Short; Mixed Air Calculator |
| Lower RH does not prove less moisture | Designers/technicians distinguishing RH from humidity ratio | Six-slide educational carousel; Psychrometric Calculator |
| Same airflow. Different velocity. | Designers/technicians/students checking Q = V × A | 28-second animated educational video; Air Distribution Tools |

Static/carousel social assets are 1080×1350. Shorts/main video are 1080×1920 with
licensed instrumental audio. Captions, hashtags, ordered media, individual carousel
alt descriptions, source references and engineering boundaries are in
[packages.json](packages.json), [carousels.json](carousels.json) and
[calendar.json](calendar.json). Hashtags are part of the final captions.

## Proposed established calendar

All times **America/New_York, EDT / UTC−04**. Prior weekly slots shifted seven days;
not performance-proven, reserved or scheduled. New queue availability is unverified.

| Date | LinkedIn | Instagram | YouTube |
|---|---|---|---|
| Mon Oct 19 | Duct promo, 17:00 | Duct promo, 19:00 | — |
| Tue Oct 20 | Equal-area carousel, 16:00 | Equal-area carousel, 19:00 | — |
| Wed Oct 21 | Mixed-air promo, 16:00 | Mixed-air promo, 18:00 | — |
| Thu Oct 22 | RH carousel, 17:00 | RH carousel, 09:00 | Duct promo Short, 19:00 |
| Fri Oct 23 | Main video, 15:00 | Main video, 18:00 | Main video, 16:00 |
| Sat Oct 24 | — | — | Mixed-air promo Short, 19:00 |
| Sun Oct 25 | — | — | — |

Distribution: LinkedIn 5, Instagram 5, YouTube 3.

## Evidence and quality

[William's performance briefing](william-performance-brief.md) distinguishes measured
provider delivery states and a successful empty counter-table query from unavailable
current engagement/search/newsletter data. Topic winners and underperformers remain
unknown. These topics are practical usefulness hypotheses, not measured growth claims.
[The collaboration record](collaboration-record.md) preserves George's proposals,
William's challenges and incorporated corrections.

[William's final review](final-quality-review.md) and [snapshot signoff](qa-signoff.json)
passed technical, rights and media checks. All twenty hashes matched, arithmetic and
caption limits passed, and four destination HEAD checks returned HTTP 200. Geometry
examples are not recommended duct sizes; velocity examples are not design targets or
predictions of airflow after real duct changes. Heating-only RH statements preserve
fixed pressure and no moisture transfer. Mixed-air copy preserves dry-air mass basis.

Real photos are MTA Capital Construction (CC BY 2.0) and Alf van Beem (CC0).
Music is the previously licensed Sleepy Cat instrumental via Mixkit. No purchases or
AI-generated imagery. Full attribution, alterations, source hashes and archived license
evidence are in [licensing.json](licensing.json) and `evidence/`. The source recording
and internal WAVs are not publication assets and must not be shared standalone.
Primary licensing references: [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/),
[air-handler source/CC0](https://commons.wikimedia.org/wiki/File:HVAC_Air_Handler_Unit,_pic1.JPG),
[Mixkit music license](https://mixkit.co/license/modal/musicFree/).

All three final audio tracks decoded successfully with zero clipped PCM samples.
Measured sample peaks are about −6.1 to −6.2 dBFS. These are sample-peak checks, not
new true-peak/LUFS claims or evidence of human listening comfort. William inspected
sampled video frames; the owner must watch/listen through all three finished videos.

Campaign checks passed; new assembly/render scripts passed ESLint. Existing Weekly
Content review/route/fixture regressions: 17 passed, 1 skipped. New nonfixture content
was correctly rejected by both historical file parser and fixture-only domain checks.
No production import was attempted. Whitespace checks passed. No application code
changed, so a production build/deployment was not needed for this preparation task.

## Weekly Content status and missing ingestion step

**Ready for local owner review; not available as a new production Control Room batch.**

The current workflow requires `fixture: true`, the exact October 12 batch identity,
filename, canonical digest and original media inventory. This batch explicitly uses
`fixture: false`. Relabeling it or replacing the historical fixture would bypass the
reviewed controls and was not attempted.

Exact missing step: a separately authorized general-batch private ingestion path and
batch selector. It must validate this reviewed content/media inventory, create a new
batch without overwriting historical rows, upload to existing private storage, verify
hashes and previews, and retain signed owner sessions, same-origin checks, version/digest
binding, CAS/idempotency, ambiguity handling, approval controls and audit history.
No production flags, schema or routes were altered to make this batch fit.

## Exact owner actions

1. Open the local preview; inspect all twelve carousel slides and two promos at full
   size, read all thirteen captions, and play all three videos with sound end to end.
2. State **APPROVE**, **REVISE** or **REJECT** for the batch/revision/digest above.
   Agents have not recorded owner approval. Approval of the creative batch alone
   does not authorize production hosting, ingestion or Buffer execution.
3. If production Weekly Content review is desired, separately authorize the missing
   private ingestion implementation and controlled rollout/import. Review this
   exact batch in private previews before granting any future scheduling permission.
4. Future scheduling needs separate explicit authorization, verified media hosting
   and a fresh queue/collision check. Do not alter the historical scheduled batch.

## File inventory and workspace safety

New campaign files are confined to `growth/promotions/2026-10-19-25/`:
briefing, proposals, collaboration record, five-package metadata, carousel copy/alt,
calendar, render/assembly scripts, license/source evidence, link checks, media manifest
and validation, QA signoff/final review, local review HTML/state/content, and this review.
Exact file sizes/hashes are recorded in `file-inventory.json`; generated media and
immutable copies reside only under ignored `growth/.generated/weekly/2026-10-19-25/`.
They were not copied into `public/` or uploaded.

Only this new campaign directory changed during the mission. Earlier runner drafts
remain in the worktree. Git remains `main` tracking `origin/main`; no commit or push.
Read-only final status confirms runner offline, zero runner processes and no startup
task. No approval, Buffer scheduling, publication, production deployment or configuration
change, analytics write, Stripe change, pending request execution or paid service.
