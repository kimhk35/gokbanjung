import test from "node:test";
import assert from "node:assert/strict";
import { parseMarkdown, plainText } from "../src/lib/markdown-lite";
import { pieces } from "../src/lib/text-marks";

test("block offsets match plainText", () => {
  const md =
    "# 제목\n\n첫 **굵은** 문단\n이어짐\n\n- 항목 [링크](https://x.example)";
  const plain = plainText(md);
  for (const b of parseMarkdown(md)) {
    const text = b.runs.map((r) => r.text).join("");
    assert.equal(plain.slice(b.start, b.start + text.length), text);
  }
  assert.equal(plain, "제목\n\n첫 굵은 문단 이어짐\n\n항목 링크");
});

test("marks split runs and keep formatting", () => {
  const [, block] = parseMarkdown("# 제목\n\n첫 **굵은** 문단");
  // block text "첫 굵은 문단" starts at offset 4
  const out = pieces(block, [
    { start: 6, end: 9, kind: "highlight", id: "h" },
    { start: 8, end: 11, kind: "note", id: "n1" },
  ]);
  assert.deepEqual(
    out.map((p) => [p.text, !!p.bold, p.highlight, p.notes.join(",")]),
    [
      ["첫 ", false, false, ""],
      ["굵은", true, true, ""],
      [" ", false, true, "n1"],
      ["문단", false, false, "n1"],
    ],
  );
});

test("marks outside the block are ignored", () => {
  const [block] = parseMarkdown("가나다");
  assert.deepEqual(
    pieces(block, [{ start: 10, end: 12, kind: "note", id: "x" }]).map(
      (p) => p.text,
    ),
    ["가나다"],
  );
});
