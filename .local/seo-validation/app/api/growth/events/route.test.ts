import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const record = vi.hoisted(() => vi.fn());
vi.mock("@/lib/growth/repository", () => ({ recordGrowthEvent: record }));
import { POST } from "./route";

function request(body: unknown, options: { origin?: string; cookie?: string; raw?: boolean } = {}) {
  return new NextRequest("https://www.anyhvac.net/api/growth/events", {
    method: "POST", body: options.raw ? String(body) : JSON.stringify(body),
    headers: { "Content-Type": "application/json", "Origin": options.origin ?? "https://www.anyhvac.net", "Sec-Fetch-Site": "same-origin", ...(options.cookie ? { Cookie: options.cookie } : {}) },
  });
}
const event = () => ({ event: "resource_view", placement: null, viewId: "d3e15125-4d43-4dc3-a15d-f52f5013ed93", viewStartedAt: Date.now() });

describe("bounded private measurement ingestion", () => {
  afterEach(() => vi.unstubAllEnvs());
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("GROWTH_MEASUREMENT_ENABLED", "true");
    record.mockReset().mockResolvedValue(undefined);
  });
  it("never writes when disabled, in development, cross-origin or with admin cookie", async () => {
    vi.stubEnv("GROWTH_MEASUREMENT_ENABLED", "false");
    expect((await POST(request(event()))).status).toBe(503);
    vi.stubEnv("GROWTH_MEASUREMENT_ENABLED", "true");
    vi.stubEnv("NODE_ENV", "development");
    expect((await POST(request(event()))).status).toBe(503);
    vi.stubEnv("NODE_ENV", "production");
    expect((await POST(request(event(), { origin: "https://evil.example" }))).status).toBe(403);
    expect((await POST(request(event(), { cookie: "anyhvac_admin_session=expired" }))).status).toBe(204);
    expect(record).not.toHaveBeenCalled();
  });
  it("rejects malformed JSON, oversize bodies and unexpected private data", async () => {
    expect((await POST(request("{", { raw: true }))).status).toBe(400);
    expect((await POST(request("x".repeat(513), { raw: true }))).status).toBe(413);
    expect((await POST(request({ ...event(), email: "private@example.test" }))).status).toBe(400);
    expect(record).not.toHaveBeenCalled();
  });
  it("reports unavailable persistence instead of claiming successful collection", async () => {
    record.mockRejectedValueOnce(new Error("missing schema"));
    expect((await POST(request(event()))).status).toBe(503);
    const value = event();
    expect((await POST(request(value))).status).toBe(204);
    expect(record).toHaveBeenLastCalledWith(value);
  });
  it("rejects missing origin, missing fetch-site and noncanonical hosts", async () => {
    const missingOrigin = request(event()); missingOrigin.headers.delete("origin");
    const missingSite = request(event()); missingSite.headers.delete("sec-fetch-site");
    expect((await POST(missingOrigin)).status).toBe(403);
    expect((await POST(missingSite)).status).toBe(403);
    expect((await POST(new NextRequest("https://preview.vercel.app/api/growth/events", {
      method: "POST", body: JSON.stringify(event()), headers: { origin: "https://preview.vercel.app", "sec-fetch-site": "same-origin", "content-type": "application/json" },
    }))).status).toBe(403);
    expect(record).not.toHaveBeenCalled();
  });
  it("caps anonymous ingestion per process without tracking IPs", async () => {
    vi.resetModules();
    const { POST: freshPost } = await import("./route");
    for (let index = 0; index < 120; index++) expect((await freshPost(request(event()))).status).toBe(204);
    expect((await freshPost(request(event()))).status).toBe(429);
    expect(record).toHaveBeenCalledTimes(120);
  });
});
