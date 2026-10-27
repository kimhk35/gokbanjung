import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getStudyPlan, studySourceUrl } from "../src/lib/cfm-study-plan";
import { curriculum } from "../src/lib/curriculum";

type Source = {
  id: string;
  path: string;
  lang: string;
  scope: string;
  units: {
    anchor: string;
    note: boolean;
    noteOwners: string[];
    verseNumbers: number[];
    sha256: string;
  }[];
};
const sources: Source[] = JSON.parse(
  readFileSync("docs/study/2026-week-44-sources.json", "utf8"),
);
const plan = getStudyPlan(44)!;
const tasks = plan.days.flatMap((day) => [
  ...day.adultTasks,
  ...day.familyTasks,
]);

test("week 44 preserves the independent source inventory, notes and real source positions", () => {
  const expected = sources.flatMap((source) =>
    source.units.map((unit) => `${source.id}#${unit.anchor}`),
  );
  const actual = tasks.flatMap((task) => task.units);
  assert.equal(sources.length, 41);
  assert.equal(expected.length, 1363);
  assert.equal(
    new Set(actual).size,
    actual.length,
    "each source body has one owner",
  );
  assert.deepEqual(actual.slice().sort(), expected.sort());
  assert.equal(new Set(tasks.map((task) => task.id)).size, tasks.length);
  for (const task of tasks) {
    const source = sources.find((source) => source.id === task.sourceId)!;
    assert.equal(task.path, source.path);
    assert.equal(task.sourceLang, source.lang);
    assert.equal(task.sourceLanguageLocked, true);
    const anchors = new Set(source.units.map((unit) => unit.anchor));
    for (const anchor of task.selectedIds)
      assert.ok(anchors.has(anchor), `${source.id}#${anchor}`);
    assert.deepEqual(
      task.sourceIds.map((anchor) => `${source.id}#${anchor}`),
      task.units,
    );
    for (const note of task.noteLinks) {
      const unit = source.units.find((unit) => unit.anchor === note.note)!;
      assert.equal(unit.note, true);
      assert.ok(unit.noteOwners.includes(note.owner));
      assert.ok(
        task.sourceIds.includes(note.owner),
        "notes stay with their citing passage",
      );
    }
    for (const unit of source.units)
      assert.match(unit.sha256, /^[a-f0-9]{64}$/);
  }
});

test("week 44 opens each assigned source position only once across all days and tracks", () => {
  const opened = new Set<string>();
  for (const task of tasks) {
    assert.ok(
      task.units.length > 0,
      `${task.id} must not repeat a shared reading`,
    );
    const url = new URL(studySourceUrl(task, "ko", false, 44));
    const positions = (url.searchParams.get("id") || "")
      .split(",")
      .filter(Boolean);
    assert.deepEqual(positions, task.selectedIds);
    for (const anchor of positions) {
      assert.ok(
        task.sourceIds.includes(anchor),
        `${task.id} opens an unassigned position`,
      );
      const key = `${url.pathname}?lang=${url.searchParams.get("lang")}#${anchor}`;
      assert.ok(!opened.has(key), `${task.id} repeats ${key}`);
      opened.add(key);
    }
    assert.equal(task.anchor, positions[0]);
    assert.equal(task.endAnchor, positions.at(-1));
    const endUrl = new URL(studySourceUrl(task, "ko", true, 44));
    assert.equal(endUrl.searchParams.get("id"), url.searchParams.get("id"));
  }
});

test("week 44 includes all nine weekly chapters, including verses combined into one Korean paragraph", () => {
  const chapters = {
    jer31: 40,
    jer32: 44,
    jer33: 26,
    jer36: 32,
    jer37: 21,
    jer38: 28,
    jer39: 18,
    lam1: 22,
    lam3: 66,
  };
  for (const [id, lastVerse] of Object.entries(chapters)) {
    const source = sources.find((source) => source.id === id)!;
    const verses = source.units.flatMap((unit) => unit.verseNumbers);
    assert.deepEqual(
      verses.slice().sort((a, b) => a - b),
      Array.from({ length: lastVerse }, (_, index) => index + 1),
      id,
    );
  }
  assert.deepEqual(
    sources
      .find((source) => source.id === "jer32")!
      .units.find((unit) => unit.anchor === "p3")!.verseNumbers,
    [3, 4, 5],
  );
  assert.deepEqual(
    sources
      .find((source) => source.id === "jer33")!
      .units.find((unit) => unit.anchor === "p10")!.verseNumbers,
    [10, 11],
  );
  const week = curriculum.find((week) => week.number === 44)!;
  assert.match(week.reference.ko, /36~39/);
  assert.doesNotMatch(week.sourceNote!.ko, /교사 확인이 필요/);
});

test("week 44 retains every numbered manual paragraph and keeps family participation separate", () => {
  const manual = sources.find((source) => source.id === "manual")!;
  for (let paragraph = 1; paragraph <= 33; paragraph++)
    assert.ok(manual.units.some((unit) => unit.anchor === `p${paragraph}`));
  for (let heading = 1; heading <= 14; heading++)
    assert.ok(manual.units.some((unit) => unit.anchor === `title${heading}`));
  for (const day of plan.days) {
    assert.equal(day.adultTasks[0].sourceId, "manual");
    assert.ok(day.familyTasks.length);
    assert.ok(day.question && day.familyQuestion && day.familyActivity);
    assert.ok(
      day.adultTasks.every(
        (task) => !day.familyTasks.some((family) => family.id === task.id),
      ),
    );
  }
  assert.match(
    sources.find((source) => source.id === "evening")!.scope,
    /metadata only/,
  );
});
