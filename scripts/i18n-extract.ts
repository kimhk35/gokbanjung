// Builds src/i18n/catalog.json (Korean source → English) from every string
// the UI can show through t()/tl(): t("ko","en") and L("ko","en") calls,
// translate(lang, "ko", "en") calls, ["ko", "en"] pairs, { ko: "…", en: "…" }
// object literals, and ko/en data files. Blanks like {n} stay in the key.
// Run: npm run i18n:extract   (prints template-literal calls it cannot key)
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import curriculum from "../src/data/curriculum.json";
import backgrounds from "../src/data/card-backgrounds.json";
import { scriptureBooks, collections } from "../src/lib/scriptures";
import { ORGANIZATIONS } from "../src/lib/ward-model";
import { questionTopics } from "../src/data/question-topics";

const catalog = new Map<string, string>();
const dynamic: string[] = [];
const add = (ko: unknown, en: unknown) => {
  if (typeof ko !== "string" || typeof en !== "string") return;
  if (!ko.trim() || ko === en || !/[가-힣]/.test(ko)) return;
  catalog.set(ko, en);
};
const text = (n: ts.Node | undefined) =>
  n && (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n))
    ? n.text
    : undefined;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return files(full);
    return /\.(ts|tsx)$/.test(name) ? [full] : [];
  });
}

for (const file of files("src")) {
  const source = ts.createSourceFile(
    file,
    readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && node.arguments.length >= 2) {
      const callee = node.expression;
      const name = ts.isIdentifier(callee)
        ? callee.text
        : ts.isPropertyAccessExpression(callee)
          ? callee.name.text
          : "";
      if (name === "t" || name === "L" || name === "translate") {
        const [a, b] =
          name === "translate" ? node.arguments.slice(1) : node.arguments;
        if (!a || !b) {
          // translate(lang, ...pair): the pair itself is extracted as an array.
        } else if (text(a) !== undefined && text(b) !== undefined)
          add(text(a), text(b));
        else if (ts.isTemplateExpression(a) || ts.isTemplateExpression(b))
          dynamic.push(
            `${file}:${source.getLineAndCharacterOfPosition(node.getStart()).line + 1}`,
          );
      }
    }
    // ["한국어", "English"] pairs (label tables, sentence patterns).
    if (ts.isArrayLiteralExpression(node) && node.elements.length === 2)
      add(text(node.elements[0]), text(node.elements[1]));
    if (ts.isObjectLiteralExpression(node)) {
      const props = new Map<string, ts.Node>();
      for (const p of node.properties)
        if (
          ts.isPropertyAssignment(p) &&
          (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name))
        )
          props.set(p.name.text, p.initializer);
      if (props.has("ko") && props.has("en"))
        add(text(props.get("ko")), text(props.get("en")));
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
}

type L10n = { ko: string; en: string } | null | undefined;
const pair = (l: L10n) => l && add(l.ko, l.en);
for (const w of curriculum as unknown as Record<string, L10n>[]) {
  pair(w.title);
  pair(w.reference);
  pair(w.sourceNote);
  pair(w.translationLabel);
}
for (const b of backgrounds) add(b.ko, b.en);
for (const b of scriptureBooks) add(b.ko, b.en);
for (const c of Object.values(collections)) add(c.ko, c.en);
for (const [, ko, en] of ORGANIZATIONS) add(ko, en);
for (const [theme, themeEn, question, questionEn] of questionTopics) {
  add(theme, themeEn);
  add(question, questionEn);
}

const sorted = Object.fromEntries(
  [...catalog.entries()].sort(([a], [b]) => a.localeCompare(b, "ko")),
);
writeFileSync("src/i18n/catalog.json", JSON.stringify(sorted, null, 1) + "\n");
console.log(`catalog: ${catalog.size} strings`);
if (dynamic.length)
  console.log(
    `template-literal t() calls (English fallback for es/fil):\n  ${dynamic.join("\n  ")}`,
  );
