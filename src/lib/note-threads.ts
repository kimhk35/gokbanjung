// Hearts, comments and owner-only deletion shared by verse notes and lesson
// text notes. Table names come from a fixed list, never from user input.
import { z } from "zod";
import { privileged, type DB } from "./db";
import { ensure } from "./errors";
import type { Actor } from "./types";
import { authorName } from "./prompts";

export type NoteComment = {
  id: string;
  note_id: string;
  author: string;
  body: string;
  created_at: string;
  mine: boolean;
};
export type ThreadFields = {
  hearts: number;
  hearted: boolean;
  comments: NoteComment[];
  mine: boolean;
};
const KINDS = {
  verse: {
    notes: "ggc.verse_notes",
    reactions: "ggc.verse_note_reactions",
    comments: "ggc.verse_note_comments",
  },
  text: {
    notes: "ggc.text_notes",
    reactions: "ggc.text_note_reactions",
    comments: "ggc.text_note_comments",
  },
} as const;
export type NoteKind = keyof typeof KINDS;
const iso = (v: unknown) => new Date(v as string).toISOString();
const isAdmin = (a: Actor) => a.kind === "user" && a.role === "ADMIN";
export const author = z.string().max(50).optional();

// Adds hearts/hearted/comments/mine to already-loaded note rows.
export async function withThreads<
  T extends { id: string; owner_id: string; created_at: unknown },
>(
  db: DB,
  kind: NoteKind,
  rows: T[],
  a: Actor | null,
): Promise<(Omit<T, "owner_id"> & ThreadFields)[]> {
  if (!rows.length) return [];
  const t = KINDS[kind];
  const ids = rows.map((r) => r.id);
  const me = a?.id || null;
  const hearts = await db.query<{ note_id: string; n: number; mine: boolean }>(
    `select note_id,count(*)::int as n,bool_or(owner_id=$2) as mine from ${t.reactions} where note_id=any($1::uuid[]) group by note_id`,
    [ids, me],
  );
  const comments = await db.query<Record<string, unknown>>(
    `select id,note_id,author,body,created_at,owner_id=$2 as mine from ${t.comments} where note_id=any($1::uuid[]) order by created_at,id`,
    [ids, me],
  );
  return rows.map(({ owner_id, ...row }) => {
    const h = hearts.find((x) => x.note_id === row.id);
    return {
      ...row,
      created_at: iso(row.created_at),
      mine: !!me && owner_id === me,
      hearts: Number(h?.n || 0),
      hearted: h?.mine === true,
      comments: comments
        .filter((c) => c.note_id === row.id)
        .map(
          (c) =>
            ({
              ...c,
              created_at: iso(c.created_at),
              mine: c.mine === true,
            }) as NoteComment,
        ),
    };
  });
}

export async function ensureOwner(db: DB, table: string, id: string, a: Actor) {
  const row = (
    await db.query<{ owner: string }>(
      `select owner_id as owner from ${table} where id=$1`,
      [id],
    )
  )[0];
  ensure(row, 404, "not_found");
  ensure(row.owner === a.id || isAdmin(a), 403, "forbidden");
}
export async function deleteNote(kind: NoteKind, a: Actor, input: unknown) {
  const v = z.object({ id: z.uuid() }).parse(input);
  const t = KINDS[kind];
  return privileged(async (db) => {
    await ensureOwner(db, t.notes, v.id, a);
    await db.query(`delete from ${t.notes} where id=$1`, [v.id]);
    return { ok: true as const };
  });
}
export async function toggleHeart(kind: NoteKind, a: Actor, input: unknown) {
  const v = z.object({ note_id: z.uuid() }).parse(input);
  const t = KINDS[kind];
  return privileged(async (db) => {
    ensure(
      (
        await db.query(
          `select 1 from ${t.notes} where id=$1 and status='published'`,
          [v.note_id],
        )
      )[0],
      404,
      "not_found",
    );
    const removed = await db.query(
      `delete from ${t.reactions} where note_id=$1 and owner_id=$2 returning note_id`,
      [v.note_id, a.id],
    );
    if (!removed.length)
      await db.query(
        `insert into ${t.reactions}(note_id,owner_id) values($1,$2) on conflict do nothing`,
        [v.note_id, a.id],
      );
    const n = (
      await db.query<{ n: number }>(
        `select count(*)::int as n from ${t.reactions} where note_id=$1`,
        [v.note_id],
      )
    )[0].n;
    return { hearted: !removed.length, hearts: Number(n) };
  });
}
export async function addComment(kind: NoteKind, a: Actor, input: unknown) {
  const v = z
    .object({
      id: z.uuid(),
      note_id: z.uuid(),
      author,
      body: z.string().trim().min(1).max(1500),
    })
    .parse(input);
  const t = KINDS[kind];
  return privileged(async (db) => {
    ensure(
      (
        await db.query(
          `select 1 from ${t.notes} where id=$1 and status='published'`,
          [v.note_id],
        )
      )[0],
      404,
      "not_found",
    );
    await db.query(
      `insert into ${t.comments}(id,note_id,owner_id,author,body) values($1,$2,$3,$4,$5) on conflict(id) do nothing`,
      [v.id, v.note_id, a.id, authorName(v.author), v.body],
    );
    const row = (
      await db.query<Record<string, unknown>>(
        `select id,note_id,author,body,created_at,owner_id from ${t.comments} where id=$1`,
        [v.id],
      )
    )[0];
    ensure(row.owner_id === a.id, 409, "conflict");
    return {
      id: v.id,
      note_id: v.note_id,
      author: String(row.author),
      body: String(row.body),
      created_at: iso(row.created_at),
      mine: true,
    } as NoteComment;
  });
}
export async function deleteComment(kind: NoteKind, a: Actor, input: unknown) {
  const v = z.object({ id: z.uuid() }).parse(input);
  const t = KINDS[kind];
  return privileged(async (db) => {
    await ensureOwner(db, t.comments, v.id, a);
    await db.query(`delete from ${t.comments} where id=$1`, [v.id]);
    return { ok: true as const };
  });
}
