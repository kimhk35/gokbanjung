import test from "node:test";
import assert from "node:assert/strict";
import { dayKey, timeKey, toISO, monthRange, onDay, ORGANIZATION_IDS } from "../src/lib/ward-model";

test("KST conversions", () => {
  assert.equal(toISO("2026-10-04", "10:00"), "2026-10-04T01:00:00.000Z");
  assert.equal(dayKey("2026-09-30T23:00:00.000Z"), "2026-10-01");
  assert.equal(timeKey("2026-09-30T23:00:00.000Z"), "08:00");
  assert.throws(() => toISO("2026-02-30", "10:00"), /invalid_time/);
  assert.throws(() => toISO("2026-10-04", "24:00"), /invalid_time/);
});

test("month range is KST midnight to KST midnight", () => {
  assert.deepEqual(monthRange(2026, 9), {
    start: "2026-09-30T15:00:00.000Z",
    end: "2026-10-31T15:00:00.000Z",
  });
  assert.deepEqual(monthRange(2026, 11).end, "2026-12-31T15:00:00.000Z");
  assert.throws(() => monthRange(2026, 12));
});

test("an overnight event appears on both days, not on the next-next day", () => {
  const ev = { starts_at: toISO("2026-10-09", "20:00"), ends_at: toISO("2026-10-10", "08:00") };
  assert.equal(onDay(ev, "2026-10-09"), true);
  assert.equal(onDay(ev, "2026-10-10"), true);
  assert.equal(onDay(ev, "2026-10-11"), false);
  const endsAtMidnight = { starts_at: toISO("2026-10-09", "20:00"), ends_at: toISO("2026-10-10", "00:00") };
  assert.equal(onDay(endsAtMidnight, "2026-10-10"), false);
});

test("organization ids are fixed", () => {
  assert.deepEqual([...ORGANIZATION_IDS], ["all", "primary", "relief", "elders", "youth", "sunday-school"]);
});
