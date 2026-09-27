import test from "node:test";
import assert from "node:assert/strict";
import { authorLabel } from "../src/lib/author-label";
import { translate } from "../src/lib/i18n";

const tFor = (lang: "ko" | "en" | "es" | "fil") => (ko: string, en: string) =>
  translate(lang, ko, en);

test("the stored anonymous name is shown in the reader's language", () => {
  assert.equal(authorLabel("익명", tFor("ko")), "익명");
  assert.equal(authorLabel("익명", tFor("en")), "Anonymous");
  assert.equal(authorLabel("익명", tFor("es")), "Anónimo");
  assert.equal(authorLabel("익명", tFor("fil")), "Anonymous");
});

test("real names are shown unchanged", () => {
  assert.equal(authorLabel("Sarah", tFor("en")), "Sarah");
  assert.equal(authorLabel("박자매", tFor("en")), "박자매");
});
