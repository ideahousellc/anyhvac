import { readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import campaign from "../campaigns/002-airflow-static-pressure/campaign.json";
import video from "../campaigns/002-airflow-static-pressure/video.json";
import campaign003 from "../campaigns/003-why-duct-size-matters/campaign.json";
import video003 from "../campaigns/003-why-duct-size-matters/video.json";
import {
  campaignStatuses,
  campaignFormats,
  getAudioTracks,
  getVideoDuration,
  mediaLifecycleStates,
  requiredCampaignKeys,
  type MediaProvenance,
  type VideoInput,
} from "../schema";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const campaignDirectory = resolve(
  root,
  "growth/campaigns/002-airflow-static-pressure",
);

function growthSourceText(directory: string): string {
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === ".generated" || entry.name === "__tests__") return [];
        return [growthSourceText(path)];
      }
      if (entry.name === "validate.mts") return [];
      if (!/\.(?:ts|tsx|mts)$/.test(entry.name)) return [];
      return [readFileSync(path, "utf8")];
    })
    .join("\n");
}

describe("George Content Factory", () => {
  it("defines every required campaign field and an allowed status", () => {
    for (const key of requiredCampaignKeys) {
      expect(campaign).toHaveProperty(key);
    }
    expect(campaignStatuses).toContain(campaign.status);
  });

  it("keeps the campaign destination aligned with the canonical asset", () => {
    expect(campaign.destinationUrl).toBe(
      `https://www.anyhvac.net${campaign.canonicalAsset}`,
    );
  });

  it("defines an original-audio 1080x1920 Short with internally consistent timing", () => {
    const input = video as VideoInput;
    expect(input.width).toBe(1080);
    expect(input.height).toBe(1920);
    expect(input.fps).toBe(30);
    expect(input.durationSeconds).toBeGreaterThanOrEqual(30);
    expect(input.durationSeconds).toBeLessThanOrEqual(60);
    expect(getVideoDuration(input)).toBe(input.durationSeconds);
    expect(input.audio.mode).toBe("ambient-text");
    expect(getAudioTracks(input.audio)).toHaveLength(1);
    expect(getAudioTracks(input.audio)[0]?.provenance.commercialUse).toBe(true);
  });

  it("traces all campaign claims to the canonical resource source", () => {
    expect(campaign.technicalClaimsSource.length).toBeGreaterThan(0);
    for (const source of campaign.technicalClaimsSource) {
      expect(source.repositoryPath).toBe(
        "app/resources/airflow-static-pressure-measurement/page.tsx",
      );
      expect(source.supports.length).toBeGreaterThan(0);
    }
  });

  it("records campaign format, audio, generation, and retention decisions", () => {
    expect(campaignFormats).toContain(campaign.primaryFormat);
    expect(campaignFormats).toContain(campaign.secondaryFormat);
    expect(campaign.formatRationale.length).toBeGreaterThan(40);
    expect(campaign.visualConcept).toContain("Selected Option B");
    expect(campaign.audioStrategy).toContain("original deterministic");
    expect(campaign.mediaRequirements.length).toBeGreaterThan(0);
    expect(campaign.generationRequirements.length).toBeGreaterThan(0);
    expect(mediaLifecycleStates).toContain(campaign.retentionState);
  });

  it("accepts independent narration, music, and ambient volumes", () => {
    const provenance: MediaProvenance = {
      source: "test fixture",
      license: "test-only",
      commercialUse: false,
      attributionRequired: false,
      attributionText: null,
      dateAcquired: null,
      publicationApproved: false,
    };
    const tracks = getAudioTracks({
      mode: "narration-light-music",
      rationale: "Test fixture only",
      narration: { path: "audio/narration.wav", volume: 1, provenance },
      music: { path: "audio/music.wav", volume: 0.15, provenance },
      ambient: [{ path: "audio/room.wav", volume: 0.25, provenance }],
    });
    expect(tracks.map(({ role, volume }) => ({ role, volume }))).toEqual([
      { role: "narration", volume: 1 },
      { role: "music", volume: 0.15 },
      { role: "ambient", volume: 0.25 },
    ]);
  });

  it("ignores generated media while leaving campaign source trackable", () => {
    const generated = spawnSync(
      "git",
      ["check-ignore", "-q", "growth/.generated/campaigns/test/video/test.mp4"],
      { cwd: root },
    );
    const source = spawnSync(
      "git",
      ["check-ignore", "-q", "growth/campaigns/002-airflow-static-pressure/campaign.json"],
      { cwd: root },
    );
    expect(generated.status).toBe(0);
    expect(source.status).not.toBe(0);
  });

  it("contains three richer directions and one six-slide carousel alternative", () => {
    const directions = readFileSync(
      resolve(campaignDirectory, "creative-directions.md"),
      "utf8",
    );
    const carousel = readFileSync(
      resolve(campaignDirectory, "carousel-concept.md"),
      "utf8",
    );
    expect(directions.match(/^## Option [A-C]/gm)).toHaveLength(3);
    expect(directions).toContain("### Narration concept");
    expect(directions).toContain("### Technical risks");
    expect(carousel.match(/^## Slide [1-6]/gm)).toHaveLength(6);
    expect(carousel).toContain("not a screenshot");
  });

  it("requires complete provenance fields and a valid publication lifecycle", () => {
    const provenance = JSON.parse(
      readFileSync(resolve(campaignDirectory, "media-provenance.json"), "utf8"),
    ) as { assets: Array<Record<string, unknown>> };
    const publication = JSON.parse(
      readFileSync(resolve(campaignDirectory, "publication-record.json"), "utf8"),
    ) as { publication_status: string };
    for (const asset of provenance.assets) {
      for (const key of [
        "source",
        "license",
        "commercial_use",
        "attribution_required",
        "attribution_text",
        "date_acquired",
        "publication_approved",
      ]) {
        expect(asset).toHaveProperty(key);
      }
    }
    expect(mediaLifecycleStates).toContain(publication.publication_status);
  });

  it("contains no network, credential, or publishing implementation", () => {
    const source = growthSourceText(resolve(root, "growth"));
    expect(source).not.toMatch(/\bfetch\s*\(/);
    expect(source).not.toMatch(/\baxios\b/);
    expect(source).not.toMatch(/api[_-]?key|access[_-]?token|client[_-]?secret/i);
    expect(source).not.toMatch(/publish(?:Post|Campaign)\s*\(/);
  });

  it("prepares the flagship Duct Calculator campaign without changing its formulas", () => {
    expect(campaign.status).toBe("REJECTED");
    expect(campaign003.status).toBe("DRAFT");
    expect(campaign003.destinationUrl).toBe("https://www.anyhvac.net/tools/duct-calculator");
    expect(campaign003.distributionChannels).toEqual(["linkedin", "instagram", "youtube-short"]);
    expect(video003.width).toBe(1080);
    expect(video003.height).toBe(1920);
    expect(video003.fps).toBe(30);
    expect(video003.durationSeconds).toBeGreaterThanOrEqual(20);
    expect(video003.durationSeconds).toBeLessThanOrEqual(35);
    expect(video003.music.license).toBe("AnyHVAC original/internal asset");
    expect(video003.calculatorImage).toContain("duct-calculator-page.png");
  });
});
