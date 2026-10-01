# Campaign #003 V2 — Blender 0–3 second opening review

## Decision summary

**The technical pipeline passes, but the opening shot does not clear the creative gate.**
The three-second render is complete, contiguous, correctly formatted, silent, and fully
reproducible. Its forward travel and modeled reducer work as intended. The still-frame
quality does not survive strongly enough at phone size, however: broad panels flatten into
a clean gray tunnel, the internal tie rod reads as a stray bar, and the reducer resembles
a framed portal more than an unmistakable fabricated HVAC transition.

George recommends **REVISE OPENING SHOT**. Work stopped at second 3. No compensating text,
particles, music, faster editing, or later campaign production was added.

## 1. MP4 location

- Full review video:
  `growth/.generated/campaigns/003-why-duct-size-matters/blender/opening/final/review/duct-opening-blender-0-3s-1080x1920.mp4`
- Format: 1080 × 1920, 30 fps, frames 0–89, exactly 3.0 seconds, H.264 in MP4, silent.
- Size: 805,530 bytes.
- SHA-256: `81191b5e86ec64b8d458aaf6caac9641d5a08b9f0929f548c4c16e4bf2031fd4`.

## 2. Representative-frame locations

All are 1080 × 1920 PNGs under
`growth/.generated/campaigns/003-why-duct-size-matters/blender/opening/final/review/representative-frames/`:

- `0.0s-frame-0000.png`
- `0.5s-frame-0015.png`
- `1.0s-frame-0030.png`
- `2.0s-frame-0060.png`
- `3.0s-frame-0089.png`

The combined inspection image is
`growth/.generated/campaigns/003-why-duct-size-matters/blender/opening/final/review/opening-sequence-contact-sheet.png`.

## 3. Phone preview location

`growth/.generated/campaigns/003-why-duct-size-matters/blender/opening/final/review/duct-opening-blender-0-3s-phone-360x640.mp4`

It is a 360 × 640, 30 fps, silent H.264 review encode. Size: 139,989 bytes; SHA-256:
`de2df6e47c52fcffbead0b0db461d79deadcfce2f0997a94bbd5c69e22f332f5`.

## 4. Blender and review scripts

- `growth/video/blender/duct_hero_frame.py` — approved still-scene foundation.
- `growth/video/blender/duct_opening_animation.py` — camera, construction details,
  qualitative airflow, scene generation, and PNG rendering.
- `growth/video/blender/encode_opening_sequence.py` — full and phone H.264 encoding plus
  representative-frame extraction through Blender's bundled FFmpeg.
- `growth/video/create-opening-review.mjs` — five-moment contact-sheet generator.

## 5. Camera path

The 32 mm perspective camera begins physically inside the large duct and travels smoothly
downstream with restrained lateral and vertical drift. Linear keyframes avoid easing to a
stop during the three-second excerpt.

| Frame | Time | Location (X, Y, Z) | Look target (X, Y, Z) |
| --- | ---: | --- | --- |
| 0 | 0.0 s | `(-1.15, 2.90, -1.10)` | `(0.20, -6.20, 0.30)` |
| 45 | 1.5 s | `(-0.80, 1.00, -0.75)` | `(0.30, -6.80, 0.42)` |
| 89 | 3.0 s | `(-0.45, -0.75, -0.35)` | `(0.45, -7.50, 0.65)` |

## 6. Airflow implementation

Eighteen thin 3D curve streaks travel downstream inside the scene. Their positions use the
modeled duct cross-section at each Y coordinate, so their envelope contracts through the
reducer. A low-strength pale blue-gray emission mixed mostly with transparency keeps the
cue understated. Speed and streak length increase slightly through the transition. This is
explicitly qualitative directionality, not CFD or a claimed velocity distribution.

## 7. Reducer and narrowing implementation

The animation reuses the actual solidified trapezoidal reducer panels from the feasibility
scene, including the eccentric downstream centerline, joints, bevels, and thickness. The
camera approaches that geometry continuously; no flat scale, crop, or 2D tunnel effect is
used. The implementation is physically in the scene, but its current composition does not
communicate the transition strongly enough at phone size.

## 8. Render configuration

- Blender 5.2.2 LTS in background mode.
- Cycles with NVIDIA OptiX.
- 1080 × 1920 at 30 fps; 90 PNG frames.
- 32 adaptive samples, denoising enabled, six maximum bounces inherited from the approved
  foundation.
- AgX medium-high contrast, `-0.35` exposure.
- Existing ambientCG Metal 049 A PBR maps and Poly Haven Studio Small 08 HDRI; no new
  external media.

A representative 540 × 960 test took 5.153 seconds at 32 samples without blur. A 48-sample
motion-blur alternative took 8.399 seconds, about 63% longer, without a material phone-size
improvement. The lower-cost configuration was therefore selected.

## 9. Motion-blur decision

Motion blur is off. A restrained 0.22-frame shutter test slightly softened the already
small seam, tie-rod, and airflow cues while adding render cost. The controlled camera speed
does not require blur to remain coherent.

## 10. Render time

- PNG production render: **1,860.059 seconds (31:00.059)**.
- Average: **20.667 seconds per frame**.
- Two MP4 encodes plus representative-frame copies: **12.119 seconds**.

## 11. Hardware and device

NVIDIA Quadro RTX 3000 through Cycles OptiX. CPU fallback was not used for the production
sequence.

## 12. Blender → Remotion workflow used

Blender generated only the modular 3D opening as an image sequence and silent review MP4.
No typography was baked into the render. In a future approved revision, Remotion would
ingest the rendered sequence and remain responsible for `SAME AIRFLOW`, timing, calculator
capture, brand, music, SFX, and final vertical assembly. None of that downstream work was
performed here.

## 13. George's 15-point self-critique

1. **Immediate HVAC recognition — qualified no.** Frame zero has sheet-metal joints and a
   rectangular passage, but without the exterior flange silhouette it can first read as a
   generic metal corridor.
2. **Galvanized realism survives motion — no at the required phone scale.** Full-resolution
   gradients remain, but the specific surface character collapses into smooth gray.
3. **Construction-detail parallax — partial.** The foreground joint and tie rod move
   strongly, but the rod reads as an arbitrary horizontal bar rather than useful fabrication.
4. **Cinematic forward movement — qualified yes.** Travel is controlled and continuous,
   with no wobble or roller-coaster motion, but the composition is visually restrained to
   the point of feeling procedural.
5. **Physically inside the duct — yes.** Perspective, close wall planes, and occlusion are
   coherent throughout.
6. **Clearly directional airflow — partial.** Streak displacement establishes downstream
   travel in motion, but individual short lines are ambiguous in still moments.
7. **Integrated airflow — qualified yes technically, partial visually.** It exists in 3D,
   follows perspective, and contracts with geometry; some streaks still resemble graphical
   dashes laid over the image.
8. **Perceptible reducer/narrowing — partial.** The opening grows throughout the shot, but
   reads more like a framed portal than a clearly fabricated reducer.
9. **Continuous evolution — yes.** Camera, parallax, airflow, and apparent opening size
   change across all 90 frames.
10. **Dead visual time — no.** There is motion from frame zero through frame 89.
11. **Generic CG tunnel resemblance — yes.** This is the decisive failure: broad smooth
    panels and symmetrical light preserve the clean-gray-tunnel character identified in the
    still feasibility review.
12. **Presentation resemblance — no.** There are no slides, diagrams, cards, or baked text.
13. **Phone-size performance — no.** Silhouette remains legible, but material and fabrication
    specificity do not.
14. **Render practicality — yes for selected hero shots, no for a Blender-heavy 26 seconds.**
    Three seconds cost about 31 minutes; linear projection is about 4 hours 29 minutes for
    26 seconds before iteration. The approved modular architecture remains appropriate.
15. **Would George use this as AnyHVAC's first public-video opening? — no.** It is a useful
    pipeline proof and revision reference, not yet a compelling public opening.

Silent curiosity test: **the motion creates some forward curiosity, but not enough specific
HVAC character to make “what happens next?” feel earned without text.**

## 14. Biggest remaining visual weakness

The inside-only viewpoint removes the strongest exterior HVAC silhouette while allowing
large, nearly featureless panels to dominate. At phone scale this becomes a generic gray
tunnel, and neither the tie rod nor the current reducer framing restores immediate HVAC
specificity.

## 15. Biggest technical limitation

The procedural model approximates fabrication rather than deriving from manufacturer or
SMACNA transition details. Its internal bracing and joint treatment can therefore look
plausible at full size without remaining unmistakably correct or recognizable in a compact
social-video composition.

## 16. Practicality for remaining Blender shots

Blender remains practical for a few short, pre-approved 3D hero inserts using preview
renders for iteration and final Cycles rendering only after composition lock. At the measured
rate, rendering the entire 26-second campaign in this mode would cost roughly 4 hours 29
minutes per clean pass and magnify iteration cost. Remotion and the real calculator capture
should still carry the non-3D majority. No remaining shot was started.

## 17. Files created or modified

Created for this gate:

- `growth/video/blender/duct_opening_animation.py`
- `growth/video/blender/encode_opening_sequence.py`
- `growth/video/create-opening-review.mjs`
- `growth/campaigns/003-why-duct-size-matters/blender-opening-review-v2.md`

Modified for this gate:

- `growth/campaigns/003-why-duct-size-matters/media-provenance.json`
- `growth/campaigns/003-why-duct-size-matters/daily-owner-review.md`

Previously prepared, uncommitted campaign work remains preserved.

## 18. Generated files excluded from Git

All rendered media is under the ignored path
`growth/.generated/campaigns/003-why-duct-size-matters/blender/opening/`, including 90 source
PNGs (166,131,287 bytes total), quality-test stills, the reproducible `.blend`, both MP4s,
five representative frames, and the contact sheet. None is staged or tracked.

## 19. Validation results

- Animation scene generation and `.blend` save: passed in headless Blender.
- Frame sequence: passed; exactly 90 contiguous files, `opening_0000.png` through
  `opening_0089.png`.
- Source-frame dimensions: passed at 1080 × 1920.
- Full and phone H.264 encoding: passed through Blender's bundled FFmpeg.
- Audio: intentionally absent (`audio_codec = NONE`).
- Contact-sheet generation: passed; Fontconfig emitted only non-blocking cache warnings and
  all labels rendered.
- Representative visual review at 0.0, 0.5, 1.0, 2.0, and 3.0 seconds: completed.
- `node --check growth/video/create-opening-review.mjs`: passed.
- `media-provenance.json` parse: passed.
- `npm test`: passed, 47 files and 503 tests.
- `npx tsc --noEmit`: passed.
- `npm run lint`: passed with zero errors and two pre-existing warnings in
  `reference/duct-calculator-original/script.js`.
- `npm run growth:validate`: passed; no publishing behavior.
- `npm run build`: passed under Next.js 16.3.4.
- `git diff --check`: passed with line-ending notices only.
- Git ignore verification: passed for the generated MP4 and its parent output tree.

## 20. Git status

Work remains uncommitted on `main`. This gate adds the animation, encoding, review utility,
and review record while modifying only the existing campaign owner-review and provenance
files. Previously prepared Campaign #003 changes remain present. Generated media stays
ignored. No commit, push, deployment, publication, scheduling, or upload occurred.

## Exact owner decision required

- [ ] **APPROVE OPENING SHOT**
- [ ] **REVISE OPENING SHOT**
- [ ] **REJECT OPENING SHOT**
