import test from "node:test";
import assert from "node:assert/strict";
import { kstDate, SITE_INFO } from "../src/lib/site-info";

test("build date is the Korea-time calendar date", () => {
  assert.equal(kstDate(new Date("2026-09-27T15:30:00Z")), "2026-09-28");
  assert.equal(kstDate(new Date("2026-09-27T14:59:00Z")), "2026-09-27");
});
test("credits, feedback address and copyright are defined in both languages", () => {
  assert.match(SITE_INFO.creators.ko, /김홍겸 형제/);
  assert.match(SITE_INFO.creators.ko, /박녹형 형제/);
  assert.equal(SITE_INFO.feedbackEmail, "kimhk35@ajou.ac.kr");
  assert.match(
    SITE_INFO.copyright.en,
    /The Church of Jesus Christ of Latter-day Saints/,
  );
});
