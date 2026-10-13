import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, open, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { apply, current, ReviewError, verify } from "./domain";
import type { ReviewAction, ReviewMedia, ReviewState } from "./types";
import { HostedReviewStore } from "./hosted";
export function enabled() { return process.env.WEEKLY_CONTENT_ENABLED === "true" && (process.env.WEEKLY_CONTENT_STORAGE === "supabase" || process.env.NODE_ENV !== "production"); }
export function ownerId() { if (!process.env.ADMIN_USERNAME) throw new ReviewError("Owner configuration unavailable.", 503); return createHash("sha256").update("anyhvac-agent-owner:" + process.env.ADMIN_USERNAME).digest("hex"); }
function hosted() {
  if (!enabled()) throw new ReviewError("Weekly review disabled.", 503);
  const batch = process.env.WEEKLY_CONTENT_BATCH_ID ?? "anyhvac-week-2026-10-12";
  if (!/^anyhvac-week-[0-9-]+$/.test(batch)) throw new ReviewError("Invalid configured batch.", 503);
  return new HostedReviewStore(ownerId(), batch);
}
export function directory() {
  if (!enabled() || process.env.NODE_ENV === "production") throw new ReviewError("Local review storage is not permitted in production.", 503);
  const owner = ownerId();
  return path.join(process.cwd(), ".local/agent-inbox/weekly", owner);
}
export async function readState(): Promise<ReviewState> { if (process.env.WEEKLY_CONTENT_STORAGE === "supabase") return (await hosted().read()).state; const value = JSON.parse(await readFile(path.join(directory(), "state.json"), "utf8")); verify(value); return value; }
export async function mediaBytes(media: ReviewMedia) {
  if (!/^[a-f0-9]{64}$/.test(media.id) || media.bytes > 50000000) throw new ReviewError("Invalid media identity or size.", 503);
  const bytes = process.env.WEEKLY_CONTENT_STORAGE === "supabase" ? await hosted().media(media) : await readFile(path.join(directory(), "media", media.id));
  if (bytes.length !== media.bytes || createHash("sha256").update(bytes).digest("hex") !== media.sha256) throw new ReviewError("Media integrity check failed.", 503);
  return bytes;
}
export async function mutate(action: ReviewAction) {
  if (process.env.WEEKLY_CONTENT_STORAGE === "supabase") {
    const store = hosted();
    for (let attempt = 0; attempt < 8; attempt++) {
      const { revision, state } = await store.read();
      if (action.action === "approve") for (const m of current(state).content.media) await mediaBytes(m);
      apply(state, action);
      if (await store.compareSwap(revision, state)) return state;
    }
    throw new ReviewError("Concurrent review changed. Refresh; retry only the same action.", 409);
  }
  const dir = directory(); await mkdir(dir, { recursive: true });
  let lock; try { lock = await open(path.join(dir, "state.lock"), "wx"); } catch { throw new ReviewError("Review is busy or interrupted. Inspect the local lock before retrying.", 503); }
  let temporary: string | undefined;
  try {
    const state = await readState();
    if (action.action === "approve") for (const m of current(state).content.media) await mediaBytes(m);
    apply(state, action);
    temporary = path.join(dir, randomUUID() + ".tmp");
    await writeFile(temporary, JSON.stringify(state), { mode: 0o600 }); await rename(temporary, path.join(dir, "state.json")); temporary = undefined;
    return state;
  } finally { if (temporary) await unlink(temporary).catch(() => {}); await lock.close(); await unlink(path.join(dir, "state.lock")); }
}
