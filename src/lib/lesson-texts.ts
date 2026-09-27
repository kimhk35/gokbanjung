// Lesson text uploaded by teachers/admins (3ⓑ) and public notes anchored to
// sentences in it. A text is shown only after an editor confirms posting
// rights and gives the source; edits of a published text become a new draft
// version so readers keep seeing the published one until it is replaced.
import { z } from "zod";
import { privileged, type DB } from "./db";
import { AppError, ensure } from "./errors";
import type { Actor } from "./types";
import { authorName, canAuthor } from "./prompts";
import { plainText } from "./markdown-lite";
import { locate, type Anchor } from "./text-anchor";
import {
  addComment,
  author,
  deleteComment,
  deleteNote,
  toggleHeart,
  withThreads,
  type ThreadFields,
} from "./note-threads";

export { plainText };
export type LessonText = {
  id: string;
  week: number;
  lang: "ko" | "en";
  title: string;
  body_markdown: string;
  source_url: string;
  rights_note: string;
  status: "draft" | "published";
  version: number;
  updated_at: string;
};
export type TextNote = {
  id: string;
  lesson_text_id: string;
  version: number;
  anchor: Anchor;
  quote: string;
  body: string;
  author: string;
  created_at: string;
} & ThreadFields;
const TEXT_COLUMNS =
  "id,week,lang,title,body_markdown,source_url,rights_note,status,version,updated_at";
type Row = Omit<LessonText, "updated_at"> & { updated_at: unknown };
const shape = (r: Row): LessonText => ({
  ...r,
  version: Number(r.version),
  week: Number(r.week),
  updated_at: new Date(r.updated_at as string).toISOString(),
});
const weekLang = z.object({
  week: z.coerce.number().int().min(1).max(52),
  lang: z.enum(["ko", "en"]),
});

async function latest(
  db: DB,
  week: number,
  lang: string,
  status?: "published",
) {
  const row = (
    await db.query<Row>(
      `select ${TEXT_COLUMNS} from ggc.lesson_texts where week=$1 and lang=$2 ${status ? "and status='published'" : ""} order by version desc limit 1`,
      [week, lang],
    )
  )[0];
  return row ? shape(row) : null;
}

export async function getLessonText(a: Actor | null, params: URLSearchParams) {
  const v = weekLang.safeParse({
    week: params.get("week"),
    lang: params.get("lang") || "ko",
  });
  ensure(v.success, 400, "invalid_input");
  const canEdit = canAuthor(a);
  return privileged(async (db) => {
    const text = await latest(db, v.data.week, v.data.lang, "published");
    const newest = canEdit ? await latest(db, v.data.week, v.data.lang) : null;
    return {
      text,
      draft: newest && newest.status === "draft" ? newest : null,
      canEdit,
    };
  });
}

const textInput = z.object({
  week: z.number().int().min(1).max(52),
  lang: z.enum(["ko", "en"]),
  title: z.string().trim().min(1).max(200),
  body_markdown: z.string().trim().min(1).max(204800),
  source_url: z
    .string()
    .max(4096)
    .regex(/^https:\/\/[^/@\s]+([/?#]\S*)?$/),
  rights_note: z.string().trim().min(1).max(300),
  rights_confirmed: z.boolean(),
});
export async function saveLessonText(a: Actor, input: unknown) {
  ensure(canAuthor(a), 403, "forbidden");
  const v = textInput.parse(input);
  if (v.rights_confirmed !== true) throw new AppError(400, "rights_required");
  return privileged(async (db) => {
    const newest = await latest(db, v.week, v.lang);
    const values = [
      v.title,
      v.body_markdown,
      v.source_url,
      v.rights_note,
      a.id,
    ];
    if (newest?.status === "draft") {
      return shape(
        (
          await db.query<Row>(
            `update ggc.lesson_texts set title=$1,body_markdown=$2,source_url=$3,rights_note=$4,confirmed_by=$5,updated_at=now() where id=$6 returning ${TEXT_COLUMNS}`,
            [...values, newest.id],
          )
        )[0],
      );
    }
    return shape(
      (
        await db.query<Row>(
          `insert into ggc.lesson_texts(title,body_markdown,source_url,rights_note,confirmed_by,created_by,week,lang,version)
       values($1,$2,$3,$4,$5,$5,$6,$7,$8) returning ${TEXT_COLUMNS}`,
          [...values, v.week, v.lang, (newest?.version || 0) + 1],
        )
      )[0],
    );
  });
}
export async function setLessonTextStatus(a: Actor, input: unknown) {
  ensure(canAuthor(a), 403, "forbidden");
  const v = z
    .object({ id: z.uuid(), status: z.enum(["draft", "published"]) })
    .parse(input);
  return privileged(async (db) => {
    const row = (
      await db.query<Row>(
        `update ggc.lesson_texts set status=$1,updated_at=now() where id=$2 returning ${TEXT_COLUMNS}`,
        [v.status, v.id],
      )
    )[0];
    ensure(row, 404, "not_found");
    return shape(row);
  });
}

type NoteRow = Record<string, unknown> & {
  id: string;
  owner_id: string;
  created_at: unknown;
};
const NOTE_COLUMNS =
  "id,lesson_text_id,version,owner_id,anchor,quote,body,author,created_at";
// Notes on every version of the same week/language, oldest first.
export async function listTextNotes(a: Actor | null, params: URLSearchParams) {
  const id = z.uuid().safeParse(params.get("text_id"));
  ensure(id.success, 400, "invalid_input");
  return privileged(async (db) => {
    const rows = await db.query<NoteRow>(
      `select ${NOTE_COLUMNS} from ggc.text_notes n where n.status='published' and n.lesson_text_id in (
         select o.id from ggc.lesson_texts o join ggc.lesson_texts t on t.week=o.week and t.lang=o.lang where t.id=$1)
       order by created_at limit 1000`,
      [id.data],
    );
    const items = (await withThreads(db, "text", rows, a)).map((n) => ({
      ...n,
      version: Number(n.version),
    }));
    return { items: items as unknown as TextNote[] };
  });
}

const anchorInput = z.object({
  exact: z.string().min(1).max(300),
  prefix: z.string().max(64),
  suffix: z.string().max(64),
  start: z.number().int().min(0),
});
export async function saveTextNote(a: Actor, input: unknown) {
  const v = z
    .object({
      id: z.uuid(),
      lesson_text_id: z.uuid(),
      anchor: anchorInput,
      body: z.string().trim().min(1).max(3000),
      author,
    })
    .parse(input);
  return privileged(async (db) => {
    const text = (
      await db.query<Row>(
        `select ${TEXT_COLUMNS} from ggc.lesson_texts where id=$1 and status='published'`,
        [v.lesson_text_id],
      )
    )[0];
    ensure(text, 404, "not_found");
    // The quoted words must really be in this text.
    ensure(
      locate(plainText(text.body_markdown), v.anchor),
      400,
      "invalid_input",
    );
    await db.query(
      `insert into ggc.text_notes(id,lesson_text_id,version,owner_id,anchor,quote,body,author) values($1,$2,$3,$4,$5,$6,$7,$8) on conflict(id) do nothing`,
      [
        v.id,
        v.lesson_text_id,
        text.version,
        a.id,
        v.anchor,
        v.anchor.exact.trim().slice(0, 300),
        v.body,
        authorName(v.author),
      ],
    );
    const row = (
      await db.query<NoteRow>(
        `select ${NOTE_COLUMNS} from ggc.text_notes where id=$1`,
        [v.id],
      )
    )[0];
    ensure(row.owner_id === a.id, 409, "conflict");
    const [note] = await withThreads(db, "text", [row], a);
    return { ...note, version: Number(note.version) } as unknown as TextNote;
  });
}
export const deleteTextNote = (a: Actor, input: unknown) =>
  deleteNote("text", a, input);
export const toggleTextHeart = (a: Actor, input: unknown) =>
  toggleHeart("text", a, input);
export const addTextComment = (a: Actor, input: unknown) =>
  addComment("text", a, input);
export const deleteTextComment = (a: Actor, input: unknown) =>
  deleteComment("text", a, input);
