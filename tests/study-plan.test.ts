import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  cfmPlan,
  getStudyPlan,
  hasStudyPlan,
  isStudyReaderPath,
  studyDayTitle,
  studyFamilyTitle,
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

test("registered weeks keep their own tasks, titles and progress denominators", () => {
  const next = getStudyPlan(44)!;
  assert.equal(getStudyPlan(43), cfmPlan);
  assert.equal(next.week, 44);
  assert.equal(next.dates, "2026-10-26/2026-11-01");
  assert.equal(hasStudyPlan(44), true);
  assert.equal(getStudyPlan(45), undefined);
  assert.deepEqual(studyTasks(1, "adult", 45), []);
  assert.equal(next.days.length, 7);
  const previousIds = cfmPlan.days
    .flatMap((d) => [...d.adultTasks, ...d.familyTasks])
    .map((t) => t.id);
  for (const day of next.days) {
    assert.ok(day.adultTasks.length > 0 && day.familyTasks.length > 0);
    assert.equal(studyTasks(day.day, "adult", 44), day.adultTasks);
    assert.equal(materialPercent(day.day, "adult", previousIds, 44).count, 0);
    assert.equal(
      materialPercent(
        day.day,
        "adult",
        day.adultTasks.map((t) => t.id),
        44,
      ).percent,
      100,
    );
    assert.notEqual(
      studyDayTitle(day, 44, true),
      studyDayTitle(cfmPlan.days[day.day - 1], 43, true),
    );
    assert.notEqual(
      studyFamilyTitle(day, 44),
      studyFamilyTitle(cfmPlan.days[day.day - 1], 43),
    );
  }
});

test("public reader shell follows the plan registry and keeps other routes in the existing flow", () => {
  for (const week of [43, 44])
    for (let day = 1; day <= 7; day++)
      assert.equal(isStudyReaderPath(`/week/${week}/day/${day}`), true);
  for (const path of [
    "/week/45/day/1",
    "/week/44/day/0",
    "/week/44/day/8",
    "/week/44/day/11",
    "/week/44",
    "/week/44/text",
  ])
    assert.equal(isStudyReaderPath(path), false, path);
  // usePathname omits the query. The page still applies its existing GuestGate
  // when view=notes, while the shell preserves the week 43 focused layout.
  assert.equal(
    isStudyReaderPath(
      new URL("https://example.test/week/43/day/1?view=notes").pathname,
    ),
    true,
  );
});

test("week 44 source URLs retain verified anchors instead of week 43 context offsets", () => {
  for (const day of getStudyPlan(44)!.days)
    for (const task of [...day.adultTasks, ...day.familyTasks]) {
      const start = new URL(studySourceUrl(task, "ko", false, 44));
      const end = new URL(studySourceUrl(task, "ko", true, 44));
      assert.equal(start.hash, task.anchor ? `#${task.anchor}` : "");
      const last = task.selectedIds.at(-1) || task.endAnchor;
      assert.equal(end.hash, last ? `#${last}` : "");
      assert.equal(
        start.searchParams.get("id"),
        task.selectedIds.join(",") || null,
      );
      assert.equal(end.searchParams.get("id"), start.searchParams.get("id"));
      if (task.sourceLanguageLocked)
        for (const lang of ["ko", "en", "es", "fil"] as const)
          assert.equal(studySourceLanguage(task, lang), task.sourceLang);
      if (task.path.endsWith("old-testament-2026/44"))
        assert.equal(new URL(studySourceUrl(task, "ko")).hash, start.hash);
    }
});
