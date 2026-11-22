import { canManageRecords } from "./access";
import { privileged, type DB } from "./db";
import { ensure } from "./errors";
import { quizPoints } from "./quiz";
import type { Actor } from "./types";

const studyPoints = { reading: 10, thought: 2 } as const;
type StudyPointKind = keyof typeof studyPoints;
type PointKind = StudyPointKind | "quiz_daily" | "quiz_weekly" | "quiz_monthly";

export type StudyPointSummary = {
  weekStart: string;
  weekEnd: string;
  weekly: number;
  total: number;
  reading: number;
  thought: number;
  quiz: number;
  wardCompletions: number;
  recent: {
    kind: PointKind;
    week: number | null;
    day: number | null;
    date: string;
    points: number;
  }[];
};

// The application and the additive migration can be rolled out separately.
async function hasPointLedger(db: DB) {
  const [row] = await db.query<{ ready: boolean }>(
    "select to_regclass('ggc.study_point_events') is not null as ready",
  );
  return row.ready;
}

export async function awardStudyPoints(
  db: DB,
  actor: Actor,
  week: number,
  day: number,
  kind: StudyPointKind,
) {
  if (!(await hasPointLedger(db))) return 0;
  const inserted = await db.query(
    `insert into ggc.study_point_events(owner_id, course_id, week, day, kind)
     values ($1, $2, $3, $4, $5)
     on conflict (owner_id, week, day, kind) do nothing
     returning kind`,
    [actor.id, actor.course_id, week, day, kind],
  );
  return inserted.length ? studyPoints[kind] : 0;
}

export async function getStudyPointSummary(
  actor: Actor,
): Promise<StudyPointSummary | null> {
  ensure(canManageRecords(actor), 403, "approval_required");
  return privileged(async (db) => {
    if (!(await hasPointLedger(db))) return null;
    const [summary] = await db.query<StudyPointSummary>(
      `with local_week as (
         select date_trunc('week', now() at time zone 'Asia/Seoul') as monday
       ), period as (
         select monday, monday at time zone 'Asia/Seoul' as starts,
           (monday + interval '7 days') at time zone 'Asia/Seoul' as ends
         from local_week
       ), entries as (
         select kind, week, day, earned_at,
           case kind when 'reading' then $3::int else $4::int end as points
         from ggc.study_point_events where owner_id = $1
         union all
         select kind, null, null, earned_at,
           case kind when 'quiz_daily' then $5::int
             when 'quiz_weekly' then $6::int else $7::int end
         from ggc.reward_events
         where owner_id = $1 and kind in ('quiz_daily', 'quiz_weekly', 'quiz_monthly')
       ), this_week as (
         select entries.* from entries, period
         where earned_at >= starts and earned_at < ends
       ), latest as (
         select kind, week, day, points,
           to_char(earned_at at time zone 'Asia/Seoul', 'YYYY-MM-DD') as date,
           earned_at
         from entries order by earned_at desc, kind, week, day limit 30
       )
       select to_char(monday, 'YYYY-MM-DD') as "weekStart",
         to_char(monday + interval '6 days', 'YYYY-MM-DD') as "weekEnd",
         (select coalesce(sum(points), 0)::int from this_week) as weekly,
         (select coalesce(sum(points), 0)::int from entries) as total,
         (select coalesce(sum(points), 0)::int from this_week where kind = 'reading') as reading,
         (select coalesce(sum(points), 0)::int from this_week where kind = 'thought') as thought,
         (select coalesce(sum(points), 0)::int from this_week where kind like 'quiz_%') as quiz,
         (select count(*)::int from ggc.study_point_events e
           join ggc.actors member on member.id = e.owner_id
           where e.course_id = $2 and member.course_id = $2 and e.kind = 'reading'
             and e.earned_at >= period.starts and e.earned_at < period.ends
             and member.kind = 'user' and member.role in ('MEMBER', 'TEACHER', 'ADMIN')
             and not exists (
               select 1 from ggc.account_requests r
               where r.actor_id = member.id and r.status <> 'approved'
             )
         ) as "wardCompletions",
         (select coalesce(jsonb_agg(jsonb_build_object(
           'kind', kind, 'week', week, 'day', day, 'date', date, 'points', points
         ) order by earned_at desc, kind, week, day), '[]'::jsonb) from latest) as recent
       from period`,
      [
        actor.id,
        actor.course_id,
        studyPoints.reading,
        studyPoints.thought,
        quizPoints.daily,
        quizPoints.weekly,
        quizPoints.monthly,
      ],
    );
    return summary;
  });
}
