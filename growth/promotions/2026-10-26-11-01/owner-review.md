# AnyHVAC October 26–November 1 — approval package

**Prepared only. Not approved, scheduled, uploaded or published.**

Open [all media and exact platform captions](review.html). Batch `anyhvac-week-2026-10-26-v1`, revision 1. Review all twelve slides, two promotional graphics and three videos with sound. Captions include final hashtags and credits; media is local-only.

## All 13 proposed posts

All times America/New_York, **EDT / UTC−04:00**, following last week's approved cadence shifted seven days. These are proposed slots, not performance-proven times or reservations.

| Date | Package / format | LinkedIn | Instagram | YouTube |
|---|---|---|---|---|
| Mon Oct 26 | Measurement before interpretation — promo graphic | 17:00 | 19:00 | — |
| Tue Oct 27 | TESP is not airflow — six-slide carousel | 16:00 | 19:00 | — |
| Wed Oct 28 | One state, several useful properties — promo graphic | 16:00 | 18:00 | — |
| Thu Oct 29 | Which pressure are you comparing? — six-slide carousel | 17:00 | 09:00 | Measurement promo Short 19:00 |
| Fri Oct 30 | A design pressure budget, step by step — 28s video | 15:00 | 18:00 | 16:00 |
| Sat Oct 31 | Psychrometric promo — 16s Short | — | — | 19:00 |
| Sun Nov 1 | No post; daylight saving time ends | — | — | — |

Total: LinkedIn 5, Instagram 5, YouTube 3. Graphics/carousels 1080×1350; Shorts/main video 1080×1920. Promotional Shorts use static vertical artwork and instrumental music. Main video uses an original animated design-budget diagram. LinkedIn is the canonical educational copy; Instagram uses website navigation CTAs; YouTube has distinct titles/descriptions. Exact files, ordered slides, captions, destinations and proposed times: [packages](packages.json), [calendar](calendar.json), [slide text/alt](carousels.json).

## Previous week and duplicates

**MEASURED — Buffer provider state, October 26 at 11:58 EDT:** all 13 October 19–25 approved post IDs returned `sent`. Zero previous-week failures. This is provider delivery confirmation, not independent native publication/engagement verification.

All three channels are connected, unlocked and unpaused. No exact caption duplicates or proposed-slot collisions were found in the retrieved queue/history. One unrelated October 8 YouTube test remains `error`; it was neither changed nor retried. [Fresh snapshot](buffer-status.json), [duplicate/slot checks](duplicate-check.json).

The measurement resource was promoted earlier, so this week's copy uses a new field-reading-versus-design-input angle. Existing tools, equipment photos and music are intentionally reused; the captions, slide sequences and main pressure-budget example are new. Pressure topics form an intentional teaching sequence. No topic-performance superiority is claimed.

## Technical and rights review

[William's independent review](william-review.md) and [snapshot signoff](qa-signoff.json) record the final result and limitations. Sources are the existing AnyHVAC measurement reference, psychrometric guide and Air Distribution tools; [source hashes and arithmetic](technical-sources.json) preserve traceability. No engineering code or formula was changed.

Photographs: MTA Capital Construction Mega Projects, CC BY 2.0, and Alf van Beem, CC0. Equipment-only crops are contextual, with source/license links and modification disclosures in captions. Main video: original AnyHVAC diagram. Music: existing Sleepy Cat promotional excerpts and New Bass 01 main-video excerpt, synchronized under the Mixkit free music license. No AI imagery, purchases or paid tools. [Licensing ledger](licensing.json), archived `evidence/`, and [current terms recheck](license-recheck.json). Raw recordings/internal WAV files are not publication assets and must not be shared standalone.

## Validation and remaining blockers

- Twenty asset hashes and all thirteen post-media references verified; caption/title limits passed. [Validation](validation.json), [media checks](media-validation.json).
- All three destination HEAD checks returned HTTP 200, without browser analytics. [Link checks](link-checks.json).
- Owner must review the complete captions/slides and play all three videos with sound; sampled visual/audio measurements do not replace that review.
- Buffer read access works. This new batch has no hosted media URLs and has not been imported into Control Room. Later scheduling requires owner authorization, a separately reviewed existing hosting/handoff path, and a fresh queue check. No website/infrastructure work was performed to resolve hosting.
- Runner was never started by this task. Independent offline confirmation is unavailable: process-command-line inspection was denied and the existing read-only runner status command stopped at its private ACL check. No security settings, ACLs or startup tasks were changed.
- No application/runtime files changed; production build and application tests are not needed for these local content artifacts. Preparation scripts were linted and whitespace checked; final worktree status is reported with delivery.

Owner decision: **APPROVE CREATIVE**, **REVISE**, or **REJECT** this exact revision. Creative approval does not schedule posts. Scheduling remains a separate owner authorization.

Review content SHA-256: `12a243c16bf90c14ba2eebb526927bc5d1f35ab785fad0d82c385e2b0460bf04`.
