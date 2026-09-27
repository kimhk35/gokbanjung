import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";

// Simulates the production database: every earlier migration applied, the
// gokbanjung migration not yet. The editor file must add the tables, keep
// existing rows, and be safe to run a second time.
test("SQL-editor update file installs the new tables, can run twice, and keeps existing rows", async () => {
  const sql = await readFile("DB업데이트_SQL편집기용.sql", "utf8");
  assert.doesNotMatch(
    sql,
    /\b(drop|truncate|delete\s+from|alter\s+table\s+ggc\.(?!event|prompt|verse|lesson_text|text_note))/i,
    "additive only",
  );
  const { PGlite } = await import("@electric-sql/pglite");
  const db = new PGlite();
  await db.exec(
    "create role authenticated; create role anon; create schema ggc;",
  );
  for (const file of (await readdir("supabase/migrations")).sort())
    if (!/^2026092[7-9]/.test(file))
      await db.exec(await readFile("supabase/migrations/" + file, "utf8"));
  await db.exec(await readFile("supabase/seed.sql", "utf8"));
  await db.query(
    "insert into ggc.actors(kind,role,nickname) values('user','ADMIN','기존 관리자')",
  );
  const count = async () =>
    (await db.query<{ n: number }>("select count(*)::int as n from ggc.actors"))
      .rows[0].n;
  const before = await count();
  for (let run = 0; run < 2; run++) {
    const results = await db.exec(sql);
    const last = results.at(-1)!.rows[0] as { result: string };
    assert.equal(
      last.result,
      "완료: 와드 일정·함께 생각하기·의견 달기 표가 준비되었습니다 (기존 기록 유지)",
    );
  }
  assert.equal(await count(), before);
  const tables = await db.query<{ t: string }>(
    "select to_regclass('ggc.events')::text as t union all select to_regclass('ggc.prompt_reply_reactions')::text union all select to_regclass('ggc.verse_notes')::text union all select to_regclass('ggc.text_note_comments')::text",
  );
  assert.deepEqual(
    tables.rows.map((r) => r.t),
    [
      "ggc.events",
      "ggc.prompt_reply_reactions",
      "ggc.verse_notes",
      "ggc.text_note_comments",
    ],
  );
  await db.close();
});
