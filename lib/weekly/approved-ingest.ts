import "server-only";
import { createHash } from "node:crypto";
import { approved, current, digest, ReviewError, validate, verify } from "./domain";
import { APPROVED_BATCH_ID, APPROVED_CONTENT_DIGEST, APPROVED_STATE_DIGEST } from "./approved-batch";
import type { ReviewMedia, ReviewState } from "./types";
import { HostedReviewStore } from "./hosted";
import { enabled, ownerId } from "./storage";

// Production caller must use HostedReviewStore(ownerId(), APPROVED_BATCH_ID).
// Its private bucket enforcement, no-upsert upload and exact-object recovery remain mandatory.
export interface ApprovedImportStore {
  exists(): Promise<boolean>;
  read(): Promise<{ state: ReviewState; revision: number }>;
  upload(media: ReviewMedia, bytes: Buffer): Promise<void>;
  media(media: ReviewMedia): Promise<Buffer>;
  compareSwap(revision: number, state: ReviewState): Promise<boolean>;
}
export function validateApprovedState(state: ReviewState) {
  verify(state);
  const version = current(state);
  if (digest(state) !== APPROVED_STATE_DIGEST || version.number !== 5 || version.digest !== APPROVED_CONTENT_DIGEST || version.content.batchId !== APPROVED_BATCH_ID || !approved(state, version)) throw new ReviewError("Only the exact owner-approved revision 5 and approval history may be ingested.", 422);
  validate(version.content);
  return version;
}
function checkMedia(media: ReviewMedia, bytes: Buffer) {
  if (!/^[a-z0-9-]+\.(png|mp4)$/.test(media.file) || media.type !== (media.file.endsWith(".mp4") ? "video/mp4" : "image/png") || bytes.length !== media.bytes || bytes.length > 50000000 || createHash("sha256").update(bytes).digest("hex") !== media.id) throw new ReviewError("Approved media integrity mismatch. Nothing may replace it.", 422);
}
export async function importApprovedBatch(state: ReviewState, store: ApprovedImportStore, load: (media: ReviewMedia) => Promise<Buffer>) {
  const version = validateApprovedState(state);
  if (version.content.media.reduce((sum, m) => sum + m.bytes, 0) > 100000000) throw new ReviewError("Approved batch too large.", 422);
  // Preflight the entire inventory before the first upload. No partial import on a bad input.
  const bytes = await Promise.all(version.content.media.map(async media => { const value = await load(media); checkMedia(media, value); return value; }));
  if (await store.exists()) {
    const saved = (await store.read()).state;
    if (digest(saved) !== APPROVED_STATE_DIGEST) throw new ReviewError("Existing review differs. Preserve its history; reconcile without replacement.");
    for (const media of version.content.media) checkMedia(media, await store.media(media));
    return { state: saved, alreadyImported: true, executionEnabled: false as const };
  }
  for (let i = 0; i < bytes.length; i++) await store.upload(version.content.media[i], bytes[i]);
  for (const media of version.content.media) checkMedia(media, await store.media(media));
  if (!await store.compareSwap(0, state)) throw new ReviewError("Concurrent or ambiguous import. Check persisted history before retrying.");
  return { state, alreadyImported: false, executionEnabled: false as const };
}
// No route invokes this yet. A separately authorized server-side operator path
// must supply the verified local packet; no browser body uploads or public URLs.
export async function importApprovedHostedBatch(state: ReviewState, load: (media: ReviewMedia) => Promise<Buffer>) {
  if (!enabled() || process.env.WEEKLY_CONTENT_STORAGE !== "supabase" || process.env.WEEKLY_CONTENT_IMPORT_ENABLED !== "true") throw new ReviewError("Approved private import disabled.", 503);
  return importApprovedBatch(state, new HostedReviewStore(ownerId(), APPROVED_BATCH_ID), load);
}
// Browser uploads are already immutable private objects. Revalidate bytes before
// committing, without re-uploading all objects inside one serverless request.
export async function commitApprovedStagedBatch(state: ReviewState, store: ApprovedImportStore) {
  const version = validateApprovedState(state);
  await Promise.all(version.content.media.map(async media => checkMedia(media, await store.media(media))));
  if (await store.exists()) {
    const saved = (await store.read()).state;
    if (digest(saved) !== APPROVED_STATE_DIGEST) throw new ReviewError("Existing review differs. Preserve its history; reconcile without replacement.");
    return { state: saved, alreadyImported: true, executionEnabled: false as const };
  }
  if (!await store.compareSwap(0, state)) throw new ReviewError("Concurrent or ambiguous import. Check persisted history before retrying.");
  return { state, alreadyImported: false, executionEnabled: false as const };
}
