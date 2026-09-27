import test from "node:test";
import assert from "node:assert/strict";
import catalog from "../src/i18n/catalog.json";
import es from "../src/i18n/es.json";
import fil from "../src/i18n/fil.json";

// Numbers and {placeholders} must survive translation unchanged.
const holes = (s: string) =>
  (s.match(/\{[^}]+\}|\d+/g) || []).sort().join(",");

test("every source string has Spanish and Filipino translations", () => {
  const source = catalog as Record<string, string>;
  const keys = Object.keys(source);
  assert.ok(keys.length > 800, `catalog too small: ${keys.length}`);
  for (const [name, dict] of [
    ["es", es],
    ["fil", fil],
  ] as const)
    for (const k of keys) {
      const v = (dict as Record<string, string>)[k];
      assert.ok(v && v.trim(), `${name} missing: ${k}`);
      assert.equal(holes(v), holes(source[k]), `${name} numbers differ: ${k}`);
      const edges = (x: string) =>
        `${x.match(/^\s*/)![0]}|${x.match(/\s*$/)![0]}|${x.includes("
")}`;
      assert.equal(edges(v), edges(source[k]), `${name} spacing differs: ${k}`);
    }
});
