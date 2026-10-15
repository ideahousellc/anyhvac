import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import WebSocket from "ws";

const port = Number(process.env.CAMPAIGN003_CDP_PORT ?? 9225);
const outputDirectory = resolve(
  "growth/.generated/campaigns/003-why-duct-size-matters/calculator-states",
);

const response = await fetch(`http://127.0.0.1:${port}/json/list`);
if (!response.ok) {
  throw new Error(`Unable to list Chrome targets on port ${port}: ${response.status}`);
}
const targets = await response.json();
const target = targets.find((candidate) => candidate.type === "page");
if (!target?.webSocketDebuggerUrl) {
  throw new Error("No debuggable Chrome page target is available");
}

const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((accept, reject) => {
  socket.once("open", accept);
  socket.once("error", reject);
});

let requestId = 0;
const pending = new Map();
socket.on("message", (payload) => {
  const message = JSON.parse(payload.toString());
  if (!message.id) return;
  const request = pending.get(message.id);
  if (!request) return;
  pending.delete(message.id);
  if (message.error) request.reject(new Error(message.error.message));
  else request.resolve(message.result);
});

function command(method, params = {}) {
  const id = ++requestId;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolvePromise, reject) => {
    pending.set(id, { resolve: resolvePromise, reject });
  });
}

async function evaluate(expression) {
  const result = await command("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text ?? "Browser evaluation failed");
  }
  return result.result.value;
}

async function waitForCalculator() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const ready = await evaluate(
      `document.readyState === "complete" &&
        Boolean(document.querySelector("#cfmInput")) &&
        document.querySelector("#exactDiameter")?.textContent?.trim() !== "—" &&
        document.querySelector("#frictionScale")?.childElementCount > 0`,
    );
    if (ready) return;
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 125));
  }
  throw new Error("Calculator did not hydrate before the capture timeout");
}

async function setState(cfm, friction) {
  await evaluate(`(() => {
    const airflow = document.querySelector("#cfmInput");
    const frictionButton = document.querySelector('[data-friction="${friction}"]');
    if (!(airflow instanceof HTMLInputElement) || !(frictionButton instanceof HTMLElement)) {
      throw new Error("Required calculator controls are missing");
    }
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    setter.call(airflow, "${cfm}");
    airflow.dispatchEvent(new Event("input", { bubbles: true }));
    airflow.dispatchEvent(new Event("change", { bubbles: true }));
    frictionButton.click();
    airflow.blur();
    window.scrollTo(0, 0);
  })()`);
  await new Promise((resolvePromise) => setTimeout(resolvePromise, 450));
  await evaluate(`(() => {
    const dismiss = [...document.querySelectorAll("button")].find((button) =>
      ["Maybe Later", "Close"].includes(button.textContent?.trim()),
    );
    dismiss?.click();
  })()`);
  await new Promise((resolvePromise) => setTimeout(resolvePromise, 180));
}

async function capture(filename) {
  const screenshot = await command("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: false,
  });
  await writeFile(resolve(outputDirectory, filename), Buffer.from(screenshot.data, "base64"));
}

await mkdir(outputDirectory, { recursive: true });
await command("Page.enable");
await command("Runtime.enable");
await command("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 1600,
  deviceScaleFactor: 1,
  mobile: false,
});
await command("Page.navigate", { url: "http://localhost:3000/tools/duct-calculator" });
await waitForCalculator();

const states = [
  { cfm: 3000, friction: "0.08", filename: "01-airflow-3000-friction-008.png" },
  { cfm: 5000, friction: "0.08", filename: "02-airflow-5000-friction-008.png" },
  { cfm: 5000, friction: "0.10", filename: "03-airflow-5000-friction-010.png" },
];

for (const state of states) {
  await setState(state.cfm, state.friction);
  await capture(state.filename);
  console.log(`Captured authentic calculator state: ${state.filename}`);
}

socket.close();
