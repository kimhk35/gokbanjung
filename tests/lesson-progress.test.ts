import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { defaultLessonItems, resizeLesson } from "../src/lib/lesson-slides";
import {
  lessonConfigSchema,
  type LessonConfig,
} from "../src/lib/lesson-config";
import { studyProgress, lessonDate } from "../src/lib/study-progress";
import {
  cardBackgrounds,
  cardBackgroundUrl,
} from "../src/lib/card-backgrounds";
import raw from "../src/data/curriculum.json";
import type { Week } from "../src/lib/types";
const weeks = raw as Week[];
test("Slide count reduction preserves content and restores it before creating slides", () => {
  const defaults = defaultLessonItems(weeks[37], "ko");
  let id = 0;
  const create = () => `test-${++id}`;
  const blank: LessonConfig = {
    items: [],
    theme: "midnight",
    size: "large",
    activeId: null,
  };
  let value = resizeLesson(blank, 10, defaults, create, "ko");
  assert.equal(value.items.length, 10);
  assert.equal(value.items.filter((x) => x.enabled).length, 10);
  value.items[8].text = "Preserved content";
  value.activeId = value.items[8].id;
  value = resizeLesson(value, 3, defaults, create, "ko");
  assert.equal(value.items.length, 10);
  assert.equal(value.items.filter((x) => x.enabled).length, 3);
  assert.equal(value.activeId, null);
  value = resizeLesson(value, 10, defaults, create, "ko");
  assert.equal(value.items[8].text, "Preserved content");
  assert.equal(value.items.length, 10);
  value = resizeLesson(value, 40, defaults, create, "en");
  assert.equal(value.items.length, 40);
  assert(lessonConfigSchema.safeParse(value).success);
  for (const bad of [0, 41, 2.5, NaN])
    assert.throws(() => resizeLesson(value, bad, defaults, create, "ko"));
});
test("Study dates cross month/year boundaries and completion counts are unique", () => {
  assert.equal(lessonDate("2025-12-29", 7), "2026-01-04");
  assert.equal(
    new Date(lessonDate("2026-09-14", 7) + "T00:00:00Z").getUTCDay(),
    0,
  );
  const result = studyProgress(weeks, [
    { week: 1, day: 1 },
    { week: 1, day: 1 },
    { week: 1, day: 7 },
    { week: 999, day: 1 },
    { week: 1, day: 8 },
  ]);
  assert.equal(result.complete.size, 2);
  assert.equal(result.months[0].done, 1);
});
test("Twenty distinct local faith backgrounds exist and are supported in lesson settings", async () => {
  assert.equal(cardBackgrounds.length, 20);
  assert.equal(new Set(cardBackgrounds.map((x) => x.id)).size, 20);
  const sources = [];
  for (const bg of cardBackgrounds) {
    const url = cardBackgroundUrl(bg.id);
    assert(url);
    const source = await readFile("public" + url, "utf8");
    assert(source.includes("<svg"));
    assert(
      !/script|https?:\/\/(?!www.w3.org)/.test(
        source.replace(/xmlns="[^"]*"/, ""),
      ),
    );
    sources.push(source);
    assert(
      lessonConfigSchema.safeParse({
        items: [],
        theme: bg.id,
        size: "large",
        activeId: null,
      }).success,
    );
  }
  assert.equal(new Set(sources).size, 20);
  assert.equal(cardBackgroundUrl("../../secret"), null);
});
