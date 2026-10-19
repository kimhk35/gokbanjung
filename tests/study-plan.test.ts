import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  cfmPlan,
  studySourceLanguage,
  studySourceUrl,
  studyTasks,
  materialPercent,
} from "../src/lib/cfm-study-plan";

test("approved whole-source inventory remains assigned once across seven days", () => {
  const units = cfmPlan.days.flatMap((d) =>
    [...d.adultTasks, ...d.familyTasks].flatMap((t) => t.units),
  );
  assert.equal(units.length, 1117);
  assert.equal(
    new Set(units).size,
    1117,
    "a source unit must not silently replace another day’s range",
  );
  assert.equal(new Set(units.map((u) => u.split("#")[0])).size, 25);
  assert.deepEqual(
    cfmPlan.days.map((d) => [
      d.adultTasks.flatMap((t) => t.units).length,
      d.familyTasks.flatMap((t) => t.units).length,
    ]),
    [
      [172, 6],
      [138, 13],
      [143, 3],
      [160, 0],
      [180, 3],
      [151, 9],
      [133, 6],
    ],
  );
  assert.equal(cfmPlan.days.flatMap((d) => d.adultTasks).length, 67);
  assert.ok(cfmPlan.days.every((d) => d.familyTasks.length > 0));
  // The audited CSV predates the React reader. Its final seven fields contain
  // no commas (quoted document titles may); compare exact ownership, not counts.
  const inventory = readFileSync(
    "docs/study/2026-week-43-source-inventory.csv",
    "utf8",
  )
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .map((line) => {
      const [anchor, day, track, , , task, path] = line.split(",").slice(-7);
      return `${path}#${anchor}:${day}:${track}:${task}`;
    })
    .sort();
  const assigned = cfmPlan.days
    .flatMap((d) =>
      (["adult", "family"] as const).flatMap((track) =>
        studyTasks(d.day, track).flatMap((task) =>
          task.units.map(
            (unit) =>
              `${task.path}#${unit.split("#")[1]}:${d.day}:${track}:${task.id}`,
          ),
        ),
      ),
    )
    .sort();
  assert.deepEqual(
    assigned,
    inventory,
    "exact source positions and daily ownership must match the approved inventory",
  );
});
test("start/end preserve all blue selections in each supported language", () => {
  for (const d of cfmPlan.days)
    for (const task of [...d.adultTasks, ...d.familyTasks])
      for (const lang of ["ko", "en", "es", "fil"] as const) {
        const start = new URL(studySourceUrl(task, lang)),
          end = new URL(studySourceUrl(task, lang, true));
        assert.equal(start.origin, "https://www.churchofjesuschrist.org");
        assert.equal(start.searchParams.get("id"), end.searchParams.get("id"));
        assert.equal(
          start.searchParams.get("id"),
          task.selectedIds.join(",") || null,
        );
        assert.equal(
          start.searchParams.get("lang"),
          studySourceLanguage(task, lang),
        );
      }
  assert.ok(studyTasks(1, "adult")[0].selectedIds.includes("p6"));
  assert.ok(!studyTasks(1, "adult")[0].selectedIds.includes("p7"));
  assert.ok(studyTasks(2, "adult")[0].selectedIds.includes("p7"));
  assert.ok(studyTasks(7, "family")[0].selectedIds.includes("p25"));
  const dynamic = studyTasks(5, "adult").find((t) =>
    t.selectedIds.some((id) => /^p_/.test(id)),
  )!;
  assert.equal(
    new URL(studySourceUrl(dynamic, "en")).searchParams.get("lang"),
    "kor",
  );
});
test("study percentages count confirmed materials, independent of optional replies or family tasks", () => {
  const first = studyTasks(1, "adult");
  assert.equal(materialPercent(1, "adult", [first[0].id, "forged"]).count, 1);
  assert.equal(
    materialPercent(
      1,
      "adult",
      first.map((t) => t.id),
    ).percent,
    100,
  );
  assert.equal(
    materialPercent(
      1,
      "family",
      first.map((t) => t.id),
    ).percent,
    0,
  );
});
