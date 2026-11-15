import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  getStudyPlan,
  materialPercent,
  studySourceEdition,
  studySourceLanguage,
  studySourceNoteUrl,
  studySourceUrl,
} from "../src/lib/cfm-study-plan";
import { verifiedEnglishSource } from "../src/lib/study-source-editions";
import { resolveStudyReaderPosition } from "../src/lib/study-reader-position";

type Source = {
  id: string;
  path: string;
  lang: string;
  scope: string;
  htmlSha256: string;
  units: {
    anchor: string;
    note: boolean;
    noteOwners: string[];
    verseNumbers: number[];
    sha256: string;
  }[];
};

for (const week of [44, 46, 47]) {
  const sources: Source[] = JSON.parse(
    readFileSync(`docs/study/2026-english-${week}-sources.json`, "utf8"),
  );
  const canonical: Source[] = JSON.parse(
    readFileSync(`docs/study/2026-week-${week}-sources.json`, "utf8"),
  );
  const plan = getStudyPlan(week)!;
  const tasks = plan.days.flatMap((day) => [
    ...day.adultTasks,
    ...day.familyTasks,
  ]);

  test(`week ${week}: every assigned material opens an audited English range and its own notes`, () => {
    const bodies: string[] = [];
    const notes: string[] = [];
    for (const task of tasks) {
      const source = sources.find((item) => item.id === task.sourceId)!;
      assert.ok(source, task.id);
      assert.equal(source.lang, "eng");
      assert.match(source.htmlSha256, /^[a-f0-9]{64}$/);
      const variant = verifiedEnglishSource(task);
      assert.ok(variant, `${task.id}: missing or stale English range`);
      const edition = studySourceEdition(task, "en");
      const start = new URL(studySourceUrl(task, "en", false, week));
      const end = new URL(studySourceUrl(task, "en", true, week));
      assert.equal(start.origin, "https://www.churchofjesuschrist.org");
      assert.equal(start.pathname, source.path);
      assert.equal(start.searchParams.get("lang"), "eng");
      assert.equal(
        start.searchParams.get("id"),
        edition.selectedIds.join(",") || null,
      );
      assert.equal(end.searchParams.get("id"), start.searchParams.get("id"));
      assert.equal(start.hash, edition.anchor ? `#${edition.anchor}` : "");
      assert.equal(end.hash, edition.endAnchor ? `#${edition.endAnchor}` : "");
      assert.equal(edition.anchor, edition.selectedIds[0] || "");
      assert.equal(edition.endAnchor, edition.selectedIds.at(-1) || "");
      assert.doesNotMatch(edition.label, /[가-힣]/);
      if (edition.readingNote)
        assert.doesNotMatch(edition.readingNote, /[가-힣]/);
      for (const anchor of edition.selectedIds) {
        const unit = source.units.find((unit) => unit.anchor === anchor);
        assert.ok(unit && !unit.note, `${task.id}: ${anchor}`);
        assert.match(unit.sha256, /^[a-f0-9]{64}$/);
        // Video-only metadata can be selected for context, but is not a transcript.
        if (!/metadata only/i.test(source.scope))
          bodies.push(`${source.path}#${anchor}`);
      }
      for (const note of edition.noteLinks) {
        const unit = source.units.find((unit) => unit.anchor === note.note);
        assert.ok(unit?.note && unit.noteOwners.includes(note.owner));
        assert.ok(edition.selectedIds.includes(note.owner));
        const url = new URL(studySourceNoteUrl(task, note, "en", week));
        assert.equal(url.pathname, source.path);
        assert.equal(url.searchParams.get("lang"), "eng");
        assert.equal(url.searchParams.get("id"), note.owner);
        assert.equal(url.hash, `#${note.owner}`);
        notes.push(`${source.path}#${note.note}`);
      }
    }
    assert.equal(
      new Set(bodies).size,
      bodies.length,
      "no repeated reading body across days/tracks",
    );
    assert.equal(
      new Set(notes).size,
      notes.length,
      "each English note has one assigned owner",
    );
    const expectedBodies = sources.flatMap((source) =>
      /metadata only/i.test(source.scope)
        ? []
        : source.units
            .filter(
              (unit) =>
                !unit.note &&
                !["reference1", "short_reference1"].includes(unit.anchor),
            )
            .map((unit) => `${source.path}#${unit.anchor}`),
    );
    const expectedNotes = sources.flatMap((source) =>
      source.units
        .filter((unit) => unit.note && unit.noteOwners.length)
        .map((unit) => `${source.path}#${unit.anchor}`),
    );
    assert.deepEqual(
      bodies.toSorted(),
      expectedBodies.toSorted(),
      "complete audited English body scope",
    );
    assert.deepEqual(
      notes.toSorted(),
      expectedNotes.toSorted(),
      "complete audited English note scope",
    );
  });

  test(`week ${week}: English scriptures retain the same logical verses despite merged Korean paragraphs`, () => {
    for (const original of canonical.filter((source) =>
      source.units.some((unit) => unit.verseNumbers.length),
    )) {
      const english = sources.find((source) => source.id === original.id)!;
      const sourceTasks = tasks.filter((task) => task.sourceId === original.id);
      for (const task of sourceTasks) {
        const expected = task.sourceIds.flatMap(
          (anchor) =>
            original.units.find((unit) => unit.anchor === anchor)!.verseNumbers,
        );
        const actual = studySourceEdition(task, "en").selectedIds.flatMap(
          (anchor) =>
            english.units.find((unit) => unit.anchor === anchor)!.verseNumbers,
        );
        assert.deepEqual(
          actual.toSorted((a, b) => a - b),
          expected.toSorted((a, b) => a - b),
          task.id,
        );
      }
      const assigned = sourceTasks.flatMap(
        (task) => studySourceEdition(task, "en").selectedIds,
      );
      const englishVerses = assigned.flatMap(
        (anchor) =>
          english.units.find((unit) => unit.anchor === anchor)!.verseNumbers,
      );
      assert.deepEqual(
        englishVerses.toSorted((a, b) => a - b),
        original.units
          .flatMap((unit) => unit.verseNumbers)
          .toSorted((a, b) => a - b),
        original.id,
      );
    }
  });

  test(`week ${week}: language changes preserve canonical tasks, progress and saved positions`, () => {
    for (const day of plan.days) {
      for (const track of ["adult", "family"] as const) {
        const list = track === "adult" ? day.adultTasks : day.familyTasks;
        const before = JSON.stringify(list);
        const completed = list.slice(0, 2).map((task) => task.id);
        const percent = materialPercent(day.day, track, completed, week);
        const saved = resolveStudyReaderPosition(list, { completed });
        for (const task of list) {
          const edition = studySourceEdition(task, "en");
          assert.equal(edition.id, task.id);
          assert.deepEqual(edition.units, task.units);
          assert.equal(studySourceEdition(task, "ko"), task);
          assert.equal(studySourceLanguage(task, "ko"), task.sourceLang);
        }
        assert.equal(JSON.stringify(list), before);
        assert.deepEqual(
          materialPercent(day.day, track, completed, week),
          percent,
        );
        assert.deepEqual(
          resolveStudyReaderPosition(list, { saved, completed }),
          saved,
        );
      }
    }
  });
}
