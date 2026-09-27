import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Actor } from "../src/lib/types";

process.env.LOCAL_DATABASE_PATH = await mkdtemp(
  path.join(tmpdir(), "ggc-texts-"),
);
const { privileged } = await import("../src/lib/db");
const L = await import("../src/lib/lesson-texts");
const { makeAnchor } = await import("../src/lib/text-anchor");
const { AppError } = await import("../src/lib/errors");

async function make(role: Actor["role"], nickname = ""): Promise<Actor> {
  const kind = role === "GUEST" ? "guest" : "user";
  return privileged(
    async (db) =>
      (
        await db.query(
          "insert into ggc.actors(kind,role,nickname) values($1,$2,$3) returning id,kind,role,nickname,course_id",
          [kind, role, nickname],
        )
      )[0] as Actor,
  );
}
const status = (code: number, name?: string) => (e: unknown) =>
  e instanceof AppError && e.status === code && (!name || e.code === name);
const body =
  "# 내 백성을 위로하라\n\n너희는 위로하라. 내 백성을 위로하라.\n\n너희의 하나님이 말씀하시니라.";
const draft = {
  week: 40,
  lang: "ko",
  title: "40주 공과 본문",
  body_markdown: body,
  source_url:
    "https://www.churchofjesuschrist.org/study/manual/come-follow-me-2026?lang=kor",
  rights_note: "와드 학습용으로 게시 허락을 받았습니다.",
  rights_confirmed: true,
};
const q = (week = 40, lang = "ko") =>
  new URLSearchParams({ week: String(week), lang });

test("only teachers/admins upload, rights confirmation is required, drafts stay private", async () => {
  const teacher = await make("TEACHER", "김선생"),
    guest = await make("GUEST");
  await assert.rejects(L.saveLessonText(guest, draft), status(403));
  await assert.rejects(
    L.saveLessonText(teacher, { ...draft, rights_confirmed: false }),
    status(400, "rights_required"),
  );
  await assert.rejects(
    L.saveLessonText(teacher, { ...draft, source_url: "http://x.example" }),
  );
  const saved = await L.saveLessonText(teacher, draft);
  assert.equal(saved.status, "draft");
  assert.equal(saved.version, 1);
  assert.equal((await L.getLessonText(guest, q())).text, null);
  assert.equal((await L.getLessonText(teacher, q())).draft?.id, saved.id);
  await assert.rejects(
    L.setLessonTextStatus(guest, { id: saved.id, status: "published" }),
    status(403),
  );
  await L.setLessonTextStatus(teacher, { id: saved.id, status: "published" });
  const seen = await L.getLessonText(guest, q());
  assert.equal(seen.text?.body_markdown, body);
  assert.equal(seen.text?.source_url, draft.source_url);
  assert.equal(seen.canEdit, false);
});

test("editing a published text makes a new draft version; notes keep their version", async () => {
  const teacher = await make("TEACHER", "이선생"),
    guest = await make("GUEST");
  const v1 = await L.saveLessonText(teacher, { ...draft, week: 41 });
  await L.setLessonTextStatus(teacher, { id: v1.id, status: "published" });
  const plain = L.plainText(v1.body_markdown);
  const i = plain.indexOf("내 백성을 위로하라");
  const note = await L.saveTextNote(guest, {
    id: randomUUID(),
    lesson_text_id: v1.id,
    anchor: makeAnchor(plain, i, i + 10),
    body: "위로가 됩니다",
    author: "",
  });
  assert.equal(note.author, "익명");
  assert.equal(note.version, 1);
  assert.equal(note.quote, "내 백성을 위로하라");
  const v2 = await L.saveLessonText(teacher, {
    ...draft,
    week: 41,
    body_markdown: "머리말\n\n" + body,
  });
  assert.equal(v2.version, 2);
  assert.equal(v2.status, "draft");
  assert.equal((await L.getLessonText(guest, q(41))).text?.id, v1.id);
  await L.setLessonTextStatus(teacher, { id: v2.id, status: "published" });
  assert.equal((await L.getLessonText(guest, q(41))).text?.id, v2.id);
  const notes = await L.listTextNotes(
    guest,
    new URLSearchParams({ text_id: v2.id }),
  );
  assert.equal(notes.items.length, 1);
  assert.equal(notes.items[0].version, 1);
  assert.equal(notes.items[0].mine, true);
});

test("notes need a published text, a matching quote, and owners to delete", async () => {
  const teacher = await make("TEACHER", "박선생"),
    a = await make("GUEST"),
    b = await make("GUEST");
  const text = await L.saveLessonText(teacher, { ...draft, week: 42 });
  const plain = L.plainText(text.body_markdown);
  const anchor = makeAnchor(plain, 0, 5);
  await assert.rejects(
    L.saveTextNote(a, {
      id: randomUUID(),
      lesson_text_id: text.id,
      anchor,
      body: "x",
    }),
    status(404),
  );
  await L.setLessonTextStatus(teacher, { id: text.id, status: "published" });
  await assert.rejects(
    L.saveTextNote(a, {
      id: randomUUID(),
      lesson_text_id: text.id,
      anchor: { ...anchor, exact: "없는 문장" },
      body: "x",
    }),
    status(400),
  );
  const note = await L.saveTextNote(a, {
    id: randomUUID(),
    lesson_text_id: text.id,
    anchor,
    body: "좋아요",
  });
  assert.deepEqual(await L.toggleTextHeart(b, { note_id: note.id }), {
    hearted: true,
    hearts: 1,
  });
  await assert.rejects(L.deleteTextNote(b, { id: note.id }), status(403));
  await L.deleteTextNote(a, { id: note.id });
  assert.equal(
    (await L.listTextNotes(null, new URLSearchParams({ text_id: text.id })))
      .items.length,
    0,
  );
});

test("plainText strips Markdown syntax but keeps the words", () => {
  assert.equal(
    L.plainText(
      "# 제목\n\n**굵게** 그리고 [링크](https://x.example)\n\n- 항목",
    ),
    "제목\n\n굵게 그리고 링크\n\n항목",
  );
});
