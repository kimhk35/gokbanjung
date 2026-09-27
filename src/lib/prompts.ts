import { z } from "zod";
import { privileged, type DB } from "./db";
import { ensure } from "./errors";
import type { Actor } from "./types";

export type Prompt = {
  id: string;
  slug: string;
  title: string;
  question: string;
  reading_text: string;
  source_url: string | null;
  reference_label: string | null;
  week: number | null;
  author: string;
  poster_path: string | null;
  created_at: string;
  reply_count: number;
  mine: boolean;
};
export type ReplyComment = {
  id: string;
  reply_id: string;
  author: string;
  body: string;
  created_at: string;
  mine: boolean;
};
export type Reply = {
  id: string;
  prompt_id: string;
  author: string;
  body: string;
  created_at: string;
  mine: boolean;
  hearts: number;
  hearted: boolean;
  comments: ReplyComment[];
};
const iso = (v: unknown) => new Date(v as string).toISOString();
const PROMPT_SELECT = `select p.id,p.slug,p.title,p.question,p.reading_text,p.source_url,p.reference_label,p.week,p.author,p.poster_path,p.created_at,p.created_by,
 (select count(*) from ggc.prompt_replies r where r.prompt_id=p.id and r.status='published')::int as reply_count from ggc.prompts p`;
type PromptRow = Omit<Prompt, "mine"> & { created_by: string };
function shapePrompt(row: PromptRow, a: Actor | null): Prompt {
  const { created_by, ...rest } = row;
  return {
    ...rest,
    week: row.week === null ? null : Number(row.week),
    reply_count: Number(row.reply_count),
    created_at: iso(row.created_at),
    mine: !!a && created_by === a.id,
  };
}
const author = z.string().max(50).optional();
export function authorName(raw: string | undefined) {
  return raw?.trim() || "익명";
}
export function canAuthor(a: Actor | null) {
  return !!a && a.kind === "user" && ["TEACHER", "ADMIN"].includes(a.role);
}
const isAdmin = (a: Actor) => a.kind === "user" && a.role === "ADMIN";

export async function listPrompts(a: Actor | null, params: URLSearchParams) {
  const week = params.get("week")
    ? z.coerce.number().int().min(1).max(52).parse(params.get("week"))
    : null;
  return privileged(async (db) => ({
    items: (
      await db.query<PromptRow>(
        `${PROMPT_SELECT} where ($1::int is null or p.week=$1) order by p.created_at desc limit 100`,
        [week],
      )
    ).map((r) => shapePrompt(r, a)),
    canAuthor: canAuthor(a),
  }));
}
export async function getPrompt(a: Actor | null, slug: string) {
  ensure(/^[a-f0-9]{12}$/.test(slug), 404, "not_found");
  return privileged(async (db) => {
    const row = (
      await db.query<PromptRow>(`${PROMPT_SELECT} where p.slug=$1`, [slug])
    )[0];
    ensure(row, 404, "not_found");
    const me = a?.id || null;
    const replies = await db.query<Record<string, unknown>>(
      `select r.id,r.prompt_id,r.author,r.body,r.created_at,r.owner_id=$2 as mine,
        (select count(*) from ggc.prompt_reply_reactions x where x.reply_id=r.id)::int as hearts,
        exists(select 1 from ggc.prompt_reply_reactions x where x.reply_id=r.id and x.owner_id=$2) as hearted
       from ggc.prompt_replies r where r.prompt_id=$1 and r.status='published' order by r.created_at,r.id`,
      [row.id, me],
    );
    const comments = await db.query<Record<string, unknown>>(
      `select c.id,c.reply_id,c.author,c.body,c.created_at,c.owner_id=$2 as mine from ggc.prompt_reply_comments c
       join ggc.prompt_replies r on r.id=c.reply_id where r.prompt_id=$1 order by c.created_at,c.id`,
      [row.id, me],
    );
    return {
      prompt: shapePrompt(row, a),
      canAuthor: canAuthor(a),
      replies: replies.map((r) => ({
        ...r,
        created_at: iso(r.created_at),
        mine: r.mine === true,
        hearted: r.hearted === true,
        hearts: Number(r.hearts),
        comments: comments
          .filter((c) => c.reply_id === r.id)
          .map((c) => ({
            ...c,
            created_at: iso(c.created_at),
            mine: c.mine === true,
          })),
      })) as Reply[],
    };
  });
}
const promptInput = z.object({
  id: z.uuid().optional(),
  title: z.string().trim().min(1).max(160),
  question: z.string().trim().min(1).max(3000),
  reading_text: z.string().max(10000).default(""),
  source_url: z
    .string()
    .max(4096)
    .regex(/^https:\/\/[^/@\s]+([/?#]\S*)?$/)
    .nullable()
    .optional(),
  reference_label: z.string().trim().max(200).optional(),
  week: z.number().int().min(1).max(52).nullable().optional(),
  author,
  poster_path: z
    .string()
    .regex(/^prompts\/[a-f0-9-]{36}\.(webp|png|jpg)$/)
    .nullable()
    .optional(),
});
export async function savePrompt(a: Actor, input: unknown) {
  ensure(canAuthor(a), 403, "forbidden");
  const v = promptInput.parse(input);
  const values = [
    v.title,
    v.question,
    v.reading_text,
    v.source_url || null,
    v.reference_label || null,
    v.week ?? null,
    authorName(v.author || a.nickname),
    v.poster_path || null,
  ];
  return privileged(async (db) => {
    let id = v.id;
    if (id) {
      const owner = (
        await db.query<{ created_by: string }>(
          "select created_by from ggc.prompts where id=$1",
          [id],
        )
      )[0];
      ensure(owner, 404, "not_found");
      ensure(owner.created_by === a.id || isAdmin(a), 403, "forbidden");
      await db.query(
        "update ggc.prompts set title=$1,question=$2,reading_text=$3,source_url=$4,reference_label=$5,week=$6,author=$7,poster_path=$8,updated_at=now() where id=$9",
        [...values, id],
      );
    } else {
      id = (
        await db.query<{ id: string }>(
          "insert into ggc.prompts(title,question,reading_text,source_url,reference_label,week,author,poster_path,created_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9) returning id",
          [...values, a.id],
        )
      )[0].id;
    }
    return shapePrompt(
      (await db.query<PromptRow>(`${PROMPT_SELECT} where p.id=$1`, [id]))[0],
      a,
    );
  });
}
async function owned(
  db: DB,
  table: string,
  id: string,
  a: Actor,
  ownerColumn = "owner_id",
) {
  const row = (
    await db.query<{ owner: string }>(
      `select ${ownerColumn} as owner from ${table} where id=$1`,
      [id],
    )
  )[0];
  ensure(row, 404, "not_found");
  ensure(row.owner === a.id || isAdmin(a), 403, "forbidden");
}
export async function deletePrompt(a: Actor, input: unknown) {
  const v = z.object({ id: z.uuid() }).parse(input);
  return privileged(async (db) => {
    await owned(db, "ggc.prompts", v.id, a, "created_by");
    await db.query("delete from ggc.prompts where id=$1", [v.id]);
    return { ok: true as const };
  });
}
export async function addReply(a: Actor, input: unknown) {
  const v = z
    .object({
      id: z.uuid(),
      prompt_id: z.uuid(),
      author,
      body: z.string().trim().min(1).max(3000),
    })
    .parse(input);
  return privileged(async (db) => {
    ensure(
      (
        await db.query("select 1 from ggc.prompts where id=$1", [v.prompt_id])
      )[0],
      404,
      "not_found",
    );
    await db.query(
      "insert into ggc.prompt_replies(id,prompt_id,owner_id,author,body) values($1,$2,$3,$4,$5) on conflict(id) do nothing",
      [v.id, v.prompt_id, a.id, authorName(v.author), v.body],
    );
    const row = (
      await db.query<Record<string, unknown>>(
        "select id,prompt_id,author,body,created_at,owner_id from ggc.prompt_replies where id=$1",
        [v.id],
      )
    )[0];
    ensure(
      row.owner_id === a.id && row.prompt_id === v.prompt_id,
      409,
      "conflict",
    );
    return {
      id: v.id,
      prompt_id: v.prompt_id,
      author: String(row.author),
      body: String(row.body),
      created_at: iso(row.created_at),
      mine: true,
      hearts: 0,
      hearted: false,
      comments: [],
    } as Reply;
  });
}
export async function deleteReply(a: Actor, input: unknown) {
  const v = z.object({ id: z.uuid() }).parse(input);
  return privileged(async (db) => {
    await owned(db, "ggc.prompt_replies", v.id, a);
    await db.query("delete from ggc.prompt_replies where id=$1", [v.id]);
    return { ok: true as const };
  });
}
export async function addReplyComment(a: Actor, input: unknown) {
  const v = z
    .object({
      id: z.uuid(),
      reply_id: z.uuid(),
      author,
      body: z.string().trim().min(1).max(1500),
    })
    .parse(input);
  return privileged(async (db) => {
    ensure(
      (
        await db.query(
          "select 1 from ggc.prompt_replies where id=$1 and status='published'",
          [v.reply_id],
        )
      )[0],
      404,
      "not_found",
    );
    await db.query(
      "insert into ggc.prompt_reply_comments(id,reply_id,owner_id,author,body) values($1,$2,$3,$4,$5) on conflict(id) do nothing",
      [v.id, v.reply_id, a.id, authorName(v.author), v.body],
    );
    const row = (
      await db.query<Record<string, unknown>>(
        "select id,reply_id,author,body,created_at,owner_id from ggc.prompt_reply_comments where id=$1",
        [v.id],
      )
    )[0];
    ensure(row.owner_id === a.id, 409, "conflict");
    return {
      id: v.id,
      reply_id: v.reply_id,
      author: String(row.author),
      body: String(row.body),
      created_at: iso(row.created_at),
      mine: true,
    } as ReplyComment;
  });
}
export async function deleteReplyComment(a: Actor, input: unknown) {
  const v = z.object({ id: z.uuid() }).parse(input);
  return privileged(async (db) => {
    await owned(db, "ggc.prompt_reply_comments", v.id, a);
    await db.query("delete from ggc.prompt_reply_comments where id=$1", [v.id]);
    return { ok: true as const };
  });
}
export async function toggleHeart(a: Actor, input: unknown) {
  const v = z.object({ reply_id: z.uuid() }).parse(input);
  return privileged(async (db) => {
    ensure(
      (
        await db.query(
          "select 1 from ggc.prompt_replies where id=$1 and status='published'",
          [v.reply_id],
        )
      )[0],
      404,
      "not_found",
    );
    const removed = await db.query(
      "delete from ggc.prompt_reply_reactions where reply_id=$1 and owner_id=$2 returning reply_id",
      [v.reply_id, a.id],
    );
    if (!removed.length)
      await db.query(
        "insert into ggc.prompt_reply_reactions(reply_id,owner_id) values($1,$2) on conflict do nothing",
        [v.reply_id, a.id],
      );
    const hearts = Number(
      (
        await db.query<{ n: number }>(
          "select count(*)::int as n from ggc.prompt_reply_reactions where reply_id=$1",
          [v.reply_id],
        )
      )[0].n,
    );
    return { hearted: !removed.length, hearts };
  });
}
export async function recentActivity() {
  return privileged(async (db) => ({
    prompts: (
      await db.query<PromptRow>(
        `${PROMPT_SELECT} order by p.created_at desc limit 3`,
      )
    ).map((r) => shapePrompt(r, null)),
    replies: (
      await db.query<Record<string, unknown>>(
        `select r.id,r.author,left(r.body,140) as body,r.created_at,p.slug as prompt_slug,p.title as prompt_title
       from ggc.prompt_replies r join ggc.prompts p on p.id=r.prompt_id where r.status='published' order by r.created_at desc limit 3`,
      )
    ).map((r) => ({ ...r, created_at: iso(r.created_at) })) as {
      id: string;
      author: string;
      body: string;
      created_at: string;
      prompt_slug: string;
      prompt_title: string;
    }[],
  }));
}
