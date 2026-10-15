import { describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
vi.mock("server-only", () => ({}));
import { LocalDocumentStore, transaction } from "../storage";
import { claim, disposePending, enqueue, expire, heartbeat, start } from "../state";
import { EMPTY_STATE, type AgentTask } from "../types";
const message = (agentId = "anyhvac.george"): AgentTask => ({ id: randomUUID(), requestId: randomUUID(), agentId, prompt: "Harmless role question", createdAt: 1000, status: "pending" });
const disposition = (action: "cancel" | "supersede" = "cancel", replacementTaskId?: string) => ({ action, requestId: randomUUID(), at: 1002, reason: "Owner duplicate review", actor: "owner" as const, replacementTaskId });
describe("pending dispositions and races", () => {
  it("retains messages and an immutable idempotent audit when cancelled or superseded", () => {
    const state = EMPTY_STATE(), original = message(), replacement = message();
    enqueue(state, original); enqueue(state, replacement);
    const action = disposition("supersede", replacement.id);
    disposePending(state, original.id, action); disposePending(state, original.id, { ...action, at: 2000 });
    expect(original).toMatchObject({ prompt: "Harmless role question", status: "superseded", disposition: action });
    expect(claim(state, "runner", "lease", 1003)?.id).toBe(replacement.id);
    expect(() => disposePending(state, original.id, { ...action, reason: "changed" })).toThrow();
    expect(() => disposePending(state, original.id, disposition())).toThrow();
  });
  it("rejects self, closed and other-agent replacements", () => {
    const state = EMPTY_STATE(), a = message(), b = message("anyhvac.william");
    enqueue(state, a); enqueue(state, b);
    for (const replacement of [a.id, b.id, randomUUID()]) expect(() => disposePending(state, a.id, disposition("supersede", replacement))).toThrow();
    disposePending(state, b.id, disposition()); expect(b.status).toBe("cancelled");
  });
  it("revokes unstarted leases across restarts but never revokes a positive start permit", () => {
    const state = EMPTY_STATE(), a = message(); enqueue(state, a); claim(state, "runner", "old", 1000);
    disposePending(state, a.id, disposition()); expire(state, 100000);
    expect(() => start(state, a.id, "runner", "old", 1003)).toThrow();
    expect(claim(state, "runner", "new", 100001)).toBeNull();
    const b = message(); enqueue(state, b); claim(state, "runner", "lease", 100002); start(state, b.id, "runner", "lease", 100003);
    expect(() => disposePending(state, b.id, disposition())).toThrow();
    expect(() => heartbeat(state, "runner", 200000, b.id, "lease")).toThrow();
    expect(b).toMatchObject({ status: "failed", reviewRequired: true });
  });
  it("serializes cancellation versus concurrent claims and starts with actual filesystem CAS", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "agent-reliability-"));
    try {
      const store = new LocalDocumentStore(directory);
      for (let index = 0; index < 8; index++) {
        const a = message(); await transaction(s => enqueue(s, a), store);
        await Promise.all([transaction(s => claim(s, "runner", "lease", 1000), store), transaction(s => disposePending(s, a.id, disposition()), new LocalDocumentStore(directory))]);
        expect((await store.read()).payload.tasks.find(t => t.id === a.id)?.status).toBe("cancelled");
        await expect(transaction(s => start(s, a.id, "runner", "lease", 1001), store)).rejects.toThrow();
      }
      const b = message(); await transaction(s => enqueue(s, b), store); await transaction(s => claim(s, "runner", "fence", 1000), store);
      const raced = await Promise.allSettled([transaction(s => start(s, b.id, "runner", "fence", 1001), store), transaction(s => disposePending(s, b.id, disposition()), new LocalDocumentStore(directory))]);
      expect(raced.filter(r => r.status === "fulfilled")).toHaveLength(1);
      const persisted = (await new LocalDocumentStore(directory).read()).payload.tasks.find(t => t.id === b.id)!;
      expect(persisted.status === "cancelled" ? persisted.startedAt === undefined : persisted.startedAt === 1001).toBe(true);
    } finally {
      if (!path.resolve(directory).startsWith(path.resolve(tmpdir()) + path.sep + "agent-reliability-")) throw Error("Unexpected cleanup target.");
      await rm(directory, { recursive: true, force: true });
    }
  });
  it("only one concurrent runner can claim the same pending task", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "agent-reliability-"));
    try {
      const store = new LocalDocumentStore(directory), a = message(); await transaction(s => enqueue(s, a), store);
      const results = await Promise.all([transaction(s => claim(s, "runner", "one", 1000), store), transaction(s => claim(s, "runner", "two", 1000), new LocalDocumentStore(directory))]);
      expect(results.filter(Boolean)).toHaveLength(1);
    } finally {
      if (!path.resolve(directory).startsWith(path.resolve(tmpdir()) + path.sep + "agent-reliability-")) throw Error("Unexpected cleanup target.");
      await rm(directory, { recursive: true, force: true });
    }
  });
});
