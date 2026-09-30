export const campaignStatuses = [
  "RESEARCH",
  "DRAFT",
  "TECHNICAL REVIEW",
  "OWNER REVIEW",
  "APPROVED",
  "SCHEDULED",
  "PUBLISHED",
  "MEASURING",
  "COMPLETE",
] as const;

export type CampaignStatus = (typeof campaignStatuses)[number];

export const campaignFormats = [
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

export type CampaignFormat = (typeof campaignFormats)[number];

export const mediaLifecycleStates = [
  "DRAFT",
  "READY_FOR_REVIEW",
  "APPROVED",
  "QUEUED",
  "PUBLISHED_CONFIRMED",
  "CLEANUP_ELIGIBLE",
] as const;

export type MediaLifecycleState = (typeof mediaLifecycleStates)[number];

export type MediaProvenance = {
  source: string;
  license: string;
  commercialUse: boolean | null;
  attributionRequired: boolean;
  attributionText: string | null;
  dateAcquired: string | null;
  publicationApproved: boolean;
};

export type AudioTrack = {
  path: string;
  volume: number;
  provenance: MediaProvenance;
};

export const audioStrategyModes = [
  "narration-light-music",
  "narration-only",
  "music-on-screen-explanation",
  "ambient-text",
  "deliberately-silent",
] as const;

export type AudioStrategyMode = (typeof audioStrategyModes)[number];

export type VideoAudioStrategy = {
  mode: AudioStrategyMode;
  rationale: string;
  narration: AudioTrack | null;
  music: AudioTrack | null;
  ambient: AudioTrack[];
};

export type CampaignSpec = {
  campaignId: string;
  canonicalAsset: string;
  objective: string;
  targetAudience: string[];
  coreUserProblem: string;
  primaryMessage: string;
  technicalClaimsSource: Array<{
    repositoryPath: string;
    section: string;
    supports: string[];
  }>;
  destinationUrl: string;
  distributionChannels: Array<
    "linkedin" | "instagram" | "youtube-short" | "newsletter"
  >;
  callToAction: string;
  revenueConnection: string;
  status: CampaignStatus;
  primaryFormat: CampaignFormat;
  secondaryFormat: CampaignFormat;
  formatRationale: string;
  visualConcept: string;
  audioStrategy: string;
  mediaRequirements: string[];
  generationRequirements: string[];
  retentionState: MediaLifecycleState;
};

export type VideoScene = {
  id: string;
  kind: "hook" | "concept" | "example" | "warning" | "cta";
  durationSeconds: number;
  eyebrow?: string;
  title: string;
  body?: string;
  formula?: string;
  values?: Array<{ label: string; value: string }>;
  sourceNote?: string;
};

export type VideoInput = {
  campaignId: string;
  videoId: string;
  title: string;
  hook: string;
  fps: number;
  width: number;
  height: number;
  durationSeconds: number;
  logoPath: string;
  audio: VideoAudioStrategy;
  destinationUrl: string;
  cta: string;
  sourceNote: string;
  scenes: VideoScene[];
};

export const requiredCampaignKeys: ReadonlyArray<keyof CampaignSpec> = [
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

export function getVideoDuration(video: VideoInput) {
  return video.scenes.reduce((sum, scene) => sum + scene.durationSeconds, 0);
}

export function getAudioTracks(audio: VideoAudioStrategy) {
  return [
    ...(audio.narration ? [{ role: "narration" as const, ...audio.narration }] : []),
    ...(audio.music ? [{ role: "music" as const, ...audio.music }] : []),
    ...audio.ambient.map((track) => ({ role: "ambient" as const, ...track })),
  ];
}

export type PublicationRecord = {
  campaignId: string;
  assetId: string;
  format: CampaignFormat;
  platform: string[];
  publicationStatus: MediaLifecycleState;
  approvedAt: string | null;
  publishedAt: string | null;
  platformPostUrl: string | null;
  canonicalDestinationUrl: string;
  sourceCampaign: string;
  technicalSource: string[];
  mediaProvenance: string[];
  notes: string;
};
