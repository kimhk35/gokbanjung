import { z } from "zod";
import { privileged, type DB } from "./db";
import { ensure } from "./errors";
import { authorName, canAuthor, listPrompts, type Prompt } from "./prompts";
import type { Actor } from "./types";

export type StudyQuestion = Prompt & { study_day: number | null };
export type StudyOverview = {
  questions: StudyQuestion[];
  answeredDays: number[];
  canAuthor: boolean;
};
export type StudyThought = {
  id: string;
  week: number;
  day: number;
  track: "adult" | "family";
  path: string;
  anchor: string;
  label: string;
  body: string;
  author: string;
  visibility: "public" | "private";
  created_at: string;
  mine: boolean;
};
export type StudyFeedItem = {
  id: string;
  kind: "question" | "range";
  day: number | null;
  body: string;
  author: string;
  created_at: string;
  label: string;
  href: string;
};
const weekSchema = z.coerce.number().int().min(1).max(52);
const pathSchema = z
  .string()
  .max(1000)
  .regex(/^\/study\/[a-zA-Z0-9/_-]+$/)
  .refine((p) => !p.includes("//"));
const anchorSchema = z
  .string()
  .min(1)
  .max(200)
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9_,.-]*$/);
const iso = (v: unknown) => new Date(v as string).toISOString();

// Called inside the existing prompt transaction so a failed assignment also
// rolls back the edit. Teachers cannot displace another teacher's daily question.
export async function assignStudyQuestion(
  db: DB,
  a: Actor,
  promptId: string,
  week: number | null,
  day: number | null,
) {
  ensure(canAuthor(a), 403, "forbidden");
  const prompt = (
    await db.query<{ created_by: string }>(
      "select created_by from ggc.prompts where id=$1",
      [promptId],
    )
  )[0];
  ensure(prompt, 404, "not_found");
  ensure(prompt.created_by === a.id || a.role === "ADMIN", 403, "forbidden");
  if (day !== null) {
    ensure(week !== null, 400, "invalid_input");
    const occupied = (
      await db.query<{ created_by: string }>(
        `select p.created_by from ggc.study_prompt_assignments s join ggc.prompts p on p.id=s.prompt_id where s.week=$1 and s.day=$2 for update of s`,
        [week, day],
      )
    )[0];
    ensure(
      !occupied || occupied.created_by === a.id || a.role === "ADMIN",
      403,
      "forbidden",
    );
  }
  await db.query(
    "delete from ggc.study_prompt_assignments where prompt_id=$1",
    [promptId],
  );
  if (day !== null) {
    const assigned = await db.query(
      `insert into ggc.study_prompt_assignments(prompt_id,week,day) values($1,$2,$3)
     on conflict(week,day) do update set prompt_id=excluded.prompt_id,updated_at=now()
     where $5::boolean or exists(select 1 from ggc.prompts p where p.id=ggc.study_prompt_assignments.prompt_id and p.created_by=$4)
     returning prompt_id`,
      [promptId, week, day, a.id, a.role === "ADMIN"],
    );
    ensure(assigned.length, 403, "forbidden");
  }
}
export async function getStudyOverview(
  a: Actor | null,
  params: URLSearchParams,
): Promise<StudyOverview> {
  const week = weekSchema.parse(params.get("week"));
  const listed = await listPrompts(
    a,
    new URLSearchParams({ week: String(week) }),
  );
  const answeredDays = await privileged(async (db) =>
    (
      await db.query<{ day: number }>(
        `select distinct s.day from ggc.study_prompt_assignments s join ggc.prompt_replies r on r.prompt_id=s.prompt_id
     where s.week=$1 and r.owner_id=$2 and r.status='published' order by s.day`,
        [week, a?.id || null],
      )
    ).map((r) => Number(r.day)),
  );
  return {
    questions: listed.items.map((p) => ({
      ...p,
      study_day: p.study_day ?? null,
    })),
    answeredDays,
    canAuthor: listed.canAuthor,
  };
}
const THOUGHT_SELECT = `select id,week,day,track,source_path as path,anchor,label,body,author,visibility,created_at,owner_id=$2 as mine from ggc.study_range_thoughts`;
export async function getStudyThoughts(
  a: Actor | null,
  params: URLSearchParams,
) {
  const week = weekSchema.parse(params.get("week"));
  const path = pathSchema.parse(params.get("path"));
  const anchor = anchorSchema.parse(params.get("anchor"));
  return privileged(async (db) => {
    const items = (
      await db.query<StudyThought>(
        `${THOUGHT_SELECT} where week=$1 and source_path=$3 and anchor=$4
      and (visibility='public' or owner_id=$2) order by created_at,id limit 500`,
        [week, a?.id || null, path, anchor],
      )
    ).map((r) => ({
      ...r,
      mine: r.mine === true,
      created_at: iso(r.created_at),
    }));
    const count = (
      await db.query<{ n: number }>(
        `select count(*)::int as n from ggc.study_range_thoughts where week=$1 and source_path=$2 and anchor=$3 and visibility='public'`,
        [week, path, anchor],
      )
    )[0];
    return { items, publicCount: Number(count.n) };
  });
}
export async function saveStudyThought(a: Actor, input: unknown) {
  const v = z
    .object({
      id: z.uuid(),
      week: z.number().int().min(1).max(52),
      day: z.number().int().min(1).max(7),
      track: z.enum(["adult", "family"]),
      path: pathSchema,
      anchor: anchorSchema,
      label: z.string().trim().min(1).max(200),
      body: z.string().trim().min(1).max(3000),
      author: z.string().max(50).optional(),
      visibility: z.enum(["public", "private"]),
    })
    .parse(input);
  return privileged(async (db) => {
    await db.query(
      `insert into ggc.study_range_thoughts(id,owner_id,week,day,track,source_path,anchor,label,body,author,visibility)
      values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) on conflict(id) do nothing`,
      [
        v.id,
        a.id,
        v.week,
        v.day,
        v.track,
        v.path,
        v.anchor,
        v.label,
        v.body,
        authorName(v.author),
        v.visibility,
      ],
    );
    const row = (
      await db.query<StudyThought & { owner_id: string }>(
        `select id,week,day,track,source_path as path,anchor,label,body,author,visibility,created_at,owner_id from ggc.study_range_thoughts where id=$1`,
        [v.id],
      )
    )[0];
    ensure(
      row.owner_id === a.id &&
        row.path === v.path &&
        row.anchor === v.anchor &&
        Number(row.week) === v.week &&
        Number(row.day) === v.day &&
        row.track === v.track &&
        row.visibility === v.visibility &&
        row.body === v.body &&
        row.label === v.label &&
        row.author === authorName(v.author),
      409,
      "conflict",
    );
    const { owner_id: _owner, ...thought } = row;
    void _owner;
    return { ...thought, mine: true, created_at: iso(row.created_at) };
  });
}
export async function deleteStudyThought(a: Actor, input: unknown) {
  const { id } = z.object({ id: z.uuid() }).parse(input);
  return privileged(async (db) => {
    const owner = (
      await db.query<{ owner_id: string }>(
        "select owner_id from ggc.study_range_thoughts where id=$1",
        [id],
      )
    )[0];
    ensure(owner, 404, "not_found");
    // Even administrators cannot read private reflections; deletion is owner only.
    ensure(owner.owner_id === a.id, 403, "forbidden");
    await db.query("delete from ggc.study_range_thoughts where id=$1", [id]);
    return { ok: true };
  });
}
export async function getStudyFeed(
  _a: Actor | null,
  params: URLSearchParams,
): Promise<{ items: StudyFeedItem[] }> {
  const week = weekSchema.parse(params.get("week"));
  return privileged(async (db) => ({
    items: (
      await db.query<
        StudyFeedItem & {
          path: string | null;
          anchor: string | null;
          track: string | null;
        }
      >(
        `select r.id,'question'::text as kind,s.day,r.body,r.author,r.created_at,p.title as label,'/p/'||p.slug as href,null::text as path,null::text as anchor,null::text as track
      from ggc.prompt_replies r join ggc.prompts p on p.id=r.prompt_id left join ggc.study_prompt_assignments s on s.prompt_id=p.id
      where p.week=$1 and r.status='published'
     union all
     select t.id,'range'::text,t.day,t.body,t.author,t.created_at,t.label,
       '/week/'||t.week||'/day/'||t.day as href,t.source_path as path,t.anchor,t.track
      from ggc.study_range_thoughts t where t.week=$1 and t.visibility='public'
     order by created_at desc,id limit 500`,
        [week],
      )
    ).map(({ path, anchor, track, ...r }) => ({
      ...r,
      created_at: iso(r.created_at),
      href:
        r.kind === "range"
          ? `${r.href}?${new URLSearchParams({ track: track!, source: path!, anchor: anchor! })}`
          : r.href,
    })),
  }));
}
