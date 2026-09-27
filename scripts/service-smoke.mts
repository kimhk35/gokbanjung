import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { privileged, asActor } from "../src/lib/db";
import { readData, writeData } from "../src/lib/service";
import type { Actor } from "../src/lib/types";
process.env.LOCAL_DATABASE_PATH = ".local-db-service-test";
const admin: Actor = {
  id: randomUUID(),
  kind: "user",
  role: "ADMIN",
  nickname: "Test admin",
  course_id: "old-testament-2026",
};
const pending: Actor = {
  id: randomUUID(),
  kind: "user",
  role: "TEACHER_PENDING",
  nickname: "Test teacher",
  course_id: admin.course_id,
};
const guest: Actor = {
  id: randomUUID(),
  kind: "guest",
  role: "GUEST",
  nickname: "Test guest",
  course_id: admin.course_id,
};
await privileged(async (db) => {
  for (const a of [admin, pending, guest])
    await db.query(
      "insert into ggc.actors(id,kind,role,nickname) values($1,$2,$3,$4)",
      [a.id, a.kind, a.role, a.nickname],
    );
});
await assert.rejects(readData(pending, "teacher", new URLSearchParams()));
const app = (await writeData(pending, "teacher-apply", {
  name: "Test teacher",
  email: "test@example.invalid",
  ward: "Test class",
  message: "Integration fixture",
})) as { id: string }[];
await writeData(admin, "approve-teacher", {
  id: app[0].id,
  status: "approved",
});
const teacher = { ...pending, role: "TEACHER" } as Actor;
const rooms = (await writeData(teacher, "create-room", {
  week: 38,
  title: "What did you discover?",
  mode: "POST_BEFORE_VIEW",
})) as { id: string }[];
await writeData(guest, "post", {
  id: rooms[0].id,
  content: "My own perspective",
});
await writeData(teacher, "edit-worksheet", {
  week: 38,
  items: [{ ko: "어떤 발견이 있었나요?", en: "What did you discover?" }],
});
const sub = (await writeData(guest, "submit", {
  week: 38,
  teacher_id: teacher.id,
  answers: { "0": "My submitted answer" },
})) as { id: string }[];
const before = (await readData(
  guest,
  "worksheet",
  new URLSearchParams({ week: "38" }),
)) as { worksheet: { version: number } };
const oldVersion = before.worksheet.version;
await writeData(guest, "draft", {
  week: 38,
  worksheet_version: oldVersion,
  answers: { "0": "Original draft answer" },
});
await writeData(teacher, "edit-worksheet", {
  week: 38,
  expected_version: oldVersion,
  items: [
    { ko: "추가한 문항", en: "Added question" },
    { ko: "수정한 문항", en: "Edited question" },
  ],
});
await assert.rejects(
  writeData(teacher, "edit-worksheet", {
    week: 38,
    expected_version: oldVersion,
    items: [{ ko: "덮어쓰기", en: "Overwrite" }],
  }),
  /worksheet_changed/,
);
await assert.rejects(
  writeData(guest, "submit", {
    week: 38,
    worksheet_version: oldVersion,
    teacher_id: teacher.id,
    answers: { "0": "Outdated" },
  }),
  /worksheet_changed/,
);
await assert.rejects(
  writeData(guest, "draft", {
    week: 38,
    worksheet_version: oldVersion,
    answers: { "0": "Outdated" },
  }),
  /worksheet_changed/,
);
const preserved = (await readData(
  guest,
  "worksheet",
  new URLSearchParams({ week: "38" }),
)) as {
  draft: {
    answers: Record<string, string>;
    worksheet_snapshot: { version: number };
  };
  submissions: {
    id: string;
    worksheet_snapshot: { version: number; items: { ko: string }[] };
  }[];
};
assert.equal(preserved.draft.worksheet_snapshot.version, oldVersion);
assert.equal(preserved.draft.answers["0"], "Original draft answer");
assert.equal(
  preserved.submissions.find((s) => s.id === sub[0].id)?.worksheet_snapshot
    .version,
  oldVersion,
);
assert.equal(
  preserved.submissions.find((s) => s.id === sub[0].id)?.worksheet_snapshot
    .items[0].ko,
  "어떤 발견이 있었나요?",
);
await assert.rejects(
  writeData(guest, "edit-worksheet", {
    week: 38,
    items: [{ ko: "권한", en: "Permission" }],
  }),
);
const teacherData = (await readData(
  teacher,
  "teacher",
  new URLSearchParams(),
)) as { submissions: { id: string }[] };
assert.ok(teacherData.submissions.some((s) => s.id === sub[0].id));
await writeData(teacher, "feedback", {
  id: sub[0].id,
  content: "Thank you for connecting this to your experience.",
});
const worksheet = (await readData(
  guest,
  "worksheet",
  new URLSearchParams({ week: "38" }),
)) as { submissions: { id: string; feedback: { content: string }[] }[] };
assert.equal(worksheet.submissions[0].feedback.length, 1);
await writeData(guest, "reflection", {
  week: 38,
  day: 1,
  content: { "0": "Private reflection", "2": "Personal practice" },
});
assert.equal(
  (await asActor(admin, (db) => db.query("select * from ggc.reflections")))
    .length,
  0,
);
await writeData(admin, "approve-teacher", {
  id: app[0].id,
  status: "suspended",
});
await assert.rejects(readData(teacher, "teacher", new URLSearchParams()));
console.log(
  "PASS: pending access blocked; application; admin approval; course assignment; discussion; worksheet version; submission; teacher feedback; private admin isolation; immediate suspension enforcement.",
);
process.exit(0);
