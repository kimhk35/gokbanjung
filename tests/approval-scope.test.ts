import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import type { Actor } from "../src/lib/types";
import { privileged } from "../src/lib/db";
import { resolveAuthActor } from "../src/lib/auth";
import { canManageRecords } from "../src/lib/access";
import { canAuthor } from "../src/lib/prompts";
import { readData, writeData, teachers } from "../src/lib/service";

test("approval changes reach issued sessions and stay inside the admin's course", async () => {
  process.env.LOCAL_DATABASE_PATH = await mkdtemp(
    (await import("node:path")).join(
      (await import("node:os")).tmpdir(),
      "ggc-approval-scope-",
    ),
  );
  const course = "old-testament-2026";
  const otherCourse = "approval-scope-other";
  const admin: Actor = { id: randomUUID(), kind: "user", role: "ADMIN", nickname: "admin", course_id: course };
  // Each member has an approved sign-in link: [actor id, provider user id].
  const people = {
    member: [randomUUID(), randomUUID()],
    teacher: [randomUUID(), randomUUID()],
    outsider: [randomUUID(), randomUUID()],
    otherAdmin: [randomUUID(), randomUUID()],
  };
  await privileged(async (db) => {
    await db.query(
      "insert into ggc.courses(id,title) values($1,'{\"ko\":\"other\"}') on conflict do nothing",
      [otherCourse],
    );
    await db.query(
      "insert into ggc.actors(id,kind,role,nickname,course_id) values($1,'user','ADMIN','admin',$2)",
      [admin.id, course],
    );
    const rows: [string, string, string][] = [
      ["member", "MEMBER", course],
      ["teacher", "TEACHER", course],
      ["outsider", "MEMBER", otherCourse],
      ["otherAdmin", "ADMIN", course],
    ];
    for (const [key, role, c] of rows) {
      const [actorId, userId] = people[key as keyof typeof people];
      await db.query(
        "insert into ggc.actors(id,kind,role,nickname,course_id) values($1,'user',$2,$3,$4)",
        [actorId, role, key, c],
      );
      await db.query(
        "insert into ggc.account_requests(user_id,actor_id,email,status) values($1,$2,$3,'approved')",
        [userId, actorId, `${key}@accounts.gokbanjeong.invalid`],
      );
    }
    await db.query(
      "insert into ggc.course_teachers(course_id,teacher_id) values($1,$2)",
      [course, people.teacher[0]],
    );
  });
  const session = (key: keyof typeof people) =>
    privileged((db) => resolveAuthActor(db, { id: people[key][1] }));
  const application = async (key: keyof typeof people, status: string) =>
    String(
      (
        await privileged((db) =>
          db.query(
            "insert into ggc.teacher_applications(user_id,name,email,ward,message,status) values($1,$2,$3,'곡반정와드','',$4) returning id",
            [people[key][0], key, `${key}@accounts.gokbanjeong.invalid`, status],
          ),
        )
      )[0].id,
    );

  // A member whose teacher application is rejected keeps personal record access.
  const memberApp = await application("member", "pending");
  await writeData(admin, "approve-teacher", { id: memberApp, status: "rejected" });
  const member = await session("member");
  assert.equal(member.role, "MEMBER");
  assert.equal(canManageRecords(member), true);

  // Suspending a teacher removes teacher access from the already-issued session.
  const teacherApp = await application("teacher", "approved");
  assert.equal(canAuthor(await session("teacher")), true);
  await writeData(admin, "approve-teacher", { id: teacherApp, status: "suspended" });
  const suspendedTeacher = await session("teacher");
  assert.equal(canAuthor(suspendedTeacher), false);
  assert.equal(canManageRecords(suspendedTeacher), true, "teacher suspension keeps member records");
  assert.equal((await teachers(course)).some((t) => t.id === people.teacher[0]), false);

  // Suspending the account blocks member access on the next request.
  await writeData(admin, "approve-account", { user_id: people.member[1], status: "suspended" });
  assert.equal(canManageRecords(await session("member")), false);

  // Another course and other administrators are out of reach.
  await assert.rejects(
    writeData(admin, "approve-account", { user_id: people.outsider[1], status: "suspended" }),
    /not_found/,
  );
  await assert.rejects(
    writeData(admin, "approve-account", { user_id: people.otherAdmin[1], status: "rejected" }),
    /not_found/,
  );
  const untouched = await privileged((db) =>
    db.query("select status from ggc.account_requests where user_id=any($1::uuid[])", [
      [people.outsider[1], people.otherAdmin[1]],
    ]),
  );
  assert.deepEqual(untouched.map((r) => r.status), ["approved", "approved"]);
  assert.equal(canManageRecords(await session("outsider")), true);

  // Administrative lists only show the administrator's course.
  const requests = (await readData(admin, "account-requests", new URLSearchParams())) as {
    user_id: string;
  }[];
  assert.equal(requests.some((r) => r.user_id === people.outsider[1]), false);
  assert.equal(requests.some((r) => r.user_id === people.member[1]), true);
  await application("outsider", "pending");
  const dashboard = (await readData(admin, "admin", new URLSearchParams())) as {
    applications: { user_id: string }[];
  };
  assert.equal(dashboard.applications.some((r) => r.user_id === people.outsider[0]), false);
  assert.equal(dashboard.applications.some((r) => r.user_id === people.member[0]), true);
});
