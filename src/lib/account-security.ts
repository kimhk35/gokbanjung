import { z } from "zod";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { privileged } from "./db";
import { ensure, AppError } from "./errors";
import { rateLimit, requireAdmin } from "./service";
import { createHash } from "node:crypto";
import type { Actor } from "./types";
import { usernameSchema, usernameEmail } from "./login-id";
export const passwordSchema = z.string().min(10).max(128);
export const accountRequestSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
});
export function publicAuthClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  ensure(url && key, 503, "auth_unavailable");
  return createClient(url, key, {
    auth: {
      flowType: "implicit",
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
export function adminAuthClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  ensure(url && key, 503, "admin_auth_unavailable");
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
export async function requestAccount(
  a: Actor,
  input: unknown,
  auth: SupabaseClient,
  origin: string,
  admin?: SupabaseClient,
) {
  ensure(
    !a.account_status && (a.kind === "guest" || a.role === "TEACHER_PENDING"),
    400,
    "invalid_transition",
  );
  const value = accountRequestSchema.parse(input);
  const v = {
    name: a.nickname || value.username,
    email: usernameEmail(value.username),
    password: value.password,
  };
  await rateLimit("account-request:" + a.id, 3, 3600);
  const existing = await privileged((db) =>
    db.query("select user_id from ggc.account_requests where actor_id=$1", [
      a.id,
    ]),
  );
  ensure(!existing.length, 409, "account_exists");
  const client = a.kind === "guest" ? admin || adminAuthClient() : auth;
  const result =
    a.kind === "guest"
      ? await client.auth.admin.createUser({
          email: v.email,
          password: v.password,
          email_confirm: true,
        })
      : await auth.auth.signInWithPassword({
          email: v.email,
          password: v.password,
        });
  ensure(!result.error && result.data.user, 400, "account_request_failed");
  if (a.kind !== "guest")
    ensure(result.data.user.id === a.id, 403, "forbidden");
  try {
    await privileged(async (db) => {
      await db.query(
        "insert into ggc.account_requests(user_id,actor_id,email) values($1,$2,$3)",
        [result.data.user!.id, a.id, v.email],
      );
      await db.query("update ggc.actors set nickname=$1 where id=$2", [
        v.name,
        a.id,
      ]);
    });
  } catch (e) {
    if (a.kind === "guest")
      await client.auth.admin.deleteUser(result.data.user.id);
    throw e;
  }
  return { ok: true, confirmEmail: false };
}
export async function sendPasswordReset(
  emailInput: unknown,
  origin: string,
  requestKey: string,
  client?: SupabaseClient,
) {
  const email = z.email().parse(emailInput).trim().toLowerCase();
  const digest = createHash("sha256").update(email).digest("hex");
  await rateLimit("recovery-email:" + digest, 3, 3600);
  await rateLimit("recovery-sender:" + requestKey, 10, 3600);
  const result = await (
    client || publicAuthClient()
  ).auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/reset-password`,
  });
  if (result.error) throw new AppError(503, "reset_email_failed");
  // Identical response whether or not an account exists.
  return { ok: true };
}
export async function accountSecurityList(a: Actor) {
  await requireAdmin(a);
  return privileged((db) =>
    db.query(
      "select a.id,a.nickname,a.role,coalesce(r.email,t.email,'') as email,coalesce(r.user_id,a.id) as user_id from ggc.actors a left join ggc.account_requests r on r.actor_id=a.id left join ggc.teacher_applications t on t.user_id=a.id where a.course_id=$1 and (a.kind='user' or r.user_id is not null) order by a.nickname",
      [a.course_id],
    ),
  );
}
export async function adminResetPassword(
  a: Actor,
  input: unknown,
  origin: string,
  client?: SupabaseClient,
) {
  await requireAdmin(a);
  const v = z
    .object({
      actor_id: z.uuid(),
      mode: z.literal("temporary"),
      password: passwordSchema.optional(),
    })
    .parse(input);
  if (v.mode === "temporary") ensure(v.password, 400, "invalid_input");
  const target = (await accountSecurityList(a)).find(
    (row) => row.id === v.actor_id,
  );
  ensure(target, 404, "not_found");
  await rateLimit("admin-password:" + a.id, 20, 3600);
  const auth = client || adminAuthClient();
  const result = await auth.auth.admin.updateUserById(String(target.user_id), {
    password: v.password!,
    email_confirm: true,
  });
  ensure(!result.error, 400, "password_update_failed");
  return { ok: true };
}

// Let an administrator approve legacy requests without requiring an old verification email.
export async function confirmForApproval(a: Actor, path: string, input: unknown, client?: SupabaseClient) {
  await requireAdmin(a);
  const value = z.object({id:z.uuid().optional(),user_id:z.uuid().optional(),status:z.literal("approved")}).parse(input);
  const target = await privileged(async db => {
    if(path === "approve-teacher") {
      ensure(value.id,400,"invalid_input");
      return (await db.query("select coalesce(r.user_id,t.user_id) as user_id from ggc.teacher_applications t join ggc.actors a on a.id=t.user_id left join ggc.account_requests r on r.actor_id=a.id where t.id=$1 and a.course_id=$2 and a.role<>'ADMIN'",[value.id,a.course_id]))[0];
    }
    ensure(path === "approve-account" && value.user_id,400,"invalid_input");
    return (await db.query("select r.user_id from ggc.account_requests r join ggc.actors a on a.id=r.actor_id where r.user_id=$1 and a.course_id=$2 and a.role<>'ADMIN'",[value.user_id,a.course_id]))[0];
  });
  ensure(target,404,"not_found");
  const result = await (client || adminAuthClient()).auth.admin.updateUserById(String(target.user_id),{email_confirm:true});
  ensure(!result.error,400,"account_approval_failed");
}
