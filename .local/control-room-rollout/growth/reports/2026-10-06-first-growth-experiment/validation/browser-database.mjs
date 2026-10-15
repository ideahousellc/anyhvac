// Independently reconcile real-browser receipts against the disposable database.
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const [psql] = process.argv.slice(2);
assert(psql);
const evidence = JSON.parse(await readFile("growth/.generated/measurement-validation/browser-evidence.json", "utf8"));
const groups = new Map();
const names = { "duct-reference-top": "calculator_top", "duct-reference-contextual": "calculator_contextual", footer: "newsletter_footer", automatic: "newsletter_automatic", other: "newsletter_other", "duct-reference-inline": "newsletter_inline" };
for (const entry of evidence.events) {
  assert.equal(entry.status, 204);
  if (entry.phase === "admin-cookie") continue;
  const { viewId, event, placement } = entry.payload;
  const metrics = groups.get(viewId) ?? new Set(["resource_view"]);
  if (event !== "resource_view") {
    assert(names[placement]);
    metrics.add(event === "resource_calculator_click" ? "calculator_any" : "newsletter_any");
    metrics.add(names[placement]);
  }
  groups.set(viewId, metrics);
}
const expected = {};
for (const metrics of groups.values()) for (const metric of metrics) expected[metric] = (expected[metric] ?? 0) + 1;
const sql = "select json_build_object('receipts', (select json_agg(view_id order by view_id) from public.resource_growth_receipts), 'counters', (select json_object_agg(metric, count) from public.resource_growth_daily));";
const { stdout } = await promisify(execFile)(psql, ["-X", "-v", "ON_ERROR_STOP=1", "-h", "127.0.0.1", "-p", "55439", "-U", "postgres", "-d", "anyhvac_measurement_validation", "-tA", "-c", sql], { windowsHide: true });
const actual = JSON.parse(stdout.trim());
assert.deepEqual(actual.receipts, [...groups.keys()].sort());
assert.deepEqual(actual.counters, expected);
const adminEntries = evidence.events.filter((entry) => entry.phase === "admin-cookie");
assert.equal(adminEntries.length, 1);
assert(!actual.receipts.includes(adminEntries[0].payload.viewId));
const result = { classification: "SYNTHETIC ISOLATED VALIDATION ONLY", browserChecks: evidence.checks.length, browserRequests: evidence.events.length, persistedViews: groups.size, counters: actual.counters, adminReceiptAbsent: true, databaseReconciliationPassed: true };
await writeFile("growth/.generated/measurement-validation/browser-database-evidence.json", JSON.stringify(result, null, 2));
console.log(JSON.stringify(result));
