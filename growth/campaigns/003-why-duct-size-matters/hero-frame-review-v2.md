# Campaign #003 V2 — hero-frame experiment review

## Decision summary

**STOP. The frame does not yet meet believable product-visualization quality.** The
approved Three.js stack successfully produced real geometry, PBR material response,
environment reflections, and a deterministic Remotion still. The resulting image is
recognizable as a rectangular duct assembly, but the wall construction, edge treatment,
lighting, and material response still read as a clean CG tunnel rather than a convincing
manufactured HVAC environment. No animation work is authorized or justified from this
result.

George recommends **REVISE HERO FRAME**.

## Review images

- Full resolution: `growth/.generated/campaigns/003-why-duct-size-matters/hero-frame/duct-hero-frame-1080x1920.png`
- Phone-size review: `growth/.generated/campaigns/003-why-duct-size-matters/hero-frame/duct-hero-frame-phone-360x640.png`

Both images are generated review artifacts under the repository's ignored
`growth/.generated/` boundary.

## Rendering method

- Remotion 4.0.530 still composition rendered through `@remotion/three` and React Three
  Fiber.
- Three.js WebGL renderer using Chromium ANGLE (`--gl=angle`).
- One-frame, deterministic 1080 × 1920 composition; no animation, text, audio, motion
  blur, airflow, logo, calculator, or CTA.
- The phone representation is the same composition rendered at one-third scale to
  360 × 640, not a separately art-directed crop.

## Geometry

The scene is authored from actual 3D geometry rather than a painted rectangle:

- four sheet-metal wall panels with physical thickness;
- an open rectangular mouth with a transverse flange;
- twelve restrained modeled fasteners;
- longitudinal seam/reinforcement strips;
- intermediate transverse reinforcement frames;
- a four-panel eccentric rectangular reducer;
- a smaller downstream rectangular run; and
- a terminating rear panel.

The geometry establishes foreground flange/hardware, a full-size midground run and
reinforcement, and a reduced background run. It is enough to communicate the intended
construction, but sharp primitive edges and simplified joint profiles remain visibly CG.

## Material implementation

ambientCG **Metal 049 A, 1K JPG** supplies base color, OpenGL normal, roughness, and
metalness maps. Maps use repeated UVs; the normal response is deliberately weak, with
high metalness, medium roughness, and environment-driven reflections. A darker variation
separates deeper reinforcement and the downstream run.

The material avoids rust, grime, chrome, and brushed-stainless styling. However, this
specific smooth-metal set does not provide a persuasive galvanized zinc-spangle response,
and the simple box UVs create inconsistent scale/orientation across differently shaped
panels.

## Lighting

Poly Haven **Studio Small 08, 1K HDR** is hidden from the camera and used only for
environment reflections. Two low-intensity cool directional lights and a very weak ambient
light provide plane separation. The visible background is an authored dark blue-gray,
not the HDRI.

The environment creates restrained edge highlights, but it does not generate enough
tonal variation across the broad interior planes. Those surfaces remain comparatively
flat and gray. This is the clearest lighting/material failure in the final frame.

## Camera

- Perspective camera, 40° field of view.
- Position: `[5.4, -1.9, 26]`.
- Look target: `[0.1, 0.3, -5.4]`.
- Near/far: `0.1 / 100`.
- Tone-mapping exposure: `0.76`.

The three-quarter position keeps the complete flange silhouette visible, exposes sheet
thickness on the right edge, and lets the eccentric reducer read without confusing the
duct path.

## CC0 asset provenance

### ambientCG Metal 049 A

- Source: https://ambientcg.com/view?id=Metal049A
- Download: 1K JPG PBR archive
- License: Creative Commons CC0 1.0 Universal
- Commercial use: permitted
- Attribution: not required; appreciated
- Access/download date: 2026-10-01
- License verification: https://docs.ambientcg.com/license/
- Local generated-media source: `growth/.generated/remotion-public/campaign-003/hero-frame/assets/`

### Poly Haven Studio Small 08

- Source: https://polyhaven.com/a/studio_small_08
- Download: 1K HDR
- License: Creative Commons CC0 1.0 Universal
- Commercial use: permitted
- Attribution: not required; appreciated
- Author listed by provider: Sergej Majboroda
- Access/download date: 2026-10-01
- License verification: https://polyhaven.com/license
- Local generated-media source: `growth/.generated/remotion-public/campaign-003/hero-frame/assets/`

Both records are also preserved in `media-provenance.json`. They remain
`publication_approved: false` while the hero frame is under owner review.

## Dependencies added

- `@remotion/three@4.0.530`: official Remotion/React Three Fiber bridge; pinned to the
  existing Remotion version.
- `@react-three/fiber@9.8.1`: declarative Three.js scene integration compatible with the
  repository's React 19 runtime.
- `three@0.186.1`: geometry, PBR materials, lights, cameras, and WebGL rendering.
- `@types/three@0.186.0`: TypeScript definitions for Three.js and its RGBE loader.

No Blender, Drei, CSG, physics, motion-blur, or alternate renderer was added. `npm install`
reported two audit findings (one high and one critical); no automatic audit fix was run
because that would be unrelated dependency mutation.

## George's 12-point self-critique

1. **Does it immediately read as HVAC ductwork? — Qualified yes.** The rectangular opening,
   flange, fasteners, seams, and reducer communicate ductwork, but the empty studio context
   makes it less immediate than a real installed assembly.
2. **Does the galvanized material look believable? — No.** It reads as clean gray metal,
   not convincingly as galvanized HVAC sheet.
3. **Does the geometry look manufactured rather than abstract? — Partly.** Flange and seams
   help, but simplified profiles and perfectly planar surfaces remain abstract/CAD-like.
4. **Are the seams/joints/reinforcement convincing? — Partly.** They survive visually but
   lack folded profiles, clips, corner hardware, sealant, and believable edge radii.
5. **Is wall thickness perceptible where appropriate? — Yes.** The open mouth and right
   exterior edge expose thickness clearly.
6. **Does the reducer read spatially? — Yes at full size; weaker on a phone.** The eccentric
   offset helps, though the low-contrast rear run weakens its outline.
7. **Does the lighting reveal the metal rather than flatten it? — Partly.** Edge highlights
   are present, but broad planes remain flat and lack controlled highlight gradients.
8. **Does the environment have convincing depth? — Qualified yes.** Foreground, midground,
   and background are distinct, but the dark interior void and simplified surfaces reduce
   realism.
9. **Does anything still resemble a generic rectangular tunnel? — Yes.** This remains the
   dominant weakness.
10. **Does it survive phone-size viewing? — Partly.** The duct mouth and depth survive;
    fasteners, subtle seams, sheet thickness, and material variation mostly do not.
11. **Is the visual quality high enough to justify animation? — No.** Motion would amplify,
    not solve, the simplified construction and material-lighting limitations.
12. **Would George use this as the visual foundation for AnyHVAC's first public video? — No.**
    The stack remains viable, but this scene is not publication quality.

## Biggest remaining visual weakness

The assembly still reads as a generic rectangular CG tunnel. The smooth gray material,
large planar surfaces, razor-sharp panel intersections, simplified flange profiles, and
weak surface variation do not create the irregular but clean manufactured character of
real galvanized ductwork.

## Biggest technical limitation

The scene uses hand-authored primitive and quad geometry with box-style UVs. Three.js can
render a stronger result, but the next attempt would need more authentic folded joint
profiles, controlled bevels/weighted normals, panel-specific UV orientation, and more
deliberate reflection cards or environment rotation. Those changes are materially deeper
than animation polish.

## Render performance

- Full-resolution render: approximately 8 seconds after bundling on the local machine.
- Phone-size render: approximately 7 seconds after bundling.
- Public directory copied by Remotion: approximately 21.4 MB, including the approved
  source assets and extracted archive contents.

## Files created or modified for this experiment

- Created: `growth/video/compositions/DuctHeroFrame.tsx`
- Created: `growth/campaigns/003-why-duct-size-matters/hero-frame-review-v2.md`
- Modified: `growth/video/Root.tsx`
- Modified: `growth/campaigns/003-why-duct-size-matters/media-provenance.json`
- Modified: `growth/campaigns/003-why-duct-size-matters/daily-owner-review.md`
- Modified: `package.json`
- Modified: `package-lock.json`

## Generated files excluded from Git

- `growth/.generated/remotion-public/campaign-003/hero-frame/assets/`
- `growth/.generated/campaigns/003-why-duct-size-matters/hero-frame/duct-hero-frame-1080x1920.png`
- `growth/.generated/campaigns/003-why-duct-size-matters/hero-frame/duct-hero-frame-phone-360x640.png`

## Validation results

- Full-resolution Remotion still: passed; 1080 × 1920 PNG, 376,645 bytes.
- Phone-size Remotion still: passed; 360 × 640 PNG, 78,470 bytes.
- `npm test`: passed, 47 files and 503 tests.
- `npx tsc --noEmit`: passed.
- `npm run lint`: passed with two pre-existing warnings in
  `reference/duct-calculator-original/script.js`; no lint errors.
- `npm run growth:validate`: passed; Campaign #003 remains a 28-second flagship
  revision draft with no publishing behavior.
- `npm run build`: passed under Next.js 16.3.4.
- `git diff --check`: passed; Git emitted line-ending conversion notices only.

## Git status

The experiment is uncommitted. Its tracked changes are `daily-owner-review.md`,
`media-provenance.json`, `growth/video/Root.tsx`, `package.json`, and
`package-lock.json`; its new files are this review and
`growth/video/compositions/DuctHeroFrame.tsx`. The worktree also retains the previously
prepared, uncommitted storyboard, production-method, opening-previsualization review, and
opening-previsualization composition. Generated assets and review PNGs are ignored.

## Boundary honored

Work stopped after the still-frame experiment. No duct animation, opening recreation,
seconds 3–26, airflow, text, logo, music, SFX, calculator transition, upload, schedule,
publication, deployment, commit, push, or Campaign #004 work was performed.

## Exact owner decision required

- [ ] **APPROVE HERO FRAME**
- [ ] **REVISE HERO FRAME**
- [ ] **REJECT HERO FRAME**
