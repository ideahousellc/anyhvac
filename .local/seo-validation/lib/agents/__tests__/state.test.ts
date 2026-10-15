import { describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
vi.mock("server-only", () => ({}));
import { getStore, LocalDocumentStore, transaction } from "../storage";
import { claim, enqueue, expire, finish, heartbeat, online, resolve, start } from "../state";
import { EMPTY_STATE, type AgentTask } from "../types";
const task = (agentId = "anyhvac.george"): AgentTask => ({ id: randomUUID(), requestId: randomUUID(), agentId, prompt: "Read-only role question", createdAt: 1000, status: "pending" });
describe("agent task permissions and recovery", () => {
  it("never permits local files as production storage", () => {
    vi.stubEnv("AGENT_INBOX_ENABLED", "true"); vi.stubEnv("AGENT_INBOX_STORAGE", "local"); vi.stubEnv("NODE_ENV", "production");
    try { expect(() => getStore()).toThrow("not permitted in production"); } finally { vi.unstubAllEnvs(); }
  });
  it("deduplicates the same request and rejects changed payloads", () => {
    const state = EMPTY_STATE(), message = task(); enqueue(state, message); enqueue(state, { ...message, id: randomUUID() });
    expect(state.tasks).toHaveLength(1); expect(() => enqueue(state, { ...message, prompt: "different" })).toThrow();
  });
  it("serializes each agent but keeps distinct logical identities", () => {
    const state = EMPTY_STATE(); enqueue(state, task()); enqueue(state, task()); enqueue(state, task("anyhvac.william"));
    expect(claim(state, "runner", "lease1", 1000)?.agentId).toBe("anyhvac.george");
    expect(claim(state, "runner", "lease2", 1000)?.agentId).toBe("anyhvac.william"); expect(claim(state, "runner", "lease3", 1000)).toBeNull();
  });
  it("requires one positive execution permit and rejects duplicate start/wrong fences", () => {
    const state = EMPTY_STATE(), message = task(); enqueue(state, message); claim(state, "runner", "lease", 1000);
    expect(() => start(state, message.id, "runner", "wrong", 1001)).toThrow(); start(state, message.id, "runner", "lease", 1001);
    expect(() => start(state, message.id, "runner", "lease", 1002)).toThrow();
    expect(() => finish(state, message.id, "other", "lease", { reply: "fake" }, 1002)).toThrow();
  });
  it("requeues expired unstarted claims but never uncertain executions", () => {
    const state = EMPTY_STATE(), message = task(); enqueue(state, message); claim(state, "runner", "lease", 1000);
    expire(state, 62000); expect(message.status).toBe("pending"); claim(state, "runner", "lease2", 63000); start(state, message.id, "runner", "lease2", 63001);
    expire(state, 124000); expect(message.status).toBe("failed"); expect(message.reviewRequired).toBe(true); enqueue(state, task()); expect(claim(state, "runner", "lease3", 125000)).toBeNull();
    finish(state, message.id, "runner", "lease2", { reply: "recovered saved reply" }, 125001); expect(message.status).toBe("completed"); expect(claim(state, "runner", "lease3", 125002)).not.toBeNull();
  });
  it("accepts repeated result delivery without replacement or replay", () => {
    const state = EMPTY_STATE(), message = task(); enqueue(state, message); claim(state, "runner", "lease", 1000); start(state, message.id, "runner", "lease", 1001);
    finish(state, message.id, "runner", "lease", { reply: "reply" }, 1002); finish(state, message.id, "runner", "lease", { reply: "reply" }, 1003);
    expect(() => finish(state, message.id, "runner", "lease", { reply: "different" }, 1004)).toThrow();
  });
  it("closes failures without turning the original message into a pending retry", () => {
    const state = EMPTY_STATE(), message = task(); enqueue(state, message); claim(state, "runner", "lease", 1000); start(state, message.id, "runner", "lease", 1001);
    finish(state, message.id, "runner", "lease", {}, 1002); resolve(state, message.id); expect(message.status).toBe("failed"); expect(message.reviewRequired).toBe(false);
    expect(() => finish(state, message.id, "runner", "lease", { reply: "late" }, 1003)).toThrow();
  });
  it("reports offline from heartbeat age and rejects an alternate runner", () => {
    const state = EMPTY_STATE(); expect(online(state, 1000)).toBe(false); heartbeat(state, "runner", 1000); expect(online(state, 2000)).toBe(true); expect(online(state, 36000)).toBe(false);
    expect(() => claim(state, "other", "lease", 2000)).toThrow();
  });
  it("persists across independent stores and concurrent compare-and-swap transactions", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "agent-inbox-test-"));
    try {
      const a = new LocalDocumentStore(directory), b = new LocalDocumentStore(directory);
      await Promise.all([transaction(state => enqueue(state, task()), a), transaction(state => enqueue(state, task("anyhvac.william")), b)]);
      expect((await new LocalDocumentStore(directory).read()).payload.tasks).toHaveLength(2);
      const [first, second] = await Promise.all([transaction(state => claim(state, "runner", "one", 1000), a), transaction(state => claim(state, "runner", "two", 1000), b)]);
      expect(first?.id).not.toBe(second?.id);
    } finally {
      if (!path.resolve(directory).startsWith(path.resolve(tmpdir()) + path.sep + "agent-inbox-test-")) throw new Error("Unexpected cleanup target.");
      await rm(directory, { recursive: true, force: true });
    }
  });
});
