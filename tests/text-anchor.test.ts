import test from "node:test";
import assert from "node:assert/strict";
import { makeAnchor, locate } from "../src/lib/text-anchor";

const text =
  "너희는 위로하라. 내 백성을 위로하라. 너희의 하나님이 말씀하시니라.";
const at = (t: string, s: string) => t.indexOf(s);

test("finds the same sentence, also after edits elsewhere", () => {
  const i = at(text, "내 백성을");
  const a = makeAnchor(text, i, i + "내 백성을 위로하라".length);
  assert.equal(a.exact, "내 백성을 위로하라");
  assert.deepEqual(locate(text, a), { start: i, end: i + a.exact.length });
  const edited = "[1절] " + text + " (추가된 문장)";
  const hit = locate(edited, a)!;
  assert.equal(edited.slice(hit.start, hit.end), "내 백성을 위로하라");
});

test("a repeated phrase resolves by its surrounding context", () => {
  const i = at(text, "위로하라.");
  const first = makeAnchor(text, i, i + 4); // first "위로하라"
  const j = text.indexOf("위로하라", i + 1);
  const second = makeAnchor(text, j, j + 4);
  assert.equal(locate(text, first)!.start, i);
  assert.equal(locate(text, second)!.start, j);
  const moved = "머리말. " + text;
  assert.equal(locate(moved, second)!.start, j + "머리말. ".length);
});

test("missing text returns null; bad ranges are rejected", () => {
  const a = makeAnchor(text, 0, 7);
  assert.equal(locate("완전히 다른 본문", a), null);
  assert.throws(() => makeAnchor(text, 5, 5));
  assert.throws(() => makeAnchor(text, -1, 3));
  assert.throws(() => makeAnchor(text, 0, text.length + 1));
});
