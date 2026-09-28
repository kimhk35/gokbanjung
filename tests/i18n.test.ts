import test from "node:test";
import assert from "node:assert/strict";
import { translate, baseLang, localeOf, churchLangCode } from "../src/lib/i18n";
import { initialLang } from "../src/lib/lang";

const dict = { es: { "와드 일정": "Calendario del barrio" }, fil: {} };
test("translation falls back to English, never Korean or blank", () => {
  assert.equal(translate("es", "와드 일정", "Ward calendar", dict), "Calendario del barrio");
  assert.equal(translate("fil", "와드 일정", "Ward calendar", dict), "Ward calendar");
  assert.equal(translate("es", "바뀐 문장", "Changed sentence", dict), "Changed sentence");
  assert.equal(translate("ko", "와드 일정", "Ward calendar", dict), "와드 일정");
  assert.equal(translate("en", "와드 일정", "Ward calendar", dict), "Ward calendar");
});
test("base language, locale and church codes", () => {
  assert.equal(baseLang("fil"), "en");
  assert.equal(baseLang("ko"), "ko");
  assert.equal(localeOf("es"), "es-ES");
  assert.equal(localeOf("fil"), "fil-PH");
  assert.equal(churchLangCode("fil"), "tgl");
  assert.equal(churchLangCode("es"), "spa");
});
test("device language picks one of the four", () => {
  assert.equal(initialLang(null, ["es-MX"]), "es");
  assert.equal(initialLang(null, ["tl-PH"]), "fil");
  assert.equal(initialLang(null, ["fil"]), "fil");
  assert.equal(initialLang(null, ["ja", "es"]), "es");
  assert.equal(initialLang("fil", ["ko"]), "fil");
  assert.equal(initialLang(null, ["ko-KR"]), "ko");
  assert.equal(initialLang(null, ["de"]), "en");
});
test("sentences with blanks are looked up by their pattern, then filled", () => {
  const d = { es: { "문항 {n}개를 가져왔어요": "Se importaron {n} preguntas" }, fil: {} };
  assert.equal(translate("es", "문항 {n}개를 가져왔어요", "Imported {n} questions", d, { n: 3 }), "Se importaron 3 preguntas");
  assert.equal(translate("fil", "문항 {n}개를 가져왔어요", "Imported {n} questions", d, { n: 3 }), "Imported 3 questions");
  assert.equal(translate("ko", "문항 {n}개를 가져왔어요", "Imported {n} questions", d, { n: 3 }), "문항 3개를 가져왔어요");
  // A value that itself contains braces is inserted as-is, not re-filled.
  assert.equal(translate("en", "{a} and {b}", "{a} and {b}", d, { a: "{b}", b: "x" }), "{b} and x");
  // Unknown blanks stay visible so a mistake is noticed.
  assert.equal(translate("en", "{a}", "{a} {z}", d, { a: 1 }), "1 {z}");
});
