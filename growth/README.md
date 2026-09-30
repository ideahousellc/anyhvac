# George Content Factory

This directory is George's local operational workspace for turning one approved,
canonical AnyHVAC asset into a reusable campaign package. It is deliberately a
file-based system: no database, dashboard, CMS, account connection, scheduler, or
publishing API is included.

## Workflow

1. Select an approved canonical asset using supplied evidence or an approved brief.
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
9. Present a concise owner package and request one campaign decision.

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
preview and `npm run video:render:002` for the first campaign render.

## Creative-media principle

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
separate owner prompts. Publication, newsletter sending, community submission,
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
