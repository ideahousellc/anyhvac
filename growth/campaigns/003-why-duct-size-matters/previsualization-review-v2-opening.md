# Campaign #003 V2 — 0–3 second visual previsualization review

**Gate:** FIRST THREE SECONDS ONLY  
**Campaign status:** NOT APPROVED FOR PRODUCTION OR PUBLICATION  
**George's recommendation:** **REVISE VISUAL DIRECTION**

## Review outputs

- Silent vertical MP4:
  `growth/.generated/campaigns/003-why-duct-size-matters/previsualization/v2-opening-0-3s.mp4`
- Representative frames:
  - `growth/.generated/campaigns/003-why-duct-size-matters/previsualization/frames/frame-0.0s.png`
  - `growth/.generated/campaigns/003-why-duct-size-matters/previsualization/frames/frame-0.5s.png`
  - `growth/.generated/campaigns/003-why-duct-size-matters/previsualization/frames/frame-1.0s.png`
  - `growth/.generated/campaigns/003-why-duct-size-matters/previsualization/frames/frame-2.0s.png`
  - `growth/.generated/campaigns/003-why-duct-size-matters/previsualization/frames/frame-3.0s.png`
- Phone-size contact sheet:
  `growth/.generated/campaigns/003-why-duct-size-matters/previsualization/phone-size-contact-sheet.png`

All generated outputs are disposable and excluded from Git by `growth/.generated/`.

## Implementation method

A separate 90-frame, 1080 × 1920, 30 fps Remotion composition was created so the
approved test cannot accidentally continue into the unapproved campaign. It is silent
and has no calculator, CTA, brand ending, final music, or final SFX.

The scene uses only local SVG/CSS rendering:

- four perspective wall planes around an off-axis vanishing point;
- procedural low-contrast galvanized variation and moving specular light;
- transverse sheet-metal joint frames, corner seams, fasteners, and panel divisions;
- a second downstream duct section for continuous depth;
- long dashed perspective paths for conceptual directional airflow;
- controlled forward travel through depth-cycled joints with minimal camera drift;
- a fabricated four-plane narrowing transition beginning during the last second; and
- small integrated `SAME AIRFLOW` and `CONCEPTUAL` labels.

No dependency, external service, generated external media, purchased asset, final
audio, or existing calculator/campaign implementation was added or changed.

## George's self-critique

1. **Does this immediately look like HVAC ductwork? — PARTIAL.** The rectangular
   sheet-metal proportions, transverse joints, corner seams, fasteners, and transition
   make HVAC ductwork a reasonable reading. The procedural material is not sufficiently
   photographic, so a viewer could still read it as a generic metal tunnel.
2. **Does it have convincing depth? — YES.** Asymmetric converging walls, the
   downstream section, moving joints, near/far scale changes, and the final transition
   create clear depth in motion and in representative frames.
3. **Does the camera actually feel inside the duct? — MOSTLY.** The frame is enclosed by
   ceiling, floor, and side walls and the camera passes structural joints. The highly
   clean vector edges reduce physical presence.
4. **Does the airflow move directionally? — YES IN MOTION, PARTIAL IN STILLS.** Long
   perspective-aligned dash paths travel toward the vanishing point. At phone size they
   remain subtle, and isolated segments can still read as light streaks rather than air.
5. **Does the environment evolve during the three seconds? — YES.** Joints pass the
   camera, the light changes, airflow advances, the distant run approaches, and the
   transition begins.
6. **Does the narrowing feel spatial? — YES.** Four separately shaded transition planes
   connect the current duct section to a visibly smaller downstream opening.
7. **Does anything resemble an abstract rectangle? — YES.** The central sheet-metal
   joints and far openings remain visually rectangular enough that the scene does not
   fully escape the exact V1 failure mode.
8. **Does anything resemble a presentation? — NO.** There are no cards, panels, title
   screens, diagrams, or oversized copy; the small text is subordinate to the scene.
9. **Does it remain readable at phone size? — PARTIAL.** Depth, enclosure, and narrowing
   survive the contact-sheet test. Fine fasteners, metal variation, airflow, and the
   conceptual label become weak.
10. **Would George personally continue production using this visual quality? — NO.**
    The motion system is reusable, but the opening is not yet cinematic or materially
    convincing enough to justify building seconds 4–26.

## Technical limitations

- SVG perspective planes simulate rather than model a true 3D volume; joint occlusion
  and reflection behavior remain simplified.
- The procedural galvanized material lacks real roughness, normal detail, and
  environment-driven reflection, which makes close surfaces feel illustrated.
- Air paths communicate direction but are not volumetric and are intentionally not CFD.
- The final representative image is frame 89 (2.967 seconds), labeled `3.0 s` for the
  requested review interval because a 90-frame/30 fps video ends immediately after it.
- The previsualization was judged from rendered frames and the MP4; it has no audio by
  design.

## Creative limitations

The revision removes V1's panels and oversized copy, but its repeated rectangular
construction still carries a graphic quality. At phone size, the image is controlled
and legible but not sufficiently tactile or surprising to meet the approved phrase
“cinematic, recognizable, convincing.” Further polishing this exact procedural
material risks spending more time on a technique whose ceiling is now visible.

## Recommended revision path

Keep the proven camera timing, joint parallax, airflow timing, and spatial narrowing,
but replace the wall treatment with one of these owner-approved inputs before another
three-second test:

1. **Preferred:** a small true-3D duct model with physically based galvanized material
   and controlled lighting, rendered locally and composited in Remotion. This requires
   choosing a local modeling/render route; Three.js is not currently a direct project
   dependency.
2. **Lower-complexity fallback:** a rights-cleared seamless galvanized PBR texture set
   (base color plus roughness/normal if supported) applied to the existing geometry.
   Commercial-use rights and provenance must be recorded before use.
3. **Footage fallback:** a rights-cleared real or high-quality rendered interior duct
   plate matching the storyboard's forward move and constriction. No search, download,
   purchase, account, or provider connection has been performed.

Do not produce the rest of Campaign #003 until a revised 0–3 second test clears the
visual-direction gate.

## Dependencies added

None.

## Source files created or modified

- Created: `growth/video/compositions/DuctOpeningPrevisualization.tsx`
- Modified: `growth/video/Root.tsx`
- Modified: `package.json`
- Created: `growth/campaigns/003-why-duct-size-matters/previsualization-review-v2-opening.md`

## Generated files excluded from Git

- `growth/.generated/campaigns/003-why-duct-size-matters/previsualization/v2-opening-0-3s.mp4`
- five representative PNG frames under the previsualization `frames/` directory
- `growth/.generated/campaigns/003-why-duct-size-matters/previsualization/phone-size-contact-sheet.png`

## Validation results

- Remotion render: PASS — exactly 3.00 seconds, 1080 × 1920, 30 fps, H.264,
  video-only/silent.
- Representative still render: PASS — frames 0, 15, 30, 60, and 89 produced.
- Phone-size contact sheet: PASS — all five review frames inspected at 270 × 480 each.
- Full Vitest suite: PASS — 47 files, 503 tests.
- TypeScript (`npx tsc --noEmit`): PASS.
- ESLint: PASS with no errors; unrelated warnings in the ignored/reference original are
  reported separately in the command output.
- Content Factory validation: PASS; Campaign #003 remains the existing 28-second draft
  in campaign metadata and has not been advanced.
- Next.js production build: PASS.
- `git diff --check`: PASS; line-ending notices are informational.
- Git ignore check: PASS — `growth/.generated/` is reported as ignored.

## Owner decision required

Choose exactly one:

- **APPROVE VISUAL DIRECTION**
- **REVISE VISUAL DIRECTION**
- **REJECT VISUAL DIRECTION**

George recommends **REVISE VISUAL DIRECTION** before any further campaign production.
