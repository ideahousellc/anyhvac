import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, open, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { apply, current, digest, ReviewError, verify } from "./domain";
import type { ReviewAction, ReviewMedia, ReviewState } from "./types";
import { HostedReviewStore } from "./hosted";
import { selectedBatch } from "./selection";
import { APPROVED_BATCH_ID, APPROVED_STATE_DIGEST } from "./approved-batch";
export function enabled() { return process.env.WEEKLY_CONTENT_ENABLED === "true" && (process.env.WEEKLY_CONTENT_STORAGE === "supabase" || process.env.NODE_ENV !== "production"); }
export function ownerId() { if (!process.env.ADMIN_USERNAME) throw new ReviewError("Owner configuration unavailable.", 503); return createHash("sha256").update("anyhvac-agent-owner:" + process.env.ADMIN_USERNAME).digest("hex"); }
function hosted(selection?: string) {
  if (!enabled()) throw new ReviewError("Weekly review disabled.", 503);
  const batch = selection === undefined ? process.env.WEEKLY_CONTENT_BATCH_ID ?? "anyhvac-week-2026-10-12" : selectedBatch(selection);
  if (!/^anyhvac-week-[0-9-]+$/.test(batch)) throw new ReviewError("Invalid configured batch.", 503);
  return new HostedReviewStore(ownerId(), batch);
}
export async function importStatus() { const store = hosted(); if (!await store.exists()) return { alreadyImported: false }; const content = current((await store.read()).state).content; return { alreadyImported: true, counts: { packages: content.packages.length, posts: content.posts.length, media: content.media.length } }; }
export function directory(selection?: string) {
  if (!enabled() || process.env.NODE_ENV === "production") throw new ReviewError("Local review storage is not permitted in production.", 503);
  const owner = ownerId();
  const base = path.join(process.cwd(), ".local/agent-inbox/weekly", owner);
  return selection && selectedBatch(selection) !== "anyhvac-week-2026-10-12" ? path.join(base, selection) : base;
}
export async function readState(selection?: string): Promise<ReviewState> {
  const value: ReviewState = process.env.WEEKLY_CONTENT_STORAGE === "supabase" ? (await hosted(selection).read()).state : JSON.parse(await readFile(path.join(directory(selection), "state.json"), "utf8"));
  verify(value);
  if (selection === APPROVED_BATCH_ID && digest(value) !== APPROVED_STATE_DIGEST) throw new ReviewError("Approved history integrity failed.", 503);
  return value;
}
export async function mediaBytes(media: ReviewMedia, selection?: string) {
  if (!/^[a-f0-9]{64}$/.test(media.id) || media.bytes > 50000000) throw new ReviewError("Invalid media identity or size.", 503);
  const bytes = process.env.WEEKLY_CONTENT_STORAGE === "supabase" ? await hosted(selection).media(media) : await readFile(path.join(directory(selection), "media", media.id));
  if (bytes.length !== media.bytes || createHash("sha256").update(bytes).digest("hex") !== media.sha256) throw new ReviewError("Media integrity check failed.", 503);
  return bytes;
}
export async function mutate(action: ReviewAction, selection?: string) {
  if ((selection ?? process.env.WEEKLY_CONTENT_BATCH_ID) === APPROVED_BATCH_ID) throw new ReviewError("Approved revision is immutable.");
  if (process.env.WEEKLY_CONTENT_STORAGE === "supabase") {
    const store = hosted(selection);
    for (let attempt = 0; attempt < 8; attempt++) {
      const { revision, state } = await store.read();
      if (action.action === "approve") for (const m of current(state).content.media) await mediaBytes(m, selection);
      apply(state, action);
      if (await store.compareSwap(revision, state)) return state;
    }
    throw new ReviewError("Concurrent review changed. Refresh; retry only the same action.", 409);
  }
  const dir = directory(selection); await mkdir(dir, { recursive: true });
  let lock; try { lock = await open(path.join(dir, "state.lock"), "wx"); } catch { throw new ReviewError("Review is busy or interrupted. Inspect the local lock before retrying.", 503); }
  let temporary: string | undefined;
  try {
    const state = await readState(selection);
    if (action.action === "approve") for (const m of current(state).content.media) await mediaBytes(m, selection);
    apply(state, action);
    temporary = path.join(dir, randomUUID() + ".tmp");
    await writeFile(temporary, JSON.stringify(state), { mode: 0o600 }); await rename(temporary, path.join(dir, "state.json")); temporary = undefined;
    return state;
  } finally { if (temporary) await unlink(temporary).catch(() => {}); await lock.close(); await unlink(path.join(dir, "state.lock")); }
}
