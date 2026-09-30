import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  unlinkSync,
} from "node:fs";
import { fileURLToPath } from "node:url";
import { isAbsolute, resolve, sep } from "node:path";

export type GeneratedAssetRecord = {
  asset_id: string;
  relative_path: string;
  lifecycle_state:
    | "DRAFT"
    | "READY_FOR_REVIEW"
    | "APPROVED"
    | "QUEUED"
    | "PUBLISHED_CONFIRMED"
    | "CLEANUP_ELIGIBLE";
  created_at: string;
  retention_days: number;
  temporary: boolean;
  abandoned_or_rejected: boolean;
  publication_confirmed: boolean;
  publishing_system_requires_local_file: boolean;
};

export type GeneratedAssetManifest = {
  campaign_id: string;
  assets: GeneratedAssetRecord[];
};

export type CleanupCandidate = {
  campaignId: string;
  assetId: string;
  absolutePath: string;
  relativePath: string;
  size: number;
  reason: string;
};

export function resolveGeneratedTarget(
  generatedRoot: string,
  relativePath: string,
) {
  if (!relativePath || isAbsolute(relativePath) || relativePath.includes("\0")) {
    throw new Error(`Unsafe generated-media path: ${relativePath}`);
  }

  const resolvedRoot = resolve(generatedRoot);
  const resolvedTarget = resolve(resolvedRoot, relativePath);
  const rootPrefix = `${resolvedRoot}${sep}`;
  if (
    resolvedTarget === resolvedRoot ||
    !resolvedTarget.startsWith(rootPrefix)
  ) {
    throw new Error(`Generated-media path escapes the allowed root: ${relativePath}`);
  }
  return resolvedTarget;
}

export function cleanupEligibility(asset: GeneratedAssetRecord, now: Date) {
  if (asset.lifecycle_state === "CLEANUP_ELIGIBLE") {
    return "manifest state is CLEANUP_ELIGIBLE";
  }
  if (asset.abandoned_or_rejected) {
    return "campaign asset is abandoned or rejected";
  }
  if (
    asset.lifecycle_state === "PUBLISHED_CONFIRMED" &&
    asset.publication_confirmed &&
    !asset.publishing_system_requires_local_file
  ) {
    return "publication confirmed and local file is no longer required";
  }
  if (asset.temporary && !asset.publication_confirmed) {
    const created = new Date(asset.created_at);
    if (Number.isNaN(created.getTime())) {
      throw new Error(`Invalid created_at for ${asset.asset_id}`);
    }
    const retentionMilliseconds = asset.retention_days * 24 * 60 * 60 * 1000;
    if (now.getTime() - created.getTime() >= retentionMilliseconds) {
      return `unpublished temporary media exceeded ${asset.retention_days}-day retention`;
    }
  }
  return null;
}

export function planCleanup({
  generatedRoot,
  manifests,
  now = new Date(),
}: {
  generatedRoot: string;
  manifests: GeneratedAssetManifest[];
  now?: Date;
}) {
  const candidates: CleanupCandidate[] = [];
  for (const manifest of manifests) {
    for (const asset of manifest.assets) {
      const absolutePath = resolveGeneratedTarget(
        generatedRoot,
        asset.relative_path,
      );
      const reason = cleanupEligibility(asset, now);
      if (!reason || !existsSync(absolutePath)) continue;
      const stats = statSync(absolutePath);
      if (!stats.isFile()) {
        throw new Error(`Cleanup target is not a file: ${asset.relative_path}`);
      }
      candidates.push({
        campaignId: manifest.campaign_id,
        assetId: asset.asset_id,
        absolutePath,
        relativePath: asset.relative_path,
        size: stats.size,
        reason,
      });
    }
  }
  return candidates;
}

export function executeCleanup(candidates: CleanupCandidate[], execute = false) {
  if (execute) {
    for (const candidate of candidates) {
      unlinkSync(candidate.absolutePath);
    }
  }
  return {
    mode: execute ? "EXECUTE" : "DRY RUN",
    fileCount: candidates.length,
    totalBytes: candidates.reduce((sum, candidate) => sum + candidate.size, 0),
  };
}

function loadRepositoryManifests(root: string) {
  const campaignsDirectory = resolve(root, "growth/campaigns");
  if (!existsSync(campaignsDirectory)) return [];
  return readdirSync(campaignsDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => resolve(campaignsDirectory, entry.name, "generated-assets.json"))
    .filter(existsSync)
    .map(
      (path) =>
        JSON.parse(readFileSync(path, "utf8")) as GeneratedAssetManifest,
    );
}

function runCli() {
  const args = new Set(process.argv.slice(2));
  const allowed = new Set(["--dry-run", "--execute"]);
  for (const arg of args) {
    if (!allowed.has(arg)) throw new Error(`Unsupported cleanup argument: ${arg}`);
  }
  if (args.has("--dry-run") && args.has("--execute")) {
    throw new Error("Choose either --dry-run or --execute, not both");
  }

  const root = process.cwd();
  const generatedRoot = resolve(root, "growth/.generated");
  const manifests = loadRepositoryManifests(root);
  const candidates = planCleanup({ generatedRoot, manifests });
  const execute = args.has("--execute");

  console.log(execute ? "George media cleanup: EXECUTE" : "George media cleanup: DRY RUN");
  for (const candidate of candidates) {
    console.log(
      `${candidate.relativePath} | ${candidate.size} bytes | ${candidate.reason}`,
    );
  }
  const summary = executeCleanup(candidates, execute);
  console.log(`${summary.fileCount} eligible file(s), ${summary.totalBytes} byte(s)`);
  if (!execute) console.log("No files deleted. Pass --execute explicitly to delete listed files.");
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null;
if (invokedPath && fileURLToPath(import.meta.url) === invokedPath) runCli();
