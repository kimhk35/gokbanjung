// Server side of "오늘의 Insight": the automatic card plus an optional
// teacher/admin override for that date.
import { z } from "zod";
import { privileged } from "./db";
import { ensure } from "./errors";
import type { Actor } from "./types";
import { canAuthor } from "./prompts";
import { localDate } from "./curriculum";
import { autoInsight } from "./daily-insight";

export type CustomInsight = {
  date: string;
  title: string;
  question: string;
  topic: string;
  message: string;
  image_path: string | null;
};
const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (d) =>
      !Number.isNaN(Date.parse(`${d}T00:00:00Z`)) &&
      new Date(`${d}T00:00:00Z`).toISOString().startsWith(d),
  );

export async function getDailyInsight(
  a: Actor | null,
  params: URLSearchParams,
) {
  const date = dateSchema.safeParse(params.get("date") || localDate());
  ensure(date.success, 400, "invalid_input");
  const row = await privileged(
    async (db) =>
      (
        await db.query<Record<string, unknown>>(
          "select to_char(day,'YYYY-MM-DD') as date,title,question,topic,message,image_path from ggc.daily_insights where day=$1",
          [date.data],
        )
      )[0],
  );
  return {
    date: date.data,
    auto: autoInsight(date.data),
    custom: (row as CustomInsight | undefined) || null,
    canEdit: canAuthor(a),
  };
}
const customInput = z.object({
  date: dateSchema,
  title: z.string().trim().max(120).default(""),
  question: z.string().trim().min(1).max(500),
  topic: z.string().trim().max(200).default(""),
  message: z.string().trim().max(600).default(""),
  image_path: z
    .string()
    .regex(/^insights\/[a-f0-9-]{36}\.(webp|png|jpg)$/)
    .nullable()
    .optional(),
});
export async function saveDailyInsight(a: Actor, input: unknown) {
  ensure(canAuthor(a), 403, "forbidden");
  const v = customInput.parse(input);
  await privileged((db) =>
    db.query(
      `insert into ggc.daily_insights(day,title,question,topic,message,image_path,updated_by) values($1,$2,$3,$4,$5,$6,$7)
       on conflict(day) do update set title=excluded.title,question=excluded.question,topic=excluded.topic,
       message=excluded.message,image_path=excluded.image_path,updated_by=excluded.updated_by,updated_at=now()`,
      [
        v.date,
        v.title,
        v.question,
        v.topic,
        v.message,
        v.image_path ?? null,
        a.id,
      ],
    ),
  );
  return { ok: true as const };
}
export async function resetDailyInsight(a: Actor, input: unknown) {
  ensure(canAuthor(a), 403, "forbidden");
  const v = z.object({ date: dateSchema }).parse(input);
  await privileged((db) =>
    db.query("delete from ggc.daily_insights where day=$1", [v.date]),
  );
  return { ok: true as const };
}
