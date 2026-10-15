// Owner-authorized disposable loopback PostgreSQL only.
// node concurrency.mjs PATH_TO_PSQL PORT DATABASE
import { spawn } from "node:child_process";
import assert from "node:assert/strict";
const [psql, port, database] = process.argv.slice(2);
assert(psql && /^\d+$/.test(port) && database === "anyhvac_measurement_validation");
const args = ["-X", "-v", "ON_ERROR_STOP=1", "-h", "127.0.0.1", "-p", port,
  "-U", "postgres", "-d", database, "-tA"];
function query(sql) {
  return new Promise((resolve, reject) => {
    const child = spawn(psql, [...args, "-c", sql], { windowsHide: true });
    let stdout = "", stderr = "";
    child.stdout.on("data", chunk => { stdout += chunk; });
    child.stderr.on("data", chunk => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", code => code ? reject(new Error(stderr.trim())) : resolve(stdout.trim()));
  });
}
await query("truncate public.resource_growth_receipts, public.resource_growth_daily;");
const started = await query("select clock_timestamp();");
assert(/^\d{4}-\d\d-\d\d [0-9:.]+[+-][0-9:]+$/.test(started));
const sameId = "66666666-6666-4666-8666-666666666666";
const events = [["resource_view", "none"], ["resource_calculator_click", "duct-reference-top"],
  ["resource_calculator_click", "duct-reference-contextual"],
  ["resource_newsletter_open", "footer"], ["resource_newsletter_open", "automatic"]];
function record(id, event, placement) {
  // Values are fixed test fixtures and a database-produced timestamp.
  return query(`set role service_role; select public.record_resource_growth_event('${id}', '${started}', '${event}', '${placement}');`);
}
await Promise.all(events.flatMap(([event, placement]) => Array.from({ length: 8 }, () => record(sameId, event, placement))));
const expected = { calculator_any: 1, calculator_contextual: 1, calculator_top: 1,
  newsletter_any: 1, newsletter_automatic: 1, newsletter_footer: 1, resource_view: 1 };
async function counters() {
  const rows = await query("select metric, count from public.resource_growth_daily order by metric;");
  return Object.fromEntries(rows.split(/\r?\n/).map(row => { const [metric, count] = row.split("|"); return [metric, Number(count)]; }));
}
assert.deepEqual(await counters(), expected);
await Promise.all(Array.from({ length: 20 }, (_, index) => record(
  `77777777-7777-4777-8777-${String(index + 1).padStart(12, "0")}`, "resource_calculator_click", "duct-reference-top")));
Object.assign(expected, { resource_view: 21, calculator_any: 21, calculator_top: 21 });
assert.deepEqual(await counters(), expected);
assert.equal(await query("select count(*) from public.resource_growth_receipts;"), "21");
console.log("PASS: 40 duplicate/racing same-view events +20 simultaneous distinct views; exact durable counters");
