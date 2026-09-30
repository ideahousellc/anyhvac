# AnyHVAC local technical video system

This is a local Remotion composition for deterministic 1080 × 1920 technical
Shorts. Campaign content lives in each campaign's `video.json`; React files contain
only reusable rendering logic. George can therefore create future videos by
changing structured content, not rebuilding the composition.

## Commands

```text
npm run video:studio
npm run video:render:002
```

The render command is local, uses the repository's `public/` assets, writes into
the ignored `growth/.generated/` directory, and makes no external API call. Remotion
bundles compatible FFmpeg/FFprobe tooling, so no system FFmpeg install is required.

## Composition

- Composition ID: `AnyHVAC-Technical-Short`
- Canvas: 1080 × 1920, 9:16
- Frame rate: 30 fps
- Duration: derived from `video.json` (30–60 seconds enforced by validation)
- Brand colors: AnyHVAC blue `#0057b8`, light blue `#66b0ff`, dark slate
  `#1f2a37`, muted slate `#647184`, and the site's light gray surface palette
- Motion: short opacity/position entrances, formula reveal, diagram flow, value
  emphasis, restrained transitions, and CTA entrance
- Safe area: primary content stays inside a 72 px horizontal inset; persistent
  identity and footer overlays stay inside a 48 px inset

Reusable concepts include brand identity, eyebrow/title, technical text, a
conceptual pressure diagram, formula/example values, source note, CTA, and end card.

## Audio

The structured `audio` object independently accepts one narration track, one music
track, and multiple ambient/sound-effect tracks, each with its own volume and
provenance. Empty tracks with `mode: deliberately-silent` produce no audio stream.
Future manually supplied files must live under `public/` or an intentionally
managed local input path and have complete commercial-rights provenance before
publication. The composition performs no synthesis, cloning, download, or paid API
call. Narration should explain the visual rather than read every on-screen word;
music must remain secondary.

Rendered outputs go to `growth/.generated/` and are ignored by Git. Source inputs,
templates, manifests, provenance, and publication records remain trackable.

## Licensing

Remotion packages are pinned at 4.0.530. The 2026-09-30 Remotion terms allow free
commercial use by individuals and organizations of up to three people; four or
more people require a Company License. Confirm eligibility and recheck current
terms before the team or use changes.
