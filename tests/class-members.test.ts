import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import type { Actor } from "../src/lib/types";
import { privileged, asActor } from "../src/lib/db";
import { classMembers } from "../src/lib/class-members";
import { writeData } from "../src/lib/service";

test("class statistics are accurate, scoped to assigned members and preserve private content", async () => {
  process.env.LOCAL_DATABASE_PATH = await mkdtemp((await import("node:path")).join((await import("node:os")).tmpdir(), "ggc-class-members-"));
  const make = (
    role: Actor["role"],
    teacher_id?: string,
    course_id = "old-testament-2026",
  ): Actor => ({
    id: randomUUID(),
    role,
    kind: role === "GUEST" ? "guest" : "user",
    nickname: role,
    course_id,
    teacher_id,
  });
  const admin = make("ADMIN"),
    t1 = make("TEACHER"),
    t2 = make("TEACHER");
  const m1 = make("MEMBER", t1.id),
    m2 = make("MEMBER", t2.id),
    guest = make("GUEST", t1.id),
    unassigned = make("MEMBER");
  const outsider = make("MEMBER", t1.id, "other-course");
  await privileged(async (db) => {
    await db.query(
      "insert into ggc.courses(id,title) values('other-course','{}')",
    );
    for (const a of [admin, t1, t2, m1, m2, guest, unassigned, outsider])
      await db.query(
        "insert into ggc.actors(id,kind,role,nickname,course_id,teacher_id) values($1,$2,$3,$4,$5,$6)",
        [a.id, a.kind, a.role, a.nickname, a.course_id, a.teacher_id || null],
      );
    for (const t of [t1, t2])
      await db.query("insert into ggc.course_teachers values($1,$2)", [
        t.course_id,
        t.id,
      ]);
    await db.query("select set_config('request.jwt.claims',$1,true)", [
      JSON.stringify({ sub: m1.id }),
    ]);
    for (const day of [1, 2]) {
      await db.query(
        "insert into ggc.reflections(owner_id,week,day,content) values($1,38,$2,$3)",
        [m1.id, day, { 0: "PRIVATE REFLECTION", 2: "PRIVATE PRACTICE" }],
      );
      await db.query(
        "insert into ggc.lesson_progress(owner_id,week,day) values($1,38,$2)",
        [m1.id, day],
      );
    }
    for (const status of ["DRAFT", "SUBMITTED", "FEEDBACK"])
      await db.query(
        "insert into ggc.worksheet_submissions(owner_id,course_id,week,teacher_id,status,answers) values($1,$2,38,$3,$4,$5)",
        [m1.id, m1.course_id, t1.id, status, { secret: "PRIVATE ANSWER" }],
      );
    const quiz = randomUUID();
    await db.query(
      "insert into ggc.quiz_sets(id,course_id,kind,period,language,scope,status) values($1,$2,'daily','2026-09-15','ko','{}','ready')",
      [quiz, m1.course_id],
    );
    for (const correct of [1, 2])
      await db.query(
        "insert into ggc.quiz_attempts(owner_id,quiz_id,answers,correct,total) values($1,$2,'[]',$3,3)",
        [m1.id, quiz, correct],
      );
  });
  const p = new URLSearchParams("week=38");
  const result = await classMembers(t1, p);
  assert.deepEqual(
    new Set(result.members.map((m) => m.id)),
    new Set([m1.id, guest.id]),
  );
  const stats = result.members.find((m) => m.id === m1.id)!;
  assert.equal(stats.completed_days, 2);
  assert.equal(stats.week_days, 2);
  assert.equal(stats.submissions, 2);
  assert.equal(stats.week_submissions, 2);
  assert.equal(stats.quiz_attempts, 2);
  assert.equal(Number(stats.quiz_accuracy), 50);
  const zero = result.members.find((m) => m.id === guest.id)!;
  assert.equal(zero.completed_days, 0);
  assert.equal(zero.quiz_accuracy, null);
  assert(!JSON.stringify(result).includes("PRIVATE"));
  assert.equal(
    (await classMembers(t1, new URLSearchParams("week=39"))).members.find(
      (m) => m.id === m1.id,
    )!.week_days,
    0,
  );
  assert.equal((await classMembers(admin, p)).members.length, 4);
  assert.equal(
    (await classMembers(admin, new URLSearchParams(`teacher=${t2.id}`)))
      .members[0].id,
    m2.id,
  );
  assert.equal(
    (await classMembers(admin, new URLSearchParams("teacher=unassigned")))
      .members[0].id,
    unassigned.id,
  );
  await assert.rejects(() => classMembers(m1, p));
  await assert.rejects(() => classMembers(guest, p));
  await assert.rejects(() =>
    classMembers(t1, new URLSearchParams(`teacher=${t2.id}`)),
  );
  await assert.rejects(() => classMembers(t1, new URLSearchParams("week=53")));
  assert.equal(
    (
      await asActor(t1, (db) =>
        db.query("select content from ggc.reflections where owner_id=$1", [
          m1.id,
        ]),
      )
    ).length,
    0,
  );
  await writeData(m1, "profile", { nickname: "새닉네임" });
  assert.equal(
    (await classMembers(t1, p)).members.find((m) => m.id === m1.id)!.nickname,
    "새닉네임",
  );
  await writeData(m1, "profile", { nickname: "새닉네임", teacher_id: t2.id });
  assert.equal((await classMembers(t1, p)).members.length, 1);
  assert.equal((await classMembers(t2, p)).members.length, 2);
  await privileged((db) =>
    db.query("update ggc.actors set role='MEMBER' where id=$1", [t1.id]),
  );
  await assert.rejects(() => classMembers(t1, p));
});
