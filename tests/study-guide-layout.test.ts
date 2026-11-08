import test from "node:test";
import assert from "node:assert/strict";
import {
  layoutStudyGuide,
  type GuideRect,
} from "../src/lib/study-guide-layout";

const intersects = (a: GuideRect, b: GuideRect) =>
  a.left < b.left + b.width &&
  a.left + a.width > b.left &&
  a.top < b.top + b.height &&
  a.top + a.height > b.top;
const onBorder = (point: { x: number; y: number }, rect: GuideRect) => {
  const epsilon = 0.000001;
  assert.ok(
    point.x >= rect.left - epsilon &&
      point.x <= rect.left + rect.width + epsilon,
  );
  assert.ok(
    point.y >= rect.top - epsilon &&
      point.y <= rect.top + rect.height + epsilon,
  );
  assert.ok(
    Math.min(
      Math.abs(point.x - rect.left),
      Math.abs(point.x - rect.left - rect.width),
      Math.abs(point.y - rect.top),
      Math.abs(point.y - rect.top - rect.height),
    ) < epsilon,
  );
};

const scenarios = [
  {
    width: 390,
    height: 844,
    targets: [
      { left: 56, top: 4, width: 120, height: 44 },
      { left: 8, top: 106, width: 80, height: 44 },
      { left: 8, top: 789, width: 100, height: 47 },
      { left: 217, top: 789, width: 165, height: 47 },
    ],
  },
  {
    width: 320,
    height: 568,
    targets: [
      { left: 8, top: 4, width: 100, height: 44 },
      { left: 8, top: 106, width: 80, height: 44 },
      { left: 8, top: 513, width: 100, height: 47 },
      { left: 147, top: 513, width: 165, height: 47 },
    ],
  },
  {
    width: 1280,
    height: 720,
    targets: [
      { left: 114, top: 4, width: 350, height: 44 },
      { left: 844, top: 60, width: 90, height: 44 },
      { left: 12, top: 669, width: 100, height: 44 },
      { left: 1105, top: 669, width: 160, height: 44 },
    ],
  },
  {
    width: 667,
    height: 375,
    targets: [
      { left: 56, top: 4, width: 230, height: 44 },
      { left: 8, top: 106, width: 80, height: 44 },
      { left: 8, top: 320, width: 100, height: 47 },
      { left: 494, top: 320, width: 165, height: 47 },
    ],
  },
];
const ids = ["day", "progress", "share", "next"];

for (const scenario of scenarios)
  test(`${scenario.width}×${scenario.height}: bounded nearby notes leave every control and other note unobscured`, () => {
    const width =
      scenario.width < 600 ? Math.min(220, (scenario.width - 36) / 2) : 240;
    const entries = scenario.targets.map((target, index) => ({
      id: ids[index],
      target,
      note: { width, height: [72, 88, 72, 88][index] },
    }));
    const result = layoutStudyGuide(scenario, entries);
    assert.deepEqual(
      result.map((item) => item.id),
      ids,
    );
    for (const [index, item] of result.entries()) {
      assert.ok(item.label.left >= 12 && item.label.top >= 12);
      assert.ok(item.label.left + item.label.width <= scenario.width - 12);
      assert.ok(item.label.top + item.label.height <= scenario.height - 12);
      assert.equal(item.label.width, width);
      assert.equal(item.label.height, entries[index].note.height);
      for (const target of scenario.targets)
        assert.equal(
          intersects(item.label, target),
          false,
          `${item.id} obscures a highlighted control`,
        );
      for (const other of result)
        if (item !== other)
          assert.equal(
            intersects(item.label, other.label),
            false,
            `${item.id} overlaps ${other.id}`,
          );
      onBorder(item.from, item.label);
      onBorder(item.to, entries[index].target);
      assert.ok(
        Math.hypot(item.from.x - item.to.x, item.from.y - item.to.y) < 250,
        `${item.id} is too far from its control`,
      );
    }
  });

test("667×375: the central dismiss control remains unobscured and does not create an extra spotlight", () => {
  const scenario = scenarios.find((item) => item.width === 667)!;
  const hint = Object.freeze({ left: 219, top: 165, width: 228, height: 44 });
  const entries = scenario.targets.map((target, index) => ({
    id: ids[index],
    target,
    note: { width: 240, height: 58 },
  }));
  const result = layoutStudyGuide(scenario, entries, [hint]);
  assert.deepEqual(
    result.map((item) => item.id),
    ids,
  );
  for (const item of result) {
    assert.equal(
      intersects(item.label, hint),
      false,
      `${item.id} obscures the dismiss control`,
    );
    assert.ok(item.label.left >= 12 && item.label.top >= 12);
    assert.ok(item.label.left + item.label.width <= scenario.width - 12);
    assert.ok(item.label.top + item.label.height <= scenario.height - 12);
    for (const target of scenario.targets)
      assert.equal(intersects(item.label, target), false);
    for (const other of result)
      if (item !== other)
        assert.equal(intersects(item.label, other.label), false);
  }
  assert.throws(
    () => layoutStudyGuide(scenario, entries, [{ ...hint, top: NaN }]),
    RangeError,
  );
});

test("oversized measured notes are clamped to the viewport even when non-overlap is impossible", () => {
  const result = layoutStudyGuide(
    { width: 320, height: 180 },
    ids.map((id) => ({
      id,
      target: { left: 0, top: 0, width: 320, height: 180 },
      note: { width: 600, height: 400 },
    })),
  );
  for (const item of result) {
    assert.deepEqual(item.label, {
      left: 12,
      top: 12,
      width: 296,
      height: 156,
    });
    assert.ok(
      [item.from.x, item.from.y, item.to.x, item.to.y].every(Number.isFinite),
    );
  }
});

test("layout is deterministic, handles absent targets and does not mutate DOM measurements", () => {
  assert.deepEqual(layoutStudyGuide({ width: 320, height: 568 }, []), []);
  const entries = [
    {
      id: "day",
      target: Object.freeze({ left: -5, top: 4, width: 120, height: 44 }),
      note: Object.freeze({ width: 142, height: 72 }),
    },
  ];
  const before = JSON.stringify(entries);
  assert.deepEqual(
    layoutStudyGuide({ width: 320, height: 568 }, entries),
    layoutStudyGuide({ width: 320, height: 568 }, entries),
  );
  assert.equal(JSON.stringify(entries), before);
});

test("invalid geometry fails explicitly instead of producing NaN CSS coordinates", () => {
  const viewport = { width: 390, height: 844 };
  const entry = {
    id: "day",
    target: { left: 56, top: 4, width: 120, height: 44 },
    note: { width: 177, height: 72 },
  };
  for (const value of [NaN, Infinity, -Infinity, 0, -1]) {
    assert.throws(
      () => layoutStudyGuide({ ...viewport, width: value }, [entry]),
      RangeError,
    );
    assert.throws(
      () =>
        layoutStudyGuide(viewport, [
          { ...entry, note: { ...entry.note, height: value } },
        ]),
      RangeError,
    );
  }
  for (const value of [NaN, Infinity, -Infinity])
    assert.throws(
      () =>
        layoutStudyGuide(viewport, [
          { ...entry, target: { ...entry.target, left: value } },
        ]),
      RangeError,
    );
  assert.throws(
    () =>
      layoutStudyGuide(viewport, [
        { ...entry, target: { ...entry.target, width: -1 } },
      ]),
    RangeError,
  );
});
