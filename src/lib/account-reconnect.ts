import { randomUUID } from "node:crypto";
import type { DB } from "./db";
import { AppError, ensure } from "./errors";
import { usernameEmail } from "./login-id";

// Operator-only recovery: attach a new ID/password to an existing actor whose
// former Supabase sign-in was deleted. The actor, its role, approval state and
// records are kept; only the sign-in link changes. Never exposed over HTTP.

export type ReconnectCandidate = {
  actor_id: string;
  nickname: string;
  kind: string;
  role: string;
  course_id: string;
  status: string | null;
  former_login: string | null;
};

// People who used to sign in (members, teachers, admins, pending requests)
// but have no working sign-in today.
export async function reconnectCandidates(db: DB) {
  return db.query<ReconnectCandidate>(
    `select a.id as actor_id,a.nickname,a.kind,a.role,a.course_id,r.status,
       coalesce(r.email,t.email) as former_login
     from ggc.actors a
     left join ggc.account_requests r on r.actor_id=a.id
     left join ggc.teacher_applications t on t.user_id=a.id
     where (a.kind='user' or r.user_id is not null)
       and not exists (
         select 1 from public.ggc_auth_user u
         where u.id=coalesce(r.user_id,a.id)::text)
     order by a.role,a.nickname`,
  );
}

export async function reconnectAccount(
  db: DB,
  input: { actorId: string; login: string; passwordHash: string },
) {
  const email = usernameEmail(input.login);
  ensure(input.passwordHash, 400, "invalid_input");
  await db.query("select pg_advisory_xact_lock(20261019,5)");
  const [actor] = await db.query<{ id: string; kind: string; role: string }>(
    "select id,kind,role from ggc.actors where id=$1 for update",
    [input.actorId],
  );
  ensure(actor, 404, "not_found");
  const [link] = await db.query<{ user_id: string }>(
    "select user_id from ggc.account_requests where actor_id=$1 for update",
    [actor.id],
  );
  ensure(actor.kind === "user" || link, 400, "invalid_transition");
  // Refuse when the person can still sign in: this tool must not take over a live account.
  const [live] = await db.query(
    "select 1 from public.ggc_auth_user where id=$1",
    [link?.user_id || actor.id],
  );
  if (live) throw new AppError(409, "already_connected");
  const [taken] = await db.query(
    "select 1 from public.ggc_auth_user where lower(email)=lower($1)",
    [email],
  );
  if (taken) throw new AppError(409, "username_taken");
  const userId = randomUUID();
  await db.query(
    `insert into public.ggc_auth_user(id,name,email,"emailVerified") values($1,$2,$3,true)`,
    [userId, email.split("@")[0], email],
  );
  await db.query(
    `insert into public.ggc_auth_account(id,"accountId","providerId","userId",password) values($1,$2,'credential',$2,$3)`,
    [randomUUID(), userId, input.passwordHash],
  );
  if (link)
    // Keep the existing approval status; only the dead provider ID is replaced.
    await db.query(
      "update ggc.account_requests set user_id=$1,email=$2 where actor_id=$3",
      [userId, email, actor.id],
    );
  else
    // Former direct accounts (actor ID = old provider ID) were active users.
    await db.query(
      "insert into ggc.account_requests(user_id,actor_id,email,status) values($1,$2,$3,$4)",
      [
        userId,
        actor.id,
        email,
        ["MEMBER", "TEACHER", "ADMIN"].includes(actor.role) ? "approved" : "pending",
      ],
    );
  return { actorId: actor.id, userId, email, role: actor.role };
}
