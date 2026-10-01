# Campaign #003 — final publication-candidate review

> Historical approval packet. The owner subsequently approved and confirmed publication on Instagram, YouTube Shorts, and LinkedIn on October 1, 2026. Current URLs and lifecycle status are recorded in `publication-record.json`.

## 1. Final MP4

`growth/.generated/campaigns/003-why-duct-size-matters/video/001-why-duct-size-matters.mp4`

- SHA-256: `F911D8D711BECDDB11811A8B0406148D75936921E8A9C0B93F6FB8A6C95A0883`
- Size: 11,508,277 bytes
- H.264, 1080 × 1920, 30 fps, yuv420p; AAC stereo at 48 kHz

## 2. Phone-size preview

`growth/.generated/campaigns/003-why-duct-size-matters/video/001-why-duct-size-matters-phone.mp4`

- SHA-256: `D96313B116D556248EE405D62AC04FC4574B2D17689827739D13C4C3724E05D9`
- Size: 1,772,197 bytes
- H.264/AAC, 360 × 640

## 3. Final duration

780 picture frames / 26.000 seconds. The final MP4 container is 26.048 seconds because its AAC stream carries a 0.048-second encoded tail.

## 4. Final storyboard and timeline

The exact 0–26 second structure is in `storyboard-final.md`: locked Blender hook (0–3), consequence (3–7), implications (7–11), question/match transition (11–14), authentic calculator payoff (14–22), and CTA (22–26).

## 5. Music

An original, deterministic 120 BPM electronic-mechanical track provides kick, snare, hi-hat, bass harmonics, arpeggio, gated chords, mechanical ticks, a product-reveal change near 14 seconds, and a clear CTA resolution. It uses no sample, external model, stock track, or third-party source.

## 6. SFX

Original synthesized entry, airflow, transition, calculator-movement, UI-click, reveal, and final-impact effects support the rhythm. They are not presented as measured airflow or actual equipment recordings.

## 7. Calculator example

The product sequence moves through three captured states:

1. 3,000 CFM at 0.08 in. w.g./100 ft.
2. 5,000 CFM at 0.08 in. w.g./100 ft.
3. 5,000 CFM at 0.10 in. w.g./100 ft with a 12-inch preferred side.

The final real application state reports a 25.6-inch calculated round size, 26-inch nominal round size, and 24 × 23 rectangular option. The UI also calculates the associated velocities and actual nominal friction; the commercial keeps phone attention on the sizing result.

## 8. Calculator authenticity

Confirmed. `growth/media/capture-calculator-states.mjs` connected to the locally running application, waited for the hydrated result UI, changed the actual airflow input, clicked the actual quick-friction controls, and captured the rendered product at 1440 × 1600. No fake UI, typed-over screenshot, fabricated result, or engineering-logic change was used.

## 9. Technical safeguards

- The claim is limited to: at the same represented airflow, smaller cross-sectional area produces higher average velocity.
- The airflow treatment is labeled `CONCEPTUAL • AVERAGE VELOCITY`.
- No universal acceptable velocity or friction rate is stated.
- No automatic system-performance, code-compliance, final-design, or noise-performance claim is made.
- The calculator remains design assistance whose correct use depends on the system and project context.

## 10. Final QA

- PASS — actual master sampled at 12 moments from 0.5 through 25.8 seconds.
- PASS — muted/visual meaning, immediate HVAC recognition, continuous motion, calculator payoff, CTA, and phone-safe framing.
- PASS — authentic calculator state/value review and engineering boundaries.
- PASS — audio stream present; authored-source/timeline and signal review found a -8.00 dBFS mixed peak, -25.15 dBFS RMS, no clipping, and no unintended silence.
- PASS — the single authorized polish pass improved calculator-result and CTA URL legibility.
- PASS — corrected opening fills the portrait canvas. This was a re-encode of the approved frames only, not a redesign or re-render.

The final review contact sheet is `growth/.generated/campaigns/003-why-duct-size-matters/final-review/final/final-campaign-contact-sheet.png` (SHA-256 `0E625D9911D8F55777C2A2283D7E30E7DACE98B3631D15D84844A9FC61024B8C`).

## 11. George's honest assessment

| Review question | Assessment |
| --- | --- |
| Meaningful activity in the first second? | Yes. The camera is already approaching a recognizable duct opening. |
| HVAC recognizable immediately? | Yes. Exterior sheet metal, flange, fasteners, and rectangular opening establish context. |
| Concept understandable? | Yes. The locked opening and connected Remotion sequence make same airflow → smaller area → higher average velocity clear. |
| Anything slow? | No material dead section appears in the sampled sequence; beats continue inside every segment. |
| Anything feel like a presentation slide? | No. Geometry, flow, kinetic type, circular match, calculator movement, and crossfades maintain continuity. |
| Music feel like actual music? | Structurally yes: it has a 120 BPM rhythm, drums, bass, harmony, arpeggio, sectional change, and resolution—not isolated beeps or a drone. |
| Transitions connected? | Yes. The duct geometry carries into the consequence, then the opening becomes the circular calculator-wheel reveal. |
| Calculator feel like the payoff? | Yes. It occupies the longest post-hook section and resolves the sizing question with real states and results. |
| Calculator authentic? | Yes. Every visible state comes from actual hydrated app behavior. |
| CTA obvious? | Yes. `SIZE IT FASTER`, product name, free/no-signup value, and canonical route appear together. |
| Technical message defensible? | Yes, within the explicitly preserved boundaries above. |
| Would George publish this as AnyHVAC's first Short? | Yes—after owner approval and the owner's own real-time sound/playback check. |

## 12. Remaining limitations

The calculator demonstration uses three authentic captured states and editorial crossfades rather than a continuous cursor recording. Fine secondary UI text is intentionally subordinate at phone size. Automated review can inspect rendered frames, source timing, codecs, and audio signal structure, but it cannot substitute for Cesar's human real-time listening judgment; the phone MP4 is provided for that final owner check.

## 13. Render time

- Final Remotion master: 54.04 seconds.
- Phone preview transcode: 4.436 seconds.
- The previously approved 90-frame Blender opening took 26:27.372; it was reused, not re-rendered.

## 14. Files created or modified

Final production files include the new Remotion composition, root registration, Blender scene/encode scripts, authentic capture and audio-analysis utilities, final-review generator, final storyboard/review documents, prior required V2 decision records, updated campaign/video/provenance/lifecycle/QA records, final channel copy, focused content test, media-generation logic, and the package manifests required by the existing Remotion/Three production path.

The authoritative worktree listing is the final `git status --short --branch`; no unrelated existing change was discarded.

## 15. Generated files excluded from Git

All renders, 90 Blender PNG frames, MP4 previews, calculator captures, contact sheets, generated WAVs, and staged Remotion public media are under ignored `growth/.generated/`. `git status --ignored` reports that tree as ignored. A generated Python bytecode cache was removed from the source tree.

## 16. Validation results

- `npm.cmd test`: PASS — 47 files, 503 tests.
- `npx.cmd tsc --noEmit`: PASS.
- `npm.cmd run growth:validate`: PASS — Campaign #003 recognized as a 26-second, three-channel unpublished draft.
- `npm.cmd run lint`: PASS — zero errors; two pre-existing warnings in `reference/duct-calculator-original/script.js`.
- `npm.cmd run build`: PASS — Next.js 16.3.4 production build and all 23 static pages.
- Campaign JSON parsing: PASS.
- New `.mjs` syntax checks: PASS.
- Audio signal analysis: PASS.
- `git diff --check`: PASS; only line-ending conversion notices from Git on Windows.

## 17. Git status and external-action state

Branch: `main...origin/main`. The worktree contains the expected modified and untracked Campaign #003 source/review files; generated media remains ignored. No commit or push was made. No deployment, upload, scheduling, Buffer action, or publication occurred. Campaign #004 was not started.

## Owner gate

- [ ] **APPROVE CAMPAIGN**
- [ ] **REVISE FINAL CAMPAIGN**
- [ ] **REJECT CAMPAIGN**
