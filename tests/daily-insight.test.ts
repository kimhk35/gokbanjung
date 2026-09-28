import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { Actor } from "../src/lib/types";

process.env.LOCAL_DATABASE_PATH = await mkdtemp(
  path.join(tmpdir(), "ggc-insight-"),
);
const { autoInsight } = await import("../src/lib/daily-insight");
const D = await import("../src/lib/daily-insight-service");
const { privileged } = await import("../src/lib/db");
const { AppError } = await import("../src/lib/errors");

test("automatic card from the curriculum: day number, weekday, question, reading, key message", () => {
  const card = autoInsight("2026-09-30")!; // Wednesday of week 40 (Isaiah 40–49)
  assert.equal(card.week, 40);
  assert.equal(card.day, 3);
  assert.equal(card.ko.kicker, "3일차 (수)");
  assert.equal(card.en.kicker, "Day 3 (Wed)");
  assert.match(card.ko.topic, /이사야/);
  assert.match(card.ko.message, /위로하라/);
  assert.ok(card.ko.question.length > 10 && card.en.question.length > 10);
  assert.ok(card.background);
  assert.equal(autoInsight("2026-09-28")!.day, 1);
  assert.equal(autoInsight("2030-01-01"), null);
  assert.notEqual(
    autoInsight("2026-09-30")!.background,
    autoInsight("2026-10-01")!.background,
  );
});

test("automatic card is also written in Spanish and Filipino", () => {
  const card = autoInsight("2026-09-30")!;
  assert.equal(card.es.kicker, "Día 3 (mié)");
  assert.match(card.es.topic, /Isaías/);
  assert.match(card.es.message, /Consolad/);
  assert.match(card.fil.kicker, /^Araw 3 /);
  // Study questions are translated, not copied from English.
  for (const lang of ["es", "fil"] as const)
    for (const k of ["title", "question"] as const)
      assert.notEqual(card[lang][k], card.en[k], `${lang} ${k}`);
});

async function make(role: Actor["role"]): Promise<Actor> {
  const kind = role === "GUEST" ? "guest" : "user";
  return privileged(
    async (db) =>
      (
        await db.query(
          "insert into ggc.actors(kind,role,nickname) values($1,$2,$3) returning id,kind,role,nickname,course_id",
          [kind, role, role.toLowerCase()],
        )
      )[0] as Actor,
  );
}
const status = (code: number) => (e: unknown) =>
  e instanceof AppError && e.status === code;

test("teachers override a day; everyone sees the override; reset returns to automatic", async () => {
  const teacher = await make("TEACHER"),
    guest = await make("GUEST");
  const q = new URLSearchParams({ date: "2026-09-30" });
  const before = await D.getDailyInsight(guest, q);
  assert.equal(before.custom, null);
  assert.equal(before.canEdit, false);
  const custom = {
    date: "2026-09-30",
    title: "영적 신호등",
    question: "내가 다시 주님께 돌아서는 신호는?",
    topic: "이사야 28~30장",
    message: "매일 주님과 가까이",
    image_path: null,
  };
  await assert.rejects(D.saveDailyInsight(guest, custom), status(403));
  await assert.rejects(
    D.saveDailyInsight(teacher, { ...custom, image_path: "javascript:x" }),
  );
  await D.saveDailyInsight(teacher, custom);
  const after = await D.getDailyInsight(guest, q);
  assert.equal(after.custom?.question, custom.question);
  assert.equal(after.auto?.week, 40);
  await D.saveDailyInsight(teacher, { ...custom, message: "수정됨" });
  assert.equal((await D.getDailyInsight(null, q)).custom?.message, "수정됨");
  await D.resetDailyInsight(teacher, { date: "2026-09-30" });
  assert.equal((await D.getDailyInsight(null, q)).custom, null);
  await assert.rejects(
    D.getDailyInsight(null, new URLSearchParams({ date: "2026-13-40" })),
    status(400),
  );
});
