import { afterEach, expect, it, vi } from "vitest";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
vi.mock("server-only", () => ({}));
import { importApprovedBatch, importApprovedHostedBatch, validateApprovedState, type ApprovedImportStore } from "../approved-ingest";
import type { ReviewMedia, ReviewState } from "../types";
import { apply, approved, current, digest } from "../domain";
afterEach(() => vi.unstubAllEnvs());
const dir = "growth/promotions/2026-10-19-25-approved";
async function input() { return JSON.parse(await readFile(dir + "/approved-review-state.json", "utf8")) as ReviewState; }
async function loader() {
  const manifest = JSON.parse(await readFile(dir + "/final-media-manifest.json", "utf8"));
  return async (media: ReviewMedia) => readFile(manifest.assets.find((a: { sha256: string }) => a.sha256 === media.id).path);
}
function store() {
  let state: ReviewState | undefined;
  const objects = new Map<string, Buffer>();
  const api: ApprovedImportStore = {
    exists: vi.fn(async () => Boolean(state)), read: vi.fn(async () => ({ state: state!, revision: 1 })),
    upload: vi.fn(async (m, b) => { if (!objects.has(m.id)) objects.set(m.id, b); else expect(objects.get(m.id)).toEqual(b); }),
    media: vi.fn(async m => objects.get(m.id)!),
    compareSwap: vi.fn(async (_revision, value) => { if (state) return false; state = structuredClone(value); return true; }),
  };
  return { api, objects, set: (value: ReviewState) => { state = value; } };
}
it("retains all versions and exact owner approval; repeat import verifies without uploads", async () => {
  const s = await input(), h = store(), load = await loader();
  const result = await importApprovedBatch(s, h.api, load);
  expect(result.executionEnabled).toBe(false); expect(result.state.versions).toHaveLength(5);
  expect(approved(result.state, current(result.state))).toBe(true); expect(h.objects.size).toBe(20);
  expect((await importApprovedBatch(s, h.api, load)).alreadyImported).toBe(true);
  expect(h.api.upload).toHaveBeenCalledTimes(20); expect(h.api.compareSwap).toHaveBeenCalledTimes(1);
});
it("rejects changed content, history or owner audit before store access", async () => {
  for (const mutate of [(s: ReviewState) => { s.actions.at(-1)!.text += "changed"; }, (s: ReviewState) => { s.versions[0].content.theme += "changed"; }, (s: ReviewState) => { s.versions.at(-1)!.content.posts[0].caption += "changed"; }]) {
    const s = await input(), h = store(); mutate(s);
    await expect(importApprovedBatch(s, h.api, await loader())).rejects.toThrow();
    expect(h.api.exists).not.toHaveBeenCalled(); expect(h.api.upload).not.toHaveBeenCalled();
  }
});
it("preflights all media before any write; rejects corruption or missing bytes", async () => {
  const s = await input(), h = store(), load = await loader();
  await expect(importApprovedBatch(s, h.api, async m => m.id === s.versions.at(-1)!.content.media[0].id ? Buffer.from("corrupt") : load(m))).rejects.toThrow("integrity");
  expect(h.api.upload).not.toHaveBeenCalled(); expect(h.api.exists).not.toHaveBeenCalled();
  await expect(importApprovedBatch(s, h.api, async () => { throw Error("missing"); })).rejects.toThrow("missing");
});
it("concurrent imports cannot create a second review or replace history", async () => {
  const s = await input(), h = store(), load = await loader();
  const outcomes = await Promise.allSettled([importApprovedBatch(s, h.api, load), importApprovedBatch(s, h.api, load)]);
  expect(outcomes.some(o => o.status === "fulfilled")).toBe(true); expect(h.objects.size).toBe(20);
  expect(digest((await h.api.read()).state)).toBe(digest(s));
  const changed = structuredClone(s); changed.actions.push({ ...changed.actions.at(-1)!, requestId: "other" }); h.set(changed);
  await expect(importApprovedBatch(s, h.api, load)).rejects.toThrow("differs");
});
it("private-store failures and uploaded corruption prevent review creation", async () => {
  const s = await input(), h = store(), load = await loader();
  vi.mocked(h.api.upload).mockRejectedValueOnce(Error("Bucket not private"));
  await expect(importApprovedBatch(s, h.api, load)).rejects.toThrow("not private");
  expect(h.api.compareSwap).not.toHaveBeenCalled();
  vi.mocked(h.api.media).mockResolvedValue(Buffer.from("tampered"));
  await expect(importApprovedBatch(s, h.api, load)).rejects.toThrow("integrity");
  expect(h.api.compareSwap).not.toHaveBeenCalled();
});
it("all 13 references resolve; all 3 main-video posts use the approved replacement", async () => {
  const s = await input(), v = validateApprovedState(s), load = await loader();
  expect(v.content.posts).toHaveLength(13);
  const replacement = "296114e1c4489c48e7e60169f4060af5ee2242ff575b7ce5db761341f00ef409";
  expect(v.content.posts.filter(p => p.packageId === "main-airflow-area").map(p => p.media)).toEqual([[replacement], [replacement], [replacement]]);
  const m = v.content.media.find(m => m.id === replacement)!;
  expect(createHash("sha256").update(await load(m)).digest("hex")).toBe(replacement);
});
it("replaying the same owner approval does not duplicate its audit action", async () => {
  const s = await input(), before = digest(s), count = s.actions.length;
  apply(s, structuredClone(s.actions.at(-1)!));
  expect(digest(s)).toBe(before); expect(s.actions).toHaveLength(count);
});
it("the hosted entry remains disabled without existing explicit import gates", async () => {
  vi.stubEnv("WEEKLY_CONTENT_ENABLED", "false");
  await expect(importApprovedHostedBatch(await input(), await loader())).rejects.toThrow("disabled");
});
