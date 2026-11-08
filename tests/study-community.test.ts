import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Actor } from "../src/lib/types";

process.env.LOCAL_DATABASE_PATH = await mkdtemp(
  path.join(tmpdir(), "ggc-study-community-"),
);
const { privileged, asActor } = await import("../src/lib/db");
const P = await import("../src/lib/prompts");
const S = await import("../src/lib/study-community");
const { AppError } = await import("../src/lib/errors");
const status = (n: number) => (e: unknown) =>
  e instanceof AppError && e.status === n;
async function actor(role: Actor["role"]): Promise<Actor> {
  return privileged(
    async (db) =>
      (
        await db.query(
          "insert into ggc.actors(kind,role,nickname) values($1,$2,'') returning id,kind,role,nickname,course_id",
          [role === "GUEST" ? "guest" : "user", role],
        )
      )[0] as Actor,
  );
}
const prompt = (week: number, day: number | null, extra = {}) => ({
  title: "오늘의 질문",
  question: "무엇을 느꼈나요?",
  week,
  study_day: day,
  ...extra,
});
const place = {
  week: 43,
  day: 1,
  track: "adult" as const,
  path: "/study/manual/come-follow-me-for-home-and-church-old-testament-2026/43",
  anchor: "p1",
  label: "도입",
};
const params = (extra: Record<string, string> = {}) =>
  new URLSearchParams({ week: "43", ...extra });

test("daily questions persist, move without changing links, and respect teacher ownership", async () => {
  const teacher = await actor("TEACHER"),
    other = await actor("TEACHER"),
    admin = await actor("ADMIN"),
    guest = await actor("GUEST");
  const original = await P.savePrompt(teacher, prompt(43, 1));
  assert.equal(original.study_day, 1);
  assert.equal((await P.getPrompt(null, original.slug)).prompt.study_day, 1);
  const changed = await P.savePrompt(
    teacher,
    prompt(43, 2, { id: original.id, title: "수정된 질문" }),
  );
  assert.equal(changed.slug, original.slug);
  const overview = await S.getStudyOverview(guest, params());
  assert.ok(
    overview.questions.some((q) => q.id === original.id && q.study_day === 2),
  );
  assert.deepEqual(overview.answeredDays, []);
  await assert.rejects(P.savePrompt(other, prompt(43, 2)), status(403));
  assert.ok(
    !(await P.listPrompts(null, params())).items.some(
      (q) => q.author === "hijack",
    ),
  );
  await assert.rejects(P.savePrompt(guest, prompt(43, 3)), status(403));
  await P.addReply(guest, {
    id: randomUUID(),
    prompt_id: original.id,
    body: "오늘 배운 점",
  });
  assert.deepEqual(
    (await S.getStudyOverview(guest, params())).answeredDays,
    [2],
  );
  assert.deepEqual(
    (await S.getStudyOverview(other, params())).answeredDays,
    [],
  );
  const replacement = await P.savePrompt(admin, prompt(43, 2));
  assert.equal((await P.getPrompt(null, original.slug)).prompt.study_day, null);
  assert.equal(replacement.study_day, 2);
  assert.deepEqual(
    (await S.getStudyOverview(guest, params())).answeredDays,
    [],
  );
  await assert.rejects(
    P.savePrompt(teacher, prompt(44, 1, { id: original.id, week: null })),
    status(400),
  );
  assert.equal(
    (await P.getPrompt(null, original.slug)).prompt.week,
    43,
    "failed assignment rolls back prompt edit",
  );
});
test("range thoughts share anchors, private thoughts never leak to guests, administrators or feed", async () => {
  const owner = await actor("GUEST"),
    stranger = await actor("GUEST"),
    admin = await actor("ADMIN");
  const publicThought = await S.saveStudyThought(owner, {
    ...place,
    id: randomUUID(),
    body: "공개된 생각",
    visibility: "public",
  });
  const privateThought = await S.saveStudyThought(owner, {
    ...place,
    id: randomUUID(),
    body: "개인 메모",
    visibility: "private",
  });
  assert.equal(publicThought.author, "익명");
  const at = params({ path: place.path, anchor: place.anchor });
  assert.equal((await S.getStudyThoughts(owner, at)).items.length, 2);
  for (const who of [null, stranger, admin]) {
    const seen = await S.getStudyThoughts(who, at);
    assert.equal(seen.publicCount, 1);
    assert.deepEqual(
      seen.items.map((t) => t.id),
      [publicThought.id],
    );
    assert.ok(
      !(await S.getStudyFeed(who, params())).items.some(
        (t) => t.id === privateThought.id,
      ),
    );
  }
  assert.equal(
    (await S.getStudyThoughts(null, params({ path: place.path, anchor: "p2" })))
      .publicCount,
    0,
  );
  await assert.rejects(
    S.saveStudyThought(stranger, {
      ...place,
      id: privateThought.id,
      body: "steal",
      visibility: "public",
    }),
    status(409),
  );
  await assert.rejects(
    S.deleteStudyThought(admin, { id: privateThought.id }),
    status(403),
  );
  await assert.rejects(
    S.deleteStudyThought(stranger, { id: publicThought.id }),
    status(403),
  );
  const again = await S.saveStudyThought(owner, {
    ...place,
    id: publicThought.id,
    body: "공개된 생각",
    visibility: "public",
  });
  assert.equal(
    again.body,
    "공개된 생각",
    "retry does not duplicate or rewrite a post",
  );
  await assert.rejects(
    S.saveStudyThought(owner, {
      ...place,
      id: privateThought.id,
      body: "개인 메모",
      visibility: "public",
    }),
    status(409),
  );
  const publicFeedItem = (await S.getStudyFeed(null, params())).items.find(
    (item) => item.id === publicThought.id,
  )!;
  const deepLink = new URL(publicFeedItem.href, "https://example.test");
  assert.equal(deepLink.searchParams.get("source"), place.path);
  assert.equal(deepLink.searchParams.get("anchor"), place.anchor);
  assert.equal(deepLink.searchParams.get("track"), "adult");
  await S.deleteStudyThought(owner, { id: publicThought.id });
  assert.equal((await S.getStudyThoughts(null, at)).publicCount, 0);
  await assert.rejects(
    S.saveStudyThought(owner, {
      ...place,
      path: "https://evil.example",
      id: randomUUID(),
      body: "bad",
      visibility: "public",
    }),
  );
  await assert.rejects(
    S.saveStudyThought(owner, {
      ...place,
      id: randomUUID(),
      body: "",
      visibility: "private",
    }),
  );
});
test("public feed includes stable question links and published replies only; tables deny direct browser access", async () => {
  const teacher = await actor("TEACHER"),
    guest = await actor("GUEST");
  const q = await P.savePrompt(teacher, prompt(44, 4));
  const visible = await P.addReply(guest, {
    id: randomUUID(),
    prompt_id: q.id,
    body: "공개 응답",
  });
  const hidden = await P.addReply(guest, {
    id: randomUUID(),
    prompt_id: q.id,
    body: "숨긴 응답",
  });
  await privileged((db) =>
    db.query("update ggc.prompt_replies set status='hidden' where id=$1", [
      hidden.id,
    ]),
  );
  const feed = await S.getStudyFeed(null, new URLSearchParams({ week: "44" }));
  assert.deepEqual(
    feed.items.map((i) => i.id),
    [visible.id],
  );
  assert.equal(feed.items[0].href, `/p/${q.slug}`);
  assert.equal(feed.items[0].day, 4);
  for (const table of ["study_range_thoughts", "study_prompt_assignments"])
    await assert.rejects(
      asActor(guest, (db) => db.query(`select * from ggc.${table}`)),
      /permission denied/,
    );
  await P.deletePrompt(teacher, { id: q.id });
  assert.equal(
    (await S.getStudyOverview(guest, new URLSearchParams({ week: "44" })))
      .questions.length,
    0,
  );
});

test("consecutive weeks keep question links, replies and identical passage anchors separate", async () => {
  const teacher = await actor("TEACHER"),
    guest = await actor("GUEST");
  const original = await P.savePrompt(teacher, prompt(43, 7));
  const next = await P.savePrompt(teacher, prompt(44, 1));
  await P.addReply(guest, {
    id: randomUUID(),
    prompt_id: next.id,
    body: "다음 주의 응답",
  });
  const priorOverview = await S.getStudyOverview(guest, params());
  const nextOverview = await S.getStudyOverview(guest, params({ week: "44" }));
  assert.ok(priorOverview.questions.some((q) => q.id === original.id));
  assert.ok(!priorOverview.questions.some((q) => q.id === next.id));
  assert.deepEqual(priorOverview.answeredDays, []);
  assert.deepEqual(nextOverview.answeredDays, [1]);
  assert.equal((await P.getPrompt(null, original.slug)).prompt.id, original.id);
  const samePassage = {
    ...place,
    path: "/study/scriptures/ot/jer/31",
    anchor: "p3",
  };
  const previousThought = await S.saveStudyThought(guest, {
    ...samePassage,
    id: randomUUID(),
    body: "이번 주",
    visibility: "public",
  });
  const nextThought = await S.saveStudyThought(guest, {
    ...samePassage,
    week: 44,
    id: randomUUID(),
    body: "다음 주",
    visibility: "public",
  });
  const range = { path: samePassage.path, anchor: samePassage.anchor };
  assert.deepEqual(
    (await S.getStudyThoughts(null, params(range))).items.map((t) => t.id),
    [previousThought.id],
  );
  assert.deepEqual(
    (
      await S.getStudyThoughts(null, params({ ...range, week: "44" }))
    ).items.map((t) => t.id),
    [nextThought.id],
  );
  assert.ok(
    !(await S.getStudyFeed(null, params())).items.some(
      (t) => t.id === nextThought.id,
    ),
  );
});
