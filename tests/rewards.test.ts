import { test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
test("Daily/weekly/monthly21 rewards are idempotent, private, and based on Korean server dates", async () => {
  const db = new PGlite();
  await db.exec("create role authenticated;create role anon;");
  for (const f of (await readdir("supabase/migrations")).sort())
    await db.exec(await readFile("supabase/migrations/" + f, "utf8"));
  await db.exec(await readFile("supabase/seed.sql", "utf8"));
  const id = "00000000-0000-4000-8000-000000000021";
  const other = "00000000-0000-4000-8000-000000000022";
  await db.query(
    "insert into ggc.actors(id,kind) values($1,'guest'),($2,'guest')",
    [id, other],
  );
  async function run(sql: string, params: unknown[] = [], owner = id) {
    return db.transaction(async (tx) => {
      await tx.exec("set local role authenticated");
      await tx.query("select set_config('request.jwt.claims',$1,true)", [
        JSON.stringify({ sub: owner }),
      ]);
      return tx.query(sql, params);
    });
  }
  await assert.rejects(
    run("insert into ggc.lesson_progress(owner_id,week,day) values($1,38,1)", [
      id,
    ]),
  );
  for (let day = 1; day <= 7; day++) {
    await run(
      "insert into ggc.reflections(owner_id,week,day,content) values($1,38,$2,$3)",
      [
        id,
        day,
        JSON.stringify({ "0": "A discovery", "2": "A small practice" }),
      ],
    );
    await run(
      "insert into ggc.lesson_progress(owner_id,week,day) values($1,38,$2) on conflict do nothing",
      [id, day],
    );
  }
  let events = (await run("select kind,period from ggc.reward_events"))
    .rows as { kind: string; period: string }[];
  assert.equal(events.filter((e) => e.kind === "daily").length, 1);
  assert.equal(events.filter((e) => e.kind === "weekly").length, 1);
  assert.equal(events.filter((e) => e.kind === "monthly21").length, 0);
  await run(
    "insert into ggc.lesson_progress(owner_id,week,day) values($1,38,7) on conflict do nothing",
    [id],
  );
  assert.equal((await run("select * from ggc.reward_events")).rows.length, 2);
  await assert.rejects(
    run(
      "insert into ggc.reward_events(owner_id,kind,period) values($1,'monthly21','2099-01')",
      [id],
    ),
  );
  assert.equal(
    (await run("select * from ggc.reward_events", [], other)).rows.length,
    0,
  );
  const today = events.find((e) => e.kind === "daily")!.period;
  const month = today.slice(0, 7);
  // Historical fixture only, inserted as database owner in this isolated in-memory database.
  let inserted = 0;
  for (let d = 1; d <= 31 && inserted < 20; d++) {
    const date = month + "-" + String(d).padStart(2, "0");
    if (date === today) continue;
    await db.query(
      "insert into ggc.reward_events(owner_id,kind,period) values($1,'daily',$2)",
      [id, date],
    );
    inserted++;
  }
  await run(
    "insert into ggc.reflections(owner_id,week,day,content) values($1,39,1,$2)",
    [id, JSON.stringify({ "0": "Next week", "2": "Practice" })],
  );
  await run(
    "insert into ggc.lesson_progress(owner_id,week,day) values($1,39,1)",
    [id],
  );
  events = (await run("select kind,period from ggc.reward_events")).rows as {
    kind: string;
    period: string;
  }[];
  assert.equal(events.filter((e) => e.kind === "monthly21").length, 1);
  assert.equal(events.find((e) => e.kind === "monthly21")?.period, month);
  await run(
    "insert into ggc.reflections(owner_id,week,day,content) values($1,39,2,$2)",
    [id, JSON.stringify({ "0": "Another", "2": "Practice" })],
  );
  await run(
    "insert into ggc.lesson_progress(owner_id,week,day) values($1,39,2)",
    [id],
  );
  assert.equal(
    (await run("select * from ggc.reward_events where kind='monthly21'")).rows
      .length,
    1,
  );
  await db.close();
});
