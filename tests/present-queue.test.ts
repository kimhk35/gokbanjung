import test from "node:test";
import assert from "node:assert/strict";
import { toggle, move, resolve, slides } from "../src/lib/present-queue";

test("queue add/remove/move", () => {
  assert.deepEqual(toggle([], "a"), ["a"]);
  assert.deepEqual(toggle(["a", "b"], "a"), ["b"]);
  assert.deepEqual(move(["a", "b", "c"], "c", -1), ["a", "c", "b"]);
  assert.deepEqual(move(["a", "b"], "a", -1), ["a", "b"]);
  assert.deepEqual(move(["a", "b"], "b", 1), ["a", "b"]);
  assert.deepEqual(move(["a", "b"], "zz", 1), ["a", "b"]);
});
test("deleted replies are skipped and order follows the queue", () => {
  const replies = [{ id: "a" }, { id: "c" }];
  assert.deepEqual(resolve(["c", "b", "a"], replies).map((r) => r.id), ["c", "a"]);
  assert.deepEqual(slides(resolve(["x"], replies)).map((s) => s.kind), ["question"]);
  assert.deepEqual(slides(resolve(["a"], replies)).map((s) => s.kind), ["question", "reply"]);
});
