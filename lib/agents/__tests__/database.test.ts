import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { createServer, type Server } from "node:http";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
vi.mock("server-only", () => ({}));
import { getStore, transaction } from "../storage";
import { claim, enqueue, expire, finish, resolve, start } from "../state";
import type { AgentTask } from "../types";
// Explicit opt-in: native PostgreSQL plus a validation REST transport, not PostgREST.
const binary = process.env.AGENT_VALIDATION_PSQL;
const token = "isolated-validation-canary-not-a-production-credential";
let server: Server;
const sqlLiteral = (value: string) => "'" + value.replaceAll("'", "''") + "'";
function query(sql: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(binary!, ["-X", "-q", "-v", "ON_ERROR_STOP=1", "-h", "127.0.0.1", "-p", "55441", "-U", "postgres", "-d", "anyhvac_agent_validation", "-tA"], { windowsHide: true });
    let output = "", error = "";
    child.stdout.on("data", c => { output += c; }); child.stderr.on("data", c => { error += c; });
    child.on("error", reject); child.on("close", code => code ? reject(new Error(error)) : resolve(output.trim())); child.stdin.end(sql);
  });
}
beforeAll(async () => {
  if (!binary) return;
  server = createServer(async (request, response) => {
    try {
      expect(request.headers.apikey).toBe(token);
      const url = new URL(request.url!, "http://localhost");
      let result;
      if (request.method === "GET") {
        expect(url.pathname).toBe("/rest/v1/agent_inbox_documents");
        const owner = url.searchParams.get("owner_id")!.replace(/^eq\./, "");
        expect(owner).toMatch(/^[a-f0-9]{64}$/);
        const rows = await query(`set role service_role; select json_build_object('revision',revision,'payload',payload) from public.agent_inbox_documents where owner_id=${sqlLiteral(owner)};`);
        result = rows ? JSON.parse(rows) : null;
      } else {
        expect(url.pathname).toBe("/rest/v1/rpc/agent_inbox_compare_swap");
        let body = ""; for await (const chunk of request) body += chunk;
        const value = JSON.parse(body);
        expect(value.p_owner).toMatch(/^[a-f0-9]{64}$/); expect(Number.isSafeInteger(value.p_revision)).toBe(true);
        result = await query(`set role service_role; select public.agent_inbox_compare_swap(${sqlLiteral(value.p_owner)},${value.p_revision},${sqlLiteral(JSON.stringify(value.p_payload))}::jsonb);`) === "t";
      }
      response.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(result));
    } catch { response.writeHead(500, { "Content-Type": "application/json" }).end('{"message":"Isolated database validation failed"}'); }
  });
  await new Promise<void>(resolve => server.listen(55442, "127.0.0.1", resolve));
  vi.stubEnv("AGENT_INBOX_ENABLED", "true"); vi.stubEnv("AGENT_INBOX_STORAGE", "supabase");
  vi.stubEnv("SUPABASE_URL", "http://127.0.0.1:55442"); vi.stubEnv("SUPABASE_SECRET_KEY", token); vi.stubEnv("ADMIN_USERNAME", "database-validation-owner-" + randomUUID());
});
afterAll(async () => { if (server) await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); vi.unstubAllEnvs(); });
it.skipIf(!binary)("persists agent identity, concurrent claims, fenced execution, recovery and owner scope through the actual Supabase adapter", async () => {
  const store = getStore();
  const message: AgentTask = { id: randomUUID(), requestId: randomUUID(), agentId: "anyhvac.george", prompt: "Read-only responsibilities", createdAt: 1000, status: "pending" };
  await Promise.all(Array.from({ length: 5 }, () => transaction(state => enqueue(state, { ...message }), getStore())));
  expect((await store.read()).payload.tasks).toHaveLength(1);
  const claims = await Promise.all(Array.from({ length: 5 }, () => transaction(state => claim(state, "validation", randomUUID(), 1000), getStore())));
  const execution = claims.find(Boolean)!; expect(claims.filter(Boolean)).toHaveLength(1);
  await transaction(state => start(state, execution.id, "validation", execution.leaseId!, 1001), store);
  await expect(transaction(state => start(state, execution.id, "validation", execution.leaseId!, 1002), store)).rejects.toThrow();
  await transaction(state => expire(state, 62000), store);
  expect((await store.read()).payload.tasks[0].reviewRequired).toBe(true);
  const metadata = { threadId: randomUUID(), definitionVersion: "a".repeat(64), inputTokens: 10, outputTokens: 5 };
  for (let i = 0; i < 2; i++) await transaction(state => finish(state, execution.id, "validation", execution.leaseId!, { reply: "George read-only response", execution: metadata }, 63000), store);
  const saved = (await getStore().read()).payload.tasks[0];
  expect(saved.agentId).toBe("anyhvac.george"); expect(saved.execution).toEqual(metadata); expect(saved.status).toBe("completed");
  const william = { ...message, id: randomUUID(), requestId: randomUUID(), agentId: "anyhvac.william" };
  await transaction(state => enqueue(state, william), store);
  const second = await transaction(state => claim(state, "validation", randomUUID(), 64000), store);
  await transaction(state => start(state, second!.id, "validation", second!.leaseId!, 64001), store);
  await transaction(state => finish(state, second!.id, "validation", second!.leaseId!, {}, 64002), store);
  await transaction(state => resolve(state, second!.id), store);
  expect((await store.read()).payload.tasks[1].status).toBe("failed");
  vi.stubEnv("ADMIN_USERNAME", "different-validation-owner"); expect((await getStore().read()).payload.tasks).toEqual([]);
  expect(await query("select payload::text from public.agent_inbox_documents;")).not.toContain(token);
}, 30000);
