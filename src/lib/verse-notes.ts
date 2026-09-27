// Notes on scripture verses (3ⓐ). Stores a place (book/chapter/verses), an
// optional short quote and the reader's thought — never the scripture text.
import { z } from "zod";
import { privileged } from "./db";
import { AppError, ensure } from "./errors";
import type { Actor } from "./types";
import { authorName } from "./prompts";
import { scriptureBooks, parseScripture } from "./scriptures";
import { curriculum, referenceChapters } from "./curriculum";
import {
  addComment,
  author,
  deleteComment,
  deleteNote,
  toggleHeart,
  withThreads,
  type ThreadFields,
} from "./note-threads";

export type VerseNote = {
  id: string;
  book_id: string;
  chapter: number;
  verse_start: number;
  verse_end: number;
  quote: string;
  body: string;
  author: string;
  week: number | null;
  created_at: string;
} & ThreadFields;
type Place = { book_id: string; chapter: number };
const COLUMNS =
  "id,owner_id,book_id,chapter,verse_start,verse_end,quote,body,author,week,created_at";

// Chapters read in a curriculum week, e.g. week 40 → Isaiah 40–49.
export function weekChapters(week: number): Place[] {
  const w = curriculum.find((x) => x.number === week);
  if (!w) return [];
  const places = referenceChapters(w).flatMap((ref) => {
    const p = parseScripture(ref);
    return p ? [{ book_id: p.book.id, chapter: p.chapter }] : [];
  });
  return places.filter(
    (p, i) =>
      places.findIndex(
        (q) => q.book_id === p.book_id && q.chapter === p.chapter,
      ) === i,
  );
}
function validPlace(book_id: string, chapter: number) {
  const book = scriptureBooks.find((b) => b.id === book_id);
  ensure(
    book &&
      Number.isInteger(chapter) &&
      chapter >= 1 &&
      chapter <= book.chapters,
    400,
    "invalid_input",
  );
}

export async function listVerseNotes(a: Actor | null, params: URLSearchParams) {
  let places: Place[];
  if (params.get("week")) {
    const week = z.coerce
      .number()
      .int()
      .min(1)
      .max(52)
      .safeParse(params.get("week"));
    ensure(week.success, 400, "invalid_input");
    places = weekChapters(week.data);
  } else {
    const book_id = params.get("book") || "";
    const chapter = Number(params.get("chapter"));
    validPlace(book_id, chapter);
    places = [{ book_id, chapter }];
  }
  return privileged(async (db) => {
    const rows = places.length
      ? await db.query<
          Record<string, unknown> & {
            id: string;
            owner_id: string;
            created_at: unknown;
          }
        >(
          `select ${COLUMNS} from ggc.verse_notes n
           where status='published' and exists(select 1 from unnest($1::text[],$2::int[]) p(b,c) where p.b=n.book_id and p.c=n.chapter)
           order by book_id,chapter,verse_start,created_at limit 500`,
          [places.map((p) => p.book_id), places.map((p) => p.chapter)],
        )
      : [];
    return {
      chapters: places,
      items: (await withThreads(
        db,
        "verse",
        rows,
        a,
      )) as unknown as VerseNote[],
    };
  });
}

const noteInput = z.object({
  id: z.uuid(),
  book_id: z.string().max(40),
  chapter: z.number().int(),
  verse_start: z.number().int().min(1).max(200),
  verse_end: z.number().int().min(1).max(200).optional(),
  quote: z.string().trim().max(200).default(""),
  body: z.string().trim().min(1).max(3000),
  author,
  week: z.number().int().min(1).max(52).nullable().optional(),
});
export async function saveVerseNote(a: Actor, input: unknown) {
  const v = noteInput.parse(input);
  validPlace(v.book_id, v.chapter);
  const end = v.verse_end ?? v.verse_start;
  if (end < v.verse_start) throw new AppError(400, "invalid_input");
  return privileged(async (db) => {
    await db.query(
      `insert into ggc.verse_notes(id,owner_id,book_id,chapter,verse_start,verse_end,quote,body,author,week)
       values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) on conflict(id) do nothing`,
      [
        v.id,
        a.id,
        v.book_id,
        v.chapter,
        v.verse_start,
        end,
        v.quote,
        v.body,
        authorName(v.author),
        v.week ?? null,
      ],
    );
    const row = (
      await db.query<
        Record<string, unknown> & {
          id: string;
          owner_id: string;
          created_at: unknown;
        }
      >(`select ${COLUMNS} from ggc.verse_notes where id=$1`, [v.id])
    )[0];
    ensure(row.owner_id === a.id, 409, "conflict");
    return (
      await withThreads(db, "verse", [row], a)
    )[0] as unknown as VerseNote;
  });
}
export const deleteVerseNote = (a: Actor, input: unknown) =>
  deleteNote("verse", a, input);
export const toggleVerseHeart = (a: Actor, input: unknown) =>
  toggleHeart("verse", a, input);
export const addVerseComment = (a: Actor, input: unknown) =>
  addComment("verse", a, input);
export const deleteVerseComment = (a: Actor, input: unknown) =>
  deleteComment("verse", a, input);
