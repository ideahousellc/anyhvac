import { afterEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { apply, approved, canonical, current, digest, validate } from "../domain";
import type { ReviewAction, ReviewContent, ReviewPost, ReviewState } from "../types";
vi.mock("server-only", () => ({}));
import { directory, enabled, mutate, readState } from "../storage";
const content = (): ReviewContent => {
  const media = { id: digest("media"), sha256: digest("media"), file: "test.png", bytes: 1, type: "image/png" as const };
  const packages = Array.from({ length: 5 }, (_, i) => ({ id: "package-" + i, title: "Package", purpose: "Education", primaryMetric: "Saves", technicalBoundary: "Illustrative", provenance: [{ source: "Original fixture", license: "Original", credit: "AnyHVAC", evidence: [digest("source")] }] }));
  const posts = packages.flatMap((p, i) => (["linkedin", "instagram", ...(i < 3 ? ["youtube"] : [])] as ReviewPost["platform"][]).map(platform => ({ id: p.id + platform, packageId: p.id, platform, title: "Title", caption: "Caption", destination: "https://www.anyhvac.net/tools/duct-calculator", scheduledAt: "2026-10-12T17:00:00-04:00", channelId: "channel-" + platform, media: [media.id], settings: { instagram: { type: "post" }, youtube: { privacy: "public" } }, alt: ["Artwork"], historicalStatus: "SCHEDULED" })));
  return { batchId: "fixture", agentId: "anyhvac.george", theme: "Education", timezone: "America/New_York", fixture: true, packages, posts, media: [media], qa: { technical: "PASS", rights: "PASS", media: "PASS", evidence: [digest("qa")] } };
};
const state = (): ReviewState => { const c = content(); return { versions: [{ number: 1, digest: digest(c), createdAt: "2026-10-08T00:00:00Z", reason: "Import", content: c }], actions: [] }; };
const action = (s: ReviewState, kind: ReviewAction["action"]): ReviewAction => ({ requestId: randomUUID(), action: kind, version: current(s).number, digest: current(s).digest, at: "2026-10-08T00:00:00Z" });
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });
describe("immutable weekly review", () => {
  it("canonicalizes object keys but preserves carousel order", () => {
    expect(canonical({ b: 2, a: 1 })).toBe(canonical({ a: 1, b: 2 })); expect(digest(["a", "b"])).not.toBe(digest(["b", "a"]));
  });
  it("covers caption, time, channel, settings and media identity in digest", () => {
    const c = content(); for (const change of [(x: ReviewContent) => { x.posts[0].caption += "!"; }, (x: ReviewContent) => { x.posts[0].scheduledAt = "2026-10-13T17:00:00-04:00"; }, (x: ReviewContent) => { x.posts[0].channelId += "!"; }, (x: ReviewContent) => { x.posts[0].settings.instagram = { type: "reel" }; }, (x: ReviewContent) => { x.media[0].sha256 = "b".repeat(64); }]) { const altered = structuredClone(c); change(altered); expect(digest(altered)).not.toBe(digest(c)); }
  });
  it("rejects missing media, provenance, license and QA evidence", () => {
    for (const change of [(x: ReviewContent) => { x.media = []; }, (x: ReviewContent) => { x.packages[0].provenance = []; }, (x: ReviewContent) => { x.packages[0].provenance[0].license = ""; }, (x: ReviewContent) => { x.qa.evidence = []; }]) { const altered = content(); change(altered); expect(() => validate(altered)).toThrow(); }
  });
  it("rejects wrong cadence and agent identity", () => { const c = content(); c.posts.pop(); expect(() => validate(c)).toThrow(); });
  it("keeps approval exact and idempotent; changed request replay fails", () => {
    const s = state(), a = action(s, "approve"); apply(s, a); apply(s, { ...a, at: "later" }); expect(s.actions).toHaveLength(1); expect(approved(s, current(s))).toBe(true); expect(() => apply(s, { ...a, action: "revision" })).toThrow();
  });
  it("records revisions, blocks approval until resolved and preserves old immutable content", () => {
    const s = state(); apply(s, action(s, "approve")); const original = canonical(s.versions[0]);
    apply(s, { ...action(s, "revision"), target: s.versions[0].content.posts[0].id, text: "Clarify boundary" }); expect(approved(s, current(s))).toBe(false); expect(() => apply(s, action(s, "approve"))).toThrow();
    apply(s, { ...action(s, "edit"), target: s.versions[0].content.posts[0].id, text: "Clarify boundary", caption: "Revised caption" }); expect(canonical(s.versions[0])).toBe(original); expect(current(s).number).toBe(2); expect(() => apply(s, action(s, "approve"))).toThrow();
    apply(s, { ...action(s, "review"), text: "Checked claims and preserved attribution against original source." }); apply(s, action(s, "approve")); expect(approved(s, current(s))).toBe(true); expect(current(s).number).toBe(3);
  });
  it("rejects stale actions and detects corrupted stored content", () => {
    const s = state(), stale = action(s, "approve"); apply(s, { ...action(s, "edit"), target: s.versions[0].content.posts[0].id, text: "Change", caption: "New" }); expect(() => apply(s, stale)).toThrow(); s.versions[0].content.posts[0].caption = "Tampered"; expect(() => current(s)).toThrow("integrity");
  });
  it("cannot enable local storage in production", () => { vi.stubEnv("WEEKLY_CONTENT_ENABLED", "true"); vi.stubEnv("NODE_ENV", "production"); expect(enabled()).toBe(false); expect(directory).toThrow(); });
  it("persists across reopen, refuses missing media approval, and fails closed on a stale lock", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "anyhvac-weekly-test-"));
    vi.spyOn(process, "cwd").mockReturnValue(root); vi.stubEnv("NODE_ENV", "test"); vi.stubEnv("WEEKLY_CONTENT_ENABLED", "true"); vi.stubEnv("ADMIN_USERNAME", "fixture-owner");
    const dir = directory(); await mkdir(dir, { recursive: true }); const s = state(); await writeFile(path.join(dir, "state.json"), JSON.stringify(s));
    try {
      await expect(mutate(action(s, "approve"))).rejects.toThrow(); expect((await readState()).actions).toHaveLength(0);
      const a = { ...action(s, "revision"), target: s.versions[0].content.posts[0].id, text: "Check statement" }; await mutate(a); await mutate(a); expect((await readState()).actions).toHaveLength(1);
      const before = await readFile(path.join(dir, "state.json"), "utf8"); await writeFile(path.join(dir, "state.lock"), "interrupted"); await expect(mutate({ ...a, requestId: randomUUID() })).rejects.toThrow("lock"); expect(await readFile(path.join(dir, "state.json"), "utf8")).toBe(before);
    } finally { if (!path.resolve(root).startsWith(path.resolve(tmpdir()) + path.sep + "anyhvac-weekly-test-")) throw Error("Unsafe test cleanup"); await rm(root, { recursive: true, force: true }); }
  });
});
