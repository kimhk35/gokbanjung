import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { privileged } from "../src/lib/db";
import {
  requestAccount,
  adminResetPassword,
  accountSecurityList,
  sendPasswordReset,
} from "../src/lib/account-security";
import type { Actor } from "../src/lib/types";
test("ID/password account request preserves guest ownership; password management is admin-only and scoped", async () => {
  process.env.LOCAL_DATABASE_PATH = await mkdtemp((await import("node:path")).join((await import("node:os")).tmpdir(), "ggc-accounts-"));
  const guest: Actor = {
    id: randomUUID(),
    nickname: "",
    role: "GUEST",
    kind: "guest",
    course_id: "old-testament-2026",
  };
  const admin: Actor = {
    ...guest,
    id: randomUUID(),
    nickname: "Admin",
    role: "ADMIN",
    kind: "user",
  };
  const teacher: Actor = { ...admin, id: randomUUID(), role: "TEACHER" };
  const userId = randomUUID();
  await privileged(async (db) => {
    for (const a of [guest, admin, teacher])
      await db.query(
        "insert into ggc.actors(id,kind,role,nickname,course_id) values($1,$2,$3,$4,$5)",
        [a.id, a.kind, a.role, a.nickname, a.course_id],
      );
    await db.query(
      "insert into ggc.reflections(owner_id,week,day,content) values($1,38,1,$2)",
      [guest.id, JSON.stringify({ recommended: "Existing guest writing" })],
    );
  });
  let updates = 0,
    mails = 0;
  const client = {
    auth: {
      unusedSignUp: async (input: {
        email: string;
        password: string;
        options: { emailRedirectTo: string };
      }) => {
        assert.equal(input.email, "learner@accounts.gokbanjeong.invalid");
        assert.equal(
          input.options.emailRedirectTo,
          "https://example.com/auth/confirm",
        );
        return {
          error: null,
          data: { user: { id: userId, identities: [{}] }, session: null },
        };
      },
      resetPasswordForEmail: async (
        email: string,
        options: { redirectTo: string },
      ) => {
        mails++;
        assert.equal(email, "learner@accounts.gokbanjeong.invalid");
        assert.equal(
          options.redirectTo,
          "https://example.com/auth/reset-password",
        );
        return { error: null };
      },
      admin: {
        createUser: async (input:{email:string;password:string;email_confirm:boolean})=>{
          assert.equal(input.email,"learner@accounts.gokbanjeong.invalid");assert.equal(input.email_confirm,true);
          return {error:null,data:{user:{id:userId}}};
        },
        updateUserById: async (id: string, input: { password: string }) => {
          assert.equal(id, userId);
          assert.equal(input.password, "Temporary123!");
          updates++;
          return { error: null };
        },
        getUserById: async (id: string) => {
          assert.equal(id, userId);
          return {
            error: null,
            data: { user: { email: "learner@accounts.gokbanjeong.invalid" } },
          };
        },
      },
    },
  } as unknown as SupabaseClient;
  assert.deepEqual(
    await requestAccount(
      guest,
      { username: "learner", password: "SafePass123!" },
      client,
      "https://example.com",
      client,
    ),
    { ok: true, confirmEmail: false },
  );
  const stored = await privileged(async (db) => ({
    requests: await db.query(
      "select actor_id,status from ggc.account_requests where user_id=$1",
      [userId],
    ),
    notes: await db.query(
      "select content from ggc.reflections where owner_id=$1",
      [guest.id],
    ),
    actors: await db.query(
      "select nickname,kind,role from ggc.actors where id=$1",
      [guest.id],
    ),
  }));
  assert.equal(stored.requests[0].actor_id, guest.id);
  assert.equal(stored.requests[0].status, "pending");
  assert.equal(stored.notes.length, 1);
  assert.equal(stored.actors[0].nickname, "learner");
  assert.equal(stored.actors[0].role, "GUEST");
  await assert.rejects(
    requestAccount(
      guest,
      { username: "learner", password: "SafePass123!" },
      client,
      "https://example.com",
      client,
    ),
    /account_exists/,
  );
  await assert.rejects(accountSecurityList(teacher), /forbidden/);
  await assert.rejects(
    adminResetPassword(
      teacher,
      { actor_id: guest.id, mode: "temporary", password: "Temporary123!" },
      "https://example.com",
      client,
    ),
    /forbidden/,
  );
  await assert.rejects(
    adminResetPassword(
      admin,
      { actor_id: randomUUID(), mode: "temporary", password: "Temporary123!" },
      "https://example.com",
      client,
    ),
    /not_found/,
  );
  await adminResetPassword(
    admin,
    { actor_id: guest.id, mode: "temporary", password: "Temporary123!" },
    "https://example.com",
    client,
  );
  assert.equal(updates, 1);
  await sendPasswordReset(
    "learner@accounts.gokbanjeong.invalid",
    "https://example.com",
    "fixture-sender",
    client,
  );
  assert.equal(mails, 1);
  assert.equal(
    (
      await privileged((db) =>
        db.query("select status from ggc.account_requests where user_id=$1", [
          userId,
        ]),
      )
    )[0].status,
    "pending",
    "reset must not approve an account",
  );
});
