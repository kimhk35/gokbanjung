import { z } from "zod";
import { asActor, type DB } from "./db";
import { ensure } from "./errors";
import { requireTeacher } from "./service";
import type { Actor } from "./types";
export const materialImageSchema = z
  .string()
  .max(750000)
  .regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/);
export const materialInputSchema = z.object({
  title: z.string().trim().min(1).max(120),
  weeks: z
    .array(z.number().int().min(1).max(52))
    .min(1)
    .max(52)
    .transform((v) => [...new Set(v)].sort((a, b) => a - b)),
  slide_count: z.number().int().min(1).max(40),
});
export type LessonMaterial = {
  id: string;
  owner_id: string;
  title: string;
  weeks: number[];
  slide_count: number;
  created_at: string;
};
export const materialSlideUrl = (id: string, index: number) =>
  `/api/lesson-materials/${id}/slides/${index}`;
export async function withStaff<T>(a: Actor, work: (db: DB) => Promise<T>) {
  ensure(a.kind === "user" && ["ADMIN", "TEACHER"].includes(a.role));
  return asActor(a, async (db) => {
    await requireTeacher(a, db);
    return work(db);
  });
}
export async function readMaterials(a: Actor, id?: string) {
  if (id) z.uuid().parse(id);
  return withStaff(a, (db) =>
    db.query<LessonMaterial>(
      `select id,owner_id,title,weeks,slide_count,created_at from ggc.lesson_materials where course_id=$1 and status='ready' ${id ? "and id=$2" : ""} order by created_at desc limit 200`,
      id ? [a.course_id, id] : [a.course_id],
    ),
  );
}
export async function readMaterialSlide(a: Actor, id: string, index: unknown) {
  z.uuid().parse(id);
  const n = z.coerce.number().int().min(0).max(39).parse(index);
  return withStaff(a, async (db) => {
    const row = (
      await db.query(
        "select s.image from ggc.lesson_material_slides s join ggc.lesson_materials m on m.id=s.material_id where m.id=$1 and s.slide_index=$2 and m.course_id=$3 and m.status='ready'",
        [id, n, a.course_id],
      )
    )[0];
    ensure(row, 404, "not_found");
    return String(row.image);
  });
}
export async function writeMaterial(a: Actor, action: string, input: unknown) {
  return withStaff(a, async (db) => {
    if (action === "create") {
      const v = materialInputSchema.parse(input);
      // Reclaim abandoned drafts from this uploader without touching saved lessons.
      await db.query(
        "delete from ggc.lesson_materials where owner_id=$1 and status='draft' and created_at<now()-interval '1 day'",
        [a.id],
      );
      return (
        await db.query(
          "insert into ggc.lesson_materials(course_id,owner_id,title,weeks,slide_count) values($1,$2,$3,ARRAY(select jsonb_array_elements_text($4::jsonb)::int),$5) returning id",
          [a.course_id, a.id, v.title, JSON.stringify(v.weeks), v.slide_count],
        )
      )[0];
    }
    const v = z.object({ id: z.uuid() }).passthrough().parse(input);
    const row = (
      await db.query(
        "select * from ggc.lesson_materials where id=$1 and course_id=$2 for update",
        [v.id, a.course_id],
      )
    )[0];
    ensure(row, 404, "not_found");
    ensure(row.owner_id === a.id || a.role === "ADMIN");
    if (action === "abort") {
      ensure(row.status === "draft", 400, "invalid_transition");
      await db.query("delete from ggc.lesson_materials where id=$1", [v.id]);
      return { ok: true };
    }
    ensure(
      row.status === "draft" && row.owner_id === a.id,
      400,
      "invalid_transition",
    );
    if (action === "slide") {
      const slide = z
        .object({
          index: z.number().int().min(0).max(39),
          image: materialImageSchema,
        })
        .parse(input);
      ensure(slide.index < Number(row.slide_count), 400, "invalid_input");
      await db.query(
        "insert into ggc.lesson_material_slides(material_id,slide_index,image) values($1,$2,$3) on conflict(material_id,slide_index) do update set image=excluded.image",
        [v.id, slide.index, slide.image],
      );
      return { ok: true };
    }
    ensure(action === "finalize", 404, "not_found");
    const count = (
      await db.query(
        "select count(*)::int as n from ggc.lesson_material_slides where material_id=$1",
        [v.id],
      )
    )[0];
    ensure(
      Number(count.n) === Number(row.slide_count),
      400,
      "material_incomplete",
    );
    await db.query(
      "update ggc.lesson_materials set status='ready' where id=$1",
      [v.id],
    );
    return { ok: true, id: v.id };
  });
}
