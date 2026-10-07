import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { EMPTY_STATE } from "../types";
vi.mock("server-only", () => ({}));
const local = vi.hoisted(() => ({ state: { tasks: [] } as import("../types").InboxState }));
vi.mock("../storage", () => ({ inboxEnabled: () => process.env.AGENT_INBOX_ENABLED === "true", transaction: async (change: (state: import("../types").InboxState) => unknown) => change(local.state) }));
import { GET, POST, PATCH } from "@/app/api/admin/agents/route";
import { POST as runner } from "@/app/api/agent-runner/route";
import { createAdminSession } from "@/lib/admin/session";
const secret = "local-agent-inbox-test-secret-32-or-more-characters";
function owner(body?: object, cookie = true, origin = "http://localhost") {
  vi.stubEnv("ADMIN_SESSION_SECRET", secret); vi.stubEnv("AGENT_INBOX_ENABLED", "true");
  return new NextRequest("http://localhost/api/admin/agents", { method: body ? "POST" : "GET", headers: { "Content-Type": "application/json", Origin: origin, ...(cookie ? { Cookie: "anyhvac_admin_session=" + createAdminSession(secret) } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
}
function worker(body: object, token = secret, origin?: string) {
  vi.stubEnv("AGENT_INBOX_ENABLED", "true"); vi.stubEnv("AGENT_RUNNER_TOKEN", secret);
  return new NextRequest("http://localhost/api/agent-runner", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + token, ...(origin ? { Origin: origin } : {}) }, body: JSON.stringify(body) });
}
afterEach(() => { vi.unstubAllEnvs(); local.state = EMPTY_STATE(); });
describe("private agent endpoints", () => {
  it("stays disabled unless explicitly configured", async () => {
    const request = owner(); vi.stubEnv("AGENT_INBOX_ENABLED", "false"); expect((await GET(request)).status).toBe(503);
  });
  it("requires owner authentication and blocks cross-origin writes", async () => {
    expect((await GET(owner(undefined, false))).status).toBe(401);
    expect((await POST(owner({}, true, "https://evil.test"))).status).toBe(403);
    expect((await PATCH(owner({}, false))).status).toBe(401);
  });
  it("rejects unknown agents, arbitrary fields and overlong prompts", async () => {
    for (const value of [{ agentId: "outsider", requestId: randomUUID(), prompt: "hi" }, { agentId: "anyhvac.george", requestId: randomUUID(), prompt: "hi", path: ".env.local" }, { agentId: "anyhvac.george", requestId: randomUUID(), prompt: "x".repeat(6001) }]) expect((await POST(owner(value))).status).toBe(400);
  });
  it("persists an owner message once and exposes no lease fields", async () => {
    const message = { agentId: "anyhvac.george", requestId: randomUUID(), prompt: "hi" };
    expect((await POST(owner(message))).status).toBe(200); expect((await POST(owner(message))).status).toBe(200); expect(local.state.tasks).toHaveLength(1);
    local.state.tasks[0].leaseId = "private-fence";
    const result = await GET(owner()); expect(result.headers.get("cache-control")).toContain("no-store"); expect(JSON.stringify(await result.json())).not.toContain("private-fence");
  });
  it("requires runner authentication and rejects browser calls", async () => {
    expect((await runner(worker({ action: "claim", runnerId: "test" }, "wrong"))).status).toBe(401);
    expect((await runner(worker({ action: "claim", runnerId: "test" }, secret, "http://localhost"))).status).toBe(403);
  });
  it("round-trips tasks through fenced runner APIs without exposing owner actions", async () => {
    await POST(owner({ agentId: "anyhvac.william", requestId: randomUUID(), prompt: "hello" }));
    const { task } = await (await runner(worker({ action: "claim", runnerId: "test" }))).json();
    const reference = { runnerId: "test", taskId: task.id, leaseId: task.leaseId };
    expect((await runner(worker({ action: "finish", ...reference, reply: "premature", execution: { definitionVersion: "a".repeat(64) } }))).status).toBe(409);
    expect((await runner(worker({ action: "start", ...reference }))).status).toBe(200);
    expect((await runner(worker({ action: "start", ...reference }))).status).toBe(409);
    const complete = { action: "finish", ...reference, reply: "Hello", execution: { definitionVersion: "a".repeat(64), threadId: randomUUID() } };
    expect((await runner(worker(complete))).status).toBe(200); expect((await runner(worker(complete))).status).toBe(200);
    expect(local.state.tasks[0].agentId).toBe("anyhvac.william"); expect(local.state.tasks[0].reply).toBe("Hello");
    expect((await runner(worker({ action: "deploy", ...reference }))).status).toBe(400);
  });
});
