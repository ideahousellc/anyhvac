# George Content Factory

This directory is George's local operational workspace for turning one approved,
canonical AnyHVAC asset into a reusable campaign package. It is deliberately a
file-based system: no database, dashboard, CMS, account connection, scheduler, or
publishing API is included.

## Workflow

1. Select an approved canonical asset using supplied evidence or an approved brief.
   Rank candidates by business value and destination strength rather than creation
   order; the HVAC Duct Calculator is the current flagship destination.
2. Create one folder under `campaigns/<campaign-id>/` from the templates.
3. Record claims and their exact canonical source locations in `campaign.json`.
4. Draft LinkedIn as the canonical social copy.
5. Lightly adapt that copy for Instagram; do not repeat the research.
6. Choose and explain a primary and secondary format before selecting production
   tooling; actively consider recent format history and visual variety.
7. Prepare media briefs and provenance records for every external or generated
   asset, then draft structured inputs such as `video.json` where applicable.
8. Render disposable previews into `growth/.generated/`, never into the campaign
   source folder, then complete `quality-gate.md`.
9. Present the complete weekly batch for one explicit Cesar decision, targeting a
   20–30-minute review: two 5–6-slide carousels, two promotional graphics and one
   main video, adapted into five LinkedIn, five Instagram and three YouTube Shorts.
   Use `templates/educational-carousel.md`, `templates/promotional-graphic.md` and
   `templates/owner-review.md` with final media, captions, hashtags, links and slots.

Preparation is not publication. No file or command here sends, schedules, uploads,
deploys, or connects to an external service.

## Campaign contract

Every `campaign.json` contains:

- `campaignId`
- `canonicalAsset`
- `objective`
- `targetAudience`
- `coreUserProblem`
- `primaryMessage`
- `technicalClaimsSource`
- `destinationUrl`
- `distributionChannels`
- `callToAction`
- `revenueConnection`
- `status`
- `primaryFormat`
- `secondaryFormat`
- `formatRationale`
- `visualConcept`
- `audioStrategy`
- `mediaRequirements`
- `generationRequirements`
- `retentionState`

Allowed statuses are `RESEARCH`, `DRAFT`, `TECHNICAL REVIEW`, `OWNER REVIEW`,
`APPROVED`, `SCHEDULED`, `PUBLISHED`, `MEASURING`, and `COMPLETE`.

Run `npm run growth:validate` to check campaign structure, required draft sections,
source references, media lifecycle, audio/provenance fields, video timing, and the
absence of publishing or credential behavior. Run `npm run video:studio` for local
preview and the campaign-specific render script for an owner-review render.

The main weekly video is edited in evolving, music-driven beats rather than static
slides. The first second must move, the hook must land within three seconds, and
creative QA must inspect pacing as well as sampled frames.
The two promotional Shorts reuse the approved promotional artwork as static vertical
images with comfortable instrumental music; they require no elaborate animation.
All final music must be pleasant and balanced, without piercing tones or repetitive beeps.

## Creative-media principle

Default to real-world HVAC imagery: recognizable environments, real equipment and
authentic work, with cinematic framing, depth, natural lighting and consistent branding.
Avoid generic repetitive stock, unrealistic arrangements, fabricated users and implied
endorsements. Occasional white/beige reference slides are welcome, not dominant.
Prioritize existing or licensed free commercial-use assets with complete provenance.
Obtain explicit owner authorization before AI-image generation or asset/service spending.
The website and PDFs are technical destinations, not default social templates.
George first asks what visual treatment will stop an HVAC professional and make the
concept understandable, then selects a format. The format-rotation strategy,
expanded visual vocabulary, technical safeguards, provider-neutral media briefs,
and tool-evaluation criteria live under `growth/media/`.

## Media storage

Git is the system of record for workflow, source content, technical claims,
templates, campaign metadata, provenance, and publication history. Git is not the
media archive for rendered video, social exports, temporary audio, or intermediate
AI media. Those files live under the ignored `growth/.generated/` directory.

The external platform will hold the published copy. Cloud archival storage should
be considered only when a real business need emerges.

Run `npm run growth:cleanup` for a dry run. Add the explicit `-- --execute` flag
only after reviewing the eligible-file list. Cleanup is never scheduled in this
phase and never acts outside `growth/.generated/`.

## Approval boundary

George may research, draft, adapt, render, validate, and package locally without
separate owner prompts, except AI-image generation and expenses require explicit
prior authorization. George may inspect Buffer's queue and prepare weekly batches.
After Cesar explicitly approves an exact batch, its Buffer scheduling is authorized
without separate approval per upload, subject to channel/content/time/queue verification.
Record provider post IDs/times; keep SCHEDULED until successful publication is
confirmed and save live public URLs for William. Report missing credentials,
approved hosting or permissions as blockers, never success. Saving standing instructions
is not batch approval and starts no external action. See `distribution/buffer/README.md`.
Other publication, newsletter sending, community submission,
affiliate applications, sponsorship communication, paid promotion, deployment,
and production configuration remain approval-gated under the root `AGENTS.md`.

## Automation boundary

Good future local automation candidates are campaign folder creation, draft
generation, LinkedIn-to-Instagram adaptation, video input generation, local
rendering, checklist validation, link validation, asset-dimension checks, and
campaign packaging. External scheduling and publication are intentionally absent.

## Remotion licensing note

The local renderer uses Remotion 4.0.530. As checked on 2026-09-30, Remotion's free
license covers individuals and organizations of up to three people, including
commercial use and automation. An organization of four or more people requires a
Company License. Recheck the current terms before organizational size or usage
changes; this repository does not create an account or purchase a license.
