// Takes the phone screenshots used by the user manual, in Korean and English.
// Needs the local site running (npm run dev -- --port 3100) with demo data.
// Run: node scripts/manual/shots.mjs
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";

const OUT = "사용설명서(사용자용)/images";
const prompts = await (await fetch("http://localhost:3100/api/think/prompts")).json();
const slug = prompts.items.find((p) => p.reply_count > 0)?.slug;
if (!slug) throw new Error("Demo data missing: need a question with replies");

const select = (blockIndex, phrase) =>
  `(()=>{const b=[...document.querySelectorAll('[data-block-start]')][${blockIndex}];const w=document.createTreeWalker(b,NodeFilter.SHOW_TEXT);let n=w.nextNode();while(n&&n.textContent.indexOf(${JSON.stringify(phrase)})<0)n=w.nextNode();if(!n)return 0;const i=n.textContent.indexOf(${JSON.stringify(phrase)});const r=document.createRange();r.setStart(n,i);r.setEnd(n,i+${phrase.length});getSelection().removeAllRanges();getSelection().addRange(r);return 1})()`;

function steps(lang) {
  const setLang = `localStorage.setItem('ggc_lang','${lang}')`;
  return [
    { size: [390, 844], go: "/ward", wait: 6000, eval: `${setLang},location.reload(),1`, sleep: 6000, shot: `${lang}/insight` },
    { eval: "document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'})),1", sleep: 800 },
    { go: "/learn", wait: 6000, shot: `${lang}/start` },
    { eval: "fetch('/api/profile',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({nickname:'Tester'})}).then(r=>r.status)" },
    { go: "/", wait: 7000, shot: `${lang}/home` },
    { go: "/week/40", wait: 7000, shot: `${lang}/study` },
    { go: "/ward", wait: 6000, shot: `${lang}/ward` },
    { go: `/p/${slug}`, wait: 6000, eval: "document.querySelector('.replies')?.scrollIntoView(),1", sleep: 800, shot: `${lang}/think` },
    { eval: "[...document.querySelectorAll('.reply-action')].find(b=>b.getAttribute('aria-label')&&b.textContent.length<8&&b.querySelector('svg'))?.click(),document.querySelectorAll('.reply .reply-action')[2]?.click(),1", sleep: 2500, shot: `${lang}/card` },
    { go: "/scriptures?book=ot/isa&chapter=40", wait: 8000, eval: "document.querySelector('.verse-notes .verse-group')?.scrollIntoView({block:'center'}),1", sleep: 1500, shot: `${lang}/verse` },
    { go: "/scriptures?book=bofm/1-ne&chapter=3", wait: 7000, eval: "document.querySelector('.chapter-view')?.scrollIntoView(),1", sleep: 2500, shot: `${lang}/scripture` },
    { go: "/week/40/text", wait: 7000, eval: select(2, lang === "ko" ? "새 힘을 얻으리니" : "새 힘을 얻으리니"), sleep: 800, shot: `${lang}/text` },
    { go: "/ward", wait: 6000, eval: "document.querySelector('.header-actions .icon-button[aria-label]')?.click(),1", sleep: 1200, shot: `${lang}/translate` },
  ];
}

for (const lang of ["ko", "en"]) {
  mkdirSync(`${OUT}/${lang}`, { recursive: true });
  const out = execFileSync(process.execPath, ["scripts/manual/cdp.mjs", OUT, JSON.stringify(steps(lang))], {
    env: { ...process.env, SHOT_SCALE: "2", EDGE_LANG: lang === "ko" ? "ko-KR" : "en-US" },
    encoding: "utf8",
  });
  const { logs } = JSON.parse(out);
  console.log(lang, "done", logs.length ? logs : "");
}
