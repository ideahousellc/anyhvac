# Video #001 render QA

## Output

- File: `growth/.generated/campaigns/002-airflow-static-pressure/video/001-tesp-is-not-airflow.mp4`
- Container: MP4
- Video codec: H.264
- Resolution: 1080 × 1920 (9:16)
- Frame rate: 30 fps
- Duration: 45.000 seconds
- File size: 5,003,204 bytes
- SHA-256: `4D3851AC29AC58B847885EEEF11AC462320E87A35D1D4C2D21601A5CBAA062A0`
- Audio streams: none

## Visual inspection

Frames sampled at 1.5, 8, 20, 35, and 43 seconds cover the hook, explanation,
worked example, limitation, and CTA scenes.

- [x] No text or graphic clipping observed
- [x] Primary text remains readable at phone-oriented scale
- [x] AnyHVAC identity remains legible on light and blue backgrounds
- [x] Formula, units, signs, and example values match the canonical resource
- [x] Source/limitation notes remain visible
- [x] CTA and destination are legible
- [x] Motion is restrained and does not obscure technical content
- [x] No unexpected audio track
- [x] File opens, probes, and decodes for frame extraction

The first render exposed insufficient end-card contrast in the persistent identity
and footer. The shared overlays were revised to use high-contrast light surfaces,
the video was re-rendered, and the affected frames were rechecked.

This QA record describes the retained local prototype. The generated binary is
ignored by Git and is not automatically the final publication asset.
