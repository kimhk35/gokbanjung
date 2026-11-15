import test from "node:test";
import assert from "node:assert/strict";
import {
  materialPercent,
  studyRelatedTasks,
  studyTasks,
} from "../src/lib/cfm-study-plan";

test("related readings link to the exact existing day, track and source range", () => {
  const source = studyTasks(1, "adult", 46)[0];
  const target = studyTasks(6, "family", 46)[1];
  const [related] = studyRelatedTasks(
    { ...source, relatedTaskIds: [target.id] },
    46,
  );
  assert.equal(related.task.id, target.id);
  assert.equal(related.day, 6);
  assert.equal(related.track, "family");
  const url = new URL(related.href, "https://example.test");
  assert.equal(url.pathname, "/week/46/day/6");
  assert.equal(url.searchParams.get("source"), target.path);
  assert.equal(url.searchParams.get("anchor"), target.anchor);
  assert.equal(url.searchParams.get("track"), "family");
});

test("related readings ignore stale, repeated, self and other-week references", () => {
  const source = studyTasks(1, "adult", 46)[0];
  const target = studyTasks(2, "adult", 46)[2];
  const otherWeek = studyTasks(1, "adult", 44)[0];
  const related = studyRelatedTasks(
    {
      ...source,
      relatedTaskIds: [source.id, "removed", target.id, target.id, otherWeek.id],
    },
    46,
  );
  assert.deepEqual(related.map((item) => item.task.id), [target.id]);
  assert.deepEqual(studyRelatedTasks(source, 47), []);
});

test("reference navigation does not add completion requirements or change allocation", () => {
  const tasks = studyTasks(1, "adult", 46);
  const before = JSON.stringify(tasks);
  const stats = materialPercent(1, "adult", [], 46);
  studyRelatedTasks(
    { ...tasks[0], relatedTaskIds: [studyTasks(2, "adult", 46)[0].id] },
    46,
  );
  assert.equal(JSON.stringify(studyTasks(1, "adult", 46)), before);
  assert.deepEqual(materialPercent(1, "adult", [], 46), stats);
});
