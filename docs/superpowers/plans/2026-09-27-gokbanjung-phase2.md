# gokbanjung Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-theme the site ("따뜻한 햇살"), add comefollowme's presentation queue, quote cards, verse notes and highlight notes on uploaded lesson text, add Spanish and Filipino, and produce the user manual in PDF/HWPX/DOCX/HTML/HTML-e-book.

**Architecture:** Same as phase 1 — Next.js App Router, writes via `/api/[...path]` → `community-api.ts` dispatch → focused service modules using `privileged()` with explicit permission checks; additive SQL migrations; client components styled with CSS tokens. i18n keeps every existing `t(ko, en)` call: for `es`/`fil` the Korean source string is the dictionary key, falling back to English. Manuals are generated from `src/data/guide.ts` by one script.

**Tech Stack:** Next.js 16, React 19, TypeScript 5.9 (compiler API for string extraction), zod 4, PGlite tests, Canvas 2D, headless Edge (CDP) for screenshots and PDF, `docx` npm package, kordoc (Markdown→HWPX).

**Spec:** `docs/superpowers/specs/2026-09-27-gokbanjung-phase2-design.md`

## Global Constraints

- Work in `C:\Users\김홍겸\Desktop\gokbanjung` on `main`; commit per task; push only in Task 12.
- DB: additive only (`create ... if not exists`), shared gospel-class Supabase; production applied by the user via the regenerated `DB업데이트_SQL편집기용.sql`.
- UI languages: `ko`, `en`, `es`, `fil`. Server/API content language stays `ko | en` (`es`/`fil` send `en`).
- Official Church link `lang=` codes: ko→`kor`, en→`eng`, es→`spa`, fil→`tgl`. Intl locales: `ko-KR`, `en-US`, `es-ES`, `fil-PH`.
- Theme tokens (light / dark): bg `#fbf7f0`/`#11201f`, surface `#fffdf9`/`#1b302e`, ink `#233a3a`/`#eef6f3`, muted `#67716c`/`#b0c3bd`, line `#ece2d2`/`#2f4744`, soft `#f3ecdf`/`#223a37`, navy(primary) `#12706d`/`#4fb3ad`, gold(accent) `#9a5f12`/`#f0b35a`, sage `#e6f1ec`/`#223a37`. Text contrast ≥ 4.5:1.
- Limits: verse note quote ≤200, body ≤3000; text note quote ≤300, body ≤3000; comments ≤1500; author ≤50 (blank → `익명`); lesson text body ≤200 KB.
- Presentation queue stored only in `localStorage` key `ggc_present:<actorId>:<promptId>`.
- Cards drawn on-device (Canvas), sizes 1080×1080, 1080×1920, 1920×1080; backgrounds from `src/data/card-backgrounds.json`.
- Manuals: participant sections only; PDF/DOCX/HWPX in 한국어 and English files; the two HTML files carry ko/en/es/fil with auto language. Output folder `사용설명서(사용자용)/`.
- Touch targets ≥44px; phone <768, tablet 768–1199, desktop ≥1200; no horizontal scroll.
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. A Spanish/Filipino visitor sees a screen whose Korean source string changed after translation → must show English, never Korean or blank → test in Task 5.
2. A text note anchored to a sentence the operator later edited → must reattach if the sentence still exists nearby, else list as "원래 문장" with its quote → test in Task 9.
3. A reply removed after the teacher queued it → presentation skips it without an empty slide → test in Task 2.
4. A verse note for a chapter/verse that does not exist (e.g. Isaiah 67, or end < start) → rejected with 400 → test in Task 8.
5. Very long reply on a quote card → wrapped and truncated with "…" inside the card, never drawn outside → test in Task 3.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/app/theme.css` | Token + hard-coded color overrides for the new theme (imported last) |
| `src/lib/contrast.ts` | WCAG contrast ratio (theme test) |
| `src/lib/present-queue.ts` | Pure queue ops |
| `src/components/think/present-mode.tsx` | Queue panel + fullscreen presenter |
| `src/lib/card-text.ts` | Pure text wrapping for cards |
| `src/components/think/quote-card.tsx` | Card preview/draw/save/share |
| `src/components/translate-help.tsx` | "🌐 다른 언어" help modal |
| `src/lib/i18n.ts` | `UiLang`, `baseLang`, `localeOf`, `churchLangCode`, `translate(ui, ko, en)` |
| `src/i18n/catalog.json`, `es.json`, `fil.json` | Extracted source strings and translations |
| `scripts/i18n-extract.ts` | Builds catalog from source and data |
| `supabase/migrations/20260928000000_notes.sql` | verse notes + lesson texts + text notes (+ reactions/comments) |
| `src/lib/verse-notes.ts` | Verse note service |
| `src/lib/text-anchor.ts` | Pure anchor make/locate |
| `src/lib/lesson-texts.ts` | Lesson text + text note service |
| `src/components/notes/*` | Verse notes UI, lesson text reader/editor |
| `scripts/manual/*` | Screenshot, Markdown, DOCX, PDF, HWPX, HTML, e-book generators |

---

### Task 1: Theme "따뜻한 햇살"

**Files:** Create `src/app/theme.css`, `src/lib/contrast.ts`, `tests/theme.test.ts`; Modify `src/app/layout.tsx` (import last, viewport themeColor), `public/manifest.webmanifest`, `public/icon.svg`.

**Interfaces:** Produces `contrast(hexA: string, hexB: string): number`.

- [ ] **Step 1: Failing test**

```ts
// tests/theme.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { contrast } from "../src/lib/contrast";

function tokens(css: string, selector: string) {
  const block = css.split(selector)[1].split("}")[0];
  return Object.fromEntries([...block.matchAll(/--([a-z]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]]));
}
test("contrast formula", () => {
  assert.equal(contrast("#000000", "#ffffff").toFixed(1), "21.0");
  assert.equal(contrast("#ffffff", "#ffffff").toFixed(1), "1.0");
});
test("theme text colors meet WCAG AA on their backgrounds", () => {
  const css = readFileSync("src/app/theme.css", "utf8");
  for (const sel of [":root {", ':root[data-theme="dark"] {']) {
    const t = tokens(css, sel);
    for (const [fg, bg] of [["ink", "bg"], ["ink", "surface"], ["muted", "surface"], ["gold", "bg"], ["navy", "surface"]])
      assert.ok(contrast(t[fg], t[bg]) >= 4.5, `${sel} ${fg} on ${bg}: ${contrast(t[fg], t[bg]).toFixed(2)}`);
  }
  assert.equal(tokens(css, ":root {").bg, "#fbf7f0");
});
```

- [ ] **Step 2:** `node --import tsx --test tests/theme.test.ts` → FAIL (module missing).
- [ ] **Step 3: Implement** `src/lib/contrast.ts`:

```ts
const channel = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
function luminance(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255].map((x) => channel(x / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrast(a: string, b: string) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}
```

and `src/app/theme.css` starting with the two token blocks (exact values from Global Constraints, plus `--shadow: 0 12px 38px #12706d0f` light / `none` dark), followed by overrides found by `grep -n "#[0-9a-f]\{6\}" src/app/globals.css src/app/renewal.css` for blue-family colors (`#086d91 #0b1a32 #112540 #172b44 #1b3650 #205b7c #284e70 #334968 #3a5576 #b8cde7 #eaf4f8 #f4f9fc #dbe8ef #eff6ff` and the header gradient/top bar). Each override re-declares the same selector with a teal/sand equivalent (e.g. `#172b44→#1b302e`, `#3a5576→#2f4744`, `#eff6ff→#eef6f3`, `#0b1a32→#0c1918`, `#112540→#15302d`, `#f4dbab→#f0b35a`). Import `./theme.css` after `./community.css` in `layout.tsx`; set viewport `themeColor` to `#fbf7f0` / `#11201f`; manifest `theme_color` `#12706d`, `background_color` `#fbf7f0`; icon.svg fills → `#12706d`/`#f0b35a`.
- [ ] **Step 4:** test PASS; `npm run build` passes.
- [ ] **Step 5: Visual check** — dev server + `.superpowers/cdp.mjs` screenshots of `/`, `/ward`, `/think`, `/guide` at 390/820/1280, light and dark; no leftover sky-blue areas (look at header band, nav cards, presentation page). Fix and re-shoot.
- [ ] **Step 6:** commit `feat: warm sunlight color theme`.

### Task 2: Presentation queue

**Files:** Create `src/lib/present-queue.ts`, `tests/present-queue.test.ts`, `src/components/think/present-mode.tsx`; Modify `src/components/think/prompt-view.tsx`, `src/components/think/reply-item.tsx`, `src/app/community.css`.

**Interfaces:** Produces `toggle(q: string[], id: string): string[]`, `move(q: string[], id: string, delta: -1 | 1): string[]`, `resolve<T extends {id: string}>(q: string[], replies: T[]): T[]`, `slides(prompt, replies): Slide[]` where `Slide = {kind:"question"} | {kind:"reply", reply}`; component `PresentMode({ prompt, replies, queue, onQueueChange, onClose })`.

- [ ] **Step 1: Failing test**

```ts
// tests/present-queue.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { toggle, move, resolve, slides } from "../src/lib/present-queue";
test("queue add/remove/move", () => {
  assert.deepEqual(toggle([], "a"), ["a"]);
  assert.deepEqual(toggle(["a", "b"], "a"), ["b"]);
  assert.deepEqual(move(["a", "b", "c"], "c", -1), ["a", "c", "b"]);
  assert.deepEqual(move(["a", "b"], "a", -1), ["a", "b"]);
  assert.deepEqual(move(["a", "b"], "b", 1), ["a", "b"]);
});
test("deleted replies are skipped and order follows the queue", () => {
  const replies = [{ id: "a" }, { id: "c" }];
  assert.deepEqual(resolve(["c", "b", "a"], replies).map((r) => r.id), ["c", "a"]);
  assert.deepEqual(slides({ id: "p" }, resolve(["x"], replies)).map((s) => s.kind), ["question"]);
});
```

- [ ] **Step 2:** run → FAIL. **Step 3:** implement (pure array functions; `slides` = question slide + one per resolved reply).
- [ ] **Step 4: UI.** In `PromptView`, when `canEdit || boot.actor.role in TEACHER/ADMIN`: state `queue` loaded from/saved to `localStorage` key above; a `발표 준비` toggle shows a side panel listing queued replies with ↑ ↓ ✕ and `발표 시작`. `ReplyItem` gets optional `queued`/`onQueue` props rendering `☆ 담기`/`★ 담김`. `PresentMode` renders a fixed full-screen overlay (`role="dialog" aria-modal="true"`), calls `document.documentElement.requestFullscreen?.()` in a try/catch, shows slide N/M, big text (clamp 1.6–3.2rem), `이름 숨기기` toggle, prev/next buttons, keys ←/→/Space/Esc, tap left/right halves. Close exits fullscreen.
- [ ] **Step 5:** tests + tsc + lint(new files) pass; browser check: queue 2 replies, reorder, present with keyboard, hide names, Esc.
- [ ] **Step 6:** commit `feat: presentation queue for shared replies`.

### Task 3: Quote cards

**Files:** Create `src/lib/card-text.ts`, `tests/card-text.test.ts`, `src/components/think/quote-card.tsx`; Modify `reply-item.tsx`.

**Interfaces:** `wrapLines(measure: (s: string) => number, text: string, width: number, maxLines: number): string[]` (breaks on spaces, falls back to characters for Korean/long words, last line ends with `…` when truncated); `CARD_SIZES = { square:[1080,1080], story:[1080,1920], wide:[1920,1080] }`.

- [ ] **Step 1: Failing test**

```ts
// tests/card-text.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { wrapLines } from "../src/lib/card-text";
const m = (s: string) => s.length * 10;
test("wraps by words and characters", () => {
  assert.deepEqual(wrapLines(m, "aa bb cc", 50, 5), ["aa bb", "cc"]);
  assert.deepEqual(wrapLines(m, "가나다라마바사", 30, 5), ["가나다", "라마바", "사"]);
  assert.deepEqual(wrapLines(m, "줄1\n줄2", 100, 5), ["줄1", "줄2"]);
});
test("truncates with an ellipsis inside the width", () => {
  const lines = wrapLines(m, "x".repeat(100), 50, 2);
  assert.equal(lines.length, 2);
  assert.ok(lines[1].endsWith("…"));
  assert.ok(lines.every((l) => m(l) <= 50));
});
```

- [ ] **Step 2–3:** FAIL → implement.
- [ ] **Step 4: UI.** `QuoteCard({ reply, prompt, open, onOpenChange })` in `Modal`: size segmented control, background select (reuse `cardBackgrounds`, `loadCardBackground`), `작성자 표시` toggle; draws on a canvas scaled into the preview (CSS width 100%): background image cover-fit + dark overlay for text legibility, prompt title (accent color, small caps), reply body wrapped with `wrapLines(ctx.measureText…)` at 64px/1.5 (story 72px), author + date, footer "곡반정와드 · 함께 생각하기". `이미지 저장` → `canvas.toBlob` → download `gokbanjung-<slug>.png`; `공유` shown when `navigator.canShare?.({files:[file]})`. Add `카드로 저장` button to `ReplyItem`.
- [ ] **Step 5:** tests pass; browser: open card, switch sizes/backgrounds, save produces PNG (check a download via CDP `Page.setDownloadBehavior`).
- [ ] **Step 6:** commit `feat: quote card images for replies`.

### Task 4: Browser translation help (다국어 A)

**Files:** Create `src/components/translate-help.tsx`; Modify `src/components/shell.tsx`, `src/data/guide.ts` (section `other-languages`).

- [ ] **Step 1:** `grep -rn "notranslate\|translate=\"no\"" src public` — remove any on user content/menus (keep only on the brand name if present).
- [ ] **Step 2:** `TranslateHelp` modal with steps for Android Chrome/Samsung Internet (⋮ → 번역), iPhone Safari (주소창 `가가` → 번역), PC Chrome/Edge (주소창 번역 아이콘), all via `t()`. Add `🌐` icon button next to language buttons and a `다른 언어로 보기` item in ☰.
- [ ] **Step 3:** add guide section `other-languages` (member part) with the same steps; `tests/guide.test.ts` required-id list gains `other-languages` (update test first → FAIL → add section → PASS).
- [ ] **Step 4:** tsc/build; commit `feat: help for browser translation`.

### Task 5: i18n core (UiLang, t fallback, locales, links, 4-language switch)

**Files:** Create `src/lib/i18n.ts`, `tests/i18n.test.ts`; Modify `src/lib/types.ts`, `src/lib/lang.ts`, `src/components/provider.tsx`, `src/components/shell.tsx`, `src/components/guide/guide-page.tsx`, `src/lib/scriptures.ts`, `src/lib/curriculum.ts`, all `X[lang]` / `"ko-KR" : "en-US"` sites.

**Interfaces:**
- `type UiLang = "ko" | "en" | "es" | "fil"`; `UI_LANGS: {id: UiLang; label: string}[]` (`한국어, English, Español, Filipino`)
- `baseLang(ui: UiLang): Lang` (ko→ko, else en)
- `localeOf(ui)`: `ko-KR | en-US | es-ES | fil-PH`; `churchLangCode(ui)`: `kor | eng | spa | tgl`
- `translate(ui, ko, en, dict = DICTS): string` — ko→ko, en→en, es/fil → `dict[ui][ko] ?? en`
- Provider context adds `uiLang`, `setUiLang`, `tl(l: Localized | null | undefined): string`, `locale`; keeps `lang` = `baseLang(uiLang)` so server calls stay ko/en; `t` uses `translate`.
- `initialLang` returns `UiLang` and maps `es*`→es, `fil*`/`tl*`→fil.

- [ ] **Step 1: Failing test**

```ts
// tests/i18n.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { translate, baseLang, localeOf, churchLangCode } from "../src/lib/i18n";
import { initialLang } from "../src/lib/lang";
const dict = { es: { "와드 일정": "Calendario del barrio" }, fil: {} } as const;
test("translation falls back to English, never Korean or blank", () => {
  assert.equal(translate("es", "와드 일정", "Ward calendar", dict), "Calendario del barrio");
  assert.equal(translate("fil", "와드 일정", "Ward calendar", dict), "Ward calendar");
  assert.equal(translate("es", "바뀐 문장", "Changed sentence", dict), "Changed sentence");
  assert.equal(translate("ko", "와드 일정", "Ward calendar", dict), "와드 일정");
});
test("base language, locale and church codes", () => {
  assert.equal(baseLang("fil"), "en");
  assert.equal(localeOf("es"), "es-ES");
  assert.equal(churchLangCode("fil"), "tgl");
  assert.equal(initialLang(null, ["es-MX"]), "es");
  assert.equal(initialLang(null, ["tl-PH"]), "fil");
  assert.equal(initialLang(null, ["fil"]), "fil");
  assert.equal(initialLang("fil", ["ko"]), "fil");
});
```

- [ ] **Step 2–3:** FAIL → implement `i18n.ts` (DICTS imported from `src/i18n/es.json`/`fil.json`, create both as `{}` now) and extend `initialLang`.
- [ ] **Step 4: Wire provider/shell.** Store `ggc_lang` as UiLang. Header language control: buttons `한국어 · EN · ES · FIL` on ≥768px, a `<select>` on phones. Guide page buttons use `UI_LANGS`.
- [ ] **Step 5: Codemod data access.** Replace `expr[lang]` for `Localized` values with `tl(expr)` (and `expr?.[lang]` with `tl(expr)`), `lang === "ko" ? "ko-KR" : "en-US"` with `locale`, church link builders to take `UiLang` and use `churchLangCode`. Use `grep -rn "\[lang\]" src` and fix each until `npx tsc --noEmit` passes. Non-Localized maps keyed by lang (e.g. `errors[key][lang]`) go through `t(errors[key].ko, errors[key].en)`.
- [ ] **Step 6:** full tests + build; browser: switch to ES/FIL — UI shows English (dictionaries empty) with correct dates/links; KO/EN unchanged. Commit `feat: four-language UI core`.

### Task 6: Spanish and Filipino dictionaries

**Files:** Create `scripts/i18n-extract.ts`, `src/i18n/catalog.json`, fill `src/i18n/es.json`, `src/i18n/fil.json`, `tests/i18n-catalog.test.ts`.

**Interfaces:** `extract(): Record<string, string>` (ko → en) from: TS AST calls `t("…","…")`, `L("…","…")`, object literals with exactly string `ko`/`en` properties in `src/**/*.ts(x)`; `src/data/curriculum.json` (`title`, `reference`, `sourceNote`, `translationLabel`), `card-backgrounds.json`; template literals are reported (not keyed) — convert each reported call to a literal or accept English fallback (ruling per case).

- [ ] **Step 1: Failing test**

```ts
// tests/i18n-catalog.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import catalog from "../src/i18n/catalog.json";
import es from "../src/i18n/es.json";
import fil from "../src/i18n/fil.json";
const holes = (s: string) => (s.match(/\{[^}]+\}|\d+/g) || []).sort().join(",");
test("every source string has Spanish and Filipino translations", () => {
  const keys = Object.keys(catalog);
  assert.ok(keys.length > 800, `catalog too small: ${keys.length}`);
  for (const [name, dict] of [["es", es], ["fil", fil]] as const)
    for (const k of keys) {
      const v = (dict as Record<string, string>)[k];
      assert.ok(v && v.trim(), `${name} missing: ${k}`);
      assert.equal(holes(v), holes((catalog as Record<string, string>)[k]), `${name} placeholders differ: ${k}`);
    }
});
```

- [ ] **Step 2:** write extractor; `node --import tsx scripts/i18n-extract.ts` writes catalog; test FAIL (dictionaries empty).
- [ ] **Step 3: Translate** in batches of ~150 keys: produce es/fil JSON objects (keys unchanged, natural church-context terminology: es "barrio", "Primaria", "Sociedad de Socorro", "quórum de élderes", "Escuela Dominical", "Ven, sígueme"; fil "purok"/"ward", "Primary", "Relief Society", "korum ng elder", "Sunday School", "Halina, Sumunod Ka sa Akin"). Keep numbers, `{…}`, emoji, URLs identical.
- [ ] **Step 4:** test PASS; `npm run i18n:extract` script added to package.json; commit `feat: Spanish and Filipino translations`.
- [ ] **Step 5:** browser: `/`, `/learn`, `/ward`, `/think`, `/guide` in ES and FIL — no Korean text except user content and proper nouns; screenshot 390px.

### Task 7: Migration for notes

**Files:** Create `supabase/migrations/20260928000000_notes.sql`, extend `tests/community-schema.test.ts`; Modify `scripts/editor-sql.mjs` (include every `2026092*` gokbanjung migration in order), `scripts/update-database.mjs` (apply notes migration when `ggc.verse_notes` missing; verify it).

Tables (all `if not exists`, RLS on, revoke from anon/authenticated):
- `ggc.verse_notes(id uuid pk, owner_id → actors cascade, book_id text check ~ '^[a-z-]+/[a-z0-9-]+$', chapter int 1..200, verse_start int 1..200, verse_end int ≥ verse_start ≤200, quote text ≤200 default '', body text 1..3000, author 1..50, week int null 1..52, status published/hidden, created_at)`, index `(book_id, chapter, verse_start)`.
- `ggc.verse_note_reactions(note_id, owner_id, pk both)`, `ggc.verse_note_comments(id pk, note_id cascade, owner_id, author, body 1..1500, created_at)`.
- `ggc.lesson_texts(id uuid pk default, week 1..52, lang ko/en, title 1..200, body_markdown ≤204800, source_url https, rights_note 1..300, confirmed_by → actors, status draft/published, version int default 1, created_by, created_at, updated_at, unique(week, lang, version))`.
- `ggc.text_notes(id pk, lesson_text_id → lesson_texts cascade, version int, owner_id, anchor jsonb ≤8KB, quote 1..300, body 1..3000, author, status, created_at)`, `ggc.text_note_reactions`, `ggc.text_note_comments` (same shape as verse ones).

- [ ] Steps: extend schema test (tables exist; `verse_end < verse_start` rejected; non-https `source_url` rejected) → FAIL → write SQL → PASS → regenerate editor SQL (`npm run db:editor-sql`) and re-run `tests/sql-editor-update.test.ts` (update its expected table checks to include `ggc.text_notes`) → commit `feat: tables for verse and text notes`.

### Task 8: Verse notes (3ⓐ)

**Files:** Create `src/lib/verse-notes.ts`, `tests/verse-notes.test.ts`, `src/components/notes/verse-notes.tsx`; Modify `src/lib/community-api.ts` (paths `notes/verse-list`, `notes/verse-save`, `notes/verse-delete`, `notes/verse-heart`, `notes/verse-comment`, `notes/verse-comment-delete`), `src/components/learning/week-voices.tsx`, `src/components/learning/scriptures.tsx`.

**Interfaces:** `listVerseNotes(a, params {book, chapter} | {week})`, `saveVerseNote(a, {id, book_id, chapter, verse_start, verse_end?, quote?, body, author?, week?})`, `deleteVerseNote`, `toggleVerseHeart`, `addVerseComment`, `deleteVerseComment` — same return shapes as prompts (`hearts`, `hearted`, `comments`, `mine`). Validation: book exists in `scriptureBooks`, `chapter ≤ book.chapters`, `1 ≤ verse_start ≤ verse_end ≤ 200`.

- [ ] **Step 1: Failing test** (mirrors `tests/prompts.test.ts`): guest saves note on `ot/isa` 40:31 with blank author → `익명`; idempotent id; Isaiah 67 → 400; `verse_end` 30 < 31 → 400; unknown book → 400; list by chapter returns sorted by verse; heart toggle counts; only owner/admin deletes (403 otherwise); list by `week=40` returns notes whose book/chapter is in that week's `referenceChapters`.
- [ ] **Step 2–4:** FAIL → implement (reuse `authorName`, `canAuthor`, `owned` pattern; extract a shared `threadHelpers` only if duplication exceeds ~40 lines) → PASS; wire dispatch; community-api test extended.
- [ ] **Step 5: UI.** `VerseNotes({ bookId, chapter, weekChapters? })`: chapter picker (limited to `weekChapters` on the week page), verse range inputs, optional quote (≤200, counter), body with `useLocalDraft` (key `verse:<book>:<chapter>`), list grouped by verse with the same heart/comment/delete actions as `ReplyItem` (factor `ThreadActions` from reply-item if needed), `공식 원문 열기` link via `scriptureUrl(book, chapter, uiLang, verse)`. Mount in `WeekVoices` (button `절에 의견 달기` expanding the panel) and on `/scriptures` chapter view (verse numbers become buttons that open the panel filtered to that verse).
- [ ] **Step 6:** tests/build/browser; commit `feat: verse notes`.

### Task 9: Lesson text + highlights + text notes (3ⓑ)

**Files:** Create `src/lib/text-anchor.ts`, `tests/text-anchor.test.ts`, `src/lib/lesson-texts.ts`, `tests/lesson-texts.test.ts`, `src/components/notes/lesson-text-reader.tsx`, `src/components/notes/lesson-text-editor.tsx`, `src/app/week/[number]/text/page.tsx`; Modify `community-api.ts` (`text/get`, `text/save`, `text/status`, `text/notes`, `text/note-save`, `text/note-delete`, `text/note-heart`, `text/note-comment`, `text/note-comment-delete`), `week-voices.tsx` (link when a published text exists).

**Interfaces:**
- `type Anchor = { exact: string; prefix: string; suffix: string; start: number }`
- `makeAnchor(text: string, start: number, end: number): Anchor` (prefix/suffix 32 chars)
- `locate(text: string, a: Anchor): { start: number; end: number } | null` — exact match with matching prefix/suffix preferred; else the occurrence of `exact` nearest `a.start`; else null.
- Services: `getLessonText(a, week, lang)` (published latest; editors also get drafts), `saveLessonText(a, {week, lang, title, body_markdown, source_url, rights_note, rights_confirmed: true})` — `rights_confirmed` must be `true` (else 400 `rights_required`), editors = TEACHER/ADMIN, saving a changed body of a published text creates `version+1` draft; `setLessonTextStatus`; text note CRUD like verse notes plus `version` and `anchor`.

- [ ] **Step 1: Failing tests**

```ts
// tests/text-anchor.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { makeAnchor, locate } from "../src/lib/text-anchor";
const text = "너희는 위로하라. 내 백성을 위로하라. 너희의 하나님이 말씀하시니라.";
test("finds the same sentence after edits elsewhere", () => {
  const i = text.indexOf("내 백성을");
  const a = makeAnchor(text, i, i + "내 백성을 위로하라".length);
  assert.deepEqual(locate(text, a), { start: i, end: i + 10 });
  const edited = "[1절] " + text;
  assert.equal(edited.slice(locate(edited, a)!.start, locate(edited, a)!.end), "내 백성을 위로하라");
});
test("repeated phrase resolves by context; missing phrase returns null", () => {
  const a = makeAnchor(text, 0, 7); // "너희는 위로하라"
  const hit = locate(text, a)!;
  assert.equal(hit.start, 0);
  assert.equal(locate("완전히 다른 본문", a), null);
});
```

`tests/lesson-texts.test.ts`: guest cannot save (403); teacher without `rights_confirmed` → 400; teacher saves draft → guest `getLessonText` 404; publish → guest sees body with `source_url`; note saved with anchor on version 1; teacher edits body → version 2 draft, published v1 still served until v2 published; after publishing v2 notes list includes v1 notes with `version: 1` (UI relocates or shows as 원래 문장); heart/comment/owner-delete as before.

- [ ] **Step 2–4:** FAIL → implement → PASS.
- [ ] **Step 5: Editor UI** (`/week/[n]/text?edit=1` for editors): lang select, title, source URL, rights note, big textarea with paste handler converting clipboard HTML to Markdown (port comefollowme `src/clipboard-import.js` logic into `src/lib/clipboard-markdown.ts`, keep it inert: no fetch/script), required checkbox `이 본문을 와드 사이트에 게시할 권한이 있음을 확인합니다`, preview, `임시 저장`/`게시`.
- [ ] **Step 6: Reader UI** (`/week/[n]/text`): header shows title + `출처: <link>` + rights note on every view; body rendered from Markdown to safe HTML (headings, paragraphs, lists, emphasis, links with `rel="noopener noreferrer" target="_blank"`; no raw HTML). Text selection (mouse/touch `selectionchange`) inside the body shows a floating bar `형광펜` (private, `localStorage` `ggc_hl:<textId>:<version>` list of anchors, painted as `<mark>`) and `의견 달기` (opens composer with quote prefilled ≤300). Sentences with public notes get a dotted underline; tapping opens a side panel (≥768px) or bottom sheet (phone) with those notes; unlocated notes appear under `원래 문장` with their quote. Painting uses `locate()` over the rendered plain text with a text-node walker to wrap ranges.
- [ ] **Step 7:** tests/build/browser (select text on 390px touch emulation and 1280 mouse; highlight persists after reload; note appears for a second guest); commit `feat: lesson text with highlights and anchored notes`.

### Task 10: Guide content for new features + 4-language HTML guide

**Files:** Modify `src/data/guide.ts` (member sections `cards`, `verse-notes`, `text-notes`, `languages`; operator sections `present`, `upload-text` with rights warning; db-update note mentions new tables), `scripts/guide-html.ts` (4 languages via `translate` + dictionaries; buttons KO/EN/ES/FIL), `tests/guide.test.ts` (new ids; html has 4 buttons).

- [ ] test first → FAIL → implement → `npm run i18n:extract` → translate new keys into es/fil → catalog test PASS → `npm run guide:build` → commit `docs: guide for phase 2 features in four languages`.

### Task 11: User manual in five formats

**Files:** Create `scripts/manual/seed.mts` (local demo data incl. events, prompts with replies, verse notes, a demo lesson text marked "연습용 본문"), `scripts/manual/shots.mjs` (CDP screenshots at 390×844, ko and en, into `사용설명서(사용자용)/images/<lang>/<section>.png`), `scripts/manual/build.mts`, `tests/manual.test.ts`; output `사용설명서(사용자용)/`.

**Interfaces:** `build.mts` reads member+help sections from `GUIDE`, maps sections → screenshots, then writes:
- `manual.<lang>.md` (intermediate; not shipped)
- `곡반정와드_사용설명서_한국어.docx` / `_English.docx` via the `docx` package (cover page, auto TOC field, heading styles, numbered steps, tables, images 60% width, page numbers) — follow the `document-skills:docx` skill guidance (load it first).
- PDFs by rendering the single-language print HTML in headless Edge `Page.printToPDF` (A4, margins 18mm, header/footer with page numbers) — follow `document-skills:pdf` for checks.
- HWPX via kordoc Markdown→HWPX (load `hwp` skill; if images are unsupported by the converter, insert them with `rhwp-edit` or ledger a ruling with a text placeholder "그림: …" and report it).
- `곡반정와드_사용설명서.html` — single page, 4 languages, auto language, images embedded as data URIs.
- `곡반정와드_사용설명서_전자책.html` — cover, TOC, one chapter per "page" with ◀ ▶ buttons, swipe, ←/→ keys, progress bar, remembers last page (`localStorage`), 4 languages, offline, images embedded.
- `npm run manual:build` runs seed → dev server → shots → build.

- [ ] **Step 1: Failing test** `tests/manual.test.ts`: after build, each of the 8 files exists and is > 20 KB; DOCX zip contains `word/document.xml` with the first member section title; HWPX zip contains `Contents/section0.xml` with that title; PDF header `%PDF` and page count ≥ 6 (regex `/Type /Page\b`); HTML files contain `data-set-lang="fil"` and at least 6 `<img`; e-book contains `data-page` ≥ 8.
- [ ] **Step 2–4:** implement generators until PASS.
- [ ] **Step 5: Visual QA** — render PDF pages to images and view 3 of them; open DOCX/HWPX via their skill's read/convert tools and check headings order; open both HTML files at 390/1280 in 4 languages.
- [ ] **Step 6:** commit `docs: user manual in PDF, HWPX, DOCX, HTML and e-book`.

### Task 12: Verify, review, publish

- [ ] `npm test` (expect only the pre-existing Sunday quiz failure on Sundays), `npm run build`, lint new files.
- [ ] Secret scan (same commands as phase 1 Task 14).
- [ ] Final whole-branch self-review against spec + Review Focus; ledger.
- [ ] `npm run db:editor-sql`; push to GitHub (auto-deploys); tell the user to run the new `DB업데이트_SQL편집기용.sql` in the Supabase SQL Editor **before** trying notes (other features work without it); smoke-test live `/`, `/ward`, `/think`, `/guide` in ES and FIL.
