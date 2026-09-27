import test from "node:test";
import assert from "node:assert/strict";
import { parseChapter, sourceLangs } from "../src/lib/scripture-text";

const html = `<html><body><header><h1>Ignored</h1></header>
<p class="title-number" id="title_number1">제 3 장</p>
<p class="study-summary" id="study_summary1">리하이의 아들들이 <a href="x">놋쇠판</a>을 얻기 위해 돌아감.</p>
<p class="verse" data-aid="1" id="p1"><span class="verse-number">1 </span>이에 이렇게 되었나니<sup class="marker">a</sup> 나 니파이는</p>
<p class="verse" id="p2"><span class="verse-number">2 </span>&quot;보라&quot; 하시니라 &amp; 그리하여</p>
<script>alert(1)</script></body></html>`;

test("parses verses without numbers, footnote markers or markup", () => {
  const c = parseChapter(html);
  assert.equal(c.summary, "리하이의 아들들이 놋쇠판을 얻기 위해 돌아감.");
  assert.deepEqual(c.verses, [
    { verse: 1, text: "이에 이렇게 되었나니 나 니파이는" },
    { verse: 2, text: '"보라" 하시니라 & 그리하여' },
  ]);
});

test("language fallback order ends in English", () => {
  assert.deepEqual(sourceLangs("fil"), ["tgl", "eng"]);
  assert.deepEqual(sourceLangs("ko"), ["kor", "eng"]);
  assert.deepEqual(sourceLangs("en"), ["eng"]);
});
