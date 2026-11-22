import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  getStudyPlan,
  studyRelatedTasks,
  studySourceUrl,
} from "../src/lib/cfm-study-plan";

type Source = {
  id: string;
  path: string;
  lang: string;
  units: {
    anchor: string;
    verseNumbers: number[];
    note: boolean;
    noteOwners: string[];
  }[];
};

const sources: Source[] = JSON.parse(
  readFileSync("docs/study/2026-week-48-sources.json", "utf8"),
);
const plan = getStudyPlan(48)!;
const tasks = plan.days.flatMap((day) => [
  ...day.adultTasks,
  ...day.familyTasks,
]);

test("the six readings own the whole week 48 source inventory exactly once", () => {
  assert.equal(plan.dates, "2026-11-23/2026-11-29");
  assert.deepEqual(
    plan.days.map((d) => d.day),
    [1, 2, 3, 4, 5, 6, 7],
  );
  for (const day of plan.days.slice(0, 6)) {
    assert.ok(day.adultTasks.length && day.familyTasks.length);
    assert.ok(day.question && day.familyActivity);
  }
  assert.deepEqual(plan.days[6].adultTasks, []);
  assert.deepEqual(plan.days[6].familyTasks, []);
  assert.equal(new Set(tasks.map((t) => t.id)).size, tasks.length);
  const expected = sources.flatMap((s) =>
    s.units.map((u) => `${s.id}#${u.anchor}`),
  );
  assert.equal(new Set(expected).size, expected.length);
  assert.deepEqual(
    tasks.flatMap((t) => t.units).toSorted(),
    expected.toSorted(),
  );
  const opened: string[] = [];
  for (const task of tasks) {
    const source = sources.find((s) => s.id === task.sourceId)!;
    const start = new URL(studySourceUrl(task, "ko", false, 48));
    const end = new URL(studySourceUrl(task, "ko", true, 48));
    assert.equal(start.pathname, source.path);
    assert.equal(start.searchParams.get("lang"), source.lang);
    assert.equal(
      start.searchParams.get("id"),
      task.selectedIds.join(",") || null,
    );
    assert.equal(end.searchParams.get("id"), start.searchParams.get("id"));
    assert.equal(start.hash, task.anchor ? `#${task.anchor}` : "");
    assert.equal(end.hash, task.endAnchor ? `#${task.endAnchor}` : "");
    for (const anchor of task.selectedIds) {
      assert.ok(task.units.includes(`${source.id}#${anchor}`));
      opened.push(`${source.path}?lang=${source.lang}#${anchor}`);
    }
    for (const note of task.noteLinks) {
      assert.ok(task.selectedIds.includes(note.owner));
      assert.ok(
        source.units
          .find((unit) => unit.anchor === note.note)
          ?.noteOwners.includes(note.owner),
      );
    }
    assert.equal(
      studyRelatedTasks(task, 48).length,
      (task.relatedTaskIds || []).length,
    );
  }
  assert.equal(opened.length, new Set(opened).size);
});

test("all 215 verses in the three weekly books are in the basic track by Saturday", () => {
  const chapters = {
    amos: [15, 16, 15, 13, 27, 14, 17, 14, 15],
    obad: [21],
    jonah: [17, 10, 10, 11],
  };
  const adult = plan.days.slice(0, 6).flatMap((day) => day.adultTasks);
  let total = 0;
  for (const [book, lengths] of Object.entries(chapters)) {
    for (const [offset, count] of lengths.entries()) {
      const path = `/study/scriptures/ot/${book}/${offset + 1}`;
      const source = sources.find((s) => s.path === path)!;
      const assigned = adult
        .filter((t) => t.path === path)
        .flatMap((t) =>
          t.selectedIds.flatMap(
            (id) =>
              source.units.find((unit) => unit.anchor === id)!.verseNumbers,
          ),
        );
      assert.deepEqual(
        assigned.toSorted((a, b) => a - b),
        Array.from({ length: count }, (_, i) => i + 1),
        path,
      );
      total += assigned.length;
    }
  }
  assert.equal(total, 215);
});

test("the next materials open the passages named by the week 48 manual", () => {
  const chains = [
    ["p4", ["amos3#p1", "amos7#p10"]],
    ["p9", ["amos4#p6", "hel-12#p3"]],
    ["p10", ["amos5#p4"]],
    [
      "p11",
      ["amos8#p11", "john-6#p26", "2-ne-9#p50", "2-ne-32#p3", "enos-1#p4"],
    ],
    ["p12", ["manual#figure7"]],
    ["p13", ["obad1#p21", "hinckley#title1"]],
    [
      "p15",
      [
        "jonah1#p1",
        "jonah2#p1",
        "jonah3#p1",
        "jonah4#p1",
        "mosiah-28#p1",
        "alma-17#p23",
      ],
    ],
    ["p28", ["mark-2#p3", "luke-23#p33", "john-8#p1"]],
  ] as const;
  const tracks = plan.days.flatMap((day) => [day.adultTasks, day.familyTasks]);
  for (const [anchor, targets] of chains) {
    const isInstruction = (task: (typeof tasks)[number]) =>
      task.units.includes(`manual#${anchor}`);
    const track = tracks.find((items) => items.some(isInstruction))!;
    assert.ok(track, anchor);
    const start = track.findIndex(isInstruction) + 1;
    targets.forEach((unit, i) =>
      assert.ok(track[start + i]?.units.includes(unit), `${anchor} → ${unit}`),
    );
  }
  const printedStory = plan.days[2].familyTasks.find((t) =>
    t.units.includes("manual#figure8"),
  )?.printEdition;
  assert.equal(printedStory?.pages, "167–170");
  assert.match(printedStory!.ko, /36618_kor\.pdf#page=176$/);
  assert.match(printedStory!.en, /36618_eng\.pdf#page=176$/);
});
