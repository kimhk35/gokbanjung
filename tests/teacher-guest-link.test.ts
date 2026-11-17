import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import type { AccountAuthClient } from "../src/lib/database-auth";
import type { Actor } from "../src/lib/types";
import { privileged } from "../src/lib/db";
import { requestTeacher } from "../src/lib/teacher-accounts";
import { requestAccount } from "../src/lib/account-security";
import { writeData, teachers } from "../src/lib/service";

test("a guest teacher application keeps the same-browser guest records", async () => {
  process.env.LOCAL_DATABASE_PATH = await mkdtemp(
    (await import("node:path")).join(
      (await import("node:os")).tmpdir(),
      "ggc-teacher-guest-",
    ),
  );
  const base = { course_id: "old-testament-2026", nickname: "tester" };
  const admin: Actor = { ...base, id: randomUUID(), kind: "user", role: "ADMIN" };
  const guest: Actor = { ...base, id: randomUUID(), kind: "guest", role: "GUEST" };
  const other: Actor = { ...base, id: randomUUID(), kind: "guest", role: "GUEST" };
  const providerIds: string[] = [];
  const deleted: string[] = [];
  let failNextInsert = false;
  const client = {
    auth: {
      admin: {
        createUser: async () => {
          const id = randomUUID();
          providerIds.push(id);
          if (failNextInsert) {
            failNextInsert = false;
            // Force the application insert to fail after the auth user exists.
            await privileged((db) =>
              db.query("update ggc.actors set role='ADMIN' where id=$1", [other.id]),
            );
          }
          return { error: null, data: { user: { id } } };
        },
        deleteUser: async (id: string) => {
          deleted.push(id);
          return { error: null };
        },
      },
    },
  } as unknown as AccountAuthClient;
  await privileged(async (db) => {
    for (const a of [admin, guest, other])
      await db.query(
        "insert into ggc.actors(id,kind,role,nickname,course_id) values($1,$2,$3,$4,$5)",
        [a.id, a.kind, a.role, a.nickname, a.course_id],
      );
    await db.query(
      "insert into ggc.guest_sessions(actor_id,token_hash,expires_at) values($1,'guest-token',now()+interval '1 day')",
      [guest.id],
    );
    await db.query(
      "insert into ggc.reflections(owner_id,week,day,content) values($1,38,1,$2)",
      [guest.id, JSON.stringify({ text: "guest note" })],
    );
  });
  const actorCount = async () =>
    Number(
      (await privileged((db) => db.query("select count(*)::int as n from ggc.actors")))[0].n,
    );
  const before = await actorCount();

  await requestTeacher(
    guest,
    { username: "teacher_guest", password: "MyPassword123!" },
    client,
    client,
  );
  assert.equal(await actorCount(), before, "no second actor is created");
  const linked = await privileged(async (db) => ({
    request: (
      await db.query("select user_id,status from ggc.account_requests where actor_id=$1", [guest.id])
    )[0],
    application: (
      await db.query("select id,status from ggc.teacher_applications where user_id=$1", [guest.id])
    )[0],
    actor: (await db.query("select kind,role from ggc.actors where id=$1", [guest.id]))[0],
  }));
  assert.equal(linked.request.user_id, providerIds[0]);
  assert.equal(linked.request.status, "pending");
  assert.equal(linked.application.status, "pending");
  assert.equal(linked.actor.kind, "guest", "no member access before approval");
  assert.notEqual(linked.actor.role, "TEACHER");
  assert.equal((await teachers(base.course_id)).some((t) => t.id === guest.id), false);

  // A second request from the same browser must not create another auth user.
  await assert.rejects(
    requestTeacher(guest, { username: "teacher_again", password: "MyPassword123!" }, client, client),
    /account_exists/,
  );
  await assert.rejects(
    requestAccount(
      { ...guest, account_status: "pending" },
      { username: "member_again", password: "MyPassword123!" },
      client,
      "https://unused.invalid",
      client,
    ),
    /invalid_transition/,
  );
  assert.equal(providerIds.length, 1);

  await writeData(admin, "approve-teacher", { id: linked.application.id, status: "approved" });
  const approved = await privileged(async (db) => ({
    actor: (await db.query("select kind,role from ggc.actors where id=$1", [guest.id]))[0],
    request: (await db.query("select status from ggc.account_requests where actor_id=$1", [guest.id]))[0],
    sessions: await db.query("select 1 from ggc.guest_sessions where actor_id=$1", [guest.id]),
    notes: await db.query("select content from ggc.reflections where owner_id=$1", [guest.id]),
  }));
  assert.deepEqual(approved.actor, { kind: "user", role: "TEACHER" });
  assert.equal(approved.request.status, "approved");
  assert.equal(approved.sessions.length, 0, "the guest cookie is not a member credential");
  assert.equal(approved.notes.length, 1, "guest records stay with the teacher");
  assert.equal((await teachers(base.course_id)).some((t) => t.id === guest.id), true);

  // A failed application insert removes only the auth user this request created.
  failNextInsert = true;
  await assert.rejects(
    requestTeacher(other, { username: "teacher_other", password: "MyPassword123!" }, client, client),
  );
  assert.deepEqual(deleted, [providerIds[1]]);
  const leftovers = await privileged((db) =>
    db.query("select 1 from ggc.account_requests where actor_id=$1", [other.id]),
  );
  assert.equal(leftovers.length, 0, "no orphan link after a failed request");
});
