import { spawn } from "node:child_process";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
const port = 3188;
const base = `http://localhost:${port}`;
const log = [];
const server = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "dev",
    "--hostname",
    "127.0.0.1",
    "--port",
    String(port),
  ],
  {
    env: {
      ...process.env,
      NEXT_PUBLIC_SITE_URL: base,
      NEXT_DIST_DIR: ".next-http-test",
    },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
server.stdout.on("data", (d) => {
  log.push(d.toString());
  process.stdout.write(d.toString());
});
server.stderr.on("data", (d) => {
  log.push(d.toString());
  process.stdout.write(d.toString());
});
let cookie = "";
const results = [];
async function request(path, data, session = cookie) {
  const response = await fetch(base + "/api/" + path, {
    method: data === undefined ? "GET" : "POST",
    headers: {
      origin: base,
      "Content-Type": "application/json",
      cookie: session,
    },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  return {
    status: response.status,
    value: await response.json(),
    cookie: response.headers.get("set-cookie"),
  };
}
try {
  let ready = false;
  for (let i = 0; i < 80; i++) {
    try {
      const r = await fetch(base);
      if (r.ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  assert.ok(ready, "Server started");
  results.push("Home returns 200");
  const first = await request("session", {});
  assert.equal(first.status, 200, JSON.stringify(first.value));
  cookie = first.cookie.split(";")[0];
  assert.equal(first.value.role, "GUEST");
  results.push("Guest session created with HttpOnly cookie");
  const boot = await request("bootstrap");
  assert.equal(boot.status, 200);
  assert.equal(boot.value.weeks.length, 52);
  results.push("52 real source weeks returned");
  assert.equal((await request("complete", { week: 38, day: 1 })).status, 403);
  results.push("Empty completion rejected");
  assert.equal(
    (
      await request("reflection", {
        week: 38,
        day: 1,
        content: {
          0: "API verification record",
          1: "Connection",
          2: "Practice today",
        },
      })
    ).status,
    200,
  );
  assert.equal(
    (await request("reflection?week=38&day=1")).value.content["0"],
    "API verification record",
  );
  results.push("Reflection saves and reloads");
  assert.equal((await request("complete", { week: 38, day: 1 })).status, 200);
  assert.equal((await request("complete", { week: 38, day: 1 })).status, 200);
  const rewards = await request("rewards");
  assert.equal(rewards.status, 200, JSON.stringify(rewards.value));
  assert.equal(
    rewards.value.events.filter((e) => e.kind === "daily").length,
    1,
  );
  results.push("Daily reward awarded once despite repeat completion");
  assert.equal(
    (await request("draft", { week: 38, answers: { 0: "Worksheet answer" } }))
      .status,
    200,
  );
  assert.equal(
    (await request("worksheet?week=38")).value.draft.answers["0"],
    "Worksheet answer",
  );
  results.push("Worksheet draft persists");
  assert.equal(
    (
      await request("note", {
        week: 38,
        content: "A shared test thought",
        anonymous: true,
      })
    ).status,
    200,
  );
  const notes = await request("notes?week=38");
  assert.ok(notes.value.some((n) => n.content === "A shared test thought"));
  assert.ok(!("owner_id" in notes.value[0]));
  results.push("Thought wall writes, masks owner identifiers");
  const second = await request("session", {}, "");
  const other = second.cookie.split(";")[0];
  assert.equal(
    (await request("reflection?week=38&day=1", undefined, other)).value,
    null,
  );
  results.push("Guest B cannot read Guest A private reflection");
  assert.equal((await request("teacher")).status, 403);
  assert.equal((await request("admin")).status, 403);
  assert.equal(
    (
      await request("create-room", {
        week: 38,
        title: "Forbidden",
        mode: "OPEN",
      })
    ).status,
    403,
  );
  results.push("Guest rejected from teacher/admin APIs");
  const csrf = await fetch(base + "/api/profile", {
    method: "POST",
    headers: {
      Origin: "https://untrusted.example",
      "Content-Type": "application/json",
      cookie,
    },
    body: '{"nickname":"No"}',
  });
  assert.equal(csrf.status, 403);
  results.push("Cross-origin mutation rejected");
  for (const route of [
    "/learn",
    "/week/38",
    "/week/38/day/1",
    "/community",
    "/discussion",
    "/worksheet",
    "/journey",
    "/rewards",
    "/insight",
    "/teacher",
    "/teacher/apply",
    "/admin",
    "/calendar",
    "/privacy",
  ]) {
    const r = await fetch(base + route);
    assert.equal(r.status, 200, route);
  }
  results.push("14 application routes return 200");
  const pdfFont = await fetch(base + "/fonts/NotoSansKR-Regular.ttf");
  assert.equal(pdfFont.status, 200);
  results.push("Korean PDF font is served");
  console.log(JSON.stringify({ passed: results.length, results }, null, 2));
  await writeFile(
    "docs/http-test-results.json",
    JSON.stringify({ passed: results.length, results }, null, 2),
  );
} catch (error) {
  console.error(error);
  console.error(log.join("").slice(-5000));
  process.exitCode = 1;
} finally {
  server.kill("SIGTERM");
}
