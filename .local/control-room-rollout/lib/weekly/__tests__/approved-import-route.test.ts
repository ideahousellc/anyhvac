import { afterEach, expect, it, vi } from "vitest";
import { readFile } from "node:fs/promises";
import { NextRequest } from "next/server";
import type { ReviewMedia, ReviewState } from "../types";
vi.mock("server-only", () => ({}));
const mock = vi.hoisted(() => ({ state: undefined as ReviewState | undefined, objects: new Map<string, Buffer>(), upload: vi.fn(), cas: vi.fn(), targets: [] as string[], publicBucket: false, loseAck: false }));
vi.mock("../storage", () => ({ enabled: () => process.env.WEEKLY_CONTENT_ENABLED === "true", ownerId: () => "isolated-owner" }));
vi.mock("../hosted", () => ({ HostedReviewStore: class {
  constructor(_owner: string, batch: string) { mock.targets.push(batch); }
  async exists() { return Boolean(mock.state); }
  async read() { return { state: mock.state!, revision: 1 }; }
  async upload(m: ReviewMedia, bytes: Buffer) { if (mock.publicBucket) throw Error("Private bucket required"); mock.upload(m.id); if (!mock.objects.has(m.id)) mock.objects.set(m.id, bytes); if (mock.loseAck) throw Error("Connection lost after private upload"); }
  async media(m: ReviewMedia) { if (mock.publicBucket || !mock.objects.has(m.id)) throw Error("Missing private object"); return mock.objects.get(m.id)!; }
  async compareSwap(_revision: number, s: ReviewState) { mock.cas(); if (mock.state) return false; mock.state = structuredClone(s); return true; }
} }));
import { GET, POST } from "@/app/api/admin/weekly/approved-import/route";
import { approvedImportMedia, approvedSource } from "../approved-source";
import { APPROVED_BATCH_ID, APPROVED_STATE_DIGEST } from "../approved-batch";
import { digest } from "../domain";
import { createAdminSession } from "@/lib/admin/session";
const secret = "isolated-approved-import-owner-session-32-characters";
function request(method = "GET", value?: object | Buffer, id?: string, owner = true, origin = "http://localhost") {
  vi.stubEnv("ADMIN_SESSION_SECRET", secret); vi.stubEnv("WEEKLY_CONTENT_ENABLED", "true"); vi.stubEnv("WEEKLY_CONTENT_STORAGE", "supabase"); vi.stubEnv("WEEKLY_CONTENT_APPROVED_IMPORT_ENABLED", "true");
  const type = id ? approvedImportMedia().find(m => m.id === id)?.type ?? "application/octet-stream" : "application/json";
  return new NextRequest("http://localhost/api/admin/weekly/approved-import" + (id ? "?media=" + id : ""), { method, headers: { Origin: origin, "Content-Type": type, ...(owner ? { Cookie: "anyhvac_admin_session=" + createAdminSession(secret) } : {}) }, ...(value ? { body: Buffer.isBuffer(value) ? new Uint8Array(value) : JSON.stringify(value) } : {}) });
}
async function bytes(m: ReviewMedia) {
  const current = JSON.parse(await readFile("growth/promotions/2026-10-19-25-approved/final-media-manifest.json", "utf8"));
  const file = current.assets.find((a: { sha256: string }) => a.sha256 === m.id)?.path ?? "growth/.generated/weekly/2026-10-19-25/media/" + m.file;
  return readFile(file);
}
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); mock.state = undefined; mock.objects.clear(); mock.targets.length = 0; mock.publicBucket = false; mock.loseAck = false; });
it("protects status and every upload/commit with owner authentication and dedicated gates", async () => {
  expect((await GET(request("GET", undefined, undefined, false))).status).toBe(401);
  expect((await POST(request("POST", { action: "finish" }, undefined, false))).status).toBe(401);
  const disabled = request(); vi.stubEnv("WEEKLY_CONTENT_APPROVED_IMPORT_ENABLED", "false"); expect((await GET(disabled)).status).toBe(503);
  expect(mock.targets).toHaveLength(0);
});
it("rejects cross-origin commits/uploads, spoofed fields and unknown IDs", async () => {
  expect((await POST(request("POST", { action: "finish" }, undefined, true, "https://evil.test"))).status).toBe(403);
  expect((await POST(request("POST", { action: "finish", ownerId: "spoof" }))).status).toBe(400);
  expect((await POST(request("POST", Buffer.from("bad"), "f".repeat(64)))).status).toBe(422);
  expect(mock.upload).not.toHaveBeenCalled(); expect(mock.cas).not.toHaveBeenCalled();
});
it("checks stream size/hash before upload and rejects public storage or lost acknowledgements", async () => {
  const m = approvedImportMedia()[0];
  expect((await POST(request("POST", Buffer.from("bad"), m.id))).status).toBe(422);
  expect((await POST(request("POST", Buffer.alloc(m.bytes + 1), m.id))).status).toBe(413);
  mock.publicBucket = true; expect((await POST(request("POST", await bytes(m), m.id))).status).toBe(503);
  mock.publicBucket = false; mock.loseAck = true; expect((await POST(request("POST", await bytes(m), m.id))).status).toBe(503);
  expect(mock.cas).not.toHaveBeenCalled(); expect(mock.objects.has(m.id)).toBe(true);
});
it("requires all 21 files; preserves approval/history, verifies persistence and blocks repeat writes", async () => {
  const media = approvedImportMedia(); expect(media).toHaveLength(21);
  expect((await POST(request("POST", { action: "finish" }))).status).toBe(503); expect(mock.cas).not.toHaveBeenCalled();
  for (const m of media) expect((await POST(request("POST", await bytes(m), m.id))).status).toBe(200);
  const result = await POST(request("POST", { action: "finish" })); expect(result.status).toBe(200);
  expect(digest(mock.state)).toBe(APPROVED_STATE_DIGEST); expect(mock.state!.versions).toHaveLength(5);
  expect(mock.targets.every(id => id === APPROVED_BATCH_ID)).toBe(true);
  expect((await (await GET(request())).json()).alreadyImported).toBe(true);
  const writes = mock.upload.mock.calls.length;
  expect((await POST(request("POST", await bytes(media[0]), media[0].id))).status).toBe(409);
  expect(mock.upload).toHaveBeenCalledTimes(writes); expect(mock.cas).toHaveBeenCalledTimes(1);
});
it("rejects persisted approval tampering and never replaces the row", async () => {
  mock.state = approvedSource(); mock.state.actions.at(-1)!.text += "altered";
  expect((await GET(request())).status).toBe(422);
  expect((await POST(request("POST", { action: "finish" }))).status).toBe(409);
  expect(mock.cas).not.toHaveBeenCalled();
});
