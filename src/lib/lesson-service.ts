import { asActor, privileged } from "./db";
import { ensure } from "./errors";
import { requireTeacher, weekSchema } from "./service";
import { lessonConfigSchema } from "./lesson-config";
import type { Actor } from "./types";
export async function lessonRevision(a: Actor, weekInput: unknown) {
  ensure(a.kind === "user" && (a.role === "ADMIN" || a.role === "TEACHER"));
  if (a.role !== "ADMIN") await asActor(a, (db) => requireTeacher(a, db));
  const week = weekSchema.parse(weekInput);
  const rows = await privileged((db) =>
    db.query(
      "select md5(value::text) as revision from ggc.site_settings where key=$1",
      [`lesson:${a.course_id}:${week}`],
    ),
  );
  return { revision: rows[0]?.revision || "empty" };
}
export async function lessonConfig(
  a: Actor,
  weekInput: unknown,
  input?: unknown,
) {
  ensure(a.kind === "user" && (a.role === "ADMIN" || a.role === "TEACHER"));
  if (a.role !== "ADMIN") await asActor(a, (db) => requireTeacher(a, db));
  const week = weekSchema.parse(weekInput);
  const key = `lesson:${a.course_id}:${week}`;
  if (input !== undefined) {
    const value = lessonConfigSchema.parse(input);
    await privileged((db) =>
      db.query(
        "insert into ggc.site_settings(key,value) values($1,$2) on conflict(key) do update set value=excluded.value",
        [key, JSON.stringify(value)],
      ),
    );
    return value;
  }
  const rows = await privileged((db) =>
    db.query("select value from ggc.site_settings where key=$1", [key]),
  );
  return rows[0]?.value ? lessonConfigSchema.parse(rows[0].value) : null;
}
