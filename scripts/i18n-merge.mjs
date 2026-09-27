// Turns translator files (<lang>-*.tsv: "index<TAB>text", \n for line breaks,
// index = position in src/i18n/catalog.json) into src/i18n/<lang>.json.
// Existing dictionary entries are kept unless a TSV line replaces them.
// Run: node scripts/i18n-merge.mjs <lang> <dir-with-tsv>
import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";

const [lang, dir] = process.argv.slice(2);
const catalog = JSON.parse(readFileSync("src/i18n/catalog.json", "utf8"));
const keys = Object.keys(catalog);
const out = existsSync(`src/i18n/${lang}.json`)
  ? JSON.parse(readFileSync(`src/i18n/${lang}.json`, "utf8"))
  : {};
for (const file of readdirSync(dir).filter(
  (f) => f.startsWith(lang + "-") && f.endsWith(".tsv"),
)) {
  for (const line of readFileSync(path.join(dir, file), "utf8").split(
    /\r?\n/,
  )) {
    const m = line.match(/^(\d+)\t(.*)$/);
    if (!m) continue;
    const key = keys[Number(m[1])];
    if (key === undefined) continue;
    // Editors trim edge spaces; restore the source's leading/trailing spaces.
    const lead = catalog[key].match(/^\s*/)[0];
    const trail = catalog[key].match(/\s*$/)[0];
    out[key] = lead + m[2].replace(/\\n/g, "\n").trim() + trail;
  }
}
const holes = (s) => (s.match(/\{[^}]+\}|\d+/g) || []).sort().join(",");
const missing = keys.filter((k) => !out[k]);
const mismatch = keys.filter(
  (k) => out[k] && holes(out[k]) !== holes(catalog[k]),
);
const ordered = Object.fromEntries(
  keys.filter((k) => out[k]).map((k) => [k, out[k]]),
);
writeFileSync(`src/i18n/${lang}.json`, JSON.stringify(ordered, null, 1) + "\n");
console.log(
  `${lang}: ${Object.keys(ordered).length}/${keys.length}, missing ${missing.length}, number mismatch ${mismatch.length}`,
);
for (const k of mismatch)
  console.log(
    "  ",
    keys.indexOf(k),
    JSON.stringify(catalog[k]),
    "=>",
    JSON.stringify(out[k]),
  );
