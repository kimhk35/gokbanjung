import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp } from "node:fs/promises";
import { privileged, asActor } from "../src/lib/db";
import { readData, writeData } from "../src/lib/service";
import { startQuiz, submitQuiz } from "../src/lib/quiz-service";
import { quizScope } from "../src/lib/quiz";
import type { Actor } from "../src/lib/types";
process.env.LOCAL_DATABASE_PATH = await mkdtemp("/tmp/ggc-release-test-");
const a: Actor = {
  id: randomUUID(),
  kind: "guest",
  role: "GUEST",
  nickname: "같은닉네임",
  course_id: "old-testament-2026",
};
const b: Actor = { ...a, id: randomUUID() };
const admin: Actor = { ...a, id: randomUUID(), kind: "user", role: "ADMIN" };
await privileged(async (db) => {
  for (const x of [a, b, admin])
    await db.query(
      "insert into ggc.actors(id,kind,role,nickname) values($1,$2,$3,$4)",
      [x.id, x.kind, x.role, x.nickname],
    );
});
await assert.rejects(
  readData(a, "journey", new URLSearchParams()),
  /approval_required/,
);
await writeData(a, "reflection", {
  week: 38,
  day: 1,
  content: { "0": "My reflection", "2": "My action" },
});
await writeData(a, "note", { week: 38, content: "Only my own post" });
const userId = randomUUID();
await privileged((db) =>
  db.query(
    "insert into ggc.account_requests(user_id,actor_id,email) values($1,$2,$3)",
    [userId, a.id, "fixture@example.invalid"],
  ),
);
await assert.rejects(
  writeData(b, "approve-account", { user_id: userId, status: "approved" }),
);
await writeData(admin, "approve-account", {
  user_id: userId,
  status: "approved",
});
const member = {
  ...a,
  kind: "user",
  role: "MEMBER",
  account_status: "approved",
} as Actor;
const posts = (await readData(member, "my-posts", new URLSearchParams())) as {
  content: string;
}[];
assert.equal(posts.length, 1);
assert.equal(posts[0].content, "Only my own post");
const journey = (await readData(member, "journey", new URLSearchParams())) as {
  reflections: unknown[];
};
assert.equal(journey.reflections.length, 1);
for (const kind of ["daily", "weekly", "monthly"] as const) {
  const scope = quizScope(kind);
  const questions = Array.from({ length: scope.count }, (_, i) => ({
    question: "Fixture " + i,
    options: ["a", "b", "c", "d"],
    answer: i % 4,
    explanation: "Fixture explanation",
    hint: "Fixture hint",
    reference: "Isaiah 1:1",
    sourceUrl:
      "https://www.churchofjesuschrist.org/study/scriptures/ot/isa/1?lang=kor&id=p1#p1",
  }));
  const row = (
    await privileged((db) =>
      db.query(
        "insert into ggc.quiz_sets(course_id,kind,period,language,scope,questions,status) values($1,$2,$3,'ko',$4,$5,'ready') returning id",
        [
          a.course_id,
          kind,
          scope.period,
          JSON.stringify(scope),
          JSON.stringify(questions),
        ],
      ),
    )
  )[0];
  const publicQ = await startQuiz(member, { kind, language: "ko" });
  assert.equal("answer" in publicQ.questions[0], false);
  assert.equal("explanation" in publicQ.questions[0], false);
  const payload = { id: row.id, answers: questions.map((q) => q.answer) };
  const results = await Promise.all([
    submitQuiz(member, payload),
    submitQuiz(member, payload),
  ]);
  assert.equal(results.filter((r) => r.newReward).length, 1);
  const other = await submitQuiz(b, payload);
  assert.equal(other.newReward, true);
  await assert.rejects(
    asActor(b, (db) => db.query("select questions from ggc.quiz_sets")),
  );
}
const ownAttempts = await asActor(b, (db) =>
  db.query("select owner_id from ggc.quiz_attempts"),
);
assert.ok(ownAttempts.every((x) => x.owner_id === b.id));
await writeData(admin, "approve-account", {
  user_id: userId,
  status: "suspended",
});
await assert.rejects(
  readData(
    { ...member, account_status: "suspended" },
    "journey",
    new URLSearchParams(),
  ),
  /approval_required/,
);
console.log(
  "PASS: guest records gated; same-name isolation; admin-only approval; guest records retained; daily/weekly/monthly server grading; concurrent idempotent rewards; answers inaccessible; suspension gate.",
);
process.exit(0);
