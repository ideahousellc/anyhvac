import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  executeCleanup,
  planCleanup,
  resolveGeneratedTarget,
  type GeneratedAssetManifest,
} from "../cleanup";

const fixtures: string[] = [];

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "anyhvac-growth-cleanup-"));
  fixtures.push(root);
  const generatedRoot = join(root, "growth", ".generated");
  mkdirSync(join(generatedRoot, "campaigns", "test", "video"), {
    recursive: true,
  });
  return { root, generatedRoot };
}

afterEach(() => {
  for (const path of fixtures.splice(0)) rmSync(path, { recursive: true, force: true });
});

function manifest(relativePath: string): GeneratedAssetManifest {
  return {
    campaign_id: "test-campaign",
    assets: [
      {
        asset_id: "test-video",
        relative_path: relativePath,
        lifecycle_state: "CLEANUP_ELIGIBLE",
        created_at: "2026-09-01T00:00:00Z",
        retention_days: 7,
        temporary: true,
        abandoned_or_rejected: false,
        publication_confirmed: false,
        publishing_system_requires_local_file: true,
      },
    ],
  };
}

describe("generated media cleanup", () => {
  it("defaults to a non-destructive dry-run plan", () => {
    const { generatedRoot } = fixture();
    const relativePath = "campaigns/test/video/example.mp4";
    const target = resolve(generatedRoot, relativePath);
    writeFileSync(target, "prototype");
    const candidates = planCleanup({
      generatedRoot,
      manifests: [manifest(relativePath)],
      now: new Date("2026-09-30T00:00:00Z"),
    });
    const result = executeCleanup(candidates);
    expect(result.mode).toBe("DRY RUN");
    expect(result.fileCount).toBe(1);
    expect(existsSync(target)).toBe(true);
  });

  it("requires explicit execution and deletes only the eligible generated file", () => {
    const { generatedRoot } = fixture();
    const relativePath = "campaigns/test/video/example.mp4";
    const target = resolve(generatedRoot, relativePath);
    writeFileSync(target, "prototype");
    const source = resolve(generatedRoot, "..", "..", "campaign.json");
    writeFileSync(source, "source must survive");
    const candidates = planCleanup({
      generatedRoot,
      manifests: [manifest(relativePath)],
      now: new Date("2026-09-30T00:00:00Z"),
    });
    executeCleanup(candidates, true);
    expect(existsSync(target)).toBe(false);
    expect(readFileSync(source, "utf8")).toBe("source must survive");
  });

  it("rejects path traversal before any deletion", () => {
    const { root, generatedRoot } = fixture();
    const outside = join(root, "outside.mp4");
    writeFileSync(outside, "outside");
    expect(() => resolveGeneratedTarget(generatedRoot, "../../../outside.mp4")).toThrow(
      /escapes the allowed root/,
    );
    expect(existsSync(outside)).toBe(true);
  });

  it("does not mark approved-but-unpublished media eligible", () => {
    const { generatedRoot } = fixture();
    const relativePath = "campaigns/test/video/example.mp4";
    const target = resolve(generatedRoot, relativePath);
    writeFileSync(target, "prototype");
    const approved = manifest(relativePath);
    approved.assets[0] = {
      ...approved.assets[0],
      lifecycle_state: "APPROVED",
      temporary: false,
    };
    expect(
      planCleanup({ generatedRoot, manifests: [approved] }),
    ).toHaveLength(0);
    expect(existsSync(target)).toBe(true);
  });
});
