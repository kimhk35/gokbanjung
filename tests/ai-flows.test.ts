import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp } from "node:fs/promises";
import { privileged } from "../src/lib/db";
import { generate, reviewAi } from "../src/lib/ai";
import { startQuiz } from "../src/lib/quiz-service";
import {
  openAiKey,
  openAiModel,
  openAiRequest,
  checkAiConnection,
} from "../src/lib/openai-config";
import type { Actor } from "../src/lib/types";
import { manageAnnouncement } from "../src/lib/announcements";
import { lessonConfig, lessonRevision } from "../src/lib/lesson-service";

test("AI integration: seven generation features, bilingual translation, 3/10/20 quizzes and provider failures", async () => {
  // Provider responses are fixtures; real schema, permissions, persistence and parsing are exercised.
  process.env.LOCAL_DATABASE_PATH = await mkdtemp((await import("node:path")).join((await import("node:os")).tmpdir(), "ggc-ai-check-"));
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.OPENAI_API_KEY;
  const originalAlias = process.env.OPEN_API_KEY;
  const originalModel = process.env.OPENAI_MODEL;
  delete process.env.OPENAI_API_KEY;
  process.env.OPEN_API_KEY = " fixture-key ";
  process.env.OPENAI_MODEL = " gpt-4.1-mini ";
  let expected: unknown = { connected: true };
  let calls = 0;
  globalThis.fetch = async (url, init) => {
    if (String(url).includes("churchofjesuschrist.org"))
      return new Response('<p class="verse" id="p1">1 Source fixture.</p>');
    calls++;
    assert.equal(
      new Headers(init?.headers).get("authorization"),
      "Bearer fixture-key",
    );
    const body = JSON.parse(String(init?.body));
    assert.equal(body.model, "gpt-4.1-mini");
    return Response.json({
      choices: [{ message: { content: JSON.stringify(expected) } }],
      usage: { prompt_tokens: 10, completion_tokens: 10 },
    });
  };
  try {
    assert.equal(openAiKey(), "fixture-key");
    assert.equal(openAiModel(), "gpt-4.1-mini");
    assert.equal((await checkAiConnection()).ok, true);
    const admin: Actor = {
      id: randomUUID(),
      nickname: "AI test",
      kind: "user",
      role: "ADMIN",
      course_id: "old-testament-2026",
    };
    const guest: Actor = {
      ...admin,
      id: randomUUID(),
      kind: "guest",
      role: "GUEST",
    };
    const resource = randomUUID();
    await privileged(async (db) => {
      for (const a of [admin, guest])
        await db.query(
          "insert into ggc.actors(id,kind,role,nickname,course_id) values($1,$2,$3,$4,$5)",
          [a.id, a.kind, a.role, a.nickname, a.course_id],
        );
      await db.query(
        "insert into ggc.reflections(owner_id,week,day,content) values($1,38,1,$2)",
        [admin.id, JSON.stringify({ note: "My own learning reflection" })],
      );
      await db.query(
        "insert into ggc.resources(id,course_id,created_by,name,storage_path,extracted_text) values($1,$2,$3,'fixture','fixture','Teaching source')",
        [resource, admin.course_id, admin.id],
      );
    });
    const outputs = {
      questions: { questions: ["What did you discover?"] },
      worksheet: {
        items: [{ ko: "어떤 발견이 있었나요?", en: "What did you discover?" }],
      },
      insight: {
        headline: "Discovery",
        question: "What next?",
        action: "Reflect",
      },
      weekly: {
        summary: "Reflection",
        themes: ["Learning"],
        nextQuestion: "Next?",
        sentence: "Learn together",
      },
      class_brief: {
        summary: "Shared learning",
        themes: ["Reading"],
        questions: ["What next?"],
      },
      curriculum: {
        weeks: [
          {
            title: { ko: "제목", en: "Title" },
            reference: { ko: "이사야 1", en: "Isaiah 1" },
            start: "2026-09-14",
            end: "2026-09-20",
            sourcePage: 1,
          },
        ],
      },
      translate: { translation: "Translated announcement" },
    };
    for (const [feature, content] of Object.entries(outputs)) {
      expected = content;
      const result = await generate(admin, {
        feature,
        week: 38,
        language: "en",
        consent: true,
        text: "공지",
        resource_id: resource,
      });
      assert.deepEqual(result.content, content, feature);
    }
    const questionRow = (await privileged(db => db.query("select id from ggc.ai_content where owner_id=$1 and feature='questions'", [admin.id])))[0];
    await privileged(db => db.query("update ggc.ai_content set content=$1 where id=$2", [JSON.stringify(JSON.stringify(outputs.questions)), String(questionRow.id)]));
    const callsBeforeLegacy = calls;
    const recovered = await generate(admin, {feature: "questions", week: 38, language: "en", consent: true, text: "공지", resource_id: resource});
    assert.deepEqual(recovered.content, outputs.questions);
    assert.equal(calls, callsBeforeLegacy, "legacy string cache is recovered without a paid request");
    await assert.rejects(reviewAi(admin, {id: questionRow.id, status: "edited", content: {questions: "broken"}}), /ai_invalid_content/);
    await privileged(db => db.query("update ggc.ai_content set content=$1 where id=$2", [JSON.stringify({questions:null}), String(questionRow.id)]));
    expected = outputs.questions;
    assert.deepEqual((await generate(admin, {feature:"questions", week:38, language:"en", consent:true, text:"공지", resource_id:resource})).content, outputs.questions);
    assert.equal(calls, callsBeforeLegacy + 1, "invalid cache generates a usable replacement");
    expected = { translation: "한국어 번역" };
    assert.deepEqual(
      (
        await generate(admin, {
          feature: "translate",
          week: 38,
          language: "ko",
          text: "Announcement",
        })
      ).content,
      expected,
    );
    const beforeCache = calls;
    await generate(admin, {
      feature: "translate",
      week: 38,
      language: "ko",
      text: "Announcement",
    });
    assert.equal(
      calls,
      beforeCache,
      "cached translation avoids duplicate provider calls",
    );
    await assert.rejects(
      generate(guest, { feature: "questions", week: 38, language: "ko" }),
      /forbidden/,
    );
    await assert.rejects(
      generate(admin, { feature: "insight", week: 38, language: "ko" }),
      /consent_required/,
    );
    const announcement = await manageAnnouncement(admin, {
      action: "save",
      content: { ko: "공지", en: "News" },
    });
    const teacher: Actor = { ...guest, kind: "user", role: "TEACHER" };
    await privileged(async (db) => {
      await db.query(
        "update ggc.actors set kind='user',role='TEACHER' where id=$1",
        [teacher.id],
      );
      await db.query(
        "insert into ggc.course_teachers(course_id,teacher_id) values($1,$2)",
        [teacher.course_id, teacher.id],
      );
    });
    await assert.rejects(
      manageAnnouncement(guest, { action: "delete", id: announcement.id }),
      /forbidden/,
    );
    await assert.rejects(
      manageAnnouncement(
        { ...teacher, role: "TEACHER_PENDING" },
        { action: "delete", id: announcement.id },
      ),
      /forbidden/,
    );
    await manageAnnouncement(teacher, {
      action: "save",
      id: announcement.id,
      content: { ko: "수정한 공지", en: "Updated news" },
    });
    const savedNotice = await privileged((db) =>
      db.query("select content from ggc.announcements where id=$1", [
        String(announcement.id),
      ]),
    );
    assert.equal((savedNotice[0].content as { en: string }).en, "Updated news");
    await assert.rejects(
      manageAnnouncement(
        { ...admin, course_id: "other-course" },
        { action: "delete", id: announcement.id },
      ),
      /not_found/,
    );
    await manageAnnouncement(teacher, {
      action: "delete",
      id: announcement.id,
    });
    const lesson = {
      items: [
        {
          id: "opening",
          kind: "start",
          title: "Welcome",
          text: "Read together",
          enabled: true,
        },
        {
          id: "question",
          kind: "question",
          title: "Question",
          text: "What did you discover?",
          enabled: true,
        },
      ],
      theme: "midnight",
      size: "large",
      activeId: "question",
      presentedAt: 1,
    };
    await lessonConfig(teacher, 38, lesson);
    assert.deepEqual(await lessonConfig(admin, 38), lesson);
    const revision = (await lessonRevision(teacher, 38)).revision;
    await lessonConfig(admin, 38, { ...lesson, presentedAt: 2 });
    assert.notEqual((await lessonRevision(teacher, 38)).revision, revision);
    await assert.rejects(lessonConfig(guest, 38), /forbidden/);
    await assert.rejects(
      lessonConfig(teacher, 38, { ...lesson, activeId: "missing" }),
    );
    await assert.rejects(
      lessonConfig(teacher, 38, {
        ...lesson,
        items: [
          { ...lesson.items[0], image: "https://untrusted.example/image" },
        ],
      }),
    );
    assert.equal(
      await lessonConfig({ ...admin, course_id: "other-course" }, 38),
      null,
    );
    assert.equal(
      (
        await privileged((db) =>
          db.query("select id from ggc.announcements where id=$1", [
            String(announcement.id),
          ]),
        )
      ).length,
      0,
    );
    for (const [kind, count] of [
      ["daily", 3],
      ["weekly", 10],
      ["monthly", 20],
    ] as const) {
      expected = {
        questions: Array.from({ length: count }, (_, i) => ({
          question: `Question ${i}`,
          options: ["A", "B", "C", "D"],
          answer: i % 4,
          explanation: "Explanation",
          hint: "Hint",
          sourceIndex: 0,
          verse: 1,
        })),
      };
      const quiz = await startQuiz(admin, { kind, language: "en" });
      assert.equal(quiz.questions.length, count);
      assert.equal(
        "answer" in quiz.questions[0],
        false,
        "answers remain private before submission",
      );
    }
    for (const [status, code, error] of [
      [401, "invalid_api_key", "ai_key_invalid"],
      [429, "insufficient_quota", "ai_quota_exceeded"],
      [429, "rate_limit_exceeded", "ai_rate_limited"],
      [403, "permission_denied", "ai_access_denied"],
      [404, "model_not_found", "ai_model_invalid"],
      [500, "server_error", "ai_provider_unavailable"],
      [400, "invalid_request_error", "ai_request_invalid"],
    ] as const) {
      globalThis.fetch = async () =>
        Response.json({ error: { code } }, { status });
      await assert.rejects(openAiRequest({}), new RegExp(error));
    }
    globalThis.fetch = async () => {
      throw new DOMException("Timed out", "TimeoutError");
    };
    await assert.rejects(openAiRequest({}), /ai_timeout/);
    globalThis.fetch = async () => {
      throw new TypeError("Network failure");
    };
    await assert.rejects(openAiRequest({}), /ai_connection_failed/);
    delete process.env.OPEN_API_KEY;
    await assert.rejects(openAiRequest({}), /ai_unavailable/);
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of [
      ["OPENAI_API_KEY", originalKey],
      ["OPEN_API_KEY", originalAlias],
      ["OPENAI_MODEL", originalModel],
    ]) {
      if (value === undefined) delete process.env[key!];
      else process.env[key!] = value;
    }
  }
});
