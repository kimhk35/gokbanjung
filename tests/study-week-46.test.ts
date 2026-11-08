import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import approved43 from "../src/data/cfm-2026-week-43.json";
import approved44 from "../src/data/cfm-2026-week-44.json";
import {
  getStudyPlan,
  isStudyReaderPath,
  materialPercent,
  studySourceLanguage,
  studySourceUrl,
  studyTasks,
} from "../src/lib/cfm-study-plan";
import { curriculum, dayIndex } from "../src/lib/curriculum";
import type { Actor } from "../src/lib/types";

type SourceUnit = {
  anchor: string;
  note: boolean;
  noteOwners: string[];
  verseNumbers: number[];
  sha256: string;
};
type Source = {
  id: string;
  path: string;
  lang: string;
  scope: string;
  units: SourceUnit[];
};
const sources: Source[] = JSON.parse(
  readFileSync("docs/study/2026-week-46-sources.json", "utf8"),
);
const plan = getStudyPlan(46)!;
const tasks = plan.days.flatMap((day) => [
  ...day.adultTasks,
  ...day.familyTasks,
]);
const sourceById = new Map(sources.map((source) => [source.id, source]));
const position = (source: Source, anchor: string) =>
  `${source.path}?lang=${source.lang}#${anchor}`;

test("week 46 owns every independent source unit once, with its original positions and note links", () => {
  const expected = sources.flatMap((source) =>
    source.units.map((unit) => `${source.id}#${unit.anchor}`),
  );
  const assigned = tasks.flatMap((task) => task.units);
  assert.ok(
    sources.length >= 8,
    "the manual and all seven chapters are required",
  );
  assert.equal(sourceById.size, sources.length);
  assert.equal(
    new Set(sources.map((source) => `${source.path}?lang=${source.lang}`)).size,
    sources.length,
  );
  assert.equal(
    new Set(expected).size,
    expected.length,
    "the source inventory itself has no repeated unit",
  );
  assert.equal(
    new Set(assigned).size,
    assigned.length,
    "a passage has one owner across days and tracks",
  );
  assert.deepEqual(assigned.slice().sort(), expected.slice().sort());
  assert.equal(new Set(tasks.map((task) => task.id)).size, tasks.length);
  for (const task of tasks) {
    assert.match(task.id, /^w46-/);
    assert.ok(
      task.units.length,
      `${task.id} cannot be a repeated-reading shortcut`,
    );
    const source = sourceById.get(task.sourceId);
    assert.ok(source, task.sourceId);
    assert.equal(task.path, source.path);
    assert.equal(task.sourceLang, source.lang);
    assert.equal(task.sourceLanguageLocked, true);
    assert.deepEqual(
      task.units,
      task.sourceIds.map((anchor) => `${source.id}#${anchor}`),
    );
    const units = task.sourceIds.map((anchor) => {
      const unit = source.units.find((unit) => unit.anchor === anchor);
      assert.ok(unit, `${source.id}#${anchor}`);
      return unit;
    });
    const linkedNotes = units.filter(
      (unit) => unit.note && unit.noteOwners.length,
    );
    assert.deepEqual(
      task.noteLinks.map((note) => note.note).sort(),
      linkedNotes.map((unit) => unit.anchor).sort(),
    );
    for (const note of task.noteLinks) {
      const unit = units.find((unit) => unit.anchor === note.note)!;
      assert.ok(unit.noteOwners.includes(note.owner));
      assert.ok(
        task.sourceIds.includes(note.owner),
        `${task.id}: note stays with its citing passage`,
      );
    }
  }
  for (const source of sources)
    for (const unit of source.units)
      assert.match(unit.sha256, /^[a-f0-9]{64}$/);
});

test("week 46 actual blue selections cover all scoped bodies without repeated source positions", () => {
  const expected = sources.flatMap((source) =>
    /metadata only/i.test(source.scope)
      ? []
      : source.units
          .filter(
            (unit) =>
              !unit.note &&
              !["reference1", "short_reference1"].includes(unit.anchor),
          )
          .map((unit) => position(source, unit.anchor)),
  );
  const opened: string[] = [];
  for (const task of tasks) {
    const source = sourceById.get(task.sourceId)!;
    for (const lang of ["ko", "en", "es", "fil"] as const) {
      const start = new URL(studySourceUrl(task, lang, false, 46));
      const end = new URL(studySourceUrl(task, lang, true, 46));
      assert.equal(start.origin, "https://www.churchofjesuschrist.org");
      assert.equal(start.pathname, task.path);
      assert.equal(studySourceLanguage(task, lang), source.lang);
      assert.equal(start.searchParams.get("lang"), source.lang);
      assert.equal(
        start.searchParams.get("id"),
        task.selectedIds.join(",") || null,
      );
      assert.equal(end.searchParams.get("id"), start.searchParams.get("id"));
      assert.equal(start.hash, task.anchor ? `#${task.anchor}` : "");
      assert.equal(end.hash, task.endAnchor ? `#${task.endAnchor}` : "");
    }
    const url = new URL(studySourceUrl(task, "ko", false, 46));
    const selections = (url.searchParams.get("id") || "")
      .split(",")
      .filter(Boolean);
    assert.equal(task.anchor, selections[0] || "");
    assert.equal(task.endAnchor, selections.at(-1) || "");
    for (const anchor of selections) {
      assert.ok(
        task.sourceIds.includes(anchor),
        `${task.id} opens an unassigned paragraph`,
      );
      opened.push(position(source, anchor));
    }
    if (/metadata only/i.test(source.scope))
      assert.equal(
        task.kind,
        "video",
        "an unselected metadata source needs a full-player task",
      );
  }
  assert.equal(
    new Set(opened).size,
    opened.length,
    "rendered selections cannot repeat through another day or track",
  );
  assert.deepEqual(
    opened.slice().sort(),
    expected.slice().sort(),
    "no scoped body is hidden by an incomplete selectedIds list",
  );
});

test("Daniel 1–7 includes all 224 logical verses in both the inventory and actual selected paragraphs", () => {
  const chapterLengths = [21, 49, 30, 37, 31, 28, 28];
  let total = 0;
  for (const [index, lastVerse] of chapterLengths.entries()) {
    const chapterPath = `/study/scriptures/ot/dan/${index + 1}`;
    const source = sources.find((source) => source.path === chapterPath);
    assert.ok(source, chapterPath);
    const expected = Array.from({ length: lastVerse }, (_, verse) => verse + 1);
    assert.deepEqual(
      source.units.flatMap((unit) => unit.verseNumbers).sort((a, b) => a - b),
      expected,
      `${chapterPath}: inventory`,
    );
    const selectedVerses = tasks
      .filter((task) => task.path === chapterPath)
      .flatMap((task) =>
        task.selectedIds.flatMap(
          (anchor) =>
            source.units.find((unit) => unit.anchor === anchor)!.verseNumbers,
        ),
      );
    assert.deepEqual(
      selectedVerses.sort((a, b) => a - b),
      expected,
      `${chapterPath}: actual assigned reading`,
    );
    total += selectedVerses.length;
  }
  assert.equal(total, 224);
});

test("week 46 uses November 9–15 and independent daily tracks without changing approved weeks", () => {
  assert.equal(plan.week, 46);
  assert.equal(plan.dates, "2026-11-09/2026-11-15");
  assert.deepEqual(
    plan.days.map((day) => day.day),
    [1, 2, 3, 4, 5, 6, 7],
  );
  const week = curriculum.find((week) => week.number === 46)!;
  assert.equal(week.start, "2026-11-09");
  assert.equal(week.end, "2026-11-15");
  assert.match(week.reference.en, /Daniel 1[–~-]7/);
  const previousIds = [43, 44].flatMap((number) =>
    getStudyPlan(number)!.days.flatMap((day) =>
      [...day.adultTasks, ...day.familyTasks].map((task) => task.id),
    ),
  );
  for (const day of plan.days) {
    assert.equal(
      dayIndex(week, `2026-11-${String(8 + day.day).padStart(2, "0")}`),
      day.day,
    );
    assert.equal(isStudyReaderPath(`/week/46/day/${day.day}`), true);
    assert.ok(day.question && day.familyQuestion && day.familyActivity);
    for (const track of ["adult", "family"] as const) {
      const items = studyTasks(day.day, track, 46);
      assert.ok(items.length, `${track} day ${day.day}`);
      assert.equal(materialPercent(day.day, track, previousIds, 46).count, 0);
      assert.equal(
        materialPercent(
          day.day,
          track,
          items.map((task) => task.id),
          46,
        ).percent,
        100,
      );
      const otherTrack = track === "adult" ? "family" : "adult";
      assert.equal(
        materialPercent(
          day.day,
          otherTrack,
          items.map((task) => task.id),
          46,
        ).count,
        0,
      );
    }
  }
  assert.deepEqual(getStudyPlan(43), approved43);
  assert.deepEqual(getStudyPlan(44), approved44);
  assert.equal(isStudyReaderPath("/week/46/day/8"), false);
});

test("week 46 progress validates its task IDs and leaves week 44 completion intact", async () => {
  // This test runs against a disposable local database, even if a developer's
  // shell happens to contain a production DATABASE_URL.
  delete process.env.DATABASE_URL;
  assert.notEqual(process.env.NODE_ENV, "production");
  process.env.LOCAL_DATABASE_PATH = await mkdtemp(
    path.join(tmpdir(), "ggc-week46-"),
  );
  const { privileged } = await import("../src/lib/db");
  const { getStudyProgress, saveStudyProgress } =
    await import("../src/lib/study-material-progress");
  const { AppError } = await import("../src/lib/errors");
  const actor = await privileged(
    async (db) =>
      (
        await db.query(
          "insert into ggc.actors(kind,role,nickname) values('guest','GUEST','') returning id,kind,role,nickname,course_id",
        )
      )[0] as Actor,
  );
  const save = (
    week: number,
    task_id: string,
    complete = true,
    track: "adult" | "family" = "adult",
  ) => saveStudyProgress(actor, { week, day: 1, track, task_id, complete });
  const previous = studyTasks(1, "adult", 44);
  const current = studyTasks(1, "adult", 46);
  const invalid = (error: unknown) =>
    error instanceof AppError && error.status === 400;
  await assert.rejects(save(46, previous[0].id), invalid);
  await assert.rejects(save(44, current[0].id), invalid);
  for (const task of previous) await save(44, task.id);
  const previousProgress = await getStudyProgress(
    actor,
    new URLSearchParams({ week: "44" }),
  );
  for (const task of studyTasks(1, "family", 46))
    await save(46, task.id, true, "family");
  const completed = () =>
    privileged(async (db) =>
      (
        await db.query<{ week: number }>(
          "select week from ggc.study_day_completion where owner_id=$1 and day=$2 order by week",
          [actor.id, 1],
        )
      ).map((row) => row.week),
    );
  assert.deepEqual(
    await completed(),
    [44],
    "family participation never completes basic reading",
  );
  for (const task of current) await save(46, task.id);
  assert.deepEqual(await completed(), [44, 46]);
  await save(46, current[0].id, false);
  assert.deepEqual(await completed(), [44]);
  assert.deepEqual(
    await getStudyProgress(actor, new URLSearchParams({ week: "44" })),
    previousProgress,
  );
});
