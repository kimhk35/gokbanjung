import test from "node:test";
import assert from "node:assert/strict";
import { wrapLines } from "../src/lib/card-text";

const m = (s: string) => s.length * 10;
test("wraps by words and characters", () => {
  assert.deepEqual(wrapLines(m, "aa bb cc", 50, 5), ["aa bb", "cc"]);
  assert.deepEqual(wrapLines(m, "가나다라마바사", 30, 5), ["가나다", "라마바", "사"]);
  assert.deepEqual(wrapLines(m, "줄1\n줄2", 100, 5), ["줄1", "줄2"]);
  assert.deepEqual(wrapLines(m, "", 100, 5), []);
});
test("truncates with an ellipsis inside the width", () => {
  const lines = wrapLines(m, "x".repeat(100), 50, 2);
  assert.equal(lines.length, 2);
  assert.ok(lines[1].endsWith("…"));
  assert.ok(lines.every((l) => m(l) <= 50));
  const words = wrapLines(m, "one two three four five six", 90, 2);
  assert.equal(words.length, 2);
  assert.ok(words[1].endsWith("…") && m(words[1]) <= 90);
});
