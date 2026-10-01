# Campaign #003 V2 — visual production-method investigation

**Phase:** RESEARCH ONLY — NO INSTALL, DOWNLOAD, BUILD, OR RENDER  
**Campaign status:** NOT APPROVED FOR FULL PRODUCTION OR PUBLICATION  
**George's recommendation:** **APPROVE PRODUCTION METHOD**

## Executive recommendation

Use **Remotion + `@remotion/three` + React Three Fiber + Three.js**, rendering a
small true-3D parametric duct scene with a **verified CC0 PBR metal material** and a
**verified CC0 studio HDRI**. Keep geometry and camera motion in TypeScript so the
environment remains deterministic, reusable, and directly compositable with the
existing calculator capture and Remotion pipeline.

Do not adopt Blender yet. Do not continue polishing the SVG duct. Prove the proposed
stack with **one 1080 × 1920 hero still** before any further animation.

## 1. Why the first previsualization failed visually

The first test simulated depth with nested SVG rectangles, gradients, noise, and line
work. It proved camera timing, parallax, airflow direction, and a spatial reducer, but
its surfaces did not react to light as metal. The joints were drawn outlines rather
than solid construction; reflections were painted rather than environment-dependent;
wall thickness and occlusion were simplified; and the repeated rectangles remained
the dominant visual vocabulary. More SVG detail would add illustration, not physical
presence.

The failure was therefore not mainly “insufficient texture.” It was the combination of
flat geometry, flat lighting, and flat construction details.

## 2–4. The three paths

| Path | Proposed implementation | Expected visual quality | Complexity | Render performance | Automation and reuse | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| **A — true local 3D** | Parametric rectangular duct meshes, reducer panels, wall thickness, flange/joint pieces, seam strips, fasteners, real perspective camera, physically based material, direct/area lights, tone mapping, and optional environment lighting in Three.js through React Three Fiber and `@remotion/three`. Material maps could initially be generated locally. | **Medium-high** if geometry and lighting are disciplined. Real occlusion, specular movement, perspective, and thickness remove the “animated rectangle” problem. A purely synthetic metal shader may still miss galvanized character. | **Medium.** One small scene system, no modeling application, no physics, no CSG requirement, and no general-purpose engine. | Slower than SVG because every frame shades 3D meshes. Still appropriate for one hero frame and a short 90-frame test. Full-video cost must be benchmarked before approval. Remotion exposes Chromium `--gl` backends if the default renderer needs tuning. | **High.** Dimensions, flange spacing, reducer length, camera path, lights, and material values can be props. The same primitives can later support ducts, VAV boxes, dampers, diffusers, filters, coils, and simplified equipment cutaways. | Viable foundation, but stronger when paired with Path B. |
| **B — true 3D + free PBR** | Path A plus a CC0 base-color, normal, roughness, and metalness set; optional height/AO; plus a CC0 studio HDRI for believable metal reflections. Use modest 1K/2K maps for the first test. | **High for the stated product-visualization target.** PBR maps add micro-normal and roughness variation while the HDRI gives metal something coherent to reflect. Construction geometry and lighting still matter more than the texture alone. | **Medium.** Texture loading, UV scale, color-space configuration, environment-map preprocessing, and provenance are added, but no new authoring application is introduced. | Moderately slower and more memory-intensive than Path A. At this scale, one material set and a 1K HDRI are a controlled cost. Avoid 4K/8K assets until phone-size QA proves a need. | **High.** A curated internal CC0 material/HDRI library can serve many future mechanical scenes. The scene remains TypeScript-driven and reproducible. | **Recommended.** Best quality-to-complexity ratio. |
| **C — improved SVG/CSS procedural** | Continue the current perspective planes; refine noise, highlights, seams, masks, air paths, and perhaps use a flat photographic texture. | **Medium-low.** It can become a polished technical illustration, but the ceiling remains “nice animated rectangle.” A texture cannot create real thickness, light transport, parallax, or occlusion. | **Medium and rising.** Each realism improvement requires custom projection and masking, with diminishing returns. | **Fastest.** Existing Remotion rendering is proven and inexpensive. | **Medium for diagrammatic explainers; low for reusable cinematic HVAC environments.** Each new object needs another 2.5D illusion. | Reject for the hero environment; retain only for overlays, labels, airflow accents, and UI transitions. |

## 5. Visual-quality implications

True 3D changes the visual problem from “draw the impression of a tunnel” to “light a
small physical set.” It provides the cues missing from V1 and the first V2 test:

- wall thickness at the duct opening and reducer;
- real folded corner and seam geometry;
- transverse joint/flange pieces that catch and block light;
- small fasteners with highlight and shadow;
- realistic rectangular proportions and a fabricated transition;
- darker corners from geometry and controlled fill;
- specular highlights that move because the camera/light relationship changes; and
- coherent reflections across metal surfaces.

The target does not require photoreal path tracing. A small mesh count, deliberate
bevels, PBR shading, an environment map, two controlled lights, and correct color
management should reach believable engineering/product-visualization quality.

## 6. Implementation complexity

The minimum Three.js scene is intentionally narrow:

1. Four wall meshes for each straight duct module, leaving the inside visible.
2. Four trapezoidal reducer panels built as custom buffer geometry.
3. Thin box meshes for TDC/TDF-style flange cues or transverse connectors.
4. Narrow extrusions/strips for corner and longitudinal seam character.
5. Instanced fastener heads where visible; no high-poly screws.
6. Small bevels on silhouette-catching edges.
7. One perspective camera controlled from Remotion's current frame.
8. One PBR material family with controlled UV scale.
9. One hidden environment map plus key/rim lights.
10. Later, instanced line/mesh airflow accents composited conservatively.

No CAD kernel, physics engine, procedural-node editor, CSG library, model importer, or
general equipment system is needed for the hero-frame experiment.

## 7. Render-performance implications

- **Path C** remains fastest because it is ordinary SVG/CSS.
- **Path A** introduces WebGL mesh rendering but uses few static meshes and one camera;
  it should be practical for stills and short sequences on the existing local Remotion
  renderer. Performance must be measured, not assumed.
- **Path B** adds texture sampling and environment lighting. Restrict the experiment to
  1K/2K maps and a 1K HDRI; higher resolutions are wasteful before phone-size review.
- **Blender EEVEE** could render quickly after scene setup, while Cycles would be slower
  but more physically accurate. Either adds a second rendering stage and intermediate
  image/video files.
- Remotion supports choosing Chromium OpenGL backends using `--gl`; this gives a local
  diagnostic path if headless WebGL differs from Studio preview. See the official
  [Remotion render CLI documentation](https://www.remotion.dev/docs/cli/render).
- Motion blur is not required for the still test. If later needed, Remotion supports
  sample-based camera motion blur, but every sample increases render work. See
  [Remotion motion blur](https://www.remotion.dev/docs/motion-blur).

No render-time claim is made until the hero-frame experiment measures this machine.

## 8. Automation and reusability

React Three Fiber exposes Three.js as reusable React components, while Remotion already
owns the frame clock, dimensions, output, and composition. The official Remotion catalog
provides a React Three Fiber template and `@remotion/three` integration, so this is a
supported direction rather than a custom canvas capture workaround. See the
[official Remotion Three template](https://www.remotion.dev/templates/three).

Recommended reusable primitives after the experiment succeeds:

- `RectangularDuctSection(width, height, length, jointSpacing)`;
- `RectangularReducer(fromWidth, fromHeight, toWidth, toHeight, length)`;
- `DuctJoint(type, dimensions)`;
- `MetalMaterialPreset(assetId, uvScale, roughnessBias)`;
- `MechanicalLightRig(environment, key, rim, exposure)`; and
- `DuctCameraPath(start, end, target, lens)`.

Those primitives can be composed into later ducts, VAV connections, plenums, dampers,
filters, diffusers, simplified AHU interiors, and cause/effect visualizations. They do
not attempt to become a general CAD or BIM system.

## 9. Licensing implications

### Code

- **Three.js:** MIT license; commercial use is allowed subject to preserving the license
  notice in copies/substantial portions. Source:
  [official Three.js license](https://github.com/mrdoob/three.js/blob/dev/LICENSE).
- **React Three Fiber:** MIT license and React 19-compatible v9 line. Source:
  [official package manifest](https://github.com/pmndrs/react-three-fiber/blob/master/packages/fiber/package.json).
- **Remotion / `@remotion/three`:** governed by Remotion's licensing. The current
  published terms list a free license for individuals and organizations of up to three
  people, with company licensing beyond that threshold. AnyHVAC must recheck eligibility
  if team size or use changes. Source:
  [Remotion license and pricing](https://www.remotion.dev/docs/license/pricing).
- **Blender:** GPL software, free for commercial use; Blender states that rendered
  artwork belongs to its creator. A distributed Blender Python add-on/script may carry
  GPL implications, another reason not to introduce that pipeline casually. Source:
  [Blender license](https://www.blender.org/about/license/).

### Candidate PBR material

Preferred first candidate: **ambientCG Metal 049 A**, described by its official page as
a clean, silver, smooth PBR metal and offered in 1K–8K sets. It is not a perfect
galvanized scan, so the test should add only subtle low-frequency zinc variation through
the material—not painted grime. Source:
[ambientCG Metal 049 A](https://ambientcg.com/view?id=Metal049A).

Alternate only if the clean material is too featureless: **ambientCG Metal 038**, a
scratched-steel PBR set. It risks looking worn and conflicts with the clean/professional
brief, so it is not the first choice. Source:
[ambientCG Metal 038](https://ambientcg.com/view?id=Metal038).

ambientCG states that all downloadable assets and preview renders are CC0 1.0: copying,
modifying, distributing, and commercial use are allowed without required attribution.
Source: [ambientCG license](https://docs.ambientcg.com/license/). Any selected download
must still receive a local provenance record with asset ID, source URL, license,
acquisition date, resolution, and maps used.

### Candidate lighting environment

Preferred first candidate: **Poly Haven Studio Small 08**, a neutral, low-contrast
indoor studio HDRI with large softbox highlights. Those rectangular highlights suit
galvanized sheet metal better than a dramatic colored environment. Source:
[Studio Small 08](https://polyhaven.com/a/studio_small_08).

Poly Haven licenses its HDRIs, textures, and models under CC0 and permits commercial use
without required attribution. Source: [Poly Haven asset license](https://polyhaven.com/license).
The website/API terms are separate from the asset license; the experiment should use a
manual one-off asset download after approval, not build a live service dependency.

No asset was downloaded or incorporated during this investigation.

## 10. Dependencies required

Only after owner approval:

- `@remotion/three@4.0.530` — match every installed Remotion package exactly;
- `@react-three/fiber@9.x` — React 19-compatible renderer;
- `three` — core 3D/PBR/WebGL library;
- `@types/three` — TypeScript declarations if not bundled by the selected Three version.

Not required for the hero frame:

- `@react-three/drei`;
- a CSG/physics/post-processing package;
- `@remotion/motion-blur`;
- Blender;
- a model marketplace; or
- an external rendering service.

Use Three.js's included loaders/utilities for the HDR environment rather than adding a
helper library solely for one file.

## 11. Is Blender necessary?

**No.** Blender is not installed locally, and installing it would introduce a large
application, Python/`.blend` source files, separate renderer settings, a second render
stage, and more operational maintenance. Its command line can render headlessly and is
automatable, and Blender confirms commercial use/output ownership, so it remains a
credible fallback. See Blender's
[background command-line rendering documentation](https://docs.blender.org/manual/en/4.0/advanced/command_line/arguments.html).

Escalate to Blender only if the approved Three.js hero-frame experiment fails because
of lighting/material limits rather than art direction. Blender would become more
compelling for complex curved equipment, detailed cutaways, or offline path-traced
hero imagery—not for this first rectangular duct set.

## 12. Is Three.js/WebGL sufficient?

**Yes for the current target.** Three.js `MeshStandardMaterial` implements a
metallic/roughness PBR workflow and explicitly benefits from an environment map. Source:
[Three.js MeshStandardMaterial](https://threejs.org/docs/pages/MeshStandardMaterial.html).
Three.js provides real perspective, depth testing, shadowing, texture maps, instancing,
tone mapping, and post-processing. Remotion provides the supported React Three Fiber
integration and deterministic frame control.

The target is believable product visualization, not an offline photoreal feature-film
shot. The duct geometry is simple enough that shader, lighting, bevel, and construction
quality—not engine capability—will determine success.

## 13. Is a PBR galvanized material worth using?

**Yes.** It is the highest-leverage addition after real geometry. Base color alone will
still look painted; normal and roughness variation make softbox reflections break across
the sheet in a physically plausible way, while metalness keeps the surface response
coherent. Height/displacement is optional and should be avoided in the first test unless
the source map remains subtle; excessive displacement would make clean duct look damaged.

The material does not replace HVAC construction cues. A plain textured box is still a
box. Geometry must provide joints, seams, folds, fasteners, thickness, and the reducer.

## 14. George's recommended production stack

1. Existing **Remotion 4.0.530** pipeline and composition system.
2. **`@remotion/three` + React Three Fiber + Three.js WebGL** for the physical scene.
3. Parametric TypeScript duct/reducer/joint meshes; no imported duct model.
4. **ambientCG Metal 049 A, 1K or 2K CC0 PBR maps** as the first material candidate.
5. Subtle procedural roughness/color modulation for zinc character, kept subordinate to
   the source maps.
6. **Poly Haven Studio Small 08, 1K CC0 HDRI**, hidden from camera but used for metal
   reflections.
7. One cool area/key light and one narrow moving rim light, plus dark corner control.
8. ACES-style filmic tone mapping, correct sRGB/data-map color handling, modest exposure,
   and no bloom in the first test.
9. Remotion/SVG only for later text, conceptual airflow accents, calculator transition,
   and compositing.

## 15. Why this stack has broader AnyHVAC value

It keeps the strongest property of the current Content Factory—deterministic code-driven
production—while adding a reusable physical visualization layer. Dimensions, components,
camera paths, lighting, and material presets can be data-driven and reviewed through the
same Remotion workflow. The investment is small enough to test on one duct frame but can
later support repeated mechanical environments and component explanations without an
external provider, recurring fee, account, or manual DCC export for every revision.

It also preserves a clean division of labor: Three.js creates physical objects and
lighting; Remotion owns editorial timing, text, UI/product capture, audio, transitions,
and final encoding.

## 16. Exact next small experiment

After **APPROVE PRODUCTION METHOD**, create exactly **one silent 1080 × 1920 hero still**:

- camera already inside a clean rectangular duct, low and slightly off center;
- one straight section leading into a visible reducer;
- one transverse flange/joint, longitudinal corner seam cues, subtle reinforcement, six
  to ten visible fasteners, and believable wall thickness;
- ambientCG Metal 049 A at 1K/2K with restrained zinc variation;
- Poly Haven Studio Small 08 at 1K for hidden environment reflections;
- one cool key and one narrow rim highlight;
- no text, airflow, motion blur, logo, calculator, animation, or second frame.

The experiment passes only if the single phone-size frame immediately reads as clean
galvanized HVAC ductwork and no longer resembles an animated rectangle. Record render
time, renderer backend, asset provenance, full-resolution image, and phone-size crop.
If that frame fails, stop and decide whether to try one material/lighting revision or
escalate to Blender. Animation remains unauthorized.

## Files and repository state

- Created: `growth/campaigns/003-why-duct-size-matters/production-method-investigation-v2.md`
- Modified: `growth/campaigns/003-why-duct-size-matters/daily-owner-review.md`
- No dependency, PBR asset, HDRI, 3D model, frame, video, music, SFX, deployment, commit,
  push, publication, or external account/service was created, installed, downloaded, or
  invoked.

## Owner gate

Choose exactly one:

- **APPROVE PRODUCTION METHOD**
- **REVISE PRODUCTION METHOD**
- **REJECT PRODUCTION METHOD**

George recommends **APPROVE PRODUCTION METHOD** for the one-frame experiment only.
