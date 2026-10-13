import { afterEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
vi.mock("server-only", () => ({}));
const mock = vi.hoisted(() => ({ mutate: vi.fn(), read: vi.fn(), bytes: vi.fn(), ingest: vi.fn() }));
vi.mock("../storage", () => ({ enabled: () => process.env.WEEKLY_CONTENT_ENABLED === "true", readState: mock.read, mutate: mock.mutate, mediaBytes: mock.bytes }));
vi.mock("../ingest", () => ({ importHistoricalFixture: mock.ingest }));
import { GET, POST } from "@/app/api/admin/weekly/route";
import { GET as media } from "@/app/api/admin/weekly/media/[id]/route";
import { POST as ingest } from "@/app/api/admin/weekly/import/route";
import { createAdminSession } from "@/lib/admin/session";
const secret = "test-owner-secret-at-least-32-characters";
function request(body?: object, owner = true, origin = "http://localhost") {
  vi.stubEnv("ADMIN_SESSION_SECRET", secret); vi.stubEnv("WEEKLY_CONTENT_ENABLED", "true");
  return new NextRequest("http://localhost/api/admin/weekly", { method: body ? "POST" : "GET", headers: { Origin: origin, "Content-Type": "application/json", ...(owner ? { Cookie: "anyhvac_admin_session=" + createAdminSession(secret) } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
}
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });
it("protects manifest/actions/media independently with existing owner sessions", async () => { expect((await GET(request(undefined, false))).status).toBe(401); expect((await POST(request({}, false))).status).toBe(401); expect((await media(request(undefined, false), { params: Promise.resolve({ id: "a".repeat(64) }) })).status).toBe(401); expect(mock.read).not.toHaveBeenCalled(); });
it("rejects cross-origin writes, arbitrary commands and extra approval fields", async () => { expect((await POST(request({}, true, "https://evil.test"))).status).toBe(403); for (const value of [{ action: "schedule" }, { action: "approve", secret: "not-allowed" }]) expect((await POST(request(value))).status).toBe(400); expect(mock.mutate).not.toHaveBeenCalled(); });
it("persists authenticated exact approval without execution authorization", async () => { mock.mutate.mockResolvedValue({ actions: [] }); const r = await POST(request({ action: "approve", version: 1, digest: "a".repeat(64), requestId: randomUUID() })); expect(r.status).toBe(200); expect((await r.json()).executionEnabled).toBe(false); expect(r.headers.get("cache-control")).toContain("no-store"); });
it("fails closed when disabled or storage fails", async () => { const req = request(); vi.stubEnv("WEEKLY_CONTENT_ENABLED", "false"); expect((await GET(req)).status).toBe(503); vi.stubEnv("WEEKLY_CONTENT_ENABLED", "true"); mock.read.mockRejectedValue(new Error("private filesystem path")); const r = await GET(req); expect(r.status).toBe(503); expect(JSON.stringify(await r.json())).not.toContain("filesystem"); });
it("requires owner authentication, dedicated import enablement and same-origin for private ingestion", async () => {
  expect((await ingest(request({ content: {} }, false))).status).toBe(401);
  expect((await ingest(request({ content: {} }))).status).toBe(503);
  vi.stubEnv("WEEKLY_CONTENT_STORAGE", "supabase"); vi.stubEnv("WEEKLY_CONTENT_IMPORT_ENABLED", "true");
  expect((await ingest(request({ content: {} }, true, "https://evil.test"))).status).toBe(403);
  expect((await ingest(request({ content: {}, ownerId: "spoof" }))).status).toBe(400);
  expect(mock.ingest).not.toHaveBeenCalled();
  mock.ingest.mockResolvedValue({ versions: [], actions: [] }); const r = await ingest(request({ content: {} })); expect(r.status).toBe(200); expect((await r.json()).executionEnabled).toBe(false);
});
it("serves private video ranges and rejects traversal, missing media and invalid ranges", async () => {
  const id = "a".repeat(64); mock.read.mockResolvedValue({ versions: [{ content: { media: [{ id, type: "video/mp4" }] } }] }); mock.bytes.mockResolvedValue(Buffer.from("0123456789"));
  const req = request(); req.headers.set("range", "bytes=2-5"); const r = await media(req, { params: Promise.resolve({ id }) }); expect(r.status).toBe(206); expect(await r.text()).toBe("2345"); expect(r.headers.get("content-range")).toBe("bytes 2-5/10"); expect(r.headers.get("cache-control")).toContain("no-store");
  req.headers.set("range", "bytes=100-200"); expect((await media(req, { params: Promise.resolve({ id }) })).status).toBe(416);
  expect((await media(request(), { params: Promise.resolve({ id: "../secret" }) })).status).toBe(404); expect((await media(request(), { params: Promise.resolve({ id: "b".repeat(64) }) })).status).toBe(404);
});
