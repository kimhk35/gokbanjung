import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { contrast } from "../src/lib/contrast";

function tokens(css: string, selector: string) {
  const block = css.split(selector)[1].split("}")[0];
  return Object.fromEntries(
    [...block.matchAll(/--([a-z]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]]),
  );
}
test("contrast formula", () => {
  assert.equal(contrast("#000000", "#ffffff").toFixed(1), "21.0");
  assert.equal(contrast("#ffffff", "#ffffff").toFixed(1), "1.0");
});
test("theme text colors meet WCAG AA on their backgrounds", () => {
  const css = readFileSync("src/app/theme.css", "utf8");
  for (const sel of [":root {", ':root[data-theme="dark"] {']) {
    const t = tokens(css, sel);
    for (const [fg, bg] of [
      ["ink", "bg"],
      ["ink", "surface"],
      ["muted", "surface"],
      ["gold", "bg"],
      ["navy", "surface"],
    ])
      assert.ok(
        contrast(t[fg], t[bg]) >= 4.5,
        `${sel} ${fg} on ${bg}: ${contrast(t[fg], t[bg]).toFixed(2)}`,
      );
  }
  assert.equal(tokens(css, ":root {").bg, "#fbf7f0");
});
