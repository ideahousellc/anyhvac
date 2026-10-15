# Campaign #003 V2 — final focused Blender opening revision

## Decision summary

**The focused revision passes the phone-first communication gate.** The shot now begins
outside a recognizable flanged rectangular duct, crosses the mouth, and approaches visible
sloped reducer panels surrounding a smaller downstream opening. The visual story works
without text: “HVAC duct” → “we are going inside” → “the duct is getting smaller.”

George recommends **APPROVE OPENING SHOT**. This approves the three-second visual opening
for the next Campaign #003 production gate; it does not authorize publication, the remaining
campaign, audio, calculator transition, CTA, deployment, commit, or push.

## 1. Revised three-second MP4

`growth/.generated/campaigns/003-why-duct-size-matters/blender/opening/focused-revision/final/review/duct-opening-blender-0-3s-1080x1920.mp4`

- 1080 × 1920, 30 fps, 90 frames, 3.0 seconds, H.264 MP4, silent.
- 1,620,603 bytes after the integration-only portrait-canvas correction.
- SHA-256: `07cfc217331864f3a39101ed1637a46eee0b5ba2c18ca00ba8b5248397ccb15b`.

## 2. Phone-size MP4

`growth/.generated/campaigns/003-why-duct-size-matters/blender/opening/focused-revision/final/review/duct-opening-blender-0-3s-phone-360x640.mp4`

- 360 × 640, 30 fps, H.264 MP4, silent.
- 119,638 bytes after regeneration from the corrected review encode.
- SHA-256: `4249ddd8701efd8ea6766ea87d7a5889d59a6b2a617e61cc6b02a8caeafec261`.

The original review encoder created its image strip before setting the portrait canvas, which embedded the approved portrait frames in a landscape intermediate. During final integration, the existing 90 approved source frames were re-encoded with the 1080 × 1920 canvas set first. This was an integration correction only: no frame was re-rendered and no visual or timing decision changed.

## 3. Contact sheet

`growth/.generated/campaigns/003-why-duct-size-matters/blender/opening/focused-revision/final/review/opening-sequence-contact-sheet.png`

The four-panel sheet is intentionally rendered at less than phone width per frame, making it
a stricter recognition check than reviewing the 1080-wide originals alone.

## 4–7. Required representative frames

All are 1080 × 1920 PNGs under
`growth/.generated/campaigns/003-why-duct-size-matters/blender/opening/focused-revision/final/review/representative-frames/`:

| Moment | File | Visual role |
| --- | --- | --- |
| 0.0 s | `0.0s-frame-0000.png` | Exterior, flange, thickness, and interior establish HVAC immediately. |
| 0.5 s | `0.5s-frame-0015.png` | Camera approaches the mouth while exterior context remains visible. |
| 1.5 s | `1.5s-frame-0045.png` | Camera is inside; sloped reducer panels and smaller opening are clear. |
| 3.0 s | `3.0s-frame-0089.png` | Off-axis endpoint preserves all four transition planes instead of entering them. |

## 8. Camera and composition change

The earlier shot began fully inside the duct and asked viewers to identify an abstract metal
tunnel. The revision uses a 36 mm camera and starts at `(5.80, 16.80, -1.60)`, outside and
off-axis. That composition simultaneously shows the exterior side sheets, TDC-style entrance
flange, fasteners, sheet thickness, rectangular mouth, and interior depth. The camera crosses
the mouth between frames 18 and 27, reaches the inside view at frame 45, and ends upstream of
the reducer at `(-0.55, -0.65, -0.55)`. The off-axis endpoint looks toward the smaller duct
center and keeps the sloped transition faces visible.

The path remains smooth and controlled. No handheld motion, banking, artificial wobble, or
zoom effect was introduced.

## 9. Confusing geometry removed

- Both internal tie rods that read as stray horizontal bars were removed.
- The extra foreground reinforcement ring added for the rejected version was removed.
- The extra interior joint fasteners were removed; the established entrance flange hardware
  is sufficient for recognition.
- The terminal end cap was removed because its illuminated face made the reducer resemble a
  framed portal.
- Airflow streak count was reduced from 18 to 8 so the duct remains dominant.

No replacement detail, texture, plugin, asset, geometry system, or renderer was added.

## 10. Reducer readability improvement

The camera no longer drives almost to the reducer inlet. It holds farther upstream and shifts
off-axis, preserving the ceiling, floor, and both side transition planes around the smaller
opening. The opening shot first establishes one continuous duct system from outside; once
inside, those four modeled trapezoidal sheets visibly connect the larger upstream section to
the smaller downstream section. Removing the bright end cap prevents the downstream run from
appearing to be a luminous wall or doorway.

## 11. Phone-size assessment

The revision passes at 360 × 640. The exterior silhouette, flange rails, dark fasteners,
metal thickness, hard rectangular mouth, and specular edge response survive reduction more
reliably than microscopic texture. At 0.5 seconds, enough exterior remains to make the entry
understandable. At 1.5 and 3.0 seconds, the reducer's sloped faces remain legible around a
smaller rectangle. Sparse airflow is subordinate and directional.

The final isolated frame remains intentionally austere and would be less self-explanatory
without the preceding entry. That is acceptable here because the approved test is the
continuous three-second story, and frame 0 supplies immediate HVAC context.

## 12. Render time

- Four initial 360 × 640 checkpoints at 16 samples: 8.599 seconds total.
- Corrected endpoint checkpoint: 2.449 seconds.
- Rejected fill-light checkpoint: 2.328 seconds; the change was reverted before production.
- Final 1080 × 1920 sequence: **1,587.372 seconds (26:27.372)**.
- Final average: **17.638 seconds per frame**.
- Full and phone MP4 encoding: 12.903 seconds.

The final used Cycles, Quadro RTX 3000 OptiX, 32 adaptive samples, denoising, six maximum
bounces, and no motion blur. It was approximately 4 minutes 33 seconds faster than the
rejected 31-minute opening despite adding the exterior approach.

## 13. George's honest assessment

- **HVAC immediately recognizable? Yes.** Frame 0 clearly presents a manufactured rectangular
  sheet-metal duct with a flange, fasteners, thickness, exterior faces, and interior depth.
- **Camera entry understandable? Yes.** Exterior context remains through the approach and the
  flange passes naturally as the camera crosses the mouth.
- **Reducer unmistakably a duct transition? Yes in the sequence.** Four sloped sheet-metal
  planes visibly connect the established large duct to the smaller downstream rectangle. The
  final frame alone is less descriptive than the sequence, but no longer reads as an isolated
  portal after the entry context and end-cap removal.
- **Visual story works without text? Yes.** The required mental sequence is readable without
  `SAME AIRFLOW`, a logo, audio, or explanatory graphics.
- **Ready to continue? Yes.** The opening has earned the next Campaign #003 production gate.
  George does not recommend another Blender-opening revision.

## 14. Files modified

- Modified: `growth/video/blender/duct_opening_animation.py`
- Modified: `growth/video/blender/encode_opening_sequence.py`
- Modified: `growth/video/create-opening-review.mjs`
- Created: `growth/campaigns/003-why-duct-size-matters/blender-opening-final-revision-review-v2.md`
- Modified: `growth/campaigns/003-why-duct-size-matters/media-provenance.json`
- Modified: `growth/campaigns/003-why-duct-size-matters/daily-owner-review.md`

Previously prepared uncommitted Campaign #003 work remains preserved.

## 15. Generated files excluded from Git

All output lives under the ignored directory
`growth/.generated/campaigns/003-why-duct-size-matters/blender/opening/focused-revision/`.
This includes the phone checkpoints, 90 production PNGs (163,713,179 bytes), reproducible
`.blend`, two MP4s, four representative frames, and contact sheet. No generated medium is
tracked or staged.

## 16. Validation

- Phone-first checkpoints were rendered and inspected before the production sequence.
- Exactly 90 contiguous production PNGs were generated, frames 0000–0089.
- Full and phone silent H.264 encodes completed through Blender's bundled FFmpeg.
- The four final-quality review moments and phone-scale contact sheet were visually inspected.
- `node --check growth/video/create-opening-review.mjs`: passed.
- `media-provenance.json` parse: passed.
- Frame sequence and dimensions: passed; 90 contiguous 1080 × 1920 PNGs.
- Git-ignore check for generated MP4: passed.
- `npm test`: passed, 47 files and 503 tests.
- `npx tsc --noEmit`: passed.
- `npm run lint`: passed with zero errors and two pre-existing warnings in
  `reference/duct-calculator-original/script.js`.
- `npm run growth:validate`: passed; no publishing behavior.
- `npm run build`: passed under Next.js 16.3.4.
- `git diff --check`: passed with line-ending notices only.

## 17. Git status

Work remains uncommitted on `main`, alongside previously prepared Campaign #003 changes.
Generated output remains ignored. No commit, push, deployment, publication, scheduling,
Buffer upload, final music, final SFX, calculator transition, CTA, or work past second 3 was
performed.

## Exact owner decision required

- [ ] **APPROVE OPENING SHOT**
- [ ] **CHANGE OPENING CONCEPT**
