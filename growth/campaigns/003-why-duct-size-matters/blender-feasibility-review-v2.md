# Campaign #003 V2 — Blender hero-frame feasibility review

## Decision summary

**Blender provides a visually meaningful improvement over the Three.js hero frame with
reasonable automated effort.** The comparison more clearly reads as fabricated sheet
metal: the entrance flange is continuous, intersections are beveled, seams and joints
catch light, the reducer feels assembled rather than painted, and the metal has controlled
tonal gradients. The result is still an intentionally clean feasibility render—not a
finished public frame—but Blender passes as the preferred 3D shot-generation direction.

George recommends **APPROVE BLENDER DIRECTION**. This does not authorize animation or
full Campaign #003 production.

## 1–4. Installation and automation verification

- **Installation result:** successful using Blender's official portable Windows x64
  distribution. The official MSI first failed with Windows Installer error 1303 because
  the process lacked permission to write `C:\Program Files\Blender Foundation`; no partial
  MSI installation remained. The official portable build was the materially better
  user-local option for pinned headless automation.
- **Version:** Blender 5.2.2 LTS, build hash `d13f752e3b9c`.
- **Executable:**
  `C:\Users\cesar\AppData\Local\Programs\Blender Foundation\Blender 5.2.2 Portable\blender-5.2.2-windows-x64\blender.exe`
- **Official archive:** 404,453,484 bytes; SHA-256
  `3849d17a682cba006075aaa3f3597ecb5c9c30ec31035b2e092c53e40679b535`,
  matching Blender's published checksum.
- **Expanded size:** 943,587,053 bytes.
- **CLI verification:** passed.
- **Background mode:** passed (`bpy.app.background=True`).
- **Python:** passed with Blender Python 3.13.13.
- **Simple headless render:** passed using `growth/video/blender/verify_headless.py`.

The production result was created without opening Blender's graphical interface.

## 5. Render engine decision

**Selected: Cycles with OptiX GPU rendering.**

EEVEE is supported headlessly and passed the installation render. It remains the better
candidate for rapid scene previews or low-cost animation drafts. For this metal-lined,
partly enclosed shot, however, Cycles provides more credible indirect illumination,
environment reflection, contact shading, and bevel highlights. The available NVIDIA GPU
made its cost practical: the final 1080 × 1920 frame rendered at 96 adaptive samples with
denoising in 22.395 seconds.

Cycles is not automatically required for every future frame. A sensible future workflow
would use EEVEE for iteration and Cycles for selected final 3D shots when its reflection
and lighting improvement survives phone-size review.

## 6–9. Review assets and source

- **Blender hero frame:**
  `growth/.generated/campaigns/003-why-duct-size-matters/blender/hero-frame/duct-hero-frame-blender-1080x1920.png`
- **Blender phone-size frame:**
  `growth/.generated/campaigns/003-why-duct-size-matters/blender/review/duct-hero-frame-blender-phone-360x640.png`
- **Full-resolution comparison:**
  `growth/.generated/campaigns/003-why-duct-size-matters/blender/review/three-vs-blender-full.png`
- **Phone-size comparison:**
  `growth/.generated/campaigns/003-why-duct-size-matters/blender/review/three-vs-blender-phone.png`
- **Python scene generator:** `growth/video/blender/duct_hero_frame.py`
- **Headless verification script:** `growth/video/blender/verify_headless.py`
- **Comparison generator:** `growth/video/compare-hero-frames.mjs`

## 10. Geometry and fabrication approach

The Python script creates the complete scene from an empty factory-startup file:

- four individually modeled large-run sheet panels with visible gauge;
- four solidified trapezoidal reducer panels with an eccentric downstream centerline;
- a smaller four-panel downstream run;
- a single-piece closed entrance flange ring instead of four overlapping bars;
- separate closed transverse reinforcement/joint rings at the large run, reducer inlet,
  reducer outlet, and downstream run;
- a folded trapezoidal ceiling seam;
- restrained standing seams along the side panels;
- eight modeled and beveled hex fasteners; and
- a downstream end cap for controlled depth termination.

Solidify modifiers create sheet gauge. Restrained multi-segment bevels are applied to
manufactured edges before rendering, allowing real highlights without making the duct
look inflated. The result is assembled geometry rather than coplanar rectangles.

## 11. Material and UV implementation

The scene reuses the verified ambientCG Metal 049 A 1K maps: base color, OpenGL normal,
roughness, and metalness. The Blender material adds a weak high-frequency procedural bump
to break up perfectly smooth CG planes without introducing dirt, rust, or a pronounced
spangle pattern.

Every modeled object receives its own Smart UV projection after solidify/bevel application.
The shared mapping scale is 2.25, which keeps material density consistent across panels,
rings, seams, and reducer surfaces. No obvious stretching or repeated box-map boundary is
visible in the rendered review. This is materially better than the Three.js primitive UV
treatment, though it is not a production-grade manually packed UV layout.

## 12. Lighting

- Poly Haven Studio Small 08 1K HDR supplies CC0 environmental reflection and ambient
  response.
- A camera-ray world shader keeps the visible background near black while allowing the
  HDRI to illuminate and reflect in the metal.
- A large soft key reveals the entrance flange and ceiling construction.
- A cool edge light separates the right wall and reducer planes.
- A restrained interior fill preserves the downstream opening without flattening corners.
- AgX medium-high contrast and `-0.35` exposure retain highlight detail.

The existing CC0 provenance records remain in `media-provenance.json`; no new external
asset was introduced.

## 13. Camera

- Perspective camera, 43 mm lens on a 36 mm sensor.
- Position: `[4.5, 23.5, -1.4]` in Blender's X/Y/Z coordinates.
- Target: `[0.15, -5.0, 0.35]`.
- Clip range: `0.1–120`.
- Output: 1080 × 1920 vertical.

The three-quarter entrance composition remains comparable to the Three.js frame. It does
not rely on a radically different concept to make Blender look better.

## 14–16. Performance, hardware, and reproducibility

- Final render: **22.395 seconds** after the scripted scene was saved.
- Engine: Cycles, 96 samples, adaptive sampling, denoising, six maximum bounces.
- Render device: **NVIDIA Quadro RTX 3000 through OptiX**.
- Available CPU fallback: Intel Core i7-9750H; deliberately disabled for the final render.
- Headless reproducibility: **passed**.

Conceptual one-command workflow:

```text
Blender --background --factory-startup --python-exit-code 1
  --python growth/video/blender/duct_hero_frame.py
  -- --assets <verified-assets> --output <generated-png> --blend <generated-blend>
```

The script clears the scene, builds geometry, unwraps UVs, constructs materials and the
world shader, adds lights and camera, selects the engine/device, saves the `.blend`, and
renders the PNG. Cesar does not need to model in Blender's UI.

## 17. Three.js vs. Blender

| Criterion | Three.js | Blender |
| --- | --- | --- |
| HVAC recognition | Recognizable rectangular duct | Immediately recognizable duct assembly |
| Galvanized realism | Flat gray metal | Better tonal/reflection variation; still somewhat smooth |
| Fabrication character | Primitive panels and bars | Solidified panels, closed flange rings, folded seam, bevels |
| Joints/flanges | Intersecting box-like construction | Continuous joint geometry with coherent highlights |
| Seams/reinforcement | Present but schematic | Better integrated and more visible without dominating |
| Fasteners | Read as simple dark cylinders | Restrained beveled hex hardware |
| Edge treatment | Mostly infinitely sharp | Controlled manufactured bevels |
| Wall thickness | Visible | Visible and better integrated with flange construction |
| Reducer | Spatially readable but abstract | Stronger panel transitions and assembled construction |
| UV/material behavior | Primitive box UV treatment | Per-object unwrapping; no obvious stretching at review size |
| Lighting/depth | Broad planes remain flat | Ray-traced gradients, edge highlights, and stronger depth |
| Phone-size result | Duct survives; detail collapses | Flange, reducer, seams, and metal response remain clearer |
| Product-commercial credibility | Below threshold | Credible feasibility direction; not yet a final public shot |

The Blender improvement is obvious in the phone comparison, not merely technical.

## 18–21. Honest quality assessment

1. HVAC recognition — pass.
2. Galvanized realism — qualified pass; clean metal is credible, but surface character is
   still smoother and more uniform than ideal galvanized sheet.
3. Sheet-metal fabrication character — pass.
4. Joints/flanges — pass for feasibility.
5. Seams — pass, though sparse.
6. Reinforcement — pass for the shot scale.
7. Fasteners — pass and restrained.
8. Edge treatment — clear pass over Three.js.
9. Wall thickness — pass.
10. Reducer construction — pass.
11. UV/material behavior — pass at full and phone review sizes.
12. Lighting — pass; it reveals the assembly without sci-fi darkness.
13. Depth — pass.
14. Phone-size readability — pass.
15. Overall product-commercial credibility — direction passes; the frame itself still
    requires art-direction refinement before becoming AnyHVAC's first public shot.

**Meaningful enough improvement:** yes. Blender clears the feasibility gate.

**Biggest remaining visual weakness:** the pristine, broad panels still preserve some
“clean gray tunnel” character. A production pass would benefit from subtler panel cross-break
deformation, more specifically galvanized surface variation, and a less abrupt downstream
termination—but those should be tested without adding grime or excessive micro-detail.

**Biggest technical limitation:** the procedural model approximates HVAC fabrication logic;
it is not generated from manufacturer or SMACNA dimensional profiles. Smart UV projection
is robust enough for this test but is less controllable than purpose-built per-panel UVs.

## 22. Installed software and dependencies

- Blender 5.2.2 LTS official Windows x64 portable distribution.
- No Blender plugins, extensions, asset packs, cloud renderer, AI service, or paid software.
- Existing CC0 Metal 049 A and Studio Small 08 assets only.
- Existing transitive `sharp` package used by the local comparison script; no new npm
  dependency was installed for comparison generation.

## 23. Files created or modified in this experiment

- Created: `growth/video/blender/verify_headless.py`
- Created: `growth/video/blender/duct_hero_frame.py`
- Created: `growth/video/compare-hero-frames.mjs`
- Created: `growth/campaigns/003-why-duct-size-matters/blender-feasibility-review-v2.md`
- Modified: `growth/campaigns/003-why-duct-size-matters/media-provenance.json`
- Modified: `growth/campaigns/003-why-duct-size-matters/daily-owner-review.md`

The Three.js composition and dependencies were preserved.

## 24. Generated files excluded from Git

- `growth/.generated/campaigns/003-why-duct-size-matters/blender/verification/`
- `growth/.generated/campaigns/003-why-duct-size-matters/blender/preview/`
- `growth/.generated/campaigns/003-why-duct-size-matters/blender/hero-frame/`
- `growth/.generated/campaigns/003-why-duct-size-matters/blender/review/`

This includes the PNGs, reproducible `.blend` file, previews, and comparisons. The already
verified source textures/HDRI remain under the ignored Remotion public-assets directory.

## 25. Validation results

- Official Blender portable ZIP SHA-256: matched the published checksum.
- Blender version/CLI/background/Python verification: passed.
- 64 × 64 EEVEE headless installation render: passed.
- Cycles/OptiX device detection: passed; Quadro RTX 3000 selected.
- Python scene generation, `.blend` save, and final render: passed.
- Final hero metadata: 1080 × 1920 PNG, 1,724,565 bytes, SHA-256
  `633a35c06be31ed73cee7c2982ef0158ece95813d027dbcf514b9c706866c0e2`.
- Phone frame metadata: 360 × 640 PNG, 171,370 bytes.
- Full comparison metadata: 2256 × 2040 PNG, 1,947,952 bytes.
- Phone comparison metadata: 780 × 718 PNG, 275,923 bytes.
- Comparison generator: passed. Fontconfig emitted non-blocking cache-directory warnings;
  the SVG labels rendered correctly.
- `npm test`: passed, 47 files and 503 tests.
- `npx tsc --noEmit`: passed.
- `npm run lint`: passed after removing the experiment's unused import; two pre-existing
  warnings remain in `reference/duct-calculator-original/script.js`.
- `npm run growth:validate`: passed; no publishing behavior.
- `npm run build`: passed under Next.js 16.3.4.
- `git diff --check`: passed with line-ending notices only.

Blender emitted forward-looking `use_nodes` deprecation warnings for Blender 6.0. The
calls are valid in the installed 5.2.2 LTS API and did not affect scene generation or
rendering; a future Blender-major-version upgrade would require API retesting.

## 26. Git status

All work remains uncommitted on `main`. This experiment adds the two Blender Python
scripts, the comparison utility, and this review; it modifies the Campaign #003 owner
review and provenance record. Previously prepared uncommitted Campaign #003 storyboard,
production-method, Three.js hero, and opening-previsualization files remain preserved.
Generated Blender media is ignored by Git.

## Boundary honored

No animation, airflow, text, logo, audio, calculator transition, seconds 0–26, publication,
schedule, upload, deployment, commit, push, or other campaign work was performed.

## Exact owner decision required

- [ ] **APPROVE BLENDER DIRECTION**
- [ ] **REVISE BLENDER DIRECTION**
- [ ] **REJECT BLENDER DIRECTION**
