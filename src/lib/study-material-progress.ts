import { z } from "zod";
import { privileged } from "./db";
import { ensure } from "./errors";
import type { Actor } from "./types";
import { hasStudyPlan, studyTasks } from "./cfm-study-plan";

export type MaterialProgress = {
  day: number;
  track: "adult" | "family";
  task_id: string;
};
export async function getStudyProgress(a: Actor, params: URLSearchParams) {
  const week = z.coerce.number().int().min(1).max(52).parse(params.get("week"));
  return privileged(async (db) => ({
    items: await db.query<MaterialProgress>(
      "select day,track,task_id from ggc.study_material_progress where owner_id=$1 and week=$2",
      [a.id, week],
    ),
  }));
}
export async function saveStudyProgress(a: Actor, input: unknown) {
  const v = z
    .object({
      week: z.number().int(),
      day: z.number().int().min(1).max(7),
      track: z.enum(["adult", "family"]),
      task_id: z.string(),
      complete: z.boolean(),
    })
    .parse(input);
  ensure(
    hasStudyPlan(v.week) &&
      studyTasks(v.day, v.track, v.week).some((t) => t.id === v.task_id),
    400,
    "invalid_input",
  );
  await privileged(async (db) => {
    await db.query("select id from ggc.actors where id=$1 for update", [a.id]);
    if (v.complete)
      await db.query(
        "insert into ggc.study_material_progress(owner_id,week,day,track,task_id) values($1,$2,$3,$4,$5) on conflict do nothing",
        [a.id, v.week, v.day, v.track, v.task_id],
      );
    else
      await db.query(
        "delete from ggc.study_material_progress where owner_id=$1 and week=$2 and day=$3 and track=$4 and task_id=$5",
        [a.id, v.week, v.day, v.track, v.task_id],
      );
    // Separate from the old reflection/practice completion and reward triggers.
    // Never fabricate a reflection or overwrite a legacy completion to mark read.
    if (v.track === "adult") {
      const required = studyTasks(v.day, "adult", v.week).map((t) => t.id);
      const rows = await db.query<{ task_id: string }>(
        "select task_id from ggc.study_material_progress where owner_id=$1 and week=$2 and day=$3 and track='adult'",
        [a.id, v.week, v.day],
      );
      if (required.every((id) => rows.some((r) => r.task_id === id))) {
        await db.query(
          "insert into ggc.study_day_completion(owner_id,week,day) values($1,$2,$3) on conflict do nothing",
          [a.id, v.week, v.day],
        );
      } else if (!v.complete) {
        await db.query(
          "delete from ggc.study_day_completion where owner_id=$1 and week=$2 and day=$3",
          [a.id, v.week, v.day],
        );
      }
    }
  });
  return { ok: true };
}
