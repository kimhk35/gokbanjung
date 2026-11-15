import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  dailyStudyHref,
  getStudyPlan,
  materialPercent,
  studyRelatedTasks,
  studySourceUrl,
  studyTasks,
} from "../src/lib/cfm-study-plan";
import { curriculum, dayIndex } from "../src/lib/curriculum";

type Unit = {
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
  units: Unit[];
};
const sources: Source[] = JSON.parse(
  readFileSync("docs/study/2026-week-47-sources.json", "utf8"),
);
const plan = getStudyPlan(47)!;
const locations = plan.days.flatMap((day) =>
  (["adult", "family"] as const).flatMap((track) =>
    studyTasks(day.day, track, 47).map((task, index) => ({
      day: day.day,
      track,
      index,
      task,
    })),
  ),
);
const tasks = locations.map((location) => location.task);
const sourceById = new Map(sources.map((source) => [source.id, source]));
const position = (source: Source, anchor: string) =>
  `${source.path}?lang=${source.lang}#${anchor}`;

test("week 47 owns every inventoried paragraph and note exactly once across both tracks", () => {
  assert.equal(sourceById.size, sources.length);
  assert.equal(
    new Set(sources.map((source) => `${source.path}?lang=${source.lang}`)).size,
    sources.length,
  );
  const expected = sources.flatMap((source) =>
    source.units.map((unit) => `${source.id}#${unit.anchor}`),
  );
  const assigned = tasks.flatMap((task) => task.units);
  assert.equal(new Set(expected).size, expected.length);
  assert.equal(new Set(assigned).size, assigned.length);
  assert.deepEqual(assigned.toSorted(), expected.toSorted());
  assert.equal(new Set(tasks.map((task) => task.id)).size, tasks.length);
  for (const task of tasks) {
    assert.match(task.id, /^w47-/);
    assert.ok(task.units.length);
    const source = sourceById.get(task.sourceId)!;
    assert.ok(source, task.id);
    assert.equal(task.path, source.path);
    assert.equal(task.sourceLang, source.lang);
    assert.equal(task.sourceLanguageLocked, true);
    assert.deepEqual(
      task.units,
      task.sourceIds.map((id) => `${source.id}#${id}`),
    );
    const units = task.sourceIds.map((id) => {
      const unit = source.units.find((item) => item.anchor === id);
      assert.ok(unit, `${task.id}: ${id}`);
      assert.match(unit.sha256, /^[a-f0-9]{64}$/);
      return unit;
    });
    assert.deepEqual(
      task.noteLinks.map((note) => note.note).toSorted(),
      units
        .filter((unit) => unit.note && unit.noteOwners.length)
        .map((unit) => unit.anchor)
        .toSorted(),
    );
    for (const note of task.noteLinks) {
      assert.ok(
        task.sourceIds.includes(note.owner),
        `${task.id}: footnote owner`,
      );
      assert.ok(
        units
          .find((unit) => unit.anchor === note.note)!
          .noteOwners.includes(note.owner),
      );
    }
  }
});

test("the actual blue selections cover all scoped bodies once in the verified source language", () => {
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
      const start = new URL(studySourceUrl(task, lang, false, 47));
      const end = new URL(studySourceUrl(task, lang, true, 47));
      assert.equal(start.origin, "https://www.churchofjesuschrist.org");
      assert.equal(start.pathname, source.path);
      assert.equal(start.searchParams.get("lang"), source.lang);
      assert.equal(
        start.searchParams.get("id"),
        task.selectedIds.join(",") || null,
      );
      assert.equal(end.searchParams.get("id"), start.searchParams.get("id"));
      assert.equal(start.hash, task.anchor ? `#${task.anchor}` : "");
      assert.equal(end.hash, task.endAnchor ? `#${task.endAnchor}` : "");
    }
    assert.equal(task.anchor, task.selectedIds[0] || "");
    assert.equal(task.endAnchor, task.selectedIds.at(-1) || "");
    for (const anchor of task.selectedIds) {
      assert.ok(
        task.sourceIds.includes(anchor),
        `${task.id}: unowned selection`,
      );
      opened.push(position(source, anchor));
    }
    if (/metadata only/i.test(source.scope)) assert.equal(task.kind, "video");
  }
  assert.equal(new Set(opened).size, opened.length);
  assert.deepEqual(opened.toSorted(), expected.toSorted());
});

test("the weekly title's 223 verses are all present; the book overview does not add Hosea 7–9", () => {
  // Independently checked against the official Korean chapter pages, not the
  // allocation's task lengths. A Korean paragraph can contain several verses.
  const chapters = [
    ["hosea/1", 11],
    ["hosea/2", 23],
    ["hosea/3", 5],
    ["hosea/4", 19],
    ["hosea/5", 15],
    ["hosea/6", 11],
    ["hosea/10", 15],
    ["hosea/11", 12],
    ["hosea/12", 14],
    ["hosea/13", 16],
    ["hosea/14", 9],
    ["joel/1", 20],
    ["joel/2", 32],
    ["joel/3", 21],
  ] as const;
  let total = 0;
  for (const [chapter, length] of chapters) {
    const path = `/study/scriptures/ot/${chapter}`;
    const source = sources.find((item) => item.path === path);
    assert.ok(source, path);
    const expected = Array.from({ length }, (_, i) => i + 1);
    assert.deepEqual(
      source.units.flatMap((unit) => unit.verseNumbers).sort((a, b) => a - b),
      expected,
    );
    const selected = tasks
      .filter((task) => task.path === path)
      .flatMap((task) =>
        task.selectedIds.flatMap(
          (id) => source.units.find((unit) => unit.anchor === id)!.verseNumbers,
        ),
      );
    assert.deepEqual(
      selected.sort((a, b) => a - b),
      expected,
      path,
    );
    total += selected.length;
  }
  assert.equal(total, 223);
  assert.equal(
    locations.some(
      ({ track, task }) =>
        track === "family" &&
        chapters.some(
          ([chapter]) => task.path === `/study/scriptures/ot/${chapter}`,
        ),
    ),
    false,
    "basic weekly scripture coverage must not depend on optional family participation",
  );
  assert.equal(
    sources.some((source) => /\/ot\/hosea\/[789]$/.test(source.path)),
    false,
  );
});

test("explicit reading prompts lead directly to their actual scripture/talk targets", () => {
  // These pairs come from the official instructions, independently of the
  // builder's reading-chains CSV. Nearby but unrelated images must not intervene.
  const chains = [
    ["manual#p4", ["hos1#p1", "hos2#p1", "hos3#p1"]],
    ["manual#p5", ["hos14#p1", "come-unto-jesus#song_number1"]],
    ["manual#p6", ["hos6#p4", "isa-48#p18", "1-ne-2#p9"]],
    ["manual#p7", ["matt-9#p10", "matt-12#p1"]],
    ["manual#p8", ["joel2#p12"]],
    ["manual#p10", ["js-h-1#p41", "acts-2#p1"]],
    ["manual#p11", ["revelation-for-the-church-revelation-for-our-lives#p1"]],
    ["manual#p12", ["mosiah-4#p1", "mosiah-18#p7"]],
    ["manual#p14", ["hel-6#p34"]],
    ["manual#p15", ["dc-19#p37"]],
    ["manual#p16", ["bednar-discussion#title1"]],
    ["manual#p19", ["25stevenson#p1", "enemy-territory#title1"]],
    ["09-teach-by-the-spirit#p3", ["matt-4#p1"]],
    ["09-teach-by-the-spirit#p20", ["john-11#p25"]],
    ["manual#p27", ["john-14#p16", "moro-10#p5", "dc-42#p17"]],
  ] as const;
  const owner = (unit: string) => {
    const found = locations.find(({ task }) => task.units.includes(unit));
    assert.ok(found, unit);
    return found;
  };
  for (const [instruction, targets] of chains) {
    const from = owner(instruction);
    targets.forEach((unit, offset) => {
      const to = owner(unit);
      assert.equal(to.day, from.day, `${instruction} → ${unit}: same day`);
      assert.equal(
        to.track,
        from.track,
        `${instruction} → ${unit}: same track`,
      );
      assert.equal(
        to.index,
        from.index + offset + 1,
        `${instruction} → ${unit}: next in sequence`,
      );
    });
  }
});

test("November 16–22 is available as seven independent daily allocations with optional references", () => {
  assert.equal(plan.week, 47);
  assert.equal(plan.dates, "2026-11-16/2026-11-22");
  assert.deepEqual(
    plan.days.map((day) => day.day),
    [1, 2, 3, 4, 5, 6, 7],
  );
  const week = curriculum.find((week) => week.number === 47)!;
  assert.equal(week.start, "2026-11-16");
  assert.equal(week.end, "2026-11-22");
  const previousIds = getStudyPlan(46)!.days.flatMap((day) =>
    [...day.adultTasks, ...day.familyTasks].map((task) => task.id),
  );
  for (const day of plan.days) {
    assert.equal(dayIndex(week, `2026-11-${15 + day.day}`), day.day);
    assert.equal(
      dailyStudyHref(47, day.day),
      `/week/47/day/${day.day}?track=adult`,
    );
    assert.ok(day.question && day.familyQuestion && day.familyActivity);
    for (const track of ["adult", "family"] as const) {
      const items = studyTasks(day.day, track, 47);
      assert.ok(items.length);
      assert.equal(materialPercent(day.day, track, previousIds, 47).count, 0);
      assert.equal(
        materialPercent(
          day.day,
          track,
          items.map((task) => task.id),
          47,
        ).percent,
        100,
      );
    }
  }
  assert.ok(
    tasks.some((task) => task.relatedTaskIds?.length),
    "reused readings need navigable references",
  );
  for (const task of tasks) {
    const references = task.relatedTaskIds || [];
    const resolved = studyRelatedTasks(task, 47);
    assert.equal(
      new Set(references).size,
      references.length,
      `${task.id}: repeated reference`,
    );
    assert.equal(
      resolved.length,
      references.length,
      `${task.id}: broken/self reference`,
    );
    for (const target of resolved) {
      const url = new URL(target.href, "https://example.test");
      assert.equal(url.pathname, `/week/47/day/${target.day}`);
      assert.equal(url.searchParams.get("source"), target.task.path);
      assert.equal(
        url.searchParams.get("anchor"),
        target.task.anchor || "main",
      );
      assert.equal(url.searchParams.get("track"), target.track);
    }
  }
});
