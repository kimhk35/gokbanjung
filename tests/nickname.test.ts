import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import type { Actor } from "../src/lib/types";
import { privileged } from "../src/lib/db";
import { writeData } from "../src/lib/service";
import { loginStatus } from "../src/lib/login-status";

test("nickname edits preserve teacher assignment, roles and other accounts", async () => {
  process.env.LOCAL_DATABASE_PATH = await mkdtemp((await import("node:path")).join((await import("node:os")).tmpdir(), "ggc-nickname-"));
  const actors: Actor[] = (
    ["GUEST", "MEMBER", "TEACHER", "ADMIN"] as const
  ).map((role) => ({
    id: randomUUID(),
    kind: role === "GUEST" ? "guest" : "user",
    role,
    nickname: "기존이름",
    course_id: "old-testament-2026",
  }));
  const teacher = actors[2];
  await privileged(async (db) => {
    for (const a of actors)
      await db.query(
        "insert into ggc.actors(id,kind,role,nickname,course_id) values($1,$2,$3,$4,$5)",
        [a.id, a.kind, a.role, a.nickname, a.course_id],
      );
    await db.query("update ggc.actors set teacher_id=$1 where id=$2", [
      teacher.id,
      actors[1].id,
    ]);
  });
  for (const [index, a] of actors.entries()) {
    // Supplied account IDs and roles must not alter the target or its permissions.
    await writeData(a, "profile", {
      nickname: `  새이름${index}  `,
      id: teacher.id,
      role: "ADMIN",
    });
    const [stored] = await privileged((db) =>
      db.query("select * from ggc.actors where id=$1", [a.id]),
    );
    assert.equal(stored.nickname, `새이름${index}`);
    assert.equal(stored.role, a.role);
    if (a.role === "MEMBER") assert.equal(stored.teacher_id, teacher.id);
  }
  for (const nickname of [" ", "가", "가".repeat(41)]) {
    await assert.rejects(() => writeData(actors[1], "profile", { nickname }));
  }
  await writeData(actors[1], "profile", {
    nickname: "다시수정",
    teacher_id: null,
  });
  const [member] = await privileged((db) =>
    db.query("select * from ggc.actors where id=$1", [actors[1].id]),
  );
  assert.equal(member.teacher_id, null);
  const rows = await privileged((db) =>
    db.query("select id,nickname from ggc.actors where id=$1", [teacher.id]),
  );
  assert.equal(rows[0].nickname, "새이름2");
  assert.deepEqual(
    actors.map((a) => loginStatus(a, "ko")),
    [
      "게스트(기존이름)",
      "승인회원(기존이름)",
      "교사(기존이름)",
      "관리자(기존이름)",
    ],
  );
  assert.equal(
    loginStatus({ ...actors[1], account_status: "pending" }, "ko"),
    "게스트(기존이름)",
  );
  assert.equal(
    loginStatus({ ...actors[1], account_status: "suspended" }, "en"),
    "Guest (기존이름)",
  );
});
