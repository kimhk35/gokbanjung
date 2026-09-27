// Builds the co-developer report from scripts/report/content.ts:
//   DOCX · HWPX (kordoc) · single-page HTML. PDF comes from the DOCX via Word:
//   powershell -File scripts/manual/convert.ps1 -Folder "개발보고서(공동개발자용)"
// Run: node --import tsx scripts/report/build.mts
import { mkdirSync, writeFileSync } from "node:fs";
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  HeadingLevel,
  LevelFormat,
  Packer,
  PageBreak,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableOfContents,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { markdownToHwpx } from "kordoc";
import { kstDate, SITE_INFO } from "../../src/lib/site-info";
import { BLOCKS, REPORT, type Block } from "./content";

const OUT = "개발보고서(공동개발자용)";
const NAME = "곡반정와드_공동개발자_보고서";
const DATE = kstDate(new Date());
const COVER = [
  `작성 · ${SITE_INFO.creators.ko}`,
  `작성일 · ${DATE}`,
  `사이트 · ${REPORT.site}`,
  `저장소 · ${REPORT.repo}`,
  `문의 · ${SITE_INFO.feedbackEmail}`,
];
const TEAL = "12706D",
  AMBER = "9A5F12",
  SOFT = "F3ECDF",
  FONT = "맑은 고딕";

// ---------- DOCX ----------
let listInstance = 0;
function docxBlock(b: Block): (Paragraph | Table)[] {
  if ("h1" in b) return [new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: true, children: [new TextRun(b.h1)] })];
  if ("h2" in b) return [new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(b.h2)] })];
  if ("p" in b) return [new Paragraph({ children: [new TextRun(b.p)] })];
  if ("ul" in b) return b.ul.map((t) => new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun(t)] }));
  if ("ol" in b) {
    const instance = ++listInstance;
    return b.ol.map((t) => new Paragraph({ numbering: { reference: "steps", level: 0, instance }, children: [new TextRun(t)] }));
  }
  if ("note" in b)
    return [
      new Paragraph({
        shading: { type: ShadingType.CLEAR, fill: SOFT, color: "auto" },
        border: { left: { style: BorderStyle.SINGLE, size: 18, color: AMBER, space: 8 } },
        spacing: { before: 120, after: 160 },
        children: [new TextRun({ text: b.note, color: "233A3A" })],
      }),
    ];
  if ("code" in b) return [new Paragraph({ children: [new TextRun({ text: b.code, font: "Consolas", size: 19 })] })];
  const { head, rows } = b.table;
  const widths = b.table.widths ?? head.map(() => Math.floor(9638 / head.length));
  const total = widths.reduce((a, w) => a + w, 0);
  const cell = (text: string, isHead: boolean, i: number) =>
    new TableCell({
      width: { size: widths[i], type: WidthType.DXA },
      shading: isHead ? { type: ShadingType.CLEAR, fill: TEAL, color: "auto" } : undefined,
      margins: { top: 60, bottom: 60, left: 100, right: 100 },
      children: [new Paragraph({ spacing: { after: 0, line: 280 }, children: [new TextRun({ text, bold: isHead, size: 19, color: isHead ? "FFFFFF" : undefined })] })],
    });
  return [
    new Table({
      width: { size: total, type: WidthType.DXA },
      columnWidths: widths,
      rows: [
        new TableRow({ tableHeader: true, children: head.map((h, i) => cell(h, true, i)) }),
        ...rows.map((r) => new TableRow({ children: r.map((c, i) => cell(c, false, i)) })),
      ],
    }),
    new Paragraph({ spacing: { after: 60 }, children: [] }),
  ];
}
function docx() {
  const cover = [
    new Paragraph({ spacing: { before: 2400 }, children: [] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: REPORT.title, bold: true, size: 48, color: TEAL })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 240 }, children: [new TextRun({ text: REPORT.subtitle, size: 26, color: AMBER })] }),
    ...COVER.map((line, i) => new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: i ? 60 : 1000 }, children: [new TextRun({ text: line, size: 21, color: "233A3A" })] })),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 400 }, children: [new TextRun({ text: SITE_INFO.copyright.ko, size: 17, color: "67716C" })] }),
    new Paragraph({ children: [new PageBreak()] }),
    new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("목차")] }),
    new TableOfContents("목차", { hyperlink: true, headingStyleRange: "1-2" }),
  ];
  return new Document({
    creator: SITE_INFO.creators.ko,
    title: REPORT.title,
    styles: {
      default: { document: { run: { font: FONT, size: 21 }, paragraph: { spacing: { line: 312, after: 100 } } } },
      paragraphStyles: [
        { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 32, bold: true, color: TEAL, font: FONT }, paragraph: { spacing: { before: 120, after: 200 }, outlineLevel: 0 } },
        { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 25, bold: true, color: "233A3A", font: FONT }, paragraph: { spacing: { before: 280, after: 120 }, outlineLevel: 1 } },
      ],
    },
    numbering: {
      config: [
        { reference: "steps", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 360 } } } }] },
        { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 360 } } } }] },
      ],
    },
    sections: [
      {
        properties: { page: { margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
        footers: {
          default: new Footer({
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [REPORT.title + " · ", PageNumber.CURRENT], size: 17, color: "67716C" })] })],
          }),
        },
        children: [...cover, ...BLOCKS.flatMap(docxBlock)],
      },
    ],
  });
}

// ---------- Markdown → HWPX ----------
function markdown() {
  const md = [`# ${REPORT.title}`, "", REPORT.subtitle, "", ...COVER.flatMap((l) => [l, ""]), SITE_INFO.copyright.ko, ""];
  for (const b of BLOCKS) {
    if ("h1" in b) md.push(`# ${b.h1}`, "");
    else if ("h2" in b) md.push(`## ${b.h2}`, "");
    else if ("p" in b) md.push(b.p, "");
    else if ("ul" in b) md.push(...b.ul.map((t) => `- ${t}`), "");
    else if ("ol" in b) md.push(...b.ol.map((t, i) => `${i + 1}. ${t}`), "");
    else if ("note" in b) md.push(`> ${b.note}`, "");
    else if ("code" in b) md.push("```", b.code, "```", "");
    else {
      const row = (cells: string[]) => `| ${cells.map((c) => c.replace(/\|/g, "/")).join(" | ")} |`;
      md.push(row(b.table.head), `|${b.table.head.map(() => " --- ").join("|")}|`, ...b.table.rows.map(row), "");
    }
  }
  return md.join("\n");
}

// ---------- HTML ----------
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
function html() {
  const toc: string[] = [];
  let n = 0;
  const body = BLOCKS.map((b) => {
    if ("h1" in b) {
      toc.push(`<li><a href="#s${++n}">${esc(b.h1)}</a></li>`);
      return `<h2 id="s${n}">${esc(b.h1)}</h2>`;
    }
    if ("h2" in b) return `<h3>${esc(b.h2)}</h3>`;
    if ("p" in b) return `<p>${esc(b.p)}</p>`;
    if ("ul" in b) return `<ul>${b.ul.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>`;
    if ("ol" in b) return `<ol>${b.ol.map((t) => `<li>${esc(t)}</li>`).join("")}</ol>`;
    if ("note" in b) return `<p class="note">${esc(b.note)}</p>`;
    if ("code" in b) return `<pre>${esc(b.code)}</pre>`;
    return `<div class="table"><table><thead><tr>${b.table.head.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${b.table.rows
      .map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`)
      .join("")}</tbody></table></div>`;
  }).join("\n");
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(REPORT.title)}</title>
<style>
:root{--bg:#fbf7f0;--surface:#fffdf9;--ink:#233a3a;--muted:#67716c;--line:#ece2d2;--soft:#f3ecdf;--teal:#12706d;--amber:#9a5f12;color-scheme:light dark}
@media (prefers-color-scheme:dark){:root{--bg:#11201f;--surface:#1b302e;--ink:#eef6f3;--muted:#b0c3bd;--line:#2f4744;--soft:#223a37;--teal:#4fb3ad;--amber:#f0b35a}}
*{box-sizing:border-box}html,body{margin:0}
body{background:var(--bg);color:var(--ink);font:17px/1.75 "Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",system-ui,sans-serif}
main{max-width:920px;margin:0 auto;padding:28px 16px 80px}
header{background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:22px 22px 14px}
h1{font-size:1.6rem;margin:0 0 .3em;color:var(--teal)}.sub{color:var(--amber);margin:0 0 .8em}
.meta{color:var(--muted);font-size:.92rem;margin:.2em 0}
nav{background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:10px 22px;margin:16px 0}
h2{font-size:1.3rem;color:var(--teal);margin:44px 0 12px;padding-bottom:6px;border-bottom:2px solid var(--amber);scroll-margin-top:12px}
h3{font-size:1.08rem;margin:26px 0 8px}
.note{background:var(--soft);border-left:4px solid var(--amber);padding:10px 14px;border-radius:0 10px 10px 0}
.table{overflow-x:auto;margin:10px 0}table{border-collapse:collapse;width:100%;min-width:560px;font-size:.92rem;background:var(--surface)}
th,td{border:1px solid var(--line);padding:7px 10px;text-align:left;vertical-align:top}th{background:var(--teal);color:#fff}
pre{background:var(--soft);padding:12px;border-radius:10px;overflow-x:auto}
a{color:var(--teal)}li{margin:.25em 0}
@media print{body{background:#fff}nav{display:none}h2{break-before:page}}
</style>
</head>
<body>
<main>
<header><h1>${esc(REPORT.title)}</h1><p class="sub">${esc(REPORT.subtitle)}</p>${COVER.map((l) => `<p class="meta">${esc(l)}</p>`).join("")}<p class="meta">${esc(SITE_INFO.copyright.ko)}</p></header>
<nav aria-label="목차"><ol>${toc.join("")}</ol></nav>
${body}
</main>
</body>
</html>
`;
}

mkdirSync(OUT, { recursive: true });
const files: [string, Buffer | string][] = [
  [`${NAME}.docx`, await Packer.toBuffer(docx())],
  [`${NAME}.hwpx`, Buffer.from(await markdownToHwpx(markdown()))],
  [`${NAME}.html`, html()],
];
for (const [name, data] of files) {
  writeFileSync(`${OUT}/${name}`, data);
  console.log(`${OUT}/${name}`);
}
