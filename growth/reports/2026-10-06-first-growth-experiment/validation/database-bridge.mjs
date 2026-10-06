// Validation-only Supabase REST transport adapter to disposable real PostgreSQL.
// No production URL, database, credential, or customer data is used.
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import assert from "node:assert/strict";

const [psql] = process.argv.slice(2);
assert(psql, "Provide the isolated psql executable");
const token = "anyhvac-isolated-validation-not-a-production-key";
const events = new Set(["resource_view", "resource_calculator_click", "resource_newsletter_open"]);
const placements = new Set(["none", "duct-reference-top", "duct-reference-contextual", "footer", "automatic", "other", "duct-reference-inline"]);
const server = createServer(async (request, response) => {
  try {
    assert.equal(request.method, "POST");
    assert.equal(request.url, "/rest/v1/rpc/record_resource_growth_event");
    assert.equal(request.headers.apikey, token);
    let body = "";
    for await (const chunk of request) { body += chunk; assert(body.length <= 1024); }
    const value = JSON.parse(body);
    assert.match(value.p_view_id, /^[0-9a-f-]{36}$/i);
    assert.match(value.p_view_started_at, /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/);
    assert(events.has(value.p_event) && placements.has(value.p_placement));
    const sql = `set role service_role; select public.record_resource_growth_event('${value.p_view_id}', '${value.p_view_started_at}', '${value.p_event}', '${value.p_placement}');`;
    await new Promise((accept, reject) => {
      const child = spawn(psql, ["-X", "-v", "ON_ERROR_STOP=1", "-h", "127.0.0.1", "-p", "55439", "-U", "postgres", "-d", "anyhvac_measurement_validation", "-tA", "-c", sql], { windowsHide: true });
      let output = "";
      child.stdout.on("data", (chunk) => { output += chunk; });
      child.stderr.resume();
      child.on("error", reject);
      child.on("close", (code) => code === 0 && output.trim().endsWith("t") ? accept() : reject(new Error("Isolated RPC failed")));
    });
    response.writeHead(200, { "Content-Type": "application/json" }).end("true");
  } catch {
    response.writeHead(400, { "Content-Type": "application/json" }).end('{"message":"Isolated validation request rejected"}');
  }
});
server.listen(55440, "127.0.0.1", () => console.log("Isolated PostgreSQL REST bridge listening on loopback:55440"));
