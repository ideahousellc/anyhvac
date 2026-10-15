import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { digest, ReviewError, validate } from "./domain";
import { HostedReviewStore } from "./hosted";
import { ownerId } from "./storage";
import type { ReviewContent, ReviewState } from "./types";
import { FIXTURE_DIGEST } from "./fixture-file";
// Private ingestion only: existing historical assets, no generation/public hosting/scheduling.
export async function importHistoricalFixture(content: ReviewContent) {
  if (digest(content) !== FIXTURE_DIGEST) throw new ReviewError("Only the exact reviewed original fixture is accepted.", 422);
  validate(content);
  if (content.batchId !== "anyhvac-week-2026-10-12" || (process.env.WEEKLY_CONTENT_BATCH_ID ?? content.batchId) !== content.batchId || content.media.reduce((s, m) => s + m.bytes, 0) > 100000000) throw new ReviewError("Only the historical fixture is supported.", 422);
  const manifest: { assets: { file: string; sha256: string; bytes: number }[] } = JSON.parse(await readFile(path.join(process.cwd(), "growth/promotions/2026-10-12-18/media-manifest.json"), "utf8"));
  if (content.media.length !== manifest.assets.length) throw new ReviewError("Historical asset inventory incomplete.", 422);
  const store = new HostedReviewStore(ownerId(), content.batchId);
  if (await store.exists()) throw new ReviewError("This batch is already imported. Existing history was preserved.");
  for (const media of content.media) {
    if (!/^[a-z0-9-]+\.(png|mp4)$/.test(media.file) || media.type !== (media.file.endsWith(".mp4") ? "video/mp4" : "image/png") || !manifest.assets.some(a => a.file === media.file && a.sha256 === media.id && a.bytes === media.bytes)) throw new ReviewError("Unrecognized historical media.", 422);
    await store.upload(media, await readFile(path.join(process.cwd(), "public/social/2026-10-12-18", media.file)));
  }
  const state: ReviewState = { versions: [{ number: 1, digest: digest(content), content, createdAt: new Date().toISOString(), reason: "Owner imported historical review fixture; no execution permission." }], actions: [] };
  if (!await store.compareSwap(0, state)) throw new ReviewError("Existing hosted review preserved. Import did not replace it.");
  return state;
}
