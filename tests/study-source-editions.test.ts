import test from "node:test";
import assert from "node:assert/strict";
import {
  verifiedEnglishSource,
  type EnglishStudyEdition,
} from "../src/lib/study-source-editions";

const task = {
  id: "example",
  path: "/study/scriptures/ot/jer/32",
  sourceLang: "kor",
  anchor: "p3",
  endAnchor: "p10",
  selectedIds: ["p3", "p6", "p7", "p8", "p9", "p10"],
};
const edition: EnglishStudyEdition = {
  original: { ...task },
  path: task.path,
  anchor: "p3",
  endAnchor: "p10",
  selectedIds: ["p3", "p4", "p5", "p6", "p7", "p8", "p9", "p10"],
  noteLinks: [{ note: "note3a_p1", owner: "p3" }],
};

test("a verified translation can expand a combined Korean verse paragraph without modifying its owner", () => {
  const before = JSON.stringify(task);
  const translated = verifiedEnglishSource(task, edition)!;
  assert.ok(translated.selectedIds.includes("p4"));
  assert.ok(translated.selectedIds.includes("p5"));
  assert.equal(JSON.stringify(task), before);
});

test("stale translations are rejected when any canonical reading boundary changes", () => {
  for (const changed of [
    { ...task, path: "/study/scriptures/ot/jer/33" },
    { ...task, sourceLang: "eng" },
    { ...task, anchor: "p6" },
    { ...task, endAnchor: "p11" },
    { ...task, selectedIds: ["p3", "p7", "p8", "p9", "p10"] },
    { ...task, selectedIds: task.selectedIds.toReversed() },
  ]) {
    assert.equal(verifiedEnglishSource(changed, edition), undefined);
  }
});

test("a missing translation does not claim that the source is verified in English", () => {
  assert.equal(verifiedEnglishSource(task), undefined);
});
