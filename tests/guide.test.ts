import test from "node:test";
import assert from "node:assert/strict";
import { initialLang } from "../src/lib/lang";
import { GUIDE, guideText } from "../src/data/guide";
import { renderGuideHtml } from "../scripts/guide-html";

test("first visit follows the device language; a saved choice always wins", () => {
  assert.equal(initialLang(null, ["ko-KR", "en-US"]), "ko");
  assert.equal(initialLang(null, ["en-US", "ko"]), "en");
  assert.equal(initialLang(null, ["ja-JP"]), "en");
  assert.equal(initialLang(null, []), "ko");
  assert.equal(initialLang("ko", ["en-US"]), "ko");
  assert.equal(initialLang("en", ["ko-KR"]), "en");
  assert.equal(initialLang("fr", ["ko-KR"]), "ko");
});

test("every guide text exists in both Korean and English", () => {
  assert.ok(GUIDE.length >= 8);
  const ids = new Set<string>();
  for (const section of GUIDE) {
    assert.ok(!ids.has(section.id), `duplicate id ${section.id}`);
    ids.add(section.id);
    for (const text of guideText(section)) {
      assert.ok(text.ko.trim(), `${section.id}: missing Korean`);
      assert.ok(text.en.trim(), `${section.id}: missing English`);
    }
  }
  for (const id of [
    "start",
    "think",
    "ward",
    "home-screen",
    "deploy",
    "db-update",
    "managers",
    "errors",
    "other-languages",
    "daily-insight",
    "cards",
    "verse-notes",
    "text-notes",
    "app-install",
    "present",
    "upload-text",
    "insight-edit",
  ])
    assert.ok(ids.has(id), `missing section ${id}`);
});

test("standalone manual carries both languages and switches automatically", () => {
  const html = renderGuideHtml();
  assert.match(html, /<html lang="ko">/);
  assert.match(html, /data-set-lang="ko"/);
  assert.match(html, /data-set-lang="en"/);
  assert.match(html, /data-set-lang="es"/);
  assert.match(html, /data-set-lang="fil"/);
  assert.match(html, /navigator\.languages/);
  assert.ok(
    html.includes(GUIDE[0].title.ko) && html.includes(GUIDE[0].title.en),
  );
  assert.doesNotMatch(html, /<script[^>]+src=/, "no external scripts");
  assert.doesNotMatch(html, /<script>[^]*<script>/, "single inline script");
});
