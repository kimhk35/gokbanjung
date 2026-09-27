// Builds the member (user) manual from src/data/guide.ts + screenshots:
//   DOCX (ko, en) · single-page HTML (4 languages) · HTML e-book (4 languages)
// HWPX (ko, en) is written here with kordoc; PDF is converted from the DOCX
// by Microsoft Word (scripts/manual/convert.ps1), so layout and pictures are kept.
// Run: node --import tsx scripts/manual/build.mts   (after shots.mjs)
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  HeadingLevel,
  ImageRun,
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
import { GUIDE, GUIDE_PARTS, type GuideSection } from "../../src/data/guide";
import { kstDate, SITE_INFO } from "../../src/lib/site-info";
import { translate, UI_LANGS, type UiLang } from "../../src/lib/i18n";
import type { Localized } from "../../src/lib/types";

const OUT = "사용설명서(사용자용)";
const TITLE: Localized = { ko: "곡반정와드 사용설명서", en: "Gokbanjeong Ward User Guide" };
const SUBTITLE: Localized = {
  ko: "참여자용 · 로그인 없이 함께 배우는 말씀 학습 사이트",
  en: "For members · Learn the word together, no sign-in needed",
};
const SITE = "https://gokbanjeong-gospel-class.vercel.app";
const UPDATED = kstDate(new Date());
// Cover/credits lines, each already in the reader's language.
const credits = (lang: UiLang) => [
  translate(lang, "만든 사람 · ", "Created by ") + tr(SITE_INFO.creators, lang),
  translate(lang, "피드백·의견 · ", "Feedback & ideas · ") + SITE_INFO.feedbackEmail,
  translate(lang, "최근 업데이트 · ", "Last updated · ") + UPDATED,
];
const IMAGES: Record<string, string> = {
  start: "start",
  menu: "home",
  study: "study",
  think: "think",
  ward: "ward",
  "other-languages": "translate",
  "daily-insight": "insight",
  cards: "card",
  "verse-notes": "verse",
  "text-notes": "text",
  "scripture-reader": "scripture",
};
const SECTIONS = GUIDE.filter((s) => s.part !== "operator");
const PARTS = (["member", "help"] as const).map((p) => ({ part: p, sections: SECTIONS.filter((s) => s.part === p) }));
const tr = (l: Localized, lang: UiLang) => translate(lang, l.ko, l.en);
const imgLang = (lang: UiLang) => (lang === "ko" ? "ko" : "en");

// Smaller copies: JPEG for Word, WebP for HTML (keeps files light).
execFileSync(
  "python",
  [
    "-c",
    `
import glob, os
from PIL import Image
for p in glob.glob(r"${OUT}/images/*/*.png"):
    im = Image.open(p).convert("RGB")
    w = 620
    im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    im.save(p[:-4] + ".jpg", quality=86, optimize=True)
    im.save(p[:-4] + ".webp", quality=80)
    small = im.resize((240, round(im.height * 240 / im.width)), Image.LANCZOS)
    small.save(p[:-4] + ".hwp.jpg", quality=86, optimize=True)
`,
  ],
  { stdio: "inherit" },
);
const imageFile = (lang: UiLang, id: string, ext: "jpg" | "webp") => {
  const name = IMAGES[id];
  const file = name && `${OUT}/images/${imgLang(lang)}/${name}.${ext}`;
  return file && existsSync(file) ? file : null;
};

// ---------- DOCX ----------
const TEAL = "12706D",
  AMBER = "9A5F12",
  SOFT = "F3ECDF";
function docxFor(lang: "ko" | "en") {
  const font = lang === "ko" ? "맑은 고딕" : "Calibri";
  const children: (Paragraph | Table | TableOfContents)[] = [
    new Paragraph({ spacing: { before: 2600 }, children: [] }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: tr(TITLE, lang), bold: true, size: 56, color: TEAL })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 240 },
      children: [new TextRun({ text: tr(SUBTITLE, lang), size: 28, color: AMBER })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 600 },
      children: [new TextRun({ text: SITE, size: 22, color: "67716C" })],
    }),
    ...credits(lang).map(
      (line, i) =>
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: i ? 60 : 900 },
          children: [new TextRun({ text: line, size: 22, color: "233A3A" })],
        }),
    ),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 360 },
      children: [new TextRun({ text: tr(SITE_INFO.copyright, lang), size: 18, color: "67716C" })],
    }),
    new Paragraph({ children: [new PageBreak()] }),
    new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(lang === "ko" ? "목차" : "Contents")] }),
    new TableOfContents(lang === "ko" ? "목차" : "Contents", { hyperlink: true, headingStyleRange: "1-2" }),
  ];
  for (const { part, sections } of PARTS) {
    children.push(new Paragraph({ children: [new PageBreak()] }));
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(tr(GUIDE_PARTS[part], lang))] }));
    for (const s of sections) children.push(...sectionDocx(s, lang));
  }
  return new Document({
    creator: "Gokbanjeong Ward",
    title: tr(TITLE, lang),
    styles: {
      default: { document: { run: { font, size: 22 }, paragraph: { spacing: { line: 320, after: 120 } } } },
      paragraphStyles: [
        { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 36, bold: true, color: TEAL, font }, paragraph: { spacing: { before: 240, after: 240 }, outlineLevel: 0 } },
        { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 28, bold: true, color: "233A3A", font }, paragraph: { spacing: { before: 360, after: 160 }, outlineLevel: 1 } },
      ],
    },
    numbering: {
      config: [{ reference: "steps", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 360 } } } }] }],
    },
    sections: [
      {
        properties: { page: { margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ children: [tr(TITLE, lang) + " · ", PageNumber.CURRENT], size: 18, color: "67716C" })],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });
}
let stepInstance = 0;
function sectionDocx(s: GuideSection, lang: "ko" | "en") {
  const out: (Paragraph | Table)[] = [new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(tr(s.title, lang))] })];
  if (s.intro) out.push(new Paragraph({ children: [new TextRun(tr(s.intro, lang))] }));
  if (s.steps) {
    stepInstance++;
    for (const step of s.steps)
      out.push(new Paragraph({ numbering: { reference: "steps", level: 0, instance: stepInstance }, children: [new TextRun(tr(step, lang))] }));
  }
  if (s.table) {
    const widths = [3000, 6638];
    const cell = (text: string, head: boolean, i: number) =>
      new TableCell({
        width: { size: widths[i], type: WidthType.DXA },
        shading: head ? { type: ShadingType.CLEAR, fill: TEAL, color: "auto" } : undefined,
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [new Paragraph({ children: [new TextRun({ text, bold: head, color: head ? "FFFFFF" : undefined })] })],
      });
    out.push(
      new Table({
        width: { size: 9638, type: WidthType.DXA },
        columnWidths: widths,
        rows: [
          new TableRow({ tableHeader: true, children: s.table.head.map((h, i) => cell(tr(h, lang), true, i)) }),
          ...s.table.rows.map((r) => new TableRow({ children: r.map((c, i) => cell(tr(c, lang), false, i)) })),
        ],
      }),
    );
  }
  if (s.note)
    out.push(
      new Paragraph({
        shading: { type: ShadingType.CLEAR, fill: SOFT, color: "auto" },
        border: { left: { style: BorderStyle.SINGLE, size: 18, color: AMBER, space: 8 } },
        spacing: { before: 120, after: 160 },
        children: [new TextRun({ text: tr(s.note, lang), color: "233A3A" })],
      }),
    );
  const img = imageFile(lang, s.id, "jpg");
  if (img) {
    const data = readFileSync(img);
    const width = 230,
      height = Math.round((width * 1688) / 780);
    out.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 120, after: 240 },
        children: [new ImageRun({ type: "jpg", data, transformation: { width, height }, altText: { name: s.id, title: tr(s.title, lang), description: tr(s.title, lang) } })],
      }),
    );
  }
  return out;
}

// ---------- HTML (single page and e-book) ----------
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const multiLines = (f: (lang: UiLang) => string[]) =>
  UI_LANGS.map(({ id }) => `<span lang="${id}">${f(id).map(esc).join("<br>")}</span>`).join("");
const creditsHtml = () => `<p class="credits">${multiLines(credits)}</p><p class="credits small">${multi(SITE_INFO.copyright)}</p>`;
const multi = (l: Localized) => UI_LANGS.map(({ id }) => `<span lang="${id}">${esc(tr(l, id))}</span>`).join("");
const dataUri = (file: string) => `data:image/webp;base64,${readFileSync(file).toString("base64")}`;
function imgHtml(id: string) {
  const ko = imageFile("ko", id, "webp"),
    en = imageFile("en", id, "webp");
  if (!ko || !en) return "";
  return `<figure class="shot"><img lang="ko" alt="" loading="lazy" src="${dataUri(ko)}"><img class="en-shot" alt="" loading="lazy" src="${dataUri(en)}"></figure>`;
}
function sectionHtml(s: GuideSection) {
  const parts = [`<h2>${multi(s.title)}</h2>`];
  if (s.intro) parts.push(`<p>${multi(s.intro)}</p>`);
  if (s.steps) parts.push(`<ol>${s.steps.map((x) => `<li>${multi(x)}</li>`).join("")}</ol>`);
  if (s.table)
    parts.push(
      `<div class="table"><table><thead><tr>${s.table.head.map((h) => `<th>${multi(h)}</th>`).join("")}</tr></thead><tbody>${s.table.rows
        .map((r) => `<tr>${r.map((c) => `<td>${multi(c)}</td>`).join("")}</tr>`)
        .join("")}</tbody></table></div>`,
    );
  if (s.note) parts.push(`<p class="note">${multi(s.note)}</p>`);
  parts.push(imgHtml(s.id));
  return parts.join("");
}
const CSS = `
:root{--bg:#fbf7f0;--surface:#fffdf9;--ink:#233a3a;--muted:#67716c;--line:#ece2d2;--soft:#f3ecdf;--teal:#12706d;--amber:#9a5f12;color-scheme:light dark}
@media (prefers-color-scheme:dark){:root{--bg:#11201f;--surface:#1b302e;--ink:#eef6f3;--muted:#b0c3bd;--line:#2f4744;--soft:#223a37;--teal:#4fb3ad;--amber:#f0b35a}}
*{box-sizing:border-box}html,body{margin:0}
body{background:var(--bg);color:var(--ink);font:18px/1.75 "Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",system-ui,sans-serif}
h1{font-size:1.7rem;margin:.2em 0;color:var(--teal)}h2{font-size:1.25rem;margin:0 0 .5em}
ol{padding-left:1.3em}li{margin:.3em 0}
.note{background:var(--soft);border-left:4px solid var(--amber);padding:10px 14px;border-radius:0 10px 10px 0}
.table{overflow-x:auto}table{border-collapse:collapse;width:100%;min-width:420px}th,td{border-bottom:1px solid var(--line);padding:8px 10px;text-align:left;vertical-align:top}th{color:var(--muted)}
.shot{margin:14px auto 0;max-width:280px}.shot img{width:100%;border-radius:18px;border:1px solid var(--line);display:block}
a{color:var(--teal)}
.credits{color:var(--muted);font-size:.9rem;margin:.4em 0}.credits.small{font-size:.8rem}
.lang{display:inline-flex;border:1px solid var(--line);border-radius:999px;overflow:hidden;background:var(--surface)}
.lang button{min-width:52px;min-height:44px;border:0;background:transparent;color:var(--ink);font:inherit;font-weight:700;cursor:pointer}
.lang button[aria-pressed=true]{background:var(--teal);color:#fff}
html[lang=ko] span[lang]:not([lang=ko]),html[lang=en] span[lang]:not([lang=en]),html[lang=es] span[lang]:not([lang=es]),html[lang=fil] span[lang]:not([lang=fil]){display:none}
html[lang=ko] .en-shot,html:not([lang=ko]) .shot img[lang=ko]{display:none}
`;
const SCRIPT = `
(function(){
  function pick(saved,langs){
    if(saved==="ko"||saved==="en"||saved==="es"||saved==="fil")return saved;
    if(!langs.length)return "ko";
    for(var i=0;i<langs.length;i++){var b=String(langs[i]).toLowerCase().split("-")[0];if(b==="ko"||b==="en"||b==="es")return b;if(b==="fil"||b==="tl")return "fil";}
    return "en";
  }
  function set(l){document.documentElement.lang=l;var bs=document.querySelectorAll("[data-set-lang]");for(var i=0;i<bs.length;i++)bs[i].setAttribute("aria-pressed",String(bs[i].getAttribute("data-set-lang")===l));}
  var saved=null;try{saved=localStorage.getItem("ggc_lang");}catch(e){}
  set(pick(saved,navigator.languages||[navigator.language||""]));
  document.addEventListener("click",function(e){var b=e.target.closest&&e.target.closest("[data-set-lang]");if(!b)return;var l=b.getAttribute("data-set-lang");set(l);try{localStorage.setItem("ggc_lang",l);}catch(err){}});
})();`;
const langButtons = `<div class="lang" role="group" aria-label="Language">${UI_LANGS.map((l) => `<button type="button" lang="${l.id}" data-set-lang="${l.id}">${l.short}</button>`).join("")}</div>`;
const shell = (title: string, css: string, body: string, script = "") =>
  `<!doctype html>\n<html lang="ko">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>${title}</title>\n<style>${CSS}${css}</style>\n</head>\n<body>\n${body}\n<script>${SCRIPT}${script}</script>\n</body>\n</html>\n`;

function singleHtml() {
  const toc = PARTS.map(({ part, sections }) => `<li><strong>${multi(GUIDE_PARTS[part])}</strong><ul>${sections.map((s) => `<li><a href="#${s.id}">${multi(s.title)}</a></li>`).join("")}</ul></li>`).join("");
  const body = PARTS.map(({ part, sections }) => `<h2 class="part">${multi(GUIDE_PARTS[part])}</h2>${sections.map((s) => `<section id="${s.id}">${sectionHtml(s)}</section>`).join("")}`).join("");
  return shell(
    "곡반정와드 사용설명서 · User guide",
    `main{max-width:860px;margin:0 auto;padding:24px 16px 80px}header.top{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
section{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:18px 20px;margin:14px 0;scroll-margin-top:16px}
h2.part{margin:44px 0 10px;padding-bottom:6px;border-bottom:2px solid var(--amber);color:var(--amber);font-size:1rem;letter-spacing:.06em}
nav.toc{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:12px 20px;margin-top:16px}nav.toc ul{padding-left:1.1em}`,
    `<main><header class="top"><div><small>${multi(SUBTITLE)}</small><h1>${multi(TITLE)}</h1></div>${langButtons}</header>${creditsHtml()}<nav class="toc"><ul>${toc}</ul></nav>${body}<p class="note">${multi({ ko: "사이트 주소: ", en: "Site: " })}<a href="${SITE}">${SITE}</a></p></main>`,
  );
}

function ebookHtml() {
  const pages: string[] = [
    `<section class="page cover" data-page><div><p class="kicker">GOKBANJEONG WARD</p><h1>${multi(TITLE)}</h1><p>${multi(SUBTITLE)}</p><p class="hint">${multi({ ko: "화면을 옆으로 넘기거나 ▶ 버튼을 누르세요", en: "Swipe or press ▶ to turn the page" })}</p>${creditsHtml()}</div></section>`,
    `<section class="page" data-page><h2>${multi({ ko: "목차", en: "Contents" })}</h2><ol class="toc">${SECTIONS.map((s, i) => `<li><a href="#" data-go="${i + 2}">${multi(s.title)}</a></li>`).join("")}</ol></section>`,
    ...SECTIONS.map((s) => `<section class="page" data-page><p class="kicker">${multi(GUIDE_PARTS[s.part])}</p>${sectionHtml(s)}</section>`),
  ];
  return shell(
    "곡반정와드 사용설명서 전자책 · Guide e-book",
    `body{height:100dvh;overflow:hidden;display:grid;grid-template-rows:auto 1fr auto}
.bar{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 16px;background:var(--surface);border-bottom:1px solid var(--line)}
.bar strong{color:var(--teal);font-size:1rem}
.book{position:relative;overflow:hidden}
.pages{display:flex;height:100%;transition:transform .35s ease}
.page{flex:0 0 100%;height:100%;overflow-y:auto;padding:24px 20px 40px;max-width:100%}
.page>*{max-width:760px;margin-left:auto;margin-right:auto}
.cover{display:grid;place-items:center;text-align:center;background:linear-gradient(160deg,var(--soft),var(--bg))}
.cover h1{font-size:2.2rem}.kicker{color:var(--amber);letter-spacing:.12em;font-size:.85rem;font-weight:700;margin:0 0 6px}.hint{color:var(--muted);font-size:.95rem;margin-top:40px}
.toc li{margin:.5em 0}
.nav{display:flex;align-items:center;gap:12px;padding:10px 16px calc(10px + env(safe-area-inset-bottom));background:var(--surface);border-top:1px solid var(--line)}
.nav button{min-width:56px;min-height:48px;border:1px solid var(--line);border-radius:14px;background:var(--bg);color:var(--ink);font:inherit;font-size:1.2rem;cursor:pointer}
.nav button:disabled{opacity:.35}
.progress{flex:1;height:6px;border-radius:999px;background:var(--soft);overflow:hidden}.progress i{display:block;height:100%;background:var(--teal);width:0;transition:width .35s}
.count{min-width:56px;text-align:center;color:var(--muted);font-size:.9rem}
@media (prefers-reduced-motion:reduce){.pages,.progress i{transition:none}}`,
    `<header class="bar"><strong>${multi(TITLE)}</strong>${langButtons}</header><main class="book"><div class="pages">${pages.join("")}</div></main><nav class="nav" aria-label="Pages"><button type="button" id="prev" aria-label="Previous page">◀</button><div class="progress"><i></i></div><span class="count"></span><button type="button" id="next" aria-label="Next page">▶</button></nav>`,
    `
(function(){
  var pages=document.querySelector(".pages"),all=document.querySelectorAll("[data-page]"),n=all.length,i=0;
  try{i=Math.min(n-1,Math.max(0,Number(localStorage.getItem("ggc_ebook_page"))||0));}catch(e){}
  function show(k){i=Math.min(n-1,Math.max(0,k));pages.style.transform="translateX("+(-100*i)+"%)";document.querySelector(".progress i").style.width=((i+1)/n*100)+"%";document.querySelector(".count").textContent=(i+1)+" / "+n;document.getElementById("prev").disabled=i===0;document.getElementById("next").disabled=i===n-1;all[i].scrollTop=0;try{localStorage.setItem("ggc_ebook_page",i);}catch(e){}}
  document.getElementById("prev").onclick=function(){show(i-1)};document.getElementById("next").onclick=function(){show(i+1)};
  document.addEventListener("keydown",function(e){if(e.key==="ArrowRight"||e.key==="PageDown")show(i+1);if(e.key==="ArrowLeft"||e.key==="PageUp")show(i-1);});
  document.addEventListener("click",function(e){var a=e.target.closest&&e.target.closest("[data-go]");if(a){e.preventDefault();show(Number(a.getAttribute("data-go")));}});
  var x=null,y=null;document.addEventListener("touchstart",function(e){x=e.touches[0].clientX;y=e.touches[0].clientY;},{passive:true});
  document.addEventListener("touchend",function(e){if(x===null)return;var dx=e.changedTouches[0].clientX-x,dy=e.changedTouches[0].clientY-y;if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.5)show(i+(dx<0?1:-1));x=null;},{passive:true});
  show(i);
})();`,
  );
}

// ---------- HWPX (kordoc) ----------
async function hwpxFor(lang: "ko" | "en") {
  const images: Record<string, Uint8Array> = {};
  const md: string[] = [`# ${tr(TITLE, lang)}`, "", tr(SUBTITLE, lang), "", SITE, "", ...credits(lang).flatMap((l) => [l, ""]), tr(SITE_INFO.copyright, lang), ""];
  for (const { part, sections } of PARTS) {
    md.push(`# ${tr(GUIDE_PARTS[part], lang)}`, "");
    for (const s of sections) {
      md.push(`## ${tr(s.title, lang)}`, "");
      if (s.intro) md.push(tr(s.intro, lang), "");
      if (s.steps) md.push(...s.steps.map((x, i) => `${i + 1}. ${tr(x, lang)}`), "");
      if (s.table) {
        const row = (cells: Localized[]) => `| ${cells.map((c) => tr(c, lang).replace(/\|/g, "/")).join(" | ")} |`;
        md.push(row(s.table.head), `|${s.table.head.map(() => " --- ").join("|")}|`, ...s.table.rows.map(row), "");
      }
      if (s.note) md.push(`> ${tr(s.note, lang)}`, "");
      const name = IMAGES[s.id];
      const file = name && `${OUT}/images/${lang}/${name}.hwp.jpg`;
      if (file && existsSync(file)) {
        images[`${name}.jpg`] = readFileSync(file);
        md.push(`![${tr(s.title, lang)}](${name}.jpg)`, "");
      }
    }
  }
  return Buffer.from(await markdownToHwpx(md.join("\n"), { images }));
}

const files: [string, Buffer | string][] = [
  ["곡반정와드_사용설명서_한국어.hwpx", await hwpxFor("ko")],
  ["곡반정와드_사용설명서_English.hwpx", await hwpxFor("en")],
  ["곡반정와드_사용설명서_한국어.docx", await Packer.toBuffer(docxFor("ko"))],
  ["곡반정와드_사용설명서_English.docx", await Packer.toBuffer(docxFor("en"))],
  ["곡반정와드_사용설명서.html", singleHtml()],
  ["곡반정와드_사용설명서_전자책.html", ebookHtml()],
];
for (const [name, data] of files) {
  writeFileSync(`${OUT}/${name}`, data);
  console.log(`${OUT}/${name}`);
}
