import { test } from "node:test";
import assert from "node:assert/strict";
import { curriculum, localDate } from "../src/lib/curriculum";
import { recommendedQuestion } from "../src/lib/recommendations";
import {
  parseScripture,
  scriptureUrl,
  scriptureBooks,
} from "../src/lib/scriptures";
import { quizScope, gradeQuiz, extractVerses } from "../src/lib/quiz";
import { canManageRecords } from "../src/lib/access";
import type { Actor } from "../src/lib/types";
test("52 weeks × 7 daily recommendations × 2 languages have sources", () => {
  for (const w of curriculum)
    for (let d = 1; d <= 7; d++)
      for (const l of ["ko", "en"] as const) {
        const q = recommendedQuestion(w, d, l);
        assert.ok(q.question.length > 15);
        assert.equal(q.sourcePage, w.sourcePage);
      }
});
test("Exact references, bilingual official URLs, ranges and invalid inputs", () => {
  for (const value of ["이사야서 1:1", "이사야 1장 1절", "Isaiah 1:1"]) {
    const r = parseScripture(value)!;
    assert.equal(r.book.id, "ot/isa");
    assert.equal(r.chapter, 1);
    assert.equal(r.verse, 1);
    assert.equal(
      scriptureUrl(r.book, 1, "ko", 1),
      "https://www.churchofjesuschrist.org/study/scriptures/ot/isa/1?lang=kor&id=p1#p1",
    );
  }
  assert.equal(parseScripture("모세서 1:39")?.verse, 39);
  assert.equal(parseScripture('교리와 성약 1:1')?.book.id,'dc-testament/dc');
  assert.equal(parseScripture("1 Nephi 3:7")?.book.id, "bofm/1-ne");
  assert.equal(parseScripture("이사야 1:1-3")?.endVerse, 3);
  for (const bad of ["이사야 67:1", "이사야 1:0", "이사야 1:3-2", "bad 1:1"])
    assert.equal(parseScripture(bad), null);
  assert.equal(new Set(scriptureBooks.map((b) => b.id)).size, 87);
});
test("Every curriculum date has valid quiz scope, server Korean day boundary, monthly excludes future weeks", () => {
  for (const w of curriculum)
    for (const kind of ["daily", "weekly", "monthly"] as const) {
      const q = quizScope(kind, w.start);
      assert.ok(q.chapters.length, `${w.number} ${kind}`);
      assert.equal(q.count, { daily: 3, weekly: 10, monthly: 20 }[kind]);
    }
  assert.equal(localDate(new Date("2026-09-14T15:00:00Z")), "2026-09-15");
  assert.equal(quizScope("daily", "2026-09-14").chapters[0].bookId, "ot/isa");
  assert.equal(quizScope("weekly", "2026-09-14").period, "2026-09-14");
  assert.ok(
    quizScope("monthly", "2026-09-01").references.every(
      (r) => !r.startsWith("Isaiah"),
    ),
  );
});
test("80 percent grading uses exact arithmetic and rejects score manipulation", () => {
  for (const n of [3, 10, 20]) {
    const questions = Array.from({ length: n }, () => ({ answer: 0 }));
    const required = Math.ceil(n * 0.8);
    assert.equal(
      gradeQuiz(
        questions,
        questions.map((_, i) => (i < required ? 0 : 1)),
      ).passed,
      true,
    );
    assert.equal(
      gradeQuiz(
        questions,
        questions.map((_, i) => (i < required - 1 ? 0 : 1)),
      ).passed,
      false,
    );
  }
  assert.throws(() =>
    gradeQuiz([{ answer: 0 }, { answer: 1 }, { answer: 2 }], [0, 1]),
  );
});
test("Only approved logged-in members/teachers/admin can manage records", () => {
  const a = { kind: "guest", role: "GUEST", nickname: "같은닉네임" } as Actor;
  assert.equal(canManageRecords(a), false);
  assert.equal(canManageRecords({ ...a, kind: "user", role: "MEMBER" }), true);
  assert.equal(
    canManageRecords({ ...a, kind: "user", role: "TEACHER_PENDING" }),
    false,
  );
  assert.equal(
    canManageRecords({
      ...a,
      kind: "user",
      role: "MEMBER",
      account_status: "suspended",
    }),
    false,
  );
});
test("Verse extraction ignores UI text and footnotes", () => {
  const verses = extractVerses(
    '<p>menu</p><p class="verse" id="p1"><span>1</span>Actual <sup>note</sup>source.</p>',
  );
  assert.deepEqual(verses, [{ verse: 1, text: "1 Actual source." }]);
});
