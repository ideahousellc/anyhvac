import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import type {
  CampaignSpec,
  MediaProvenance,
  VideoInput,
} from "./schema";

const campaignStatuses = [
  "RESEARCH",
  "DRAFT",
  "TECHNICAL REVIEW",
  "OWNER REVIEW",
  "APPROVED",
  "SCHEDULED",
  "PUBLISHED",
  "MEASURING",
  "COMPLETE",
  "REJECTED",
] as const;

const campaignFormats = [
  "short-video",
  "image-carousel",
  "single-image",
  "technical-diagram",
  "worked-example",
  "tool-demonstration",
  "field-visualization",
  "cause-effect",
  "component-explainer",
  "misconception-explainer",
  "quick-tip",
  "resource-highlight",
  "interface-capture",
] as const;

const mediaLifecycleStates = [
  "DRAFT",
  "READY_FOR_REVIEW",
  "APPROVED",
  "QUEUED",
  "PUBLISHED_CONFIRMED",
  "CLEANUP_ELIGIBLE",
] as const;

const requiredCampaignKeys: ReadonlyArray<keyof CampaignSpec> = [
  "campaignId",
  "canonicalAsset",
  "objective",
  "targetAudience",
  "coreUserProblem",
  "primaryMessage",
  "technicalClaimsSource",
  "destinationUrl",
  "distributionChannels",
  "callToAction",
  "revenueConnection",
  "status",
  "primaryFormat",
  "secondaryFormat",
  "formatRationale",
  "visualConcept",
  "audioStrategy",
  "mediaRequirements",
  "generationRequirements",
  "retentionState",
];

function getVideoDuration(videoInput: VideoInput) {
  return videoInput.scenes.reduce(
    (sum, scene) => sum + scene.durationSeconds,
    0,
  );
}

const root = process.cwd();
const campaignDirectory = resolve(
  root,
  "growth/campaigns/002-airflow-static-pressure",
);

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const campaignPath = resolve(campaignDirectory, "campaign.json");
const videoPath = resolve(campaignDirectory, "video.json");
const provenancePath = resolve(campaignDirectory, "media-provenance.json");
const publicationPath = resolve(campaignDirectory, "publication-record.json");
const generatedAssetsPath = resolve(campaignDirectory, "generated-assets.json");
const campaign = readJson<CampaignSpec>(campaignPath);
const video = readJson<VideoInput>(videoPath);
const provenance = readJson<{
  assets: Array<{
    source: string;
    license: string;
    commercial_use: boolean | null;
    attribution_required: boolean;
    attribution_text: string | null;
    date_acquired: string | null;
    publication_approved: boolean;
  }>;
}>(provenancePath);
const publication = readJson<{ publication_status: string }>(publicationPath);
const generatedAssets = readJson<{
  assets: Array<{
    relative_path: string;
    lifecycle_state: string;
    retention_days: number;
  }>;
}>(generatedAssetsPath);

for (const key of requiredCampaignKeys) {
  assert(campaign[key] !== undefined, `campaign.json is missing ${key}`);
}

assert(
  campaignStatuses.includes(campaign.status),
  `Unsupported campaign status: ${campaign.status}`,
);
assert(campaignFormats.includes(campaign.primaryFormat), "Invalid primary format");
assert(campaignFormats.includes(campaign.secondaryFormat), "Invalid secondary format");
assert(
  mediaLifecycleStates.includes(campaign.retentionState),
  "Invalid campaign retention state",
);
assert(
  /^\d{3}-[a-z0-9-]+$/.test(campaign.campaignId),
  "Campaign ID must start with three digits and use lowercase kebab-case",
);
assert(
  campaign.canonicalAsset.startsWith("/resources/"),
  "Canonical asset must be an AnyHVAC resource path",
);
assert(
  campaign.destinationUrl ===
    `https://www.anyhvac.net${campaign.canonicalAsset}`,
  "Destination URL must match the canonical AnyHVAC asset",
);
assert(
  campaign.technicalClaimsSource.length > 0 &&
    campaign.technicalClaimsSource.every((source) =>
      existsSync(resolve(root, source.repositoryPath)),
    ),
  "Every technical claims source must resolve to a repository file",
);

const requiredDrafts: Record<string, string[]> = {
  "campaign-brief.md": ["## Canonical asset", "## Technical claims source"],
  "linkedin.md": ["## Hook", "## Technical insight", "## Source notes"],
  "instagram.md": ["## Source LinkedIn draft", "## Platform adjustments"],
  "youtube-short.md": ["## Hook", "## Explanation", "## CTA"],
  "newsletter.md": ["## Excerpt", "## CTA", "## Source notes"],
  "quality-gate.md": ["## Technical", "## Approval"],
  "creative-directions.md": ["## Current prototype", "## Option A", "## Option B", "## Option C"],
  "carousel-concept.md": ["## Slide 1", "## Slide 6", "## Technical takeaway"],
  "daily-owner-review.md": ["## Today's asset", "## License / provenance check", "## Decision"],
};

for (const [file, sections] of Object.entries(requiredDrafts)) {
  const path = resolve(campaignDirectory, file);
  assert(existsSync(path), `Missing campaign file: ${file}`);
  const content = readFileSync(path, "utf8");
  for (const section of sections) {
    assert(content.includes(section), `${file} is missing ${section}`);
  }
}

assert(video.campaignId === campaign.campaignId, "Video campaign ID mismatch");
assert(video.width === 1080 && video.height === 1920, "Video must be 1080x1920");
assert(video.fps === 30, "Initial video system must render at 30 fps");
assert(
  video.durationSeconds >= 30 && video.durationSeconds <= 60,
  "Short duration must be between 30 and 60 seconds",
);
assert(
  getVideoDuration(video) === video.durationSeconds,
  "Scene durations must sum to the declared video duration",
);
assert(existsSync(resolve(root, "public", video.logoPath)), "Logo path is invalid");

const tracks = [
  video.audio.narration,
  video.audio.music,
  ...video.audio.ambient,
].filter((track) => track !== null);
if (video.audio.mode === "deliberately-silent") {
  assert(tracks.length === 0, "Deliberately silent mode cannot include audio tracks");
}
for (const track of tracks) {
  assert(track.volume >= 0 && track.volume <= 1, "Audio volume must be between 0 and 1");
  assert(
    !track.path.startsWith("/") && !track.path.includes(".."),
    "Audio paths must be safe public-relative paths",
  );
  validateProvenance(track.provenance);
}

function validateProvenance(record: MediaProvenance) {
  assert(record.source.length > 0, "Media provenance requires a source");
  assert(record.license.length > 0, "Media provenance requires a license");
  if (record.publicationApproved) {
    assert(record.commercialUse === true, "Approved media must allow commercial use");
    assert(record.dateAcquired !== null, "Approved media needs an acquisition date");
    if (record.attributionRequired) {
      assert(Boolean(record.attributionText), "Required attribution text is missing");
    }
  }
}

for (const record of provenance.assets) {
  validateProvenance({
    source: record.source,
    license: record.license,
    commercialUse: record.commercial_use,
    attributionRequired: record.attribution_required,
    attributionText: record.attribution_text,
    dateAcquired: record.date_acquired,
    publicationApproved: record.publication_approved,
  });
}
assert(
  mediaLifecycleStates.includes(
    publication.publication_status as (typeof mediaLifecycleStates)[number],
  ),
  "Invalid publication lifecycle state",
);
for (const asset of generatedAssets.assets) {
  assert(
    !asset.relative_path.startsWith("/") && !asset.relative_path.includes(".."),
    "Generated asset path must remain relative to growth/.generated",
  );
  assert(asset.retention_days >= 0, "Retention days cannot be negative");
  assert(
    mediaLifecycleStates.includes(
      asset.lifecycle_state as (typeof mediaLifecycleStates)[number],
    ),
    "Invalid generated asset lifecycle state",
  );
}

const gitignore = readFileSync(resolve(root, ".gitignore"), "utf8");
assert(
  gitignore.includes("/growth/.generated/"),
  "growth/.generated must be ignored by Git",
);
assert(
  !existsSync(resolve(campaignDirectory, "renders/001-tesp-is-not-airflow.mp4")),
  "Generated MP4 must not remain in the source campaign folder",
);

const serialized = [campaign, video, provenance, publication, generatedAssets]
  .map((value) => JSON.stringify(value).toLowerCase())
  .join("\n");
const forbiddenKeys = [
  "api_key",
  "apikey",
  "access_token",
  "client_secret",
  "publishendpoint",
  "scheduleendpoint",
];
for (const key of forbiddenKeys) {
  assert(!serialized.includes(key), `Forbidden publishing or credential field: ${key}`);
}

const campaign003Directory = resolve(root, "growth/campaigns/003-why-duct-size-matters");
const campaign003 = readJson<CampaignSpec>(resolve(campaign003Directory, "campaign.json"));
const video003 = readJson<{width:number;height:number;fps:number;durationSeconds:number;calculatorImage:string;music:{license:string};sfx:{license:string}}>(resolve(campaign003Directory, "video.json"));
assert(campaign003.status === "PUBLISHED", "Campaign #003 must record its confirmed published status");
assert(campaign003.destinationUrl === "https://www.anyhvac.net/tools/duct-calculator", "Campaign #003 destination is not canonical");
assert(campaign003.distributionChannels.length === 3, "Campaign #003 must target the three connected social channels");
assert(campaign003.technicalClaimsSource.every((source) => existsSync(resolve(root, source.repositoryPath))), "Campaign #003 claim source is missing");
assert(video003.width === 1080 && video003.height === 1920 && video003.fps === 30, "Campaign #003 video spec is invalid");
assert(video003.durationSeconds >= 20 && video003.durationSeconds <= 35, "Campaign #003 duration must be 20–35 seconds");
assert(video003.music.license === "AnyHVAC original/internal asset" && video003.sfx.license === "AnyHVAC original/internal asset", "Campaign #003 audio rights are incomplete");
for (const file of ["campaign-brief.md","storyboard.md","linkedin.md","instagram.md","youtube-short.md","media-provenance.json","generated-assets.json","publication-record.json","quality-gate.md","daily-owner-review.md","render-qa.md"]) {
  assert(existsSync(resolve(campaign003Directory, file)), `Campaign #003 is missing ${file}`);
}

console.log(
  `Validated Campaign #002 rejection preservation and Campaign #003: ${campaign003.distributionChannels.length} published channels, ${video003.durationSeconds}s final asset, rights/provenance controls, no publishing behavior.`,
);
