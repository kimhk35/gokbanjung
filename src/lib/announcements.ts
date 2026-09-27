import { z } from "zod";
import { asActor, privileged } from "./db";
import { ensure } from "./errors";
import { requireTeacher } from "./service";
import type { Actor } from "./types";

export async function manageAnnouncement(a: Actor, raw: unknown) {
  ensure(a.kind === "user");
  if (a.role !== "ADMIN") {
    ensure(a.role === "TEACHER");
    await asActor(a, (db) => requireTeacher(a, db));
  }
  const value = z
    .discriminatedUnion("action", [
      z.object({ action: z.literal("delete"), id: z.uuid() }),
      z.object({
        action: z.literal("save"),
        id: z.uuid().optional(),
        content: z.object({
          ko: z.string().trim().min(1).max(6000),
          en: z.string().trim().min(1).max(6000),
        }),
      }),
    ])
    .parse(raw);
  return privileged(async (db) => {
    const result =
      value.action === "delete"
        ? await db.query(
            "delete from ggc.announcements where id=$1 and course_id=$2 returning id",
            [value.id, a.course_id],
          )
        : value.id
          ? await db.query(
              "update ggc.announcements set content=$1 where id=$2 and course_id=$3 returning id",
              [JSON.stringify(value.content), value.id, a.course_id],
            )
          : await db.query(
              "insert into ggc.announcements(course_id,content) values($1,$2) returning id",
              [a.course_id, JSON.stringify(value.content)],
            );
    ensure(result.length, 404, "not_found");
    return result[0];
  });
}
