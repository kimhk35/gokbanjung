// Builds the standalone four-language manual (사용설명서.html) from
// src/data/guide.ts; Spanish/Filipino come from the site's dictionaries.
// Run: node --import tsx scripts/guide-html.ts
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { GUIDE, GUIDE_PARTS, type GuideSection } from "../src/data/guide";
import type { Localized } from "../src/lib/types";
import { translate, UI_LANGS } from "../src/lib/i18n";

const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
const both = (l: Localized) =>
  UI_LANGS.map(
    ({ id }) => `<span lang="${id}">${esc(translate(id, l.ko, l.en))}</span>`,
  ).join("");

function section(s: GuideSection) {
  const parts = [`<section id="${s.id}"><h2>${both(s.title)}</h2>`];
  if (s.intro) parts.push(`<p>${both(s.intro)}</p>`);
  if (s.steps)
    parts.push(
      `<ol>${s.steps.map((x) => `<li>${both(x)}</li>`).join("")}</ol>`,
    );
  if (s.table)
    parts.push(
      `<div class="table"><table><thead><tr>${s.table.head.map((h) => `<th>${both(h)}</th>`).join("")}</tr></thead><tbody>${s.table.rows
        .map((r) => `<tr>${r.map((c) => `<td>${both(c)}</td>`).join("")}</tr>`)
        .join("")}</tbody></table></div>`,
    );
  if (s.note) parts.push(`<p class="note">${both(s.note)}</p>`);
  parts.push("</section>");
  return parts.join("");
}

export function renderGuideHtml() {
  const parts = Object.keys(GUIDE_PARTS) as GuideSection["part"][];
  const toc = parts
    .map(
      (p) =>
        `<li><strong>${both(GUIDE_PARTS[p])}</strong><ul>${GUIDE.filter(
          (s) => s.part === p,
        )
          .map((s) => `<li><a href="#${s.id}">${both(s.title)}</a></li>`)
          .join("")}</ul></li>`,
    )
    .join("");
  const body = parts
    .map(
      (p) =>
        `<h2 class="part">${both(GUIDE_PARTS[p])}</h2>${GUIDE.filter(
          (s) => s.part === p,
        )
          .map(section)
          .join("")}`,
    )
    .join("");
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>곡반정와드 사용설명서 · Guide</title>
<style>
:root{--bg:#f7f6f1;--surface:#fff;--ink:#173c4d;--muted:#5c6b70;--line:#dce1dc;--soft:#edf2ed;--gold:#ae8541;--navy:#123e50;color-scheme:light dark}
@media (prefers-color-scheme:dark){:root{--bg:#141f28;--surface:#1c2b36;--ink:#f0f3f2;--muted:#b4c0c7;--line:#374956;--soft:#263640;--gold:#d0b582;--navy:#2c5a78}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:18px/1.75 "Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",sans-serif}
main{max-width:860px;margin:0 auto;padding:24px 16px 80px}
header{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
h1{font-size:1.7rem;margin:.2em 0}
h2{font-size:1.25rem;margin:0 0 .5em}
h2.part{margin:48px 0 12px;padding-bottom:6px;border-bottom:2px solid var(--gold);color:var(--gold);font-size:1rem;letter-spacing:.08em}
section{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:18px 20px;margin:14px 0;scroll-margin-top:16px}
ol{padding-left:1.3em;margin:.4em 0}li{margin:.3em 0}
.note{background:var(--soft);border-left:4px solid var(--gold);padding:10px 14px;border-radius:0 10px 10px 0;margin:.8em 0 0}
.table{overflow-x:auto}table{border-collapse:collapse;width:100%;min-width:480px}th,td{border-bottom:1px solid var(--line);padding:8px 10px;text-align:left;vertical-align:top}th{color:var(--muted);font-weight:600}
nav.toc{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:14px 20px;margin-top:16px}
nav.toc ul{padding-left:1.1em;margin:.2em 0 .6em}a{color:var(--navy)}@media (prefers-color-scheme:dark){a{color:#9cc9e8}}
.lang{display:inline-flex;border:1px solid var(--line);border-radius:999px;overflow:hidden}
.lang button{min-width:64px;min-height:44px;border:0;background:var(--surface);color:var(--ink);font:inherit;font-weight:700;cursor:pointer}
.lang button[aria-pressed=true]{background:var(--navy);color:#fff}
html[lang=ko] span[lang]:not([lang=ko]),html[lang=en] span[lang]:not([lang=en]),html[lang=es] span[lang]:not([lang=es]),html[lang=fil] span[lang]:not([lang=fil]){display:none}
.lang button[lang]{display:inline-block !important}
</style>
</head>
<body>
<main>
<header>
<div><small>${both({ ko: "곡반정와드 통합 학습 사이트", en: "Gokbanjeong Ward learning site" })}</small><h1>${both({ ko: "사용설명서", en: "User guide" })}</h1></div>
<div class="lang" role="group" aria-label="Language"><button type="button" lang="ko" data-set-lang="ko">한국어</button><button type="button" lang="en" data-set-lang="en">EN</button><button type="button" lang="es" data-set-lang="es">ES</button><button type="button" lang="fil" data-set-lang="fil">FIL</button></div>
</header>
<nav class="toc" aria-label="Contents"><ul>${toc}</ul></nav>
${body}
</main>
<script>
(function(){
  function pick(saved,langs){
    if(saved==="ko"||saved==="en"||saved==="es"||saved==="fil")return saved;
    if(!langs.length)return "ko";
    for(var i=0;i<langs.length;i++){var b=String(langs[i]).toLowerCase().split("-")[0];if(b==="ko"||b==="en"||b==="es")return b;if(b==="fil"||b==="tl")return "fil";}
    return "en";
  }
  function set(l){
    document.documentElement.lang=l;
    var bs=document.querySelectorAll("[data-set-lang]");
    for(var i=0;i<bs.length;i++)bs[i].setAttribute("aria-pressed",String(bs[i].getAttribute("data-set-lang")===l));
  }
  var saved=null;try{saved=localStorage.getItem("ggc_lang");}catch(e){}
  set(pick(saved,navigator.languages||[navigator.language||""]));
  document.addEventListener("click",function(e){
    var b=e.target.closest&&e.target.closest("[data-set-lang]");if(!b)return;
    var l=b.getAttribute("data-set-lang");set(l);try{localStorage.setItem("ggc_lang",l);}catch(err){}
  });
})();
</script>
</body>
</html>
`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  writeFileSync("사용설명서.html", renderGuideHtml());
  console.log("사용설명서.html written");
}
