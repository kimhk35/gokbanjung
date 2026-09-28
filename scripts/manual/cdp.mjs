// Headless Edge (Chrome DevTools Protocol) driver: runs JSON steps against the
// local site and saves screenshots. Used by the manual builder and UI checks.
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const PORT = 9333;
const OUT = path.resolve(process.argv[2] || ".superpowers/shots");
const BASE = "http://localhost:3100";
const edge = spawn(EDGE, ["--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${mkdtempSync(path.join(tmpdir(), "edge-"))}`, "--no-first-run", ...(process.env.EDGE_LANG ? [`--lang=${process.env.EDGE_LANG}`, `--accept-lang=${process.env.EDGE_LANG}`] : []), "--hide-scrollbars", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let target;
for (let i = 0; i < 40 && !target; i++) {
  await sleep(250);
  try {
    target = (await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()).find((t) => t.type === "page");
  } catch {}
}
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0;
const waiting = new Map();
const logs = [];
ws.onmessage = (m) => {
  const msg = JSON.parse(m.data);
  if (msg.id && waiting.has(msg.id)) waiting.get(msg.id)(msg);
  if (msg.method === "Runtime.exceptionThrown") logs.push("EXCEPTION " + msg.params.exceptionDetails.exception?.description?.slice(0, 200));
  if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error") logs.push("console.error " + msg.params.args.map((a) => a.value ?? a.description).join(" ").slice(0, 200));
  // Browser-generated messages, e.g. Content-Security-Policy violations.
  if (msg.method === "Log.entryAdded" && msg.params.entry.level === "error")
    logs.push("browser " + (msg.params.entry.url || "").split("/").pop() + " " + msg.params.entry.text.slice(0, 200));
};
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const n = ++id;
    waiting.set(n, (msg) => (msg.error ? reject(new Error(method + ": " + msg.error.message)) : resolve(msg.result)));
    ws.send(JSON.stringify({ id: n, method, params }));
  });
await send("Page.enable");
await send("Runtime.enable");
await send("Log.enable");
const evaluate = async (expression) => (await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result.value;
async function size(width, height) {
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: Number(process.env.SHOT_SCALE || 1), mobile: width < 768 });
}
async function go(url, wait = 2500) {
  await send("Page.navigate", { url: /^(file|https?):/.test(url) ? url : BASE + url });
  await sleep(wait);
}
async function shot(name) {
  // Hide the Next.js dev-mode badge so screenshots look like the real site.
  await evaluate("document.querySelectorAll('nextjs-portal').forEach((e) => e.remove())");
  const { data } = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(path.join(OUT, name + ".png"), Buffer.from(data, "base64"));
}
const steps = JSON.parse(process.argv[3] || "[]");
const results = [];
for (const s of steps) {
  try {
    if (s.transparent)
      await send("Emulation.setDefaultBackgroundColorOverride", { color: { r: 0, g: 0, b: 0, a: 0 } });
    if (s.size) await size(...s.size);
    if (s.go) await go(s.go, s.wait);
    if (s.eval) results.push([s.label || s.eval.slice(0, 40), await evaluate(s.eval)]);
    if (s.sleep) await sleep(s.sleep);
    if (s.shot) await shot(s.shot);
  } catch (e) {
    results.push([s.label || "step", "ERROR " + e.message]);
  }
}
console.log(JSON.stringify({ results, logs }, null, 1));
ws.close();
edge.kill();
process.exit(0);
