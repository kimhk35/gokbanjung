import { randomUUID } from "node:crypto";
import type { DB } from "./db";
import { ensure } from "./errors";

// Operator-only administrator recovery, run by the database owner from a
// terminal. Never exposed over HTTP.

export type AdminRow = {
  actor_id: string;
  nickname: string;
  kind: string;
  status: string | null;
  login: string | null;
  has_login: boolean;
};

export async function adminOverview(db: DB) {
  const [counts] = await db.query<{
    weeks: number;
    people: number;
    teachers: number;
    logins: number;
    last_visit: string | null;
  }>(
    `select (select count(*)::int from ggc.weeks) as weeks,
       (select count(*)::int from ggc.actors) as people,
       (select count(*)::int from ggc.actors where role='TEACHER') as teachers,
       (select count(*)::int from public.ggc_auth_user) as logins,
       (select to_char(max(created_at) at time zone 'Asia/Seoul','YYYY-MM-DD HH24:MI') from ggc.actors) as last_visit`,
  );
  const admins = await db.query<AdminRow>(
    `select a.id as actor_id,a.nickname,a.kind,r.status,u.email as login,
       u.id is not null as has_login
     from ggc.actors a
     left join ggc.account_requests r on r.actor_id=a.id
     left join public.ggc_auth_user u on u.id=coalesce(r.user_id,a.id)::text
     where a.role='ADMIN'
     order by a.created_at,a.id`,
  );
  return { ...counts, admins };
}

// Replaces only the password of one administrator and ends that person's
// sessions. Role, approval state, actor link and records are not touched.
export async function setAdminPassword(
  db: DB,
  input: { actorId: string; passwordHash: string },
) {
  ensure(input.passwordHash, 400, "invalid_input");
  await db.query("select pg_advisory_xact_lock(20261019,5)");
  const [actor] = await db.query<{ id: string; role: string }>(
    "select id,role from ggc.actors where id=$1 for update",
    [input.actorId],
  );
  ensure(actor, 404, "not_found");
  ensure(actor.role === "ADMIN", 403, "not_administrator");
  const [user] = await db.query<{ id: string; email: string }>(
    `select u.id,u.email from public.ggc_auth_user u
     where u.id=coalesce((select user_id from ggc.account_requests where actor_id=$1),$1)::text`,
    [actor.id],
  );
  ensure(user, 409, "not_connected");
  const changed = await db.query(
    `update public.ggc_auth_account set password=$2,"updatedAt"=now()
     where "userId"=$1 and "providerId"='credential' returning id`,
    [user.id, input.passwordHash],
  );
  if (!changed.length)
    await db.query(
      `insert into public.ggc_auth_account(id,"accountId","providerId","userId",password) values($1,$2,'credential',$2,$3)`,
      [randomUUID(), user.id, input.passwordHash],
    );
  await db.query('delete from public.ggc_auth_session where "userId"=$1', [
    user.id,
  ]);
  return { email: user.email };
}
