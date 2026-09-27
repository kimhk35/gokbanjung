import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Actor } from "../src/lib/types";

process.env.LOCAL_DATABASE_PATH = await mkdtemp(path.join(tmpdir(), "ggc-prompts-"));
const { privileged } = await import("../src/lib/db");
const P = await import("../src/lib/prompts");
const { AppError } = await import("../src/lib/errors");

async function make(role: Actor["role"], nickname = ""): Promise<Actor> {
  const kind = role === "GUEST" ? "guest" : "user";
  return privileged(async (db) =>
    (await db.query(
      "insert into ggc.actors(kind,role,nickname) values($1,$2,$3) returning id,kind,role,nickname,course_id",
      [kind, role, nickname],
    ))[0] as Actor,
  );
}
const status = (code: number) => (e: unknown) => e instanceof AppError && e.status === code;
const question = { title: "위로의 말씀", question: "이사야 40장에서 위로가 된 구절은?", week: 40, source_url: "https://www.churchofjesuschrist.org/study/scriptures/ot/isa/40?lang=kor" };

test("authorName", () => {
  assert.equal(P.authorName("  "), "익명");
  assert.equal(P.authorName(undefined), "익명");
  assert.equal(P.authorName(" 홍길동 "), "홍길동");
});

test("only teachers and admins publish prompts; owners edit their own", async () => {
  const teacher = await make("TEACHER", "김선생"), other = await make("TEACHER", "이선생");
  const admin = await make("ADMIN", "관리자"), guest = await make("GUEST");
  await assert.rejects(P.savePrompt(guest, question), status(403));
  const p = await P.savePrompt(teacher, question);
  assert.equal(p.author, "김선생");
  assert.match(p.slug, /^[a-f0-9]{12}$/);
  await assert.rejects(P.savePrompt(other, { ...question, id: p.id, title: "x" }), status(403));
  assert.equal((await P.savePrompt(admin, { ...question, id: p.id, title: "수정됨" })).title, "수정됨");
  await assert.rejects(P.savePrompt(teacher, { ...question, source_url: "javascript:alert(1)" }));
  const list = await P.listPrompts(null, new URLSearchParams({ week: "40" }));
  assert.equal(list.canAuthor, false);
  assert.ok(list.items.some((x) => x.id === p.id));
  assert.equal((await P.listPrompts(null, new URLSearchParams({ week: "41" }))).items.length, 0);
  await assert.rejects(P.deletePrompt(guest, { id: p.id }), status(403));
});

test("replies are idempotent, anonymous by default, and deletable only by their owner", async () => {
  const teacher = await make("TEACHER", "김선생");
  const guest = await make("GUEST"), stranger = await make("GUEST");
  const p = await P.savePrompt(teacher, question);
  const id = randomUUID();
  const reply = await P.addReply(guest, { id, prompt_id: p.id, author: "", body: "40:31 독수리 날개" });
  assert.equal(reply.author, "익명");
  await P.addReply(guest, { id, prompt_id: p.id, author: "", body: "40:31 독수리 날개" });
  assert.equal((await P.getPrompt(null, p.slug)).replies.length, 1);
  await assert.rejects(P.addReply(stranger, { id, prompt_id: p.id, body: "hijack" }), status(409));
  await assert.rejects(P.addReply(guest, { id: randomUUID(), prompt_id: p.id, body: "x".repeat(3001) }));
  await assert.rejects(P.deleteReply(stranger, { id }), status(403));
  const view = await P.getPrompt(guest, p.slug);
  assert.equal(view.replies[0].mine, true);
  assert.equal(view.prompt.reply_count, 1);
  await P.deleteReply(guest, { id });
  assert.equal((await P.getPrompt(null, p.slug)).replies.length, 0);
});

test("hearts toggle and comments belong to their authors", async () => {
  const teacher = await make("TEACHER", "김선생");
  const a = await make("GUEST"), b = await make("GUEST");
  const p = await P.savePrompt(teacher, question);
  const reply = await P.addReply(a, { id: randomUUID(), prompt_id: p.id, author: "가", body: "생각" });
  assert.deepEqual(await P.toggleHeart(a, { reply_id: reply.id }), { hearted: true, hearts: 1 });
  assert.deepEqual(await P.toggleHeart(b, { reply_id: reply.id }), { hearted: true, hearts: 2 });
  assert.deepEqual(await P.toggleHeart(a, { reply_id: reply.id }), { hearted: false, hearts: 1 });
  const cid = randomUUID();
  const c = await P.addReplyComment(b, { id: cid, reply_id: reply.id, author: "나", body: "공감해요" });
  assert.equal(c.author, "나");
  await assert.rejects(P.addReplyComment(b, { id: randomUUID(), reply_id: reply.id, body: "x".repeat(1501) }));
  await assert.rejects(P.deleteReplyComment(a, { id: cid }), status(403));
  const view = await P.getPrompt(b, p.slug);
  assert.equal(view.replies[0].hearts, 1);
  assert.equal(view.replies[0].hearted, true);
  assert.equal(view.replies[0].comments[0].mine, true);
  await P.deleteReplyComment(b, { id: cid });
  const recent = await P.recentActivity();
  assert.ok(recent.prompts.length >= 1 && recent.replies.some((r) => r.id === reply.id));
});
