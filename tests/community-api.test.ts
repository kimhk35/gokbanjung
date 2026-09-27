import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Actor } from "../src/lib/types";

process.env.LOCAL_DATABASE_PATH = await mkdtemp(
  path.join(tmpdir(), "ggc-api-"),
);
const { privileged } = await import("../src/lib/db");
const C = await import("../src/lib/community-api");
const { AppError } = await import("../src/lib/errors");

test("dispatch covers community paths and lets nickname-less guests participate", async () => {
  assert.equal(C.isCommunityPath("ward/events"), true);
  assert.equal(C.isCommunityPath("think/reply"), true);
  assert.equal(C.isCommunityPath("home/activity"), true);
  assert.equal(C.isCommunityPath("notes/verse-list"), true);
  assert.equal(C.isCommunityPath("reflection"), false);
  const [teacher, guest] = (await privileged(async (db) => [
    (
      await db.query(
        "insert into ggc.actors(kind,role,nickname) values('user','TEACHER','김선생') returning id,kind,role,nickname,course_id",
      )
    )[0],
    (
      await db.query(
        "insert into ggc.actors(kind,role,nickname) values('guest','GUEST','') returning id,kind,role,nickname,course_id",
      )
    )[0],
  ])) as Actor[];
  const prompt = (await C.communityWrite(teacher, "think/save", {
    title: "질문",
    question: "무엇을 배웠나요?",
  })) as { id: string; slug: string };
  const reply = (await C.communityWrite(guest, "think/reply", {
    id: randomUUID(),
    prompt_id: prompt.id,
    body: "배움",
  })) as { id: string; author: string };
  assert.equal(reply.author, "익명");
  assert.deepEqual(
    await C.communityWrite(guest, "think/heart", { reply_id: reply.id }),
    { hearted: true, hearts: 1 },
  );
  const view = (await C.communityRead(
    null,
    "think/prompt",
    new URLSearchParams({ slug: prompt.slug }),
  )) as { replies: unknown[] };
  assert.equal(view.replies.length, 1);
  await assert.rejects(
    C.communityRead(null, "ward/nope", new URLSearchParams()),
    (e) => e instanceof AppError && e.status === 404,
  );
  await assert.rejects(
    C.communityRead(null, "ward/managers", new URLSearchParams()),
    (e) => e instanceof AppError && e.status === 401,
  );
});
