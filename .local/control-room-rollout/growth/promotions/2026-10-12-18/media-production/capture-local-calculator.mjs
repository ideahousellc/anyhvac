import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import WebSocket from "ws";

const output = resolve("growth/.generated/weekly/2026-10-12-18/inputs");
await mkdir(output, { recursive: true });
const port = 9251;
const browser = spawn("C:/Program Files/Google/Chrome/Application/chrome.exe", [
  "--headless=new", "--disable-gpu", "--no-sandbox", "--disable-gpu-sandbox", "--disable-software-rasterizer",
  "--no-first-run", "--no-default-browser-check", "--disable-background-networking", "--disable-sync",
  "--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost, EXCLUDE 127.0.0.1",
  `--remote-debugging-port=${port}`, `--user-data-dir=${resolve(output, `capture-profile-${Date.now()}`)}`, "about:blank",
], { windowsHide: true, stdio: "ignore" });
const pending = new Map(); let serial = 0; let socket;
const delay = (ms) => new Promise((accept) => setTimeout(accept, ms));
function command(method, params = {}) {
  return new Promise((accept, reject) => {
    const id = ++serial; const timer = setTimeout(() => { pending.delete(id); reject(new Error(method)); }, 20000);
    pending.set(id, { accept, reject, timer }); socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await command("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
  return result.result.value;
}
async function until(test, label) {
  for (let attempt = 0; attempt < 150; attempt++) { if (await test()) return; await delay(100); }
  throw new Error(`Timeout ${label}`);
}
const manifest = { status: "LOCAL ILLUSTRATIVE DERIVED CALCULATOR OUTPUTS", capture_date: "2026-10-06", route: "http://localhost:3108/tools/duct-calculator", external_requests_blocked: true, outputs: [] };
try {
  let targets;
  await until(async () => { try { targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); return targets.some((target) => target.type === "page"); } catch { return false; } }, "Chrome");
  socket = new WebSocket(targets.find((target) => target.type === "page").webSocketDebuggerUrl);
  await new Promise((accept, reject) => { socket.once("open", accept); socket.once("error", reject); });
  socket.on("message", (bytes) => {
    const message = JSON.parse(bytes.toString());
    if (message.id) {
      const request = pending.get(message.id); if (!request) return;
      clearTimeout(request.timer); pending.delete(message.id);
      if (message.error) request.reject(new Error(message.error.message)); else request.accept(message.result);
    } else if (message.method === "Fetch.requestPaused") {
      const { requestId, request } = message.params;
      void command(new URL(request.url).origin === "http://localhost:3108" ? "Fetch.continueRequest" : "Fetch.failRequest", new URL(request.url).origin === "http://localhost:3108" ? { requestId } : { requestId, errorReason: "BlockedByClient" });
    }
  });
  await command("Page.enable"); await command("Runtime.enable");
  await command("Fetch.enable", { patterns: [{ urlPattern: "*", requestStage: "Request" }] });
  await command("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1600, deviceScaleFactor: 1, mobile: false });
  await command("Page.addScriptToEvaluateOnNewDocument", { source: `try{localStorage.setItem('anyhvac-growth-measurement-opt-out','true');localStorage.setItem('anyhvac-newsletter-auto-prompt-suppressed','true');localStorage.setItem('anyhvac-support-prompt-seen','true')}catch{}` });
  await command("Page.navigate", { url: manifest.route });
  await until(() => evaluate(`!!document.querySelector('#frictionScale')?.childElementCount && document.querySelector('#exactDiameter')?.textContent.trim() !== '—'`), "calculator hydrate");
  for (const airflow of [3000, 5000]) {
    await evaluate(`(() => {
      const input=document.querySelector('#cfmInput');input.value='${airflow}';input.dispatchEvent(new Event('change',{bubbles:true}));
      document.querySelector('[data-friction="0.08"]').click();
      document.querySelector('[aria-label="Close dialog"]')?.click();
    })()`);
    await delay(400);
    const values = await evaluate(`Object.fromEntries(['cfmInput','frictionInput','exactDiameter','nominalDiameter','exactVelocity','nominalVelocity','nominalFriction','roundArea'].map(id=>[id,document.getElementById(id).value??document.getElementById(id).textContent.trim()]))`);
    const captures = [];
    for (const [name, selector, ancestor] of [["inputs", "#cfmInput", "section"], ["results", "#nominalDiameter", "section"], ["wheel", "#frictionScale", "svg"]]) {
      const clip = await evaluate(`(() => {const rect=document.querySelector('${selector}').closest('${ancestor}').getBoundingClientRect();return {x:rect.x+scrollX,y:rect.y+scrollY,width:rect.width,height:rect.height,scale:1}})()`);
      const screenshot = await command("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: true, clip });
      const path = resolve(output, `calculator-${airflow}-${name}.png`);
      await writeFile(path, Buffer.from(screenshot.data, "base64")); captures.push({ path, clip });
    }
    manifest.outputs.push({ illustrative: true, input_basis: "Existing local UI with 0.08 in.w.g./100 ft design friction rate. Not a recommended universal rate or measured system.", airflow_cfm: airflow, values, captures });
  }
  await writeFile("growth/promotions/2026-10-12-18/media-production/calculator-capture-manifest.json", JSON.stringify(manifest, null, 2));
  console.log(JSON.stringify({ states: manifest.outputs.length, outputs: manifest.outputs.map((state) => state.values) }));
} finally {
  for (const request of pending.values()) { clearTimeout(request.timer); request.reject(new Error("Capture closed")); }
  socket?.close(); browser.kill();
}
