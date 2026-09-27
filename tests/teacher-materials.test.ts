import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Actor } from "../src/lib/types";
import { privileged, asActor } from "../src/lib/db";
import { requestTeacher, removeTeacher } from "../src/lib/teacher-accounts";
import {
  requestAccount,
  adminResetPassword,
  confirmForApproval,
} from "../src/lib/account-security";
import { writeData, teachers } from "../src/lib/service";
import {
  writeMaterial,
  readMaterials,
  readMaterialSlide,
  withStaff,
} from "../src/lib/lesson-materials";
import {
  usernameEmail,
  passwordLoginEmail,
  displayLoginId,
} from "../src/lib/login-id";

test("ID signup, admin approval/reset/removal, and private lesson images", async () => {
  process.env.LOCAL_DATABASE_PATH = await mkdtemp(
    (await import("node:path")).join((await import("node:os")).tmpdir(), "ggc-teacher-materials-"),
  );
  const base = { course_id: "old-testament-2026", nickname: "tester" };
  const admin: Actor = {
    ...base,
    id: randomUUID(),
    kind: "user",
    role: "ADMIN",
  };
  const guest: Actor = {
    ...base,
    id: randomUUID(),
    kind: "guest",
    role: "GUEST",
  };
  const member: Actor = {
    ...base,
    id: randomUUID(),
    kind: "user",
    role: "MEMBER",
  };
  const teacherId = randomUUID();
  let created = 0,
    reset = 0;
  const client = {
    auth: {
      admin: {
        createUser: async (v: {
          email: string;
          email_confirm: boolean;
          password: string;
        }) => {
          created++;
          assert.equal(v.email_confirm, true);
          assert.equal(
            v.email,
            usernameEmail(created === 1 ? "teacher_01" : "member_01"),
          );
          return {
            error: null,
            data: { user: { id: created === 1 ? teacherId : randomUUID() } },
          };
        },
        deleteUser: async () => ({ error: null }),
        updateUserById: async (
          id: string,
          v: { password: string; email_confirm: boolean },
        ) => {
          assert.equal(id, teacherId);
          if (v.password) assert.equal(v.password, "NewSecret123!");
          assert.equal(v.email_confirm, true);
          if (v.password) reset++;
          return { error: null };
        },
      },
    },
  } as unknown as SupabaseClient;
  await privileged(async (db) => {
    for (const a of [admin, guest, member])
      await db.query(
        "insert into ggc.actors(id,kind,role,nickname,course_id) values($1,$2,$3,$4,$5)",
        [a.id, a.kind, a.role, a.nickname, a.course_id],
      );
  });
  assert.equal(passwordLoginEmail("TEACHER_01"), usernameEmail("teacher_01"));
  assert.equal(displayLoginId(usernameEmail("teacher_01")), "teacher_01");
  assert.throws(() => usernameEmail("bad id"));
  await requestTeacher(
    guest,
    { username: "Teacher_01", password: "MyPassword123!" },
    client,
    client,
  );
  const app = await privileged(
    async (db) =>
      (
        await db.query(
          "select * from ggc.teacher_applications where user_id=$1",
          [teacherId],
        )
      )[0],
  );
  assert.equal(app.status, "pending");
  assert.equal(
    (await teachers(base.course_id)).some((t) => t.id === teacherId),
    false,
  );
  const pending: Actor = {
    ...base,
    id: teacherId,
    role: "TEACHER_PENDING",
    kind: "user",
  };
  await assert.rejects(readMaterials(pending), /forbidden/);
  await assert.rejects(
    writeData(guest, "approve-teacher", { id: app.id, status: "approved" }),
    /forbidden/,
  );
  await assert.rejects(confirmForApproval(guest,"approve-teacher",{id:app.id,status:"approved"},client),/forbidden/);
  await confirmForApproval(admin,"approve-teacher",{id:app.id,status:"approved"},client);
  await writeData(admin, "approve-teacher", { id: app.id, status: "approved" });
  const teacher: Actor = { ...pending, role: "TEACHER" };
  assert.equal(
    (await teachers(base.course_id)).some((t) => t.id === teacherId),
    true,
  );
  await adminResetPassword(
    admin,
    { actor_id: teacherId, mode: "temporary", password: "NewSecret123!" },
    "https://unused.invalid",
    client,
  );
  assert.equal(reset, 1);
  await assert.rejects(
    adminResetPassword(
      teacher,
      { actor_id: teacherId, mode: "temporary", password: "NewSecret123!" },
      "",
      client,
    ),
    /forbidden/,
  );
  const draft = (await writeMaterial(teacher, "create", {
    title: "Two slide lesson",
    weeks: [1, 38],
    slide_count: 2,
  })) as { id: string };
  assert.equal((await readMaterials(teacher)).length, 0);
  await assert.rejects(
    writeMaterial(teacher, "finalize", { id: draft.id }),
    /material_incomplete/,
  );
  const image =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==";
  for (let i = 0; i < 2; i++)
    await writeMaterial(teacher, "slide", { id: draft.id, index: i, image });
  await writeMaterial(teacher, "finalize", { id: draft.id });
  assert.equal((await readMaterials(admin))[0].slide_count, 2);
  assert.equal(await readMaterialSlide(admin, draft.id, 1), image);
  await assert.rejects(readMaterialSlide(guest, draft.id, 0), /forbidden/);
  await assert.rejects(readMaterials(member), /forbidden/);
  assert.equal(
    (
      await asActor(member, (db) =>
        db.query("select id from ggc.lesson_materials"),
      )
    ).length,
    0,
  );
  assert.equal(
    (
      await asActor(member, (db) =>
        db.query("select image from ggc.lesson_material_slides"),
      )
    ).length,
    0,
  );
  await privileged(async (db) => {
    await db.query("update ggc.actors set teacher_id=$1 where id=$2", [
      teacherId,
      guest.id,
    ]);
    await db.query(
      "insert into ggc.reflections(owner_id,week,day,content) values($1,38,1,$2)",
      [teacherId, JSON.stringify({ text: "keep me" })],
    );
  });
  await assert.rejects(
    removeTeacher(member, { id: app.id, confirm: "REMOVE" }),
    /forbidden/,
  );
  await removeTeacher(admin, { id: app.id, confirm: "REMOVE" });
  await assert.rejects(
    withStaff(teacher, async () => true),
    /forbidden/,
    "stale teacher session must lose access",
  );
  assert.equal(
    (await teachers(base.course_id)).some((t) => t.id === teacherId),
    false,
  );
  const after = await privileged(async (db) => ({
    a: (
      await db.query("select role from ggc.actors where id=$1", [teacherId])
    )[0],
    records: await db.query("select * from ggc.reflections where owner_id=$1", [
      teacherId,
    ]),
    g: (
      await db.query("select teacher_id from ggc.actors where id=$1", [
        guest.id,
      ])
    )[0],
  }));
  assert.equal(after.a.role, "MEMBER");
  assert.equal(after.records.length, 1);
  assert.equal(after.g.teacher_id, null);
  assert.equal(
    (await readMaterials(admin)).length,
    1,
    "saved lesson preserved after teacher removal",
  );
  await requestAccount(
    guest,
    { username: "member_01", password: "MemberSecret123!" },
    client,
    "https://unused.invalid",
    client,
  );
  const requests = await privileged((db) =>
    db.query(
      "select status,actor_id from ggc.account_requests where actor_id=$1",
      [guest.id],
    ),
  );
  assert.equal(requests[0].status, "pending");
  assert.equal(requests[0].actor_id, guest.id);
  assert.equal(created, 2, "no email signup API was called");
});
