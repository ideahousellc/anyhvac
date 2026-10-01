# Thursday afternoon sprint — owner review

Prepared October 1, 2026. Status: SCHEDULED. Owner approval and manual Buffer scheduling confirmed October 1, 2026. Lightweight promotion of existing resources; no new major campaign or engineering resource. The owner manually scheduled all three posts in Buffer. George performed no upload, scheduling, publication, commit, push or deployment. Successful publication remains unconfirmed.

## Approved media and owner-confirmed schedule

All times America/New_York (EDT, UTC−04:00). The owner confirmed all three posts manually scheduled for these slots. The live queue has not been independently inspected.

| Platform | Scheduled date/time | Media |
|---|---|---|
| LinkedIn | Friday October 2, 2026, 3 PM ET | `friday-duct-reference.png`, 1080 × 1350 |
| Instagram | Friday October 2, 2026, 6 PM ET | Same Friday graphic, 1080 × 1350 |
| YouTube Shorts | Saturday October 3, 2026, 7 PM ET | `saturday-discover-anyhvac.mp4`, 1080 × 1920, 15 seconds |

Media directory: `growth/.generated/promotions/2026-10-02-03/`. The Saturday PNG is also supplied. The MP4 holds that image static throughout, with no animation or narration. Audio is an original quiet 72 BPM instrumental with low bass, warm chords and a soft melody, plus opening/closing fades. Listen to the complete MP4 before approval.

## LinkedIn — final caption

Keep a practical duct-design reference close to your next project.

The free AnyHVAC Duct Design Quick Reference brings airflow and velocity formulas, duct-sizing relationships, pressure basics, reference values and IP/SI conversions into a two-page PDF.

2 pages. Practical formulas and reference values. No signup.

Download the free PDF:
https://www.anyhvac.net/resources/duct-design-quick-reference

Save it for your next design check, or share it with a colleague. Verify reference values against your project requirements before final design.

#HVAC #DuctDesign #MEPEngineering #HVACDesign

## Instagram — final caption

A useful reference for your next duct-design check.

Our FREE Duct Design Quick Reference covers airflow, velocity, duct sizing, pressure basics and IP/SI conversions.

2 pages. Practical formulas and reference values. No signup.

Visit anyhvac.net → Resources → Duct Design Quick Reference to download the PDF.

Save this post for later and share it with your HVAC team. Verify reference values against your project requirements before final design.

#HVAC #DuctDesign #HVACDesign #MEPEngineering #AirDistribution #HVACTools

Instagram CTA deliberately uses site navigation; it does not assume a particular profile bio link or a clickable caption URL. Alt text: “AnyHVAC free HVAC Duct Design Quick Reference. Two pages of practical formulas and reference values, with no signup. Covers airflow, velocity, duct sizing, pressure basics and IP/SI conversions.”

## YouTube Shorts — final title and description

Title: Free HVAC Calculators & Tools | AnyHVAC

Description:

Explore free HVAC calculators, design tools and downloadable references at anyhvac.net.

Find duct-sizing, air-distribution, psychrometric and mixed-air tools for your next HVAC check.

Visit anyhvac.net and explore Tools and Resources. Save this Short for your next project.

#HVAC #HVACTools #MEPEngineering #Shorts

CTA uses the readable domain and does not depend on clickable Shorts description links.

## Buffer inspection and manual handoff

`growth/distribution/buffer/README.md` records owner-reported Buffer Free with LinkedIn company page, Instagram and @AnyHVAC connected, timezone New York/Eastern, as of September 30. That is documented state, not a live inspection.

Repository inspection found no Buffer SDK, provider client, queue reader, uploader or scheduler. No Buffer credential variables or approved media-hosting variables were found in `.env.local` or the relevant process environment; values were never printed. No Buffer connector is exposed in this session. Existing local files and public website URLs do not establish an approved API media-hosting workflow.

The owner has now confirmed manual scheduling of these three posts in Buffer. Independent queue inspection and provider publication confirmation remain unavailable through the integration. Manual uploads required no new hosting service. No queued posts were changed by George. Per-platform records remain SCHEDULED until Buffer confirms successful publication; actual publication timestamps and public post URLs remain unknown.

## Technical and provenance checks

- Claims traced to `app/resources/duct-design-quick-reference/page.tsx`, the existing PDF and Available tools in `data/tools.ts`. PDF structure confirms exactly two pages. No new equations, performance claims or engineering values appear in the artwork.
- October 1 read-only HTTP checks returned 200 for the resource page, public PDF and homepage, with expected HTML/PDF content types. Browsing-tool access failed; direct HTTP checks succeeded.
- Native SVG layouts rasterized with the existing Sharp dependency. Existing `public/Horizontal Logo.png` and site palette reused. No image model, paid assets, Blender or new dependencies used. Reproducible source: `produce.mjs`.
- AnyHVAC original/internal graphic layouts and soundtrack, prepared October 1, 2026. Commercial reuse permitted for original work; no attribution requirement. Logo reused within the owner's brand. Audio has no external samples, recordings, borrowed melody or voice.
- Visual review of both PNGs passed for exact headline/supporting copy, legibility and clipping. Saturday primary content stays left of the Shorts action rail and above the lower overlay area; platform preview still requires owner review.
- MP4: H.264, yuv420p, 30 fps, 450 frames, AAC stereo 48 kHz, faststart. Encoding/metadata, decoded audio and a decoded seven-second video frame were checked. Decoded audio peak −14.71 dBFS, RMS −26.85 dBFS, zero clipped samples. The bundled FFmpeg lacks some analysis filters/muxers; checks used decoded WAV samples and an extracted PNG instead. Sound comfort still requires listening by the owner.
- No application runtime changes; runtime suite/build not needed. Generation, decoded media checks and `git diff --check` are the proportionate validation for this package.

## Campaign #003 closure

Existing publication record already confirms October 1, 2026 and all three owner-supplied public URLs. No publication times or measurement baselines invented. Existing approved assets are left intact; `campaign-003-retained-assets.json` records SHA-256 hashes and missing-file status for the approved video, phone preview, music and SFX. Existing retention metadata protects these as non-temporary files required locally by the publishing workflow. No cleanup was run.

William's existing handoff remains at `growth/campaigns/003-why-duct-size-matters/william-publication-handoff.md`: first snapshot October 2 after each post has had 24 hours where possible; seven-day comparison October 8. Preserve capture times, reporting windows, owner/test exclusions and MEASURED/DERIVED/INFERRED labels. Measure platform metrics separately from site referrals, qualified duct-calculator visits, newsletter subscriptions and actual revenue. No measurement data was retrieved or fabricated here.

## Owner decision

APPROVED by the owner; all three posts manually scheduled in Buffer. Status remains SCHEDULED, not PUBLISHED. Approved media and platform captions are preserved byte-for-byte. See publication-record.json for per-platform times, retention hashes and pending publication confirmations. No further approval is needed for this administrative recording; future external actions require separate authorization.
