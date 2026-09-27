import { test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
import {
  curriculum,
  referenceChapters,
  reading,
  currentWeek,
} from "../src/lib/curriculum";
test("52 source weeks, continuous calendar, bilingual titles and chapter coverage", () => {
  assert.equal(curriculum.length, 52);
  assert.equal(currentWeek("2026-09-14")?.number, 38);
  for (const w of curriculum) {
    assert.ok(w.title.ko && w.title.en);
    assert.ok(!/[가-힣]/.test(w.reference.en));
    assert.ok(!/[가-힣]/.test(reading(w, 1, "en")));
    const expected = referenceChapters(w);
    const assigned = Array.from({ length: 6 }, (_, i) =>
      reading(w, i + 1, "en"),
    ).join("; ");
    for (const c of expected) assert.ok(assigned.includes(c));
  }
});
test("PostgreSQL schema and role isolation", async () => {
  const db = new PGlite();
  await db.exec("create role authenticated; create role anon;");
  for (const f of (await readdir("supabase/migrations")).sort())
    await db.exec(await readFile("supabase/migrations/" + f, "utf8"));
  await db.exec(await readFile("supabase/seed.sql", "utf8"));
  const ids = [
    "00000000-0000-4000-8000-000000000001",
    "00000000-0000-4000-8000-000000000002",
    "00000000-0000-4000-8000-000000000003",
    "00000000-0000-4000-8000-000000000004",
    "00000000-0000-4000-8000-000000000005",
  ];
  for (let i = 0; i < ids.length; i++)
    await db.query(
      "insert into ggc.actors(id,kind,role,nickname) values($1,$2,$3,$4)",
      [
        ids[i],
        i < 2 ? "guest" : "user",
        i < 2 ? "GUEST" : i === 4 ? "ADMIN" : "TEACHER",
        "Test " + i,
      ],
    );
  await db.query(
    "insert into ggc.course_teachers values('old-testament-2026',$1),('old-testament-2026',$2)",
    [ids[2], ids[3]],
  );
  async function as<T>(id: string, fn: () => Promise<T>) {
    return db.transaction(async (tx) => {
      await tx.exec("set local role authenticated");
      await tx.query("select set_config('request.jwt.claims',$1,true)", [
        JSON.stringify({ sub: id }),
      ]);
      return fn();
    });
  }
  // Use transaction query handles (PGlite serializes the outer db).
  async function run(id: string, sql: string, params: unknown[] = []) {
    return db.transaction(async (tx) => {
      await tx.exec("set local role authenticated");
      await tx.query("select set_config('request.jwt.claims',$1,true)", [
        JSON.stringify({ sub: id }),
      ]);
      return tx.query(sql, params);
    });
  }
  await run(
    ids[0],
    'insert into ggc.reflections(owner_id,week,day,content) values($1,38,1,\'{"thought":"private"}\')',
    [ids[0]],
  );
  for (const id of ids.slice(1))
    assert.equal(
      (await run(id, "select * from ggc.reflections")).rows.length,
      0,
      "Private reflection cannot be read by other guest, teachers, or admin",
    );
  assert.equal(
    (await run(ids[0], "select * from ggc.reflections")).rows.length,
    1,
  );
  await assert.rejects(
    run(
      ids[0],
      "insert into ggc.discussion_rooms(course_id,teacher_id,week,title,mode) values('old-testament-2026',$1,38,'x','OPEN')",
      [ids[0]],
    ),
  );
  const room = (
    await run(
      ids[2],
      "insert into ggc.discussion_rooms(course_id,teacher_id,week,title,mode) values('old-testament-2026',$1,38,'Question','POST_BEFORE_VIEW') returning id",
      [ids[2]],
    )
  ).rows[0] as { id: string };
  await run(
    ids[0],
    "insert into ggc.discussion_posts(owner_id,room_id,content,display_name) values($1,$2,'A idea','A')",
    [ids[0], room.id],
  );
  assert.equal(
    (await run(ids[1], "select * from ggc.discussion_posts")).rows.length,
    0,
  );
  await run(
    ids[1],
    "insert into ggc.discussion_posts(owner_id,room_id,content,display_name) values($1,$2,'B idea','B')",
    [ids[1], room.id],
  );
  assert.equal(
    (await run(ids[1], "select * from ggc.discussion_posts")).rows.length,
    2,
  );
  const submission = (
    await run(
      ids[0],
      "insert into ggc.worksheet_submissions(owner_id,course_id,week,teacher_id,status,answers) values($1,'old-testament-2026',38,$2,'SUBMITTED','{\"0\":\"my answer\"}') returning id",
      [ids[0], ids[2]],
    )
  ).rows[0] as { id: string };
  assert.equal(
    (await run(ids[3], "select * from ggc.worksheet_submissions")).rows.length,
    0,
  );
  assert.equal(
    (await run(ids[2], "select * from ggc.worksheet_submissions")).rows.length,
    1,
  );
  await assert.rejects(
    run(
      ids[2],
      "update ggc.worksheet_submissions set answers='{}' where id=$1",
      [submission.id],
    ),
  );
  await run(
    ids[2],
    "insert into ggc.teacher_feedback(submission_id,teacher_id,content) values($1,$2,'Thank you')",
    [submission.id, ids[2]],
  );
  assert.equal(
    (await run(ids[0], "select * from ggc.teacher_feedback")).rows.length,
    1,
  );
  await assert.rejects(
    run(ids[0], "update ggc.actors set role='ADMIN' where id=$1", [ids[0]]),
  );
  assert.equal(
    (await run(ids[0], "select * from ggc.teacher_applications")).rows.length,
    0,
  );
  await assert.rejects(run(ids[0], "select * from ggc.guest_sessions"));
  await db.close();
});
