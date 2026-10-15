// Isolated browser validation. Never connects to production or provider URLs.
// Run with a COPY of the production build connected to disposable local PostgreSQL.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import WebSocket from "ws";

const appPort = Number(process.env.MEASUREMENT_TEST_APP_PORT ?? 3107);
const cdpPort = Number(process.env.MEASUREMENT_TEST_CDP_PORT ?? 9237);
assert(Number.isInteger(appPort) && appPort > 1024 && appPort < 65536);
assert(Number.isInteger(cdpPort) && cdpPort > 1024 && cdpPort < 65536);
const chromePath = process.env.MEASUREMENT_TEST_CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const output = resolve("growth/.generated/measurement-validation");
const profile = resolve(output, `chrome-profile-${Date.now()}`);
await mkdir(profile, { recursive: true });
const chrome = spawn(chromePath, [
  "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
  // This disposable Chrome child runs inside Codex's OS sandbox. Chrome's
  // nested Windows GPU/renderer sandbox cannot initialize under that token.
  // These flags affect this child only, never app/user browser configuration.
  "--no-sandbox", "--disable-gpu-sandbox", "--disable-software-rasterizer",
  "--disable-background-networking", "--disable-component-update", "--disable-sync",
  "--disable-default-apps", "--disable-domain-reliability", "--disable-features=MediaRouter,OptimizationHints",
  "--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost, EXCLUDE 127.0.0.1",
  `--remote-debugging-port=${cdpPort}`, `--user-data-dir=${profile}`, "about:blank",
], { windowsHide: true, stdio: ["ignore", "ignore", "pipe"] });
const delay = (ms) => new Promise((accept) => setTimeout(accept, ms));
let socket;
const evidence = { checks: [], events: [], blockedExternalOrigins: [], interceptionFailures: [] };
let chromeDiagnostics = "";
chrome.stderr.on("data", (chunk) => { chromeDiagnostics = (chromeDiagnostics + chunk.toString()).slice(-8000); });
const loaderStub = `(() => {
  const script = document.currentScript;
  const formId = script.dataset.beehiivForm;
  window.__measurementFormStub ??= { loads: [], destroys: [] };
  window.__measurementFormStub.loads.push(formId);
  const frame = document.createElement('iframe');
  frame.src = 'https://www.anyhvac.net/__measurement_stub_embed';
  script.parentElement.appendChild(frame);
  window.__bhv_embeds ??= {};
  window.__bhv_embeds[formId] = { destroy() {
    window.__measurementFormStub.destroys.push(formId);
    frame.remove();
  } };
})();`;
let phase = "initial";
const pending = new Map();
let serial = 0;
function command(method, params = {}) {
  const id = ++serial;
  return new Promise((accept, reject) => {
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 15000);
    pending.set(id, { accept, reject, timer });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await command("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
  return result.result.value;
}
async function until(condition, label, timeout = 15000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) { if (await condition()) return; await delay(100); }
  throw new Error(`Timeout: ${label}`);
}
async function navigate(path) {
  await command("Page.navigate", { url: `https://www.anyhvac.net${path}` });
  await until(() => evaluate(`document.readyState === 'complete' && location.pathname === ${JSON.stringify(path)}`), `navigate ${path}`);
  await delay(500);
}
function check(label, actual, expected) {
  assert.deepEqual(actual, expected, label); evidence.checks.push({ label, passed: true });
}
function eventCount(event, placement) {
  return evidence.events.filter((entry) => entry.payload.event === event && (placement === undefined || entry.payload.placement === placement) && entry.status === 204).length;
}

try {
  let targets;
  await until(async () => {
    try { targets = await (await fetch(`http://127.0.0.1:${cdpPort}/json/list`)).json(); return targets.some((target) => target.type === "page"); }
    catch { return false; }
  }, "Chrome startup");
  const target = targets.find((item) => item.type === "page");
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((accept, reject) => { socket.once("open", accept); socket.once("error", reject); });
  socket.on("message", (bytes) => {
    const message = JSON.parse(bytes.toString());
    if (message.id) {
      const request = pending.get(message.id); if (!request) return;
      clearTimeout(request.timer); pending.delete(message.id);
      if (message.error) request.reject(new Error(message.error.message)); else request.accept(message.result);
    } else if (message.method === "Fetch.requestPaused") {
      void (async () => {
        const { requestId, request } = message.params;
        const url = new URL(request.url);
        // Exact known loader URL is fulfilled by a deterministic local string;
        // no provider request or signup is performed. This verifies embed wiring.
        if (url.href === "https://subscribe-forms.beehiiv.com/v3/loader.js") {
          await command("Fetch.fulfillRequest", { requestId, responseCode: 200,
            responseHeaders: [{ name: "Content-Type", value: "application/javascript" }],
            body: Buffer.from(loaderStub).toString("base64") }); return;
        }
        if (url.origin === "https://www.anyhvac.net" && url.pathname === "/__measurement_stub_embed") {
          await command("Fetch.fulfillRequest", { requestId, responseCode: 200,
            responseHeaders: [{ name: "Content-Type", value: "text/html" }],
            body: Buffer.from("<!doctype html><title>Synthetic embed</title><p>Local validation stub. No submission form.</p>").toString("base64") }); return;
        }
        if (url.origin !== "https://www.anyhvac.net") {
          evidence.blockedExternalOrigins.push(url.origin);
          await command("Fetch.failRequest", { requestId, errorReason: "BlockedByClient" }); return;
        }
        // Node fetch's target is always loopback. Canonical host/protocol headers
        // preserve the application's existing origin guard without relaxing it.
        const headers = new Headers(request.headers);
        headers.set("host", "www.anyhvac.net");
        headers.set("x-forwarded-host", "www.anyhvac.net");
        headers.set("x-forwarded-proto", "https");
        headers.delete("content-length");
        // CDP's pre-network request-paused snapshot omits Fetch Metadata.
        // Every application request here is initiated by the canonical-origin
        // document; restore its same-origin metadata in the loopback proxy.
        headers.set("sec-fetch-site", "same-origin");
        const local = await fetch(`http://127.0.0.1:${appPort}${url.pathname}${url.search}`, {
          method: request.method, headers, body: request.postData, redirect: "manual",
        });
        if (url.pathname === "/api/growth/events") {
          evidence.events.push({ phase, payload: JSON.parse(request.postData), status: local.status });
        }
        const body = Buffer.from(await local.arrayBuffer());
        const responseHeaders = [...local.headers].filter(([name]) => !["content-encoding", "content-length", "transfer-encoding"].includes(name)).map(([name, value]) => ({ name, value }));
        await command("Fetch.fulfillRequest", { requestId, responseCode: local.status, responseHeaders, body: body.toString("base64") });
      })().catch(async (error) => {
        evidence.interceptionFailures.push(String(error));
        try { await command("Fetch.failRequest", { requestId: message.params.requestId, errorReason: "Failed" }); } catch { /* target closed */ }
      });
    }
  });
  socket.on("error", (error) => evidence.interceptionFailures.push(`CDP socket: ${error.message}`));
  await command("Page.enable"); await command("Runtime.enable"); await command("Network.enable");
  await command("Fetch.enable", { patterns: [{ urlPattern: "*", requestStage: "Request" }] });
  await navigate("/resources/duct-design-quick-reference");
  await until(() => eventCount("resource_view") === 1, "initial view collection");
  check("unchanged resource has two calculator links and no proposed inline CTA", await evaluate(`({links:document.querySelectorAll('a[data-growth-calculator]').length,inline:document.querySelectorAll('[data-growth-newsletter="duct-reference-inline"]').length,signupCopy:document.body.textContent.includes('Get free tool updates')})`), { links: 2, inline: 0, signupCopy: false });

  // Actual DOM dispatch in a real hydrated browser; preventDefault only in this
  // harness permits repeated same-view checks. Application listeners never do so.
  await evaluate(`(() => {
    const top=document.querySelector('[data-growth-calculator="duct-reference-top"]');
    top.addEventListener('click', event=>event.preventDefault());
    top.click(); top.click();
    const contextual=document.querySelector('[data-growth-calculator="duct-reference-contextual"]');
    contextual.dispatchEvent(new MouseEvent('auxclick',{bubbles:true,button:1}));
    contextual.dispatchEvent(new MouseEvent('auxclick',{bubbles:true,button:2}));
  })()`);
  await until(() => eventCount("resource_calculator_click") === 2, "two placement clicks");
  check("two placements deduplicate repeated actions in one view", evidence.events.filter((e) => e.payload.event === "resource_calculator_click").map((e) => e.payload.placement).sort(), ["duct-reference-contextual", "duct-reference-top"]);
  check("view and clicks share ephemeral view ID", new Set(evidence.events.slice(0, 3).map((e) => e.payload.viewId)).size, 1);

  await evaluate(`[...document.querySelectorAll('footer button')].find(button=>button.textContent.trim()==='Newsletter').click()`);
  await until(() => eventCount("resource_newsletter_open", "footer") === 1, "footer newsletter open");
  await until(() => evaluate("window.__measurementFormStub?.loads.length === 1"), "local form loader mount");
  check("missing dedicated form explicitly remains unconfigured", await evaluate(`document.querySelector('[aria-label="AnyHVAC newsletter signup form"]').dataset.dedicatedFormConfigured`), "false");
  check("existing signup uses unchanged form ID through deterministic local loader", await evaluate("window.__measurementFormStub.loads"), ["e6094995-c70e-4323-9cb8-69c189648725"]);
  check("loader inserts one iframe in the existing embed host", await evaluate(`document.querySelector('[aria-label="AnyHVAC newsletter signup form"]').querySelectorAll('iframe').length`), 1);
  await evaluate(`document.querySelector('[aria-label="Close dialog"]').click()`);
  check("closing existing modal preserves mounted embed without duplicate loader", await evaluate("window.__measurementFormStub.loads.length"), 1);

  // Fresh page clears automatic suppression only inside this temporary profile.
  await evaluate(`localStorage.removeItem('anyhvac-newsletter-auto-prompt-suppressed');localStorage.removeItem('anyhvac-newsletter-last-prompt-date')`);
  await navigate("/resources/duct-design-quick-reference");
  await until(() => eventCount("resource_newsletter_open", "automatic") === 1, "automatic newsletter open", 12000);
  await evaluate(`document.querySelector('[aria-label="Close dialog"]').click()`);

  const beforeOptOut = evidence.events.length;
  phase = "owner-opt-out";
  await evaluate(`localStorage.setItem('anyhvac-growth-measurement-opt-out','true')`);
  await navigate("/resources/duct-design-quick-reference");
  await evaluate(`document.querySelector('[data-growth-calculator="duct-reference-contextual"]').dispatchEvent(new MouseEvent('auxclick',{bubbles:true,button:1}))`);
  await delay(400);
  check("owner opt-out emits no view or link events", evidence.events.length, beforeOptOut);
  await evaluate(`localStorage.removeItem('anyhvac-growth-measurement-opt-out')`);

  await command("Network.setCookie", { name: "anyhvac_admin_session", value: "SYNTHETIC_TEST_ONLY", url: "https://www.anyhvac.net", httpOnly: true, secure: true });
  phase = "admin-cookie";
  await navigate("/resources/duct-design-quick-reference");
  await delay(400);
  check("admin-cookie request reaches local exclusion gate", evidence.events.filter((entry) => entry.phase === "admin-cookie").length, 1);
  await command("Network.deleteCookies", { name: "anyhvac_admin_session", url: "https://www.anyhvac.net" });

  const beforeOtherPath = evidence.events.length;
  phase = "non-resource";
  await navigate("/tools/duct-calculator");
  check("unchanged Duct Calculator SEO title", await evaluate("document.title"), "HVAC Duct Calculator | AnyHVAC");
  check("non-resource navigation emits no collector events", evidence.events.length, beforeOtherPath);
  phase = "keyboard-navigation";
  await navigate("/resources/duct-design-quick-reference");
  await evaluate(`document.querySelector('[data-growth-calculator="duct-reference-top"]').focus()`);
  await command("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
  await command("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
  await until(() => evaluate(`location.pathname === '/tools/duct-calculator' && document.title === 'HVAC Duct Calculator | AnyHVAC'`), "native keyboard calculator navigation");
  await until(() => evidence.events.some((entry) => entry.phase === "keyboard-navigation" && entry.payload.event === "resource_calculator_click"), "native keyboard activation event");
  evidence.checks.push({ label: "native keyboard activation records a click and preserves calculator navigation", passed: true });
  check("all accepted events contain bounded fields only", evidence.events.every(({ payload }) => Object.keys(payload).sort().join(",") === "event,placement,viewId,viewStartedAt"), true);
  check("all browser ingestion requests accepted or intentionally excluded", evidence.events.every((entry) => entry.status === 204), true);
  check("local interception completed without failures", evidence.interceptionFailures, []);
  evidence.blockedExternalOrigins = [...new Set(evidence.blockedExternalOrigins)];
  evidence.notes = ["Canonical-origin application requests fulfilled from loopback. The exact Beehiiv loader URL was fulfilled from a deterministic local script string; every other external request blocked.", "Primary clicks and middle/right auxclicks exercised via DOM dispatch in real Chrome; repeated-action harness prevents default only for the top link. Keyboard navigation uses native CDP Input.", "Provider signup completion is unverified; no form submitted or provider configured. Default loader dataset/mount tested with a local stub; dedicated-form switching and controller cleanup covered by focused tests.", "Admin exclusion requires companion database-counter assertion; 204 alone does not distinguish writes from exclusions."];
  await writeFile(resolve(output, "browser-evidence.json"), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify({ passedChecks: evidence.checks.length, eventRequests: evidence.events.length, evidence: resolve(output, "browser-evidence.json") }));
} catch (error) {
  await writeFile(resolve(output, "browser-failure-evidence.json"), JSON.stringify({ ...evidence, failure: String(error), chromeDiagnostics }, null, 2));
  throw error;
} finally {
  for (const request of pending.values()) { clearTimeout(request.timer); request.reject(new Error("Browser validation closed")); }
  socket?.close(); chrome.kill();
}
