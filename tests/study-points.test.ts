import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import type { Actor } from "../src/lib/types";
import type { StudyTrack } from "../src/lib/cfm-study-plan";

process.env.LOCAL_DATABASE_PATH = await mkdtemp(
  path.join(tmpdir(), "ggc-points-"),
);
const { asActor, privileged } = await import("../src/lib/db");
const { studyTasks, studyThoughtAnchor } =
  await import("../src/lib/cfm-study-plan");
const { saveStudyProgress } =
  await import("../src/lib/study-material-progress");
const { saveStudyThought, deleteStudyThought } =
  await import("../src/lib/study-community");
const { getStudyPointSummary } = await import("../src/lib/study-points");
const { readData } = await import("../src/lib/service");

async function actor(role: "MEMBER" | "GUEST", course = "old-testament-2026") {
  return privileged(async (db) => {
    const [row] = await db.query(
      "insert into ggc.actors(kind,role,course_id) values($1,$2,$3) returning *",
      [role === "GUEST" ? "guest" : "user", role, course],
    );
    return row as Actor;
  });
}

async function finish(a: Actor, day: number, track: StudyTrack) {
  const results = await Promise.all(
    studyTasks(day, track, 48).map((task) =>
      saveStudyProgress(a, {
        week: 48,
        day,
        track,
        task_id: task.id,
        complete: true,
      }),
    ),
  );
  return results.reduce((n, result) => n + result.pointsAwarded, 0);
}

test("weekly and lifetime points count only eligible activity, once across both reading tracks", async () => {
  const member = await actor("MEMBER");
  const guest = await actor("GUEST");
  assert.equal(await finish(guest, 1, "family"), 10);
  await assert.rejects(getStudyPointSummary(guest), { status: 403 });
  await assert.rejects(readData(guest, "study-points", new URLSearchParams()), {
    status: 403,
  });

  const [basic, family] = await Promise.all([
    finish(member, 1, "adult"),
    finish(member, 1, "family"),
  ]);
  assert.equal(basic + family, 10);
  assert.equal(await finish(member, 1, "family"), 0);
  assert.equal(await finish(member, 2, "family"), 10);
  assert.equal(await finish(member, 7, "adult"), 0);
  const second = studyTasks(2, "adult", 48)[0];
  const thought = {
    id: randomUUID(),
    week: 48,
    day: 2,
    track: "adult",
    path: second.path,
    anchor: studyThoughtAnchor(second),
    label: second.label,
    body: "A private study note",
    visibility: "private",
  };
  assert.equal(
    (
      await saveStudyThought(member, {
        ...thought,
        id: randomUUID(),
        anchor: "unassigned",
      })
    ).pointsAwarded,
    0,
  );
  assert.equal((await saveStudyThought(member, thought)).pointsAwarded, 2);
  assert.equal((await saveStudyThought(member, thought)).pointsAwarded, 0);
  await deleteStudyThought(member, { id: thought.id });
  const familyTask = studyTasks(2, "family", 48)[0];
  assert.equal(
    (
      await saveStudyThought(member, {
        ...thought,
        id: randomUUID(),
        track: "family",
        visibility: "public",
        path: familyTask.path,
        anchor: studyThoughtAnchor(familyTask),
      })
    ).pointsAwarded,
    0,
  );
  const third = studyTasks(3, "adult", 48)[0];
  assert.equal(
    (
      await saveStudyThought(member, {
        ...thought,
        id: randomUUID(),
        day: 3,
        visibility: "public",
        path: third.path,
        anchor: studyThoughtAnchor(third),
      })
    ).pointsAwarded,
    2,
  );

  await privileged(async (db) => {
    const weekStart =
      "(date_trunc('week', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul')";
    await db.query(
      `insert into ggc.reward_events(owner_id,kind,period,earned_at) values
       ($1,'quiz_daily','prior',${weekStart} - interval '1 second'),
       ($1,'quiz_weekly','current',${weekStart}),
       ($1,'daily','badge',${weekStart})`,
      [member.id],
    );
    await db.query(
      "insert into ggc.courses(id,title) select 'another-course',title from ggc.courses where id=$1",
      [member.course_id],
    );
  });
  const outside = await actor("MEMBER", "another-course");
  assert.equal(await finish(outside, 1, "family"), 10);
  await assert.rejects(
    asActor(outside, (db) => db.query("select * from ggc.study_point_events")),
    /permission denied/i,
  );

  const summary = await getStudyPointSummary(member);
  assert.ok(summary);
  assert.deepEqual(
    [
      summary.weekly,
      summary.total,
      summary.reading,
      summary.thought,
      summary.quiz,
      summary.wardCompletions,
    ],
    [64, 74, 20, 4, 40, 2],
  );
  assert.equal(
    summary.recent.find((e) => e.kind === "quiz_weekly")?.date,
    summary.weekStart,
  );
  assert.doesNotMatch(
    JSON.stringify(summary),
    /A private study note|visibility|owner_id/,
  );
  assert.equal((await getStudyPointSummary(outside))?.total, 10);
  assert.deepEqual(await readData(member, "study-points", new URLSearchParams()), {
    weekly: summary.weekly,
    total: summary.total,
  });
  assert.deepEqual(await readData(outside, "study-points", new URLSearchParams()), {
    weekly: 10,
    total: 10,
  });
  const journey = await readData(member, "journey", new URLSearchParams());
  assert.ok(journey && "progress" in journey);
  assert.deepEqual(journey.progress, [
    { week: 48, day: 1 },
    { week: 48, day: 2 },
  ]);

  const task = studyTasks(1, "adult", 48)[0];
  await saveStudyProgress(member, {
    week: 48,
    day: 1,
    track: "adult",
    task_id: task.id,
    complete: false,
  });
  assert.equal(
    await finish(member, 1, "adult"),
    0,
    "undo and reread cannot earn a second award",
  );
});
