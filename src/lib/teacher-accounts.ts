import { z } from "zod";
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Actor } from "./types";
import { privileged } from "./db";
import { ensure } from "./errors";
import { adminAuthClient, passwordSchema } from "./account-security";
import { rateLimit, requireAdmin } from "./service";
import { usernameSchema, usernameEmail } from "./login-id";

export async function requestTeacher(
  a: Actor,
  input: unknown,
  session: SupabaseClient,
  admin?: SupabaseClient,
) {
  ensure(a.role !== "ADMIN" && a.role !== "TEACHER", 400, "invalid_transition");
  const value = z
    .object({ username: usernameSchema, password: passwordSchema.optional() })
    .parse(input);
  const v = {
    name: a.nickname || value.username,
    email: usernameEmail(value.username),
    password: value.password,
  };
  const signedIn = a.kind === "user";
  if (!signedIn) ensure(v.password, 400, "invalid_input");
  await rateLimit("teacher-request:" + a.id, 3, 3600);
  await rateLimit(
    "teacher-email:" + createHash("sha256").update(v.email).digest("hex"),
    3,
    3600,
  );

  let userId = a.id;
  let client: SupabaseClient | undefined;
  if (signedIn) {
    const current = await session.auth.getUser();
    ensure(!current.error && !!current.data.user, 403, "forbidden");
    const actual = current.data.user!.email!;
    ensure(
      actual === v.email || !actual.endsWith("@accounts.gokbanjeong.invalid"),
      403,
      "forbidden",
    );
    v.email = actual;
    v.name = a.nickname || value.username;
    // Linked member actor IDs may differ from the Auth ID; actor() already resolved them.
  } else {
    client = admin || adminAuthClient();
    const created = await client.auth.admin.createUser({
      email: v.email,
      password: v.password!,
      email_confirm: true,
    });
    ensure(!created.error && created.data.user, 400, "teacher_request_failed");
    userId = created.data.user.id;
  }
  try {
    await privileged(async (db) => {
      if (!signedIn)
        await db.query(
          "insert into ggc.actors(id,kind,role,nickname,course_id) values($1,'user','TEACHER_PENDING',$2,$3)",
          [userId, v.name, a.course_id],
        );
      const target = (
        await db.query("select role from ggc.actors where id=$1 for update", [
          userId,
        ])
      )[0];
      ensure(
        target && !["ADMIN", "TEACHER"].includes(String(target.role)),
        400,
        "invalid_transition",
      );
      const application = await db.query(
        "insert into ggc.teacher_applications(user_id,name,email,ward,message) values($1,$2,$3,'곡반정와드','') on conflict(user_id) do nothing returning id",
        [userId, v.name, v.email],
      );
      ensure(application.length, 409, "account_exists");
    });
  } catch (e) {
    // Compensate only for the Auth account created by this request, never an existing user.
    if (client) await client.auth.admin.deleteUser(userId);
    throw e;
  }
  return { ok: true, status: "pending" as const };
}

export async function removeTeacher(a: Actor, input: unknown) {
  await requireAdmin(a);
  const v = z
    .object({ id: z.uuid(), confirm: z.literal("REMOVE") })
    .parse(input);
  return privileged(async (db) => {
    const target = (
      await db.query(
        "select t.user_id,a.role from ggc.teacher_applications t join ggc.actors a on a.id=t.user_id where t.id=$1 and a.course_id=$2 for update of t,a",
        [v.id, a.course_id],
      )
    )[0];
    ensure(target, 404, "not_found");
    ensure(
      target.role !== "ADMIN" && target.user_id !== a.id,
      403,
      "forbidden",
    );
    const id = String(target.user_id);
    await db.query("delete from ggc.course_teachers where teacher_id=$1", [id]);
    await db.query(
      "update ggc.actors set teacher_id=null where teacher_id=$1",
      [id],
    );
    await db.query(
      "update ggc.actors set role=case when role='TEACHER' then 'MEMBER' else role end where id=$1",
      [id],
    );
    await db.query("delete from ggc.teacher_applications where id=$1", [v.id]);
    await db.query(
      "insert into ggc.notifications(owner_id,message) values($1,$2)",
      [
        id,
        JSON.stringify({
          ko: "교사 권한이 해제되었습니다. 개인 학습 기록은 유지됩니다.",
          en: "Your teaching access has been removed. Personal learning records are preserved.",
        }),
      ],
    );
    return { ok: true };
  });
}
