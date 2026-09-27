import { z } from "zod";
import { privileged } from "./db";
import { ensure } from "./errors";
import type { Actor } from "./types";

export async function classMembers(actor: Actor, params: URLSearchParams) {
  ensure(actor.kind === "user" && ["TEACHER", "ADMIN"].includes(actor.role));
  const week = z.coerce
    .number()
    .int()
    .min(1)
    .max(52)
    .parse(params.get("week") || 38);
  const filter = params.get("teacher") || "all";
  if (!["all", "unassigned"].includes(filter)) z.uuid().parse(filter);
  return privileged(async (db) => {
    // Re-check the current database role before aggregating private progress.
    const [viewer] = await db.query(
      "select id,kind,role,course_id from ggc.actors a where id=$1 and not exists(select 1 from ggc.account_requests r where r.actor_id=a.id and r.status<>'approved')",
      [actor.id],
    );
    ensure(
      viewer?.kind === "user" &&
        viewer.course_id === actor.course_id &&
        ["ADMIN", "TEACHER"].includes(String(viewer.role)),
    );
    const admin = viewer.role === "ADMIN";
    if (!admin) {
      const assigned = await db.query(
        "select 1 from ggc.course_teachers where teacher_id=$1 and course_id=$2",
        [actor.id, actor.course_id],
      );
      ensure(assigned.length > 0);
      ensure(filter === "all" || filter === actor.id);
    }
    const teachers = admin
      ? await db.query(
          "select a.id,a.nickname from ggc.actors a join ggc.course_teachers ct on ct.teacher_id=a.id and ct.course_id=a.course_id where a.course_id=$1 and a.role='TEACHER' order by a.nickname",
          [actor.course_id],
        )
      : [];
    const members = await db.query(
      `
      with roster as (
        select a.id,a.nickname,a.kind,a.role,a.teacher_id,t.nickname as teacher_name,ar.status as account_status
        from ggc.actors a left join ggc.actors t on t.id=a.teacher_id
        left join ggc.account_requests ar on ar.actor_id=a.id
        where a.course_id=$1 and a.role in ('GUEST','MEMBER','TEACHER_PENDING')
          and (($2::boolean and ($4='all' or ($4='unassigned' and a.teacher_id is null) or a.teacher_id::text=$4))
            or (not $2::boolean and a.teacher_id=$3::uuid))
      ), progress as (
        select p.owner_id,p.week,count(*)::int as days,max(p.created_at) as last_at
        from ggc.lesson_progress p join roster r on r.id=p.owner_id
        join ggc.weeks w on w.id=p.week and w.course_id=$1 group by p.owner_id,p.week
      )
      select r.*,
        coalesce((select sum(p.days)::int from progress p where p.owner_id=r.id),0) as completed_days,
        coalesce((select p.days from progress p where p.owner_id=r.id and p.week=$5::int),0) as week_days,
        (select count(*)::int from progress p where p.owner_id=r.id and p.days=7) as completed_weeks,
        coalesce((select jsonb_agg(jsonb_build_object('week',p.week,'days',p.days) order by p.week) from progress p where p.owner_id=r.id),'[]'::jsonb) as progress,
        (select max(p.last_at) from progress p where p.owner_id=r.id) as last_completed_at,
        (select count(*)::int from ggc.worksheet_submissions s where s.owner_id=r.id and s.course_id=$1 and s.status<>'DRAFT') as submissions,
        (select count(*)::int from ggc.worksheet_submissions s where s.owner_id=r.id and s.course_id=$1 and s.status<>'DRAFT' and s.week=$5::int) as week_submissions,
        (select count(*)::int from ggc.quiz_attempts q join ggc.quiz_sets qs on qs.id=q.quiz_id where q.owner_id=r.id and qs.course_id=$1) as quiz_attempts,
        (select round(100.0*sum(q.correct)/nullif(sum(q.total),0),1) from ggc.quiz_attempts q join ggc.quiz_sets qs on qs.id=q.quiz_id where q.owner_id=r.id and qs.course_id=$1) as quiz_accuracy
      from roster r order by r.nickname,r.id`,
      [actor.course_id, admin, actor.id, filter, week],
    );
    return { week, members, teachers };
  });
}
