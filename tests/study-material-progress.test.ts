import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { Actor } from "../src/lib/types";
process.env.LOCAL_DATABASE_PATH = await mkdtemp(
  path.join(tmpdir(), "ggc-material-progress-"),
);
const { privileged } = await import("../src/lib/db");
const { getStudyProgress, saveStudyProgress } =
  await import("../src/lib/study-material-progress");
const { studyTasks } = await import("../src/lib/cfm-study-plan");
const { AppError } = await import("../src/lib/errors");
async function guest() {
  return privileged(
    async (db) =>
      (
        await db.query(
          "insert into ggc.actors(kind,role,nickname) values('guest','GUEST','') returning id,kind,role,nickname,course_id",
        )
      )[0] as Actor,
  );
}
test("progress belongs to actor, validates task assignment, and is idempotent", async () => {
  const a = await guest(),
    b = await guest(),
    task = studyTasks(1, "adult")[0];
  const v = {
    week: 43,
    day: 1,
    track: "adult",
    task_id: task.id,
    complete: true,
  };
  await saveStudyProgress(a, v);
  await saveStudyProgress(a, v);
  assert.equal(
    (await getStudyProgress(a, new URLSearchParams({ week: "43" }))).items
      .length,
    1,
  );
  assert.equal(
    (await getStudyProgress(b, new URLSearchParams({ week: "43" }))).items
      .length,
    0,
  );
  await assert.rejects(
    saveStudyProgress(a, { ...v, day: 2 }),
    (e) => e instanceof AppError && e.status === 400,
  );
  await assert.rejects(saveStudyProgress(a, { ...v, week: 42 }));
  await saveStudyProgress(a, { ...v, complete: false });
  assert.equal(
    (await getStudyProgress(a, new URLSearchParams({ week: "43" }))).items
      .length,
    0,
  );
});
test("new basic completion updates calendar without requiring a reply; family and old completions stay separate", async () => {
  const a = await guest(),
    tasks = studyTasks(1, "adult");
  for (const task of tasks)
    await saveStudyProgress(a, {
      week: 43,
      day: 1,
      track: "adult",
      task_id: task.id,
      complete: true,
    });
  const legacy = () =>
    privileged((db) =>
      db.query(
        "select day from ggc.lesson_progress where owner_id=$1 and week=43",
        [a.id],
      ),
    );
  const complete = () =>
    privileged((db) =>
      db.query(
        "select day from ggc.study_day_completion where owner_id=$1 and week=43",
        [a.id],
      ),
    );
  assert.equal((await complete()).length, 1);
  assert.equal((await legacy()).length, 0);
  await saveStudyProgress(a, {
    week: 43,
    day: 1,
    track: "adult",
    task_id: tasks[0].id,
    complete: false,
  });
  assert.equal((await complete()).length, 0);
  await privileged(async (db) => {
    await db.query("select set_config('request.jwt.claims',$1,true)", [
      JSON.stringify({ sub: a.id }),
    ]);
    await db.query(
      "insert into ggc.reflections(owner_id,week,day,content) values($1,43,2,$2::jsonb)",
      [a.id, JSON.stringify({ "0": "old reflection", "2": "old practice" })],
    );
    await db.query(
      "insert into ggc.lesson_progress(owner_id,week,day) values($1,43,2)",
      [a.id],
    );
  });
  for (const task of studyTasks(2, "adult"))
    await saveStudyProgress(a, {
      week: 43,
      day: 2,
      track: "adult",
      task_id: task.id,
      complete: true,
    });
  await saveStudyProgress(a, {
    week: 43,
    day: 2,
    track: "adult",
    task_id: studyTasks(2, "adult")[0].id,
    complete: false,
  });
  assert.deepEqual(
    (await legacy()).map((r) => r.day),
    [2],
  );
  for (const task of studyTasks(3, "family"))
    await saveStudyProgress(a, {
      week: 43,
      day: 3,
      track: "family",
      task_id: task.id,
      complete: true,
    });
  assert.deepEqual(
    (await legacy()).map((r) => r.day),
    [2],
  );
});

test("consecutive weeks validate their own tasks and isolate material and day completion", async () => {
  const a = await guest();
  const previous = studyTasks(1, "adult", 43);
  const next = studyTasks(1, "adult", 44);
  const save = (week: number, task_id: string, complete = true) =>
    saveStudyProgress(a, { week, day: 1, track: "adult", task_id, complete });
  await assert.rejects(
    save(44, previous[0].id),
    (e) => e instanceof AppError && e.status === 400,
  );
  await assert.rejects(
    save(43, next[0].id),
    (e) => e instanceof AppError && e.status === 400,
  );
  for (const task of next) await save(44, task.id);
  assert.equal(
    (await getStudyProgress(a, new URLSearchParams({ week: "44" }))).items
      .length,
    next.length,
  );
  assert.equal(
    (await getStudyProgress(a, new URLSearchParams({ week: "43" }))).items
      .length,
    0,
  );
  const completedWeeks = () =>
    privileged(async (db) =>
      (
        await db.query<{ week: number }>(
          "select week from ggc.study_day_completion where owner_id=$1 and day=1 order by week",
          [a.id],
        )
      ).map((r) => r.week),
    );
  assert.deepEqual(
    await completedWeeks(),
    [44],
    "week 44 completion uses week 44 required materials",
  );
  for (const task of previous) await save(43, task.id);
  assert.deepEqual(await completedWeeks(), [43, 44]);
  await save(44, next[0].id, false);
  assert.deepEqual(await completedWeeks(), [43]);
  assert.equal(
    (await getStudyProgress(a, new URLSearchParams({ week: "43" }))).items
      .length,
    previous.length,
  );
  await assert.rejects(
    saveStudyProgress(a, {
      week: 44,
      day: 1,
      track: "family",
      task_id: next[0].id,
      complete: true,
    }),
  );
});
