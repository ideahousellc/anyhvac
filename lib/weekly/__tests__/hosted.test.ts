import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { createServer, type Server } from "node:http";
import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { NextRequest } from "next/server";
vi.mock("server-only", () => ({}));
import { GET, POST } from "@/app/api/admin/weekly/route";
import { POST as ingest } from "@/app/api/admin/weekly/import/route";
import { GET as preview } from "@/app/api/admin/weekly/media/[id]/route";
import { createAdminSession } from "@/lib/admin/session";
import type { ReviewContent, ReviewState } from "../types";
const binary = process.env.WEEKLY_VALIDATION_PSQL;
const token = "isolated-weekly-service-canary-not-production";
const session = "isolated-weekly-owner-session-at-least-32-characters";
const objects = new Map<string, Buffer>();
let server: Server, content: ReviewContent, owner: string;
let bucketPublic = false;
let failAfterSave = false;
const literal = (v: string) => "'" + v.replaceAll("'", "''") + "'";
function query(sql: string): Promise<string> { return new Promise((resolve, reject) => {
  const p = spawn(binary!, ["-X", "-q", "-v", "ON_ERROR_STOP=1", "-h", "127.0.0.1", "-p", "55443", "-U", "postgres", "-d", "anyhvac_weekly_validation_final", "-tA"], { windowsHide: true });
  let out = "", err = ""; p.stdout.on("data", c => { out += c; }); p.stderr.on("data", c => { err += c; }); p.on("error", reject); p.on("close", code => code ? reject(Error(err)) : resolve(out.trim())); p.stdin.end(sql);
}); }
function request(value?: object, authenticated = true, origin = "http://localhost") {
  return new NextRequest("http://localhost/api/admin/weekly", { method: value ? "POST" : "GET", headers: { Origin: origin, "Content-Type": "application/json", ...(authenticated ? { Cookie: "anyhvac_admin_session=" + createAdminSession(session) } : {}) }, ...(value ? { body: JSON.stringify(value) } : {}) });
}
async function state() { const r = await GET(request()); expect(r.status).toBe(200); return (await r.json()).state as ReviewState; }
async function action(kind: string, extra: object = {}, requestId = randomUUID()) { const s = await state(), v = s.versions.at(-1)!; return POST(request({ action: kind, version: v.number, digest: v.digest, requestId, ...extra })); }
beforeAll(async () => {
  if (!binary) return;
  // Fail before the HTTP adapter can mask an unavailable isolated database as 503.
  await query("select 1;");
  const directories = await readdir(".local/agent-inbox/weekly");
  content = JSON.parse(await readFile(".local/agent-inbox/weekly/" + directories[0] + "/state.json", "utf8")).versions[0].content;
  const username = "weekly-isolated-owner-" + randomUUID(); owner = createHash("sha256").update("anyhvac-agent-owner:" + username).digest("hex");
  server = createServer(async (req, res) => {
    if (req.headers.authorization !== "Bearer " + token) { res.writeHead(401, { "Content-Type": "application/json" }).end('{"message":"Denied"}'); return; }
    try {
      const url = new URL(req.url!, "http://localhost");
      if (url.pathname === "/storage/v1/bucket/weekly-content-review") { res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ id: "weekly-content-review", name: "weekly-content-review", public: bucketPublic })); return; }
      if (url.pathname.startsWith("/storage/v1/object/")) {
        const key = decodeURIComponent(url.pathname.replace(/^\/storage\/v1\/object\/(authenticated\/)?/, ""));
        if (req.method === "POST") {
          if (objects.has(key)) { res.writeHead(409, { "Content-Type": "application/json" }).end('{"statusCode":"409","message":"Object exists","error":"Duplicate"}'); return; }
          const chunks = []; for await (const c of req) chunks.push(c); objects.set(key, Buffer.concat(chunks)); res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ Key: key })); return;
        }
        const value = objects.get(key); if (!value) { res.writeHead(404, { "Content-Type": "application/json" }).end('{"statusCode":"404","message":"Not found"}'); return; }
        res.writeHead(200, { "Content-Type": "application/octet-stream" }).end(value); return;
      }
      let result;
      if (req.method === "GET") {
        expect(url.pathname).toBe("/rest/v1/weekly_content_reviews");
        const id = url.searchParams.get("owner_id")!.replace(/^eq\./, ""), batch = url.searchParams.get("batch_id")!.replace(/^eq\./, "");
        const rows = await query(`set role service_role;select json_build_object('revision',revision,'payload',payload) from public.weekly_content_reviews where owner_id=${literal(id)} and batch_id=${literal(batch)};`); result = rows ? JSON.parse(rows) : null;
      } else {
        expect(url.pathname).toBe("/rest/v1/rpc/weekly_content_compare_swap"); let text = ""; for await (const c of req) text += c; const v = JSON.parse(text);
        expect(Number.isSafeInteger(v.p_revision)).toBe(true);
        result = await query(`set role service_role;select public.weekly_content_compare_swap(${literal(v.p_owner)},${literal(v.p_batch)},${v.p_revision},${literal(JSON.stringify(v.p_payload))}::jsonb);`) === "t";
        if (failAfterSave) { failAfterSave = false; res.writeHead(500, { "Content-Type": "application/json" }).end('{"message":"Simulated lost acknowledgement"}'); return; }
      }
      res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(result));
    } catch { res.writeHead(400, { "Content-Type": "application/json" }).end('{"message":"Isolated request rejected"}'); }
  });
  await new Promise<void>(resolve => server.listen(55444, "127.0.0.1", resolve));
  for (const [key, value] of Object.entries({ WEEKLY_CONTENT_ENABLED: "true", WEEKLY_CONTENT_STORAGE: "supabase", WEEKLY_CONTENT_IMPORT_ENABLED: "true", ADMIN_USERNAME: username, ADMIN_SESSION_SECRET: session, SUPABASE_URL: "http://127.0.0.1:55444", SUPABASE_SECRET_KEY: token })) vi.stubEnv(key, value);
}, 10000);
afterAll(async () => { if (server) await new Promise<void>((resolve, reject) => server.close(e => e ? reject(e) : resolve())); vi.unstubAllEnvs(); });
it.skipIf(!binary)("persists owner-only immutable reviews and protected media through Supabase SDK into isolated PostgreSQL", async () => {
  expect((await ingest(request({ content }, false))).status).toBe(401);
  expect((await ingest(request({ content }, true, "https://evil.test"))).status).toBe(403);
  const changed = structuredClone(content); changed.posts[0].caption += "Changed"; expect((await ingest(request({ content: changed }))).status).toBe(422); expect(objects.size).toBe(0);
  expect((await ingest(request({ content }))).status).toBe(200);
  expect((await ingest(request({ content }))).status).toBe(409); // existing version never replaced
  const first = await state(); expect(first.versions[0].content).toEqual(content); expect(first.actions).toEqual([]);
  expect((await action("approve")).status).toBe(200);
  const v = (await state()).versions[0], target = content.posts[0].id;
  const shared = { action: "revision", version: 1, digest: v.digest, target, text: "Isolated revision" };
  const key = randomUUID(); const calls = [{ ...shared, requestId: key }, { ...shared, requestId: key }, { ...shared, requestId: randomUUID() }];
  const responses = await Promise.all(calls.map(c => POST(request(c)))); expect(responses.map(r => r.status)).toEqual([200, 200, 200]); expect((await state()).actions).toHaveLength(3);
  expect((await action("approve")).status).toBe(409);
  expect((await action("edit", { target, text: "Clarify fixture only", caption: content.posts[0].caption + "\nIsolated fixture test." })).status).toBe(200);
  expect((await action("approve")).status).toBe(422);
  expect((await action("review", { text: "Reviewed unchanged claims, attribution and fixture clarification." })).status).toBe(200);
  expect((await action("approve")).status).toBe(200);
  const saved = await state(); expect(saved.versions).toHaveLength(3); expect(saved.versions[0]).toEqual(first.versions[0]); expect(await state()).toEqual(saved);
  const m = content.media.find(x => x.type === "video/mp4")!;
  expect((await preview(request(undefined, false), { params: Promise.resolve({ id: m.id }) })).status).toBe(401);
  const req = request(); req.headers.set("range", "bytes=0-19"); const range = await preview(req, { params: Promise.resolve({ id: m.id }) }); expect(range.status).toBe(206); expect((await range.arrayBuffer()).byteLength).toBe(20);
  const object = `weekly-content-review/${owner}/${content.batchId}/${m.id}`;
  const original = objects.get(object)!; objects.delete(object); expect((await action("approve")).status).toBe(503); expect((await preview(request(), { params: Promise.resolve({ id: m.id }) })).status).toBe(503); expect(await state()).toEqual(saved);
  objects.set(object, Buffer.from("changed")); expect((await action("approve")).status).toBe(503); expect((await preview(request(), { params: Promise.resolve({ id: m.id }) })).status).toBe(503); objects.set(object, original);
  bucketPublic = true; expect((await preview(request(), { params: Promise.resolve({ id: m.id }) })).status).toBe(503); expect((await action("approve")).status).toBe(503); bucketPublic = false;
  expect(JSON.stringify(saved)).not.toContain(token); expect(JSON.stringify(saved)).not.toContain(session);
  const direct = await fetch("http://127.0.0.1:55444/storage/v1/object/" + object); expect(direct.status).toBe(401);
  const last = saved.versions.at(-1)!;
  const recovery = { action: "revision", version: last.number, digest: last.digest, target, text: "Lost acknowledgement test", requestId: randomUUID() };
  failAfterSave = true; expect((await POST(request(recovery))).status).toBe(503);
  const committed = await state(); expect(committed.actions).toHaveLength(saved.actions.length + 1);
  expect((await POST(request(recovery))).status).toBe(200); expect(await state()).toEqual(committed);
  await expect(query(`set role anon;insert into public.weekly_content_reviews(owner_id,batch_id,payload) values('${"d".repeat(64)}','${content.batchId}',${literal(JSON.stringify(first))}::jsonb);`)).rejects.toThrow("permission denied");
  vi.stubEnv("ADMIN_USERNAME", "other-isolated-owner"); expect((await GET(request())).status).toBe(503);
}, 60000);
