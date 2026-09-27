# gokbanjung Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Copy the gospel-class Next.js site into `Desktop\gokbanjung` and add comefollowme's ward calendar, "함께 생각하기" prompts (replies · hearts · comments), local reply drafts and responsive tablet/mobile layout, then ship with a Korean user manual and a private GitHub repo.

**Architecture:** gospel-class stays the skeleton (Next.js 16 App Router, every write goes through `src/app/api/[...path]/route.ts`, identity = `ggc.actors`, guests via `ggc_guest` cookie). New features live in three server modules (`ward-events.ts`, `prompts.ts`, `community-api.ts`) that use `privileged()` DB transactions with explicit permission checks, plus one additive SQL migration. UI is new client components under `src/components/ward` and `src/components/think` styled with the existing CSS tokens.

**Tech Stack:** Next.js 16.3.5, React 19, TypeScript, zod 4, postgres / PGlite (local tests), Supabase Auth + Storage, lucide-react icons, node:test via tsx.

**Spec:** `docs/superpowers/specs/2026-09-27-gokbanjung-design.md`

## Global Constraints

- Source of the skeleton: `C:\Users\김홍겸\Desktop\gospel-class` — read only, never modified.
- Target folder: `C:\Users\김홍겸\Desktop\gokbanjung` (git repo already initialised on `main`).
- Shared Supabase DB: migration must be additive only — `create ... if not exists`, no `alter`/`drop` of existing objects.
- Organizations (exact ids): `all, primary, relief, elders, youth, sunday-school`.
- Limits copied from comefollowme: event title ≤160, description ≤5000, location ≤300; prompt title ≤160, question ≤3000, reading ≤10000, reference ≤200, author ≤50, reply ≤3000, reply comment ≤1500.
- Poster: original ≤5 MB (PNG/JPG/WebP), browser-compressed to long side 1600px, server accepts ≤2 MB; bucket `ggc-posters` (public read).
- Time zone for display and date input: `Asia/Seoul`; DB stores UTC.
- Local draft autosave delay: 800 ms. Background refresh for prompts/events: 30 s, paused while typing.
- Blank author → `익명`.
- Required env vars: `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Optional: `NEXT_PUBLIC_SITE_URL`, `OPENAI_API_KEY`, `OPENAI_MODEL`.
- Breakpoints: phone `<768px`, tablet `768–1199px`, desktop `≥1200px`. Touch targets ≥44px.
- Every user-visible string has Korean and English via `t(ko, en)`.
- Secrets (`.env*` except `.env.example`, `.vercel`) never committed.
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. An event that crosses midnight KST (e.g. youth overnight 20:00–08:00) must appear on both calendar days → test in Task 3.
2. An event at 08:00 KST on the 1st of a month (still the previous day in UTC) must be listed in that month → test in Task 4.
3. A double-tapped "답글 등록" must not create two replies → idempotent client id, test in Task 5.
4. A guest who never set a nickname must still be able to reply/heart/comment (gospel-class `writeData` normally rejects this) → test in Task 6.
5. Someone opening a draft event's `/e/<slug>` link (not a manager) must get "not found", not the draft → test in Task 4.

---

## File Structure

| File | Responsibility |
|---|---|
| `supabase/migrations/20260927000000_ward_community.sql` | 6 new tables, RLS on, no client grants |
| `src/lib/ward-model.ts` | Pure KST date helpers + organization list (shared by server & UI) |
| `src/lib/ward-events.ts` | Event list/read/save/status/delete, manager permissions |
| `src/lib/prompts.ts` | Prompt, reply, reply comment, heart services; `authorName` |
| `src/lib/community-api.ts` | Path dispatch for `ward/*`, `think/*`, `home/activity` |
| `src/lib/poster.ts` | Bucket name, size limit, magic-byte sniff, public URL |
| `src/lib/site-url.ts` | Origin resolution without mandatory `NEXT_PUBLIC_SITE_URL` |
| `src/lib/image-compress.ts` | Browser poster compression + upload |
| `src/app/api/poster/route.ts` | Poster upload endpoint |
| `src/components/use-local-draft.ts` | 800 ms local draft hook |
| `src/components/use-refresh.ts` | 30 s refresh with pause/visibility |
| `src/components/ward/*` | Ward calendar page, editor, detail, parts |
| `src/components/think/*` | Prompt list, editor, view, reply item |
| `src/components/community/share-tabs.tsx` | "나눔" tab bar |
| `src/components/learning/home-community.tsx` | Home cards |
| `src/components/learning/week-voices.tsx` | Week page "다른 사람들의 생각" |
| `src/components/admin/event-managers.tsx` | Admin tab for calendar managers |
| `src/app/community.css` | Styles for all new UI + tablet rail |
| `src/app/ward/page.tsx`, `src/app/e/[slug]/page.tsx`, `src/app/think/page.tsx`, `src/app/p/[slug]/page.tsx` | Routes |
| `사용설명서.html` | Korean manual |
| `1_설치확인.cmd`, `2_DB업데이트.cmd`, `3_배포.cmd` | Operator scripts |

---

### Task 1: Copy the skeleton and get a green baseline

**Files:**
- Create: everything under `C:\Users\김홍겸\Desktop\gokbanjung` copied from gospel-class
- Modify (only if baseline fails on Windows): `tests/*.test.ts` temp paths

**Interfaces:**
- Produces: a buildable, testable copy; `npm test` and `npm run build` pass.

- [ ] **Step 1: Copy with exclusions**

```powershell
robocopy "C:\Users\김홍겸\Desktop\gospel-class" "C:\Users\김홍겸\Desktop\gokbanjung" /E /XD node_modules .next .local-db .vercel .next-http-test .local-db-service-test test-results "supabase\.temp" /XF .env.local tsconfig.tsbuildinfo "*.backup-*"
```
Expected: robocopy exit code ≤ 3 (1 = files copied).

- [ ] **Step 2: Remove development-only artifacts**

```bash
cd "/c/Users/김홍겸/Desktop/gokbanjung"
rm -f docs/*.png docs/worksheet-export-test.pdf docs/http-test-results.json
rm -f public/file.svg public/globe.svg public/next.svg public/vercel.svg public/window.svg
grep -rn "file.svg\|globe.svg\|next.svg\|vercel.svg\|window.svg" src || echo "no references"
```
Expected: `no references`.

- [ ] **Step 3: Install and run baseline tests**

```bash
cd "/c/Users/김홍겸/Desktop/gokbanjung" && npm ci && npm test
```
Expected: all tests pass. If a test fails only because `mkdtemp("/tmp/...")` cannot create the directory on Windows, replace each such call with the OS temp dir and re-run:

```ts
import { tmpdir } from "node:os";
import path from "node:path";
// before: await mkdtemp("/tmp/ggc-class-members-")
await mkdtemp(path.join(tmpdir(), "ggc-class-members-"))
```

- [ ] **Step 4: Baseline build**

Run: `npm run build`
Expected: `✓ Compiled successfully` and exit code 0.

- [ ] **Step 5: Commit**

```bash
git add -A && git status --short | grep -E "\.env|\.vercel" ; git commit -qm "chore: import gospel-class skeleton

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
Expected: the grep prints only `.env.example`.

---

### Task 2: Additive migration for ward calendar and prompts

**Files:**
- Create: `supabase/migrations/20260927000000_ward_community.sql`
- Test: `tests/community-schema.test.ts`

**Interfaces:**
- Produces tables: `ggc.event_managers(actor_id, organization, created_by, created_at)`, `ggc.events(id, slug, title, description, starts_at, ends_at, location, organizations, status, poster_path, created_by, created_at, updated_at)`, `ggc.prompts(id, slug, title, question, reading_text, source_url, reference_label, week, author, poster_path, created_by, created_at, updated_at)`, `ggc.prompt_replies(id, prompt_id, owner_id, author, body, status, created_at)`, `ggc.prompt_reply_comments(id, reply_id, owner_id, author, body, created_at)`, `ggc.prompt_reply_reactions(reply_id, owner_id, created_at)`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/community-schema.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

test("ward/community tables exist with their constraints", async () => {
  process.env.LOCAL_DATABASE_PATH = await mkdtemp(path.join(tmpdir(), "ggc-schema-"));
  const { privileged } = await import("../src/lib/db");
  await privileged(async (db) => {
    const rows = await db.query<{ t: string | null }>(
      "select to_regclass(x) as t from unnest(array['ggc.event_managers','ggc.events','ggc.prompts','ggc.prompt_replies','ggc.prompt_reply_comments','ggc.prompt_reply_reactions']) x",
    );
    assert.deepEqual(rows.map((r) => r.t && String(r.t)), [
      "ggc.event_managers", "ggc.events", "ggc.prompts",
      "ggc.prompt_replies", "ggc.prompt_reply_comments", "ggc.prompt_reply_reactions",
    ]);
    const actor = (await db.query<{ id: string }>(
      "insert into ggc.actors(kind,role,nickname) values('user','ADMIN','a') returning id",
    ))[0].id;
    await assert.rejects(
      db.query(
        "insert into ggc.events(title,starts_at,ends_at,organizations,created_by) values('x','2026-10-01T10:00Z','2026-10-01T09:00Z',array['all'],$1)",
        [actor],
      ),
    );
  });
  await privileged(async (db) => {
    const actor = (await db.query<{ id: string }>(
      "insert into ggc.actors(kind,role,nickname) values('user','ADMIN','b') returning id",
    ))[0].id;
    await assert.rejects(
      db.query(
        "insert into ggc.events(title,starts_at,ends_at,organizations,created_by) values('x','2026-10-01T09:00Z','2026-10-01T10:00Z',array['choir'],$1)",
        [actor],
      ),
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import tsx --test tests/community-schema.test.ts`
Expected: FAIL — first `deepEqual` shows `null` entries.

- [ ] **Step 3: Write the migration**

```sql
-- supabase/migrations/20260927000000_ward_community.sql
-- gokbanjung: ward calendar + shared study prompts. Additive only; the
-- server reads and writes these tables through privileged transactions.
create table if not exists ggc.event_managers(
 actor_id uuid not null references ggc.actors(id) on delete cascade,
 organization text not null check(organization in ('all','primary','relief','elders','youth','sunday-school')),
 created_by uuid references ggc.actors(id) on delete set null,
 created_at timestamptz not null default now(),
 primary key(actor_id,organization)
);
create table if not exists ggc.events(
 id uuid primary key default gen_random_uuid(),
 slug text not null unique default substr(replace(gen_random_uuid()::text,'-',''),1,12) check(slug ~ '^[a-f0-9]{12}$'),
 title text not null check(char_length(btrim(title)) between 1 and 160),
 description text not null default '' check(char_length(description)<=5000),
 starts_at timestamptz not null,
 ends_at timestamptz not null,
 location text check(location is null or char_length(btrim(location)) between 1 and 300),
 organizations text[] not null check(cardinality(organizations) between 1 and 6 and organizations <@ array['all','primary','relief','elders','youth','sunday-school']::text[]),
 status text not null default 'draft' check(status in ('draft','published','cancelled')),
 poster_path text check(poster_path is null or poster_path ~ '^events/[a-f0-9-]{36}\.(webp|png|jpg)$'),
 created_by uuid references ggc.actors(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check(ends_at>starts_at)
);
create index if not exists events_time on ggc.events(starts_at,ends_at);
create table if not exists ggc.prompts(
 id uuid primary key default gen_random_uuid(),
 slug text not null unique default substr(replace(gen_random_uuid()::text,'-',''),1,12) check(slug ~ '^[a-f0-9]{12}$'),
 title text not null check(char_length(btrim(title)) between 1 and 160),
 question text not null check(char_length(btrim(question)) between 1 and 3000),
 reading_text text not null default '' check(char_length(reading_text)<=10000),
 source_url text check(source_url is null or (char_length(source_url)<=4096 and source_url ~ '^https://[^/@[:space:]]+([/?#][^[:space:]]*)?$')),
 reference_label text check(reference_label is null or char_length(btrim(reference_label)) between 1 and 200),
 week integer check(week is null or week between 1 and 52),
 author text not null check(char_length(btrim(author)) between 1 and 50),
 poster_path text check(poster_path is null or poster_path ~ '^prompts/[a-f0-9-]{36}\.(webp|png|jpg)$'),
 created_by uuid not null references ggc.actors(id) on delete cascade,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists prompts_created on ggc.prompts(created_at desc);
create index if not exists prompts_week on ggc.prompts(week);
create table if not exists ggc.prompt_replies(
 id uuid primary key,
 prompt_id uuid not null references ggc.prompts(id) on delete cascade,
 owner_id uuid not null references ggc.actors(id) on delete cascade,
 author text not null check(char_length(btrim(author)) between 1 and 50),
 body text not null check(char_length(btrim(body)) between 1 and 3000),
 status text not null default 'published' check(status in ('published','hidden')),
 created_at timestamptz not null default now()
);
create index if not exists prompt_replies_prompt on ggc.prompt_replies(prompt_id,created_at);
create table if not exists ggc.prompt_reply_comments(
 id uuid primary key,
 reply_id uuid not null references ggc.prompt_replies(id) on delete cascade,
 owner_id uuid not null references ggc.actors(id) on delete cascade,
 author text not null check(char_length(btrim(author)) between 1 and 50),
 body text not null check(char_length(btrim(body)) between 1 and 1500),
 created_at timestamptz not null default now()
);
create index if not exists prompt_reply_comments_reply on ggc.prompt_reply_comments(reply_id,created_at);
create table if not exists ggc.prompt_reply_reactions(
 reply_id uuid not null references ggc.prompt_replies(id) on delete cascade,
 owner_id uuid not null references ggc.actors(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(reply_id,owner_id)
);
alter table ggc.event_managers enable row level security;
alter table ggc.events enable row level security;
alter table ggc.prompts enable row level security;
alter table ggc.prompt_replies enable row level security;
alter table ggc.prompt_reply_comments enable row level security;
alter table ggc.prompt_reply_reactions enable row level security;
revoke all on ggc.event_managers,ggc.events,ggc.prompts,ggc.prompt_replies,ggc.prompt_reply_comments,ggc.prompt_reply_reactions from anon,authenticated;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --import tsx --test tests/community-schema.test.ts`
Expected: PASS. Then `npm test` — all pass.

- [ ] **Step 5: Teach the DB update script about the new migration and the poster bucket**

In `scripts/update-database.mjs`, directly after the `lesson_materials` block (`if (!materials.installed) ...`), add:

```js
    const [ward] = await tx`select to_regclass('ggc.events') as installed`;
    if (!ward.installed) await tx.unsafe(await read("supabase/migrations/20260927000000_ward_community.sql","utf8"));
    const [storage] = await tx`select to_regclass('storage.buckets') as installed`;
    if (storage.installed) await tx`insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('ggc-posters','ggc-posters',true,2097152,array['image/webp','image/png','image/jpeg']) on conflict(id) do nothing`;
```
and change the verification query/message to:

```js
    const [verified] =
      await tx`select to_regclass('ggc.quiz_sets') as quizzes,to_regclass('ggc.account_requests') as accounts,to_regclass('ggc.events') as events,to_regclass('ggc.prompt_reply_reactions') as prompts`;
    if (!verified.quizzes || !verified.accounts || !verified.events || !verified.prompts)
      throw new Error("Schema verification failed");
    console.log(
      "Verified: accounts, quizzes, ward calendar, shared prompts. Existing records preserved.",
    );
```
Also change the prompt text `"Update this gospel-class database? Type UPDATE: "` to `"Add gokbanjung tables to this database? Type UPDATE: "`.

In `scripts/migrate.mts`, after the existing `gospel-materials` bucket insert, add:

```ts
  await sql`insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('ggc-posters','ggc-posters',true,2097152,array['image/webp','image/png','image/jpeg']) on conflict(id) do nothing`;
```

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260927000000_ward_community.sql tests/community-schema.test.ts scripts/update-database.mjs scripts/migrate.mts
git commit -qm "feat: add ward calendar and prompt tables

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: KST date model

**Files:**
- Create: `src/lib/ward-model.ts`
- Test: `tests/ward-model.test.ts`

**Interfaces:**
- Produces:
  - `ZONE = "Asia/Seoul"`
  - `ORGANIZATIONS: readonly (readonly [id, ko, en])[]`, `ORGANIZATION_IDS` (tuple for `z.enum`), `type Organization`
  - `dayKey(value: string | Date): string` → `"YYYY-MM-DD"` in KST
  - `timeKey(value: string | Date): string` → `"HH:MM"` in KST
  - `toISO(date: string, time: string): string` (throws `Error("invalid_time")`)
  - `monthRange(year: number, month0: number): { start: string; end: string }`
  - `onDay(ev: { starts_at: string; ends_at: string }, date: string): boolean`

- [ ] **Step 1: Write the failing test**

```ts
// tests/ward-model.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { dayKey, timeKey, toISO, monthRange, onDay, ORGANIZATION_IDS } from "../src/lib/ward-model";

test("KST conversions", () => {
  assert.equal(toISO("2026-10-04", "10:00"), "2026-10-04T01:00:00.000Z");
  assert.equal(dayKey("2026-09-30T23:00:00.000Z"), "2026-10-01");
  assert.equal(timeKey("2026-09-30T23:00:00.000Z"), "08:00");
  assert.throws(() => toISO("2026-02-30", "10:00"), /invalid_time/);
  assert.throws(() => toISO("2026-10-04", "24:00"), /invalid_time/);
});

test("month range is KST midnight to KST midnight", () => {
  assert.deepEqual(monthRange(2026, 9), {
    start: "2026-09-30T15:00:00.000Z",
    end: "2026-10-31T15:00:00.000Z",
  });
  assert.deepEqual(monthRange(2026, 11).end, "2026-12-31T15:00:00.000Z");
  assert.throws(() => monthRange(2026, 12));
});

test("an overnight event appears on both days, not on the next-next day", () => {
  const ev = { starts_at: toISO("2026-10-09", "20:00"), ends_at: toISO("2026-10-10", "08:00") };
  assert.equal(onDay(ev, "2026-10-09"), true);
  assert.equal(onDay(ev, "2026-10-10"), true);
  assert.equal(onDay(ev, "2026-10-11"), false);
  const endsAtMidnight = { starts_at: toISO("2026-10-09", "20:00"), ends_at: toISO("2026-10-10", "00:00") };
  assert.equal(onDay(endsAtMidnight, "2026-10-10"), false);
});

test("organization ids are fixed", () => {
  assert.deepEqual([...ORGANIZATION_IDS], ["all", "primary", "relief", "elders", "youth", "sunday-school"]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import tsx --test tests/ward-model.test.ts`
Expected: FAIL — cannot find module `../src/lib/ward-model`.

- [ ] **Step 3: Implement**

```ts
// src/lib/ward-model.ts
// Calendar rules shared by the server and the browser (ported from
// comefollowme calendar-model.js). Korea has no daylight saving time.
export const ZONE = "Asia/Seoul";
export const ORGANIZATIONS = [
  ["all", "전 회원", "All members"],
  ["primary", "초등회", "Primary"],
  ["relief", "상호부조회", "Relief Society"],
  ["elders", "장로 정원회", "Elders quorum"],
  ["youth", "청소년", "Youth"],
  ["sunday-school", "주일학교", "Sunday School"],
] as const;
export const ORGANIZATION_IDS = ["all", "primary", "relief", "elders", "youth", "sunday-school"] as const;
export type Organization = (typeof ORGANIZATION_IDS)[number];
const OFFSET = 9 * 3600000;
export function dayKey(value: string | Date) {
  return new Date(new Date(value).getTime() + OFFSET).toISOString().slice(0, 10);
}
export function timeKey(value: string | Date) {
  return new Date(new Date(value).getTime() + OFFSET).toISOString().slice(11, 16);
}
export function toISO(date: string, time: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time))
    throw new Error("invalid_time");
  const d = new Date(`${date}T${time}:00+09:00`);
  if (!Number.isFinite(d.getTime()) || dayKey(d) !== date) throw new Error("invalid_time");
  return d.toISOString();
}
export function monthRange(year: number, month0: number) {
  if (!Number.isInteger(year) || !Number.isInteger(month0) || month0 < 0 || month0 > 11)
    throw new Error("invalid_month");
  return {
    start: new Date(Date.UTC(year, month0, 1) - OFFSET).toISOString(),
    end: new Date(Date.UTC(year, month0 + 1, 1) - OFFSET).toISOString(),
  };
}
export function onDay(ev: { starts_at: string; ends_at: string }, date: string) {
  const start = new Date(`${date}T00:00:00+09:00`).getTime();
  const end = start + 86400000;
  return new Date(ev.starts_at).getTime() < end && new Date(ev.ends_at).getTime() > start;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --import tsx --test tests/ward-model.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/ward-model.ts tests/ward-model.test.ts
git commit -qm "feat: add KST ward calendar model

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Ward event service

**Files:**
- Create: `src/lib/ward-events.ts`
- Test: `tests/ward-events.test.ts`

**Interfaces:**
- Consumes: `privileged`, `DB` (`src/lib/db.ts`); `ensure`, `AppError` (`src/lib/errors.ts`); `Actor`; `ORGANIZATION_IDS`, `monthRange`, `toISO` (Task 3).
- Produces:
  - `type WardEvent = { id; slug; title; description; starts_at; ends_at; location: string | null; organizations: string[]; status: "draft" | "published" | "cancelled"; poster_path: string | null; updated_at; can_edit: boolean }` (all dates ISO strings)
  - `canManage(managed: string[], orgs: string[]): boolean`
  - `managedOrganizations(a: Actor | null, db: DB): Promise<string[]>`
  - `canCreateEvents(a: Actor): Promise<boolean>`
  - `listEvents(a: Actor | null, params: URLSearchParams): Promise<{ items: WardEvent[]; managed: string[] }>` — params `from`, `to` (ISO); default current KST month; span ≤ 400 days
  - `getEvent(a: Actor | null, slug: string): Promise<WardEvent>` (404 `not_found` if invisible)
  - `saveEvent(a: Actor, input: unknown): Promise<WardEvent>` — input `{ id?, title, description?, date, start, end_date, end, location?, organizations, poster_path?, status: "draft"|"published" }`
  - `setEventStatus(a: Actor, input: unknown): Promise<WardEvent>` — `{ id, status: "draft"|"published"|"cancelled" }`
  - `deleteEvent(a: Actor, input: unknown): Promise<{ ok: true }>` — `{ id }`
  - `listEventManagers(a: Actor): Promise<{ users: { id; nickname; role }[]; managers: { actor_id; organization }[] }>`
  - `setEventManager(a: Actor, input: unknown): Promise<{ ok: true }>` — `{ actor_id, organization, enabled }`
  - `upcomingEvents(limit: number): Promise<WardEvent[]>` (published only, `can_edit` false)

- [ ] **Step 1: Write the failing test**

```ts
// tests/ward-events.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { Actor } from "../src/lib/types";

process.env.LOCAL_DATABASE_PATH = await mkdtemp(path.join(tmpdir(), "ggc-ward-"));
const { privileged } = await import("../src/lib/db");
const W = await import("../src/lib/ward-events");
const { AppError } = await import("../src/lib/errors");

async function make(role: Actor["role"], kind: Actor["kind"] = role === "GUEST" ? "guest" : "user"): Promise<Actor> {
  return privileged(async (db) =>
    (await db.query(
      "insert into ggc.actors(kind,role,nickname) values($1,$2,$3) returning id,kind,role,nickname,course_id",
      [kind, role, role.toLowerCase()],
    ))[0] as Actor,
  );
}
const status = (code: number) => (e: unknown) => e instanceof AppError && e.status === code;
const base = { title: "와드 바자회", description: "", date: "2026-10-10", start: "10:00", end_date: "2026-10-10", end: "13:00", location: "와드 문화관", organizations: ["all"], status: "draft" };
const october = new URLSearchParams({ from: "2026-09-30T15:00:00.000Z", to: "2026-10-31T15:00:00.000Z" });

test("drafts are private to managers; published events are public", async () => {
  const admin = await make("ADMIN"), guest = await make("GUEST");
  await assert.rejects(W.saveEvent(guest, base), status(403));
  const draft = await W.saveEvent(admin, base);
  assert.equal(draft.status, "draft");
  assert.equal(draft.starts_at, "2026-10-10T01:00:00.000Z");
  assert.equal((await W.listEvents(guest, october)).items.length, 0);
  assert.equal((await W.listEvents(null, october)).items.length, 0);
  await assert.rejects(W.getEvent(guest, draft.slug), status(404));
  assert.equal((await W.listEvents(admin, october)).items[0].can_edit, true);
  await W.setEventStatus(admin, { id: draft.id, status: "published" });
  const seen = (await W.listEvents(null, october)).items;
  assert.equal(seen.length, 1);
  assert.equal(seen[0].can_edit, false);
  assert.equal((await W.getEvent(guest, draft.slug)).title, "와드 바자회");
  await W.setEventStatus(admin, { id: draft.id, status: "cancelled" });
  assert.equal((await W.getEvent(null, draft.slug)).status, "cancelled");
  await W.deleteEvent(admin, { id: draft.id });
  await assert.rejects(W.getEvent(admin, draft.slug), status(404));
});

test("organization managers are scoped", async () => {
  const admin = await make("ADMIN"), member = await make("MEMBER"), guest = await make("GUEST");
  await assert.rejects(W.setEventManager(member, { actor_id: member.id, organization: "youth", enabled: true }), status(403));
  await assert.rejects(W.setEventManager(admin, { actor_id: guest.id, organization: "youth", enabled: true }), status(400));
  await W.setEventManager(admin, { actor_id: member.id, organization: "youth", enabled: true });
  assert.equal(await W.canCreateEvents(member), true);
  const youth = await W.saveEvent(member, { ...base, organizations: ["youth"] });
  await assert.rejects(W.saveEvent(member, { ...base, organizations: ["youth", "primary"] }), status(403));
  const primary = await W.saveEvent(admin, { ...base, organizations: ["primary"] });
  await assert.rejects(W.saveEvent(member, { ...base, id: primary.id, organizations: ["youth"] }), status(403));
  await assert.rejects(W.deleteEvent(member, { id: primary.id }), status(403));
  await W.saveEvent(member, { ...base, id: youth.id, title: "청소년 밤샘", organizations: ["youth"] });
  const managers = await W.listEventManagers(admin);
  assert.ok(managers.users.some((u) => u.id === member.id));
  assert.deepEqual(managers.managers.filter((m) => m.actor_id === member.id).map((m) => m.organization), ["youth"]);
  await W.setEventManager(admin, { actor_id: member.id, organization: "youth", enabled: false });
  assert.equal(await W.canCreateEvents(member), false);
});

test("time validation and KST month boundary", async () => {
  const admin = await make("ADMIN");
  await assert.rejects(W.saveEvent(admin, { ...base, end: "09:00" }), status(400));
  await assert.rejects(W.saveEvent(admin, { ...base, date: "2026-02-30", end_date: "2026-02-30" }), status(400));
  const early = await W.saveEvent(admin, { ...base, title: "새벽", date: "2026-11-01", start: "08:00", end_date: "2026-11-01", end: "09:00", status: "published" });
  assert.equal(early.starts_at, "2026-10-31T23:00:00.000Z");
  const nov = new URLSearchParams({ from: "2026-10-31T15:00:00.000Z", to: "2026-11-30T15:00:00.000Z" });
  assert.ok((await W.listEvents(null, nov)).items.some((e) => e.id === early.id));
  assert.ok(!(await W.listEvents(null, october)).items.some((e) => e.id === early.id));
  await assert.rejects(W.listEvents(null, new URLSearchParams({ from: "2026-01-01T00:00:00Z", to: "2028-01-01T00:00:00Z" })), status(400));
  assert.ok((await W.upcomingEvents(3)).length <= 3);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import tsx --test tests/ward-events.test.ts`
Expected: FAIL — cannot find module `../src/lib/ward-events`.

- [ ] **Step 3: Implement**

```ts
// src/lib/ward-events.ts
import { z } from "zod";
import { privileged, type DB } from "./db";
import { AppError, ensure } from "./errors";
import type { Actor } from "./types";
import { ORGANIZATION_IDS, monthRange, toISO } from "./ward-model";

export type WardEvent = {
  id: string;
  slug: string;
  title: string;
  description: string;
  starts_at: string;
  ends_at: string;
  location: string | null;
  organizations: string[];
  status: "draft" | "published" | "cancelled";
  poster_path: string | null;
  updated_at: string;
  can_edit: boolean;
};
type Row = Omit<WardEvent, "can_edit" | "starts_at" | "ends_at" | "updated_at"> & {
  starts_at: string | Date;
  ends_at: string | Date;
  updated_at: string | Date;
};
const COLUMNS =
  "id,slug,title,description,starts_at,ends_at,location,organizations,status,poster_path,updated_at";
const organization = z.enum(ORGANIZATION_IDS);
const iso = (v: string | Date) => new Date(v).toISOString();

export function canManage(managed: string[], orgs: string[]) {
  return managed.includes("all") || (orgs.length > 0 && orgs.every((o) => managed.includes(o)));
}
export async function managedOrganizations(a: Actor | null, db: DB) {
  if (!a || a.kind !== "user") return [];
  if (a.role === "ADMIN") return ["all"];
  const rows = await db.query<{ organization: string }>(
    "select organization from ggc.event_managers where actor_id=$1",
    [a.id],
  );
  return rows.map((r) => r.organization);
}
export async function canCreateEvents(a: Actor) {
  return (await privileged((db) => managedOrganizations(a, db))).length > 0;
}
function shape(row: Row, managed: string[]): WardEvent {
  return {
    ...row,
    organizations: [...row.organizations],
    starts_at: iso(row.starts_at),
    ends_at: iso(row.ends_at),
    updated_at: iso(row.updated_at),
    can_edit: canManage(managed, row.organizations),
  };
}
const visible = (e: WardEvent) => e.status !== "draft" || e.can_edit;

export async function listEvents(a: Actor | null, params: URLSearchParams) {
  const now = new Date(Date.now() + 9 * 3600000);
  const fallback = monthRange(now.getUTCFullYear(), now.getUTCMonth());
  const range = z
    .object({ from: z.iso.datetime({ offset: true }), to: z.iso.datetime({ offset: true }) })
    .safeParse({ from: params.get("from") || fallback.start, to: params.get("to") || fallback.end });
  ensure(range.success, 400, "invalid_input");
  const from = new Date(range.data.from).getTime(), to = new Date(range.data.to).getTime();
  ensure(to > from && to - from <= 400 * 86400000, 400, "invalid_input");
  return privileged(async (db) => {
    const managed = await managedOrganizations(a, db);
    const rows = await db.query<Row>(
      `select ${COLUMNS} from ggc.events where starts_at<$2 and ends_at>$1 order by starts_at limit 500`,
      [new Date(from).toISOString(), new Date(to).toISOString()],
    );
    return { items: rows.map((r) => shape(r, managed)).filter(visible), managed };
  });
}
export async function getEvent(a: Actor | null, slug: string) {
  ensure(/^[a-f0-9]{12}$/.test(slug), 404, "not_found");
  return privileged(async (db) => {
    const managed = await managedOrganizations(a, db);
    const row = (await db.query<Row>(`select ${COLUMNS} from ggc.events where slug=$1`, [slug]))[0];
    ensure(row, 404, "not_found");
    const event = shape(row, managed);
    ensure(visible(event), 404, "not_found");
    return event;
  });
}
const eventInput = z.object({
  id: z.uuid().optional(),
  title: z.string().trim().min(1).max(160),
  description: z.string().max(5000).default(""),
  date: z.string(),
  start: z.string(),
  end_date: z.string(),
  end: z.string(),
  location: z.string().trim().max(300).default(""),
  organizations: z.array(organization).min(1).max(6),
  poster_path: z.string().regex(/^events\/[a-f0-9-]{36}\.(webp|png|jpg)$/).nullable().optional(),
  status: z.enum(["draft", "published"]),
});
function times(v: z.infer<typeof eventInput>) {
  try {
    const starts = toISO(v.date, v.start), ends = toISO(v.end_date, v.end);
    ensure(new Date(ends) > new Date(starts), 400, "invalid_time");
    return [starts, ends];
  } catch (e) {
    if (e instanceof AppError) throw e;
    throw new AppError(400, "invalid_time");
  }
}
export async function saveEvent(a: Actor, input: unknown) {
  const v = eventInput.parse(input);
  const [starts, ends] = times(v);
  const organizations = [...new Set(v.organizations)];
  return privileged(async (db) => {
    const managed = await managedOrganizations(a, db);
    ensure(canManage(managed, organizations), 403, "forbidden");
    const values = [v.title, v.description, starts, ends, v.location || null, organizations, v.poster_path || null, v.status];
    if (v.id) {
      const current = (await db.query<Row>(`select ${COLUMNS} from ggc.events where id=$1`, [v.id]))[0];
      ensure(current, 404, "not_found");
      ensure(canManage(managed, current.organizations), 403, "forbidden");
      const row = (await db.query<Row>(
        `update ggc.events set title=$1,description=$2,starts_at=$3,ends_at=$4,location=$5,organizations=$6,poster_path=$7,status=$8,updated_at=now() where id=$9 returning ${COLUMNS}`,
        [...values, v.id],
      ))[0];
      return shape(row, managed);
    }
    const row = (await db.query<Row>(
      `insert into ggc.events(title,description,starts_at,ends_at,location,organizations,poster_path,status,created_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9) returning ${COLUMNS}`,
      [...values, a.id],
    ))[0];
    return shape(row, managed);
  });
}
async function editable(a: Actor, id: string, db: DB) {
  const managed = await managedOrganizations(a, db);
  const row = (await db.query<Row>(`select ${COLUMNS} from ggc.events where id=$1`, [id]))[0];
  ensure(row, 404, "not_found");
  ensure(canManage(managed, row.organizations), 403, "forbidden");
  return managed;
}
export async function setEventStatus(a: Actor, input: unknown) {
  const v = z.object({ id: z.uuid(), status: z.enum(["draft", "published", "cancelled"]) }).parse(input);
  return privileged(async (db) => {
    const managed = await editable(a, v.id, db);
    const row = (await db.query<Row>(
      `update ggc.events set status=$1,updated_at=now() where id=$2 returning ${COLUMNS}`,
      [v.status, v.id],
    ))[0];
    return shape(row, managed);
  });
}
export async function deleteEvent(a: Actor, input: unknown) {
  const v = z.object({ id: z.uuid() }).parse(input);
  return privileged(async (db) => {
    await editable(a, v.id, db);
    await db.query("delete from ggc.events where id=$1", [v.id]);
    return { ok: true as const };
  });
}
function requireAdminActor(a: Actor) {
  ensure(a.kind === "user" && a.role === "ADMIN", 403, "forbidden");
}
export async function listEventManagers(a: Actor) {
  requireAdminActor(a);
  return privileged(async (db) => ({
    users: await db.query<{ id: string; nickname: string; role: string }>(
      "select id,nickname,role from ggc.actors where kind='user' and role in ('MEMBER','TEACHER','ADMIN') order by nickname",
    ),
    managers: await db.query<{ actor_id: string; organization: string }>(
      "select actor_id,organization from ggc.event_managers order by organization",
    ),
  }));
}
export async function setEventManager(a: Actor, input: unknown) {
  requireAdminActor(a);
  const v = z.object({ actor_id: z.uuid(), organization, enabled: z.boolean() }).parse(input);
  return privileged(async (db) => {
    const target = (await db.query<{ kind: string }>("select kind from ggc.actors where id=$1", [v.actor_id]))[0];
    ensure(target?.kind === "user", 400, "invalid_input");
    if (v.enabled)
      await db.query(
        "insert into ggc.event_managers(actor_id,organization,created_by) values($1,$2,$3) on conflict do nothing",
        [v.actor_id, v.organization, a.id],
      );
    else
      await db.query("delete from ggc.event_managers where actor_id=$1 and organization=$2", [v.actor_id, v.organization]);
    return { ok: true as const };
  });
}
export async function upcomingEvents(limit: number) {
  return privileged(async (db) =>
    (await db.query<Row>(
      `select ${COLUMNS} from ggc.events where status='published' and ends_at>now() order by starts_at limit $1`,
      [Math.min(Math.max(limit, 1), 10)],
    )).map((r) => shape(r, [])),
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --import tsx --test tests/ward-events.test.ts`
Expected: PASS (3 tests). If `z.iso.datetime` is not available in the installed zod, use `z.string().datetime({ offset: true })` instead and re-run.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ward-events.ts tests/ward-events.test.ts
git commit -qm "feat: add ward event service with organization-scoped managers

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Prompt, reply, comment and heart service

**Files:**
- Create: `src/lib/prompts.ts`
- Test: `tests/prompts.test.ts`

**Interfaces:**
- Consumes: `privileged`, `ensure`, `Actor`.
- Produces:
  - `authorName(raw: string | undefined): string` (blank → `익명`, max 50 after trim enforced by zod)
  - `canAuthor(a: Actor | null): boolean` (user TEACHER/ADMIN)
  - `type Prompt = { id; slug; title; question; reading_text; source_url: string | null; reference_label: string | null; week: number | null; author; poster_path: string | null; created_at; reply_count: number; mine: boolean }`
  - `type ReplyComment = { id; reply_id; author; body; created_at; mine }`
  - `type Reply = { id; prompt_id; author; body; created_at; mine; hearts: number; hearted: boolean; comments: ReplyComment[] }`
  - `listPrompts(a: Actor | null, params: URLSearchParams): Promise<{ items: Prompt[]; canAuthor: boolean }>` (`week` optional)
  - `getPrompt(a: Actor | null, slug: string): Promise<{ prompt: Prompt; replies: Reply[]; canAuthor: boolean }>`
  - `savePrompt(a: Actor, input: unknown): Promise<Prompt>` — `{ id?, title, question, reading_text?, source_url?, reference_label?, week?, author?, poster_path? }`
  - `deletePrompt(a: Actor, input: unknown): Promise<{ ok: true }>`
  - `addReply(a: Actor, input: unknown): Promise<Reply>` — `{ id, prompt_id, author?, body }`
  - `deleteReply(a: Actor, input: unknown): Promise<{ ok: true }>`
  - `addReplyComment(a: Actor, input: unknown): Promise<ReplyComment>` — `{ id, reply_id, author?, body }`
  - `deleteReplyComment(a: Actor, input: unknown): Promise<{ ok: true }>`
  - `toggleHeart(a: Actor, input: unknown): Promise<{ hearted: boolean; hearts: number }>` — `{ reply_id }`
  - `recentActivity(): Promise<{ prompts: Prompt[]; replies: { id; author; body; created_at; prompt_slug; prompt_title }[] }>`

- [ ] **Step 1: Write the failing test**

```ts
// tests/prompts.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Actor } from "../src/lib/types";

process.env.LOCAL_DATABASE_PATH = await mkdtemp(path.join(tmpdir(), "ggc-prompts-"));
const { privileged } = await import("../src/lib/db");
const P = await import("../src/lib/prompts");
const { AppError } = await import("../src/lib/errors");

async function make(role: Actor["role"], nickname = ""): Promise<Actor> {
  const kind = role === "GUEST" ? "guest" : "user";
  return privileged(async (db) =>
    (await db.query(
      "insert into ggc.actors(kind,role,nickname) values($1,$2,$3) returning id,kind,role,nickname,course_id",
      [kind, role, nickname],
    ))[0] as Actor,
  );
}
const status = (code: number) => (e: unknown) => e instanceof AppError && e.status === code;
const question = { title: "위로의 말씀", question: "이사야 40장에서 위로가 된 구절은?", week: 40, source_url: "https://www.churchofjesuschrist.org/study/scriptures/ot/isa/40?lang=kor" };

test("authorName", () => {
  assert.equal(P.authorName("  "), "익명");
  assert.equal(P.authorName(undefined), "익명");
  assert.equal(P.authorName(" 홍길동 "), "홍길동");
});

test("only teachers and admins publish prompts; owners edit their own", async () => {
  const teacher = await make("TEACHER", "김선생"), other = await make("TEACHER", "이선생");
  const admin = await make("ADMIN", "관리자"), guest = await make("GUEST");
  await assert.rejects(P.savePrompt(guest, question), status(403));
  const p = await P.savePrompt(teacher, question);
  assert.equal(p.author, "김선생");
  assert.match(p.slug, /^[a-f0-9]{12}$/);
  await assert.rejects(P.savePrompt(other, { ...question, id: p.id, title: "x" }), status(403));
  assert.equal((await P.savePrompt(admin, { ...question, id: p.id, title: "수정됨" })).title, "수정됨");
  await assert.rejects(P.savePrompt(teacher, { ...question, source_url: "javascript:alert(1)" }));
  const list = await P.listPrompts(null, new URLSearchParams({ week: "40" }));
  assert.equal(list.canAuthor, false);
  assert.ok(list.items.some((x) => x.id === p.id));
  assert.equal((await P.listPrompts(null, new URLSearchParams({ week: "41" }))).items.length, 0);
  await assert.rejects(P.deletePrompt(guest, { id: p.id }), status(403));
});

test("replies are idempotent, anonymous by default, and deletable only by their owner", async () => {
  const teacher = await make("TEACHER", "김선생");
  const guest = await make("GUEST"), stranger = await make("GUEST");
  const p = await P.savePrompt(teacher, question);
  const id = randomUUID();
  const reply = await P.addReply(guest, { id, prompt_id: p.id, author: "", body: "40:31 독수리 날개" });
  assert.equal(reply.author, "익명");
  await P.addReply(guest, { id, prompt_id: p.id, author: "", body: "40:31 독수리 날개" });
  assert.equal((await P.getPrompt(null, p.slug)).replies.length, 1);
  await assert.rejects(P.addReply(stranger, { id, prompt_id: p.id, body: "hijack" }), status(409));
  await assert.rejects(P.addReply(guest, { id: randomUUID(), prompt_id: p.id, body: "x".repeat(3001) }));
  await assert.rejects(P.deleteReply(stranger, { id }), status(403));
  const view = await P.getPrompt(guest, p.slug);
  assert.equal(view.replies[0].mine, true);
  assert.equal(view.prompt.reply_count, 1);
  await P.deleteReply(guest, { id });
  assert.equal((await P.getPrompt(null, p.slug)).replies.length, 0);
});

test("hearts toggle and comments belong to their authors", async () => {
  const teacher = await make("TEACHER", "김선생");
  const a = await make("GUEST"), b = await make("GUEST");
  const p = await P.savePrompt(teacher, question);
  const reply = await P.addReply(a, { id: randomUUID(), prompt_id: p.id, author: "가", body: "생각" });
  assert.deepEqual(await P.toggleHeart(a, { reply_id: reply.id }), { hearted: true, hearts: 1 });
  assert.deepEqual(await P.toggleHeart(b, { reply_id: reply.id }), { hearted: true, hearts: 2 });
  assert.deepEqual(await P.toggleHeart(a, { reply_id: reply.id }), { hearted: false, hearts: 1 });
  const cid = randomUUID();
  const c = await P.addReplyComment(b, { id: cid, reply_id: reply.id, author: "나", body: "공감해요" });
  assert.equal(c.author, "나");
  await assert.rejects(P.addReplyComment(b, { id: randomUUID(), reply_id: reply.id, body: "x".repeat(1501) }));
  await assert.rejects(P.deleteReplyComment(a, { id: cid }), status(403));
  const view = await P.getPrompt(b, p.slug);
  assert.equal(view.replies[0].hearts, 1);
  assert.equal(view.replies[0].hearted, true);
  assert.equal(view.replies[0].comments[0].mine, true);
  await P.deleteReplyComment(b, { id: cid });
  const recent = await P.recentActivity();
  assert.ok(recent.prompts.length >= 1 && recent.replies.some((r) => r.id === reply.id));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import tsx --test tests/prompts.test.ts`
Expected: FAIL — cannot find module `../src/lib/prompts`.

- [ ] **Step 3: Implement**

```ts
// src/lib/prompts.ts
import { z } from "zod";
import { privileged, type DB } from "./db";
import { ensure } from "./errors";
import type { Actor } from "./types";

export type Prompt = {
  id: string; slug: string; title: string; question: string; reading_text: string;
  source_url: string | null; reference_label: string | null; week: number | null;
  author: string; poster_path: string | null; created_at: string;
  reply_count: number; mine: boolean;
};
export type ReplyComment = { id: string; reply_id: string; author: string; body: string; created_at: string; mine: boolean };
export type Reply = {
  id: string; prompt_id: string; author: string; body: string; created_at: string;
  mine: boolean; hearts: number; hearted: boolean; comments: ReplyComment[];
};
const iso = (v: unknown) => new Date(v as string).toISOString();
const PROMPT_SELECT = `select p.id,p.slug,p.title,p.question,p.reading_text,p.source_url,p.reference_label,p.week,p.author,p.poster_path,p.created_at,p.created_by,
 (select count(*) from ggc.prompt_replies r where r.prompt_id=p.id and r.status='published')::int as reply_count from ggc.prompts p`;
type PromptRow = Omit<Prompt, "mine"> & { created_by: string };
function shapePrompt(row: PromptRow, a: Actor | null): Prompt {
  const { created_by, ...rest } = row;
  return { ...rest, week: row.week === null ? null : Number(row.week), reply_count: Number(row.reply_count), created_at: iso(row.created_at), mine: !!a && created_by === a.id };
}
const author = z.string().max(50).optional();
export function authorName(raw: string | undefined) {
  return raw?.trim() || "익명";
}
export function canAuthor(a: Actor | null) {
  return !!a && a.kind === "user" && ["TEACHER", "ADMIN"].includes(a.role);
}
const isAdmin = (a: Actor) => a.kind === "user" && a.role === "ADMIN";

export async function listPrompts(a: Actor | null, params: URLSearchParams) {
  const week = params.get("week") ? z.coerce.number().int().min(1).max(52).parse(params.get("week")) : null;
  return privileged(async (db) => ({
    items: (await db.query<PromptRow>(
      `${PROMPT_SELECT} where ($1::int is null or p.week=$1) order by p.created_at desc limit 100`,
      [week],
    )).map((r) => shapePrompt(r, a)),
    canAuthor: canAuthor(a),
  }));
}
export async function getPrompt(a: Actor | null, slug: string) {
  ensure(/^[a-f0-9]{12}$/.test(slug), 404, "not_found");
  return privileged(async (db) => {
    const row = (await db.query<PromptRow>(`${PROMPT_SELECT} where p.slug=$1`, [slug]))[0];
    ensure(row, 404, "not_found");
    const me = a?.id || null;
    const replies = await db.query<Record<string, unknown>>(
      `select r.id,r.prompt_id,r.author,r.body,r.created_at,r.owner_id=$2 as mine,
        (select count(*) from ggc.prompt_reply_reactions x where x.reply_id=r.id)::int as hearts,
        exists(select 1 from ggc.prompt_reply_reactions x where x.reply_id=r.id and x.owner_id=$2) as hearted
       from ggc.prompt_replies r where r.prompt_id=$1 and r.status='published' order by r.created_at,r.id`,
      [row.id, me],
    );
    const comments = await db.query<Record<string, unknown>>(
      `select c.id,c.reply_id,c.author,c.body,c.created_at,c.owner_id=$2 as mine from ggc.prompt_reply_comments c
       join ggc.prompt_replies r on r.id=c.reply_id where r.prompt_id=$1 order by c.created_at,c.id`,
      [row.id, me],
    );
    return {
      prompt: shapePrompt(row, a),
      canAuthor: canAuthor(a),
      replies: replies.map((r) => ({
        ...r,
        created_at: iso(r.created_at),
        mine: r.mine === true,
        hearted: r.hearted === true,
        hearts: Number(r.hearts),
        comments: comments
          .filter((c) => c.reply_id === r.id)
          .map((c) => ({ ...c, created_at: iso(c.created_at), mine: c.mine === true })),
      })) as Reply[],
    };
  });
}
const promptInput = z.object({
  id: z.uuid().optional(),
  title: z.string().trim().min(1).max(160),
  question: z.string().trim().min(1).max(3000),
  reading_text: z.string().max(10000).default(""),
  source_url: z.string().max(4096).regex(/^https:\/\/[^/@\s]+([/?#]\S*)?$/).nullable().optional(),
  reference_label: z.string().trim().max(200).optional(),
  week: z.number().int().min(1).max(52).nullable().optional(),
  author,
  poster_path: z.string().regex(/^prompts\/[a-f0-9-]{36}\.(webp|png|jpg)$/).nullable().optional(),
});
export async function savePrompt(a: Actor, input: unknown) {
  ensure(canAuthor(a), 403, "forbidden");
  const v = promptInput.parse(input);
  const values = [
    v.title, v.question, v.reading_text, v.source_url || null, v.reference_label || null,
    v.week ?? null, authorName(v.author || a.nickname), v.poster_path || null,
  ];
  return privileged(async (db) => {
    let id = v.id;
    if (id) {
      const owner = (await db.query<{ created_by: string }>("select created_by from ggc.prompts where id=$1", [id]))[0];
      ensure(owner, 404, "not_found");
      ensure(owner.created_by === a.id || isAdmin(a), 403, "forbidden");
      await db.query(
        "update ggc.prompts set title=$1,question=$2,reading_text=$3,source_url=$4,reference_label=$5,week=$6,author=$7,poster_path=$8,updated_at=now() where id=$9",
        [...values, id],
      );
    } else {
      id = (await db.query<{ id: string }>(
        "insert into ggc.prompts(title,question,reading_text,source_url,reference_label,week,author,poster_path,created_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9) returning id",
        [...values, a.id],
      ))[0].id;
    }
    return shapePrompt((await db.query<PromptRow>(`${PROMPT_SELECT} where p.id=$1`, [id]))[0], a);
  });
}
async function owned(db: DB, table: string, id: string, a: Actor, ownerColumn = "owner_id") {
  const row = (await db.query<{ owner: string }>(`select ${ownerColumn} as owner from ${table} where id=$1`, [id]))[0];
  ensure(row, 404, "not_found");
  ensure(row.owner === a.id || isAdmin(a), 403, "forbidden");
}
export async function deletePrompt(a: Actor, input: unknown) {
  const v = z.object({ id: z.uuid() }).parse(input);
  return privileged(async (db) => {
    await owned(db, "ggc.prompts", v.id, a, "created_by");
    await db.query("delete from ggc.prompts where id=$1", [v.id]);
    return { ok: true as const };
  });
}
export async function addReply(a: Actor, input: unknown) {
  const v = z.object({ id: z.uuid(), prompt_id: z.uuid(), author, body: z.string().trim().min(1).max(3000) }).parse(input);
  return privileged(async (db) => {
    ensure((await db.query("select 1 from ggc.prompts where id=$1", [v.prompt_id]))[0], 404, "not_found");
    await db.query(
      "insert into ggc.prompt_replies(id,prompt_id,owner_id,author,body) values($1,$2,$3,$4,$5) on conflict(id) do nothing",
      [v.id, v.prompt_id, a.id, authorName(v.author), v.body],
    );
    const row = (await db.query<Record<string, unknown>>(
      "select id,prompt_id,author,body,created_at,owner_id from ggc.prompt_replies where id=$1",
      [v.id],
    ))[0];
    ensure(row.owner_id === a.id && row.prompt_id === v.prompt_id, 409, "conflict");
    return { id: v.id, prompt_id: v.prompt_id, author: String(row.author), body: String(row.body), created_at: iso(row.created_at), mine: true, hearts: 0, hearted: false, comments: [] } as Reply;
  });
}
export async function deleteReply(a: Actor, input: unknown) {
  const v = z.object({ id: z.uuid() }).parse(input);
  return privileged(async (db) => {
    await owned(db, "ggc.prompt_replies", v.id, a);
    await db.query("delete from ggc.prompt_replies where id=$1", [v.id]);
    return { ok: true as const };
  });
}
export async function addReplyComment(a: Actor, input: unknown) {
  const v = z.object({ id: z.uuid(), reply_id: z.uuid(), author, body: z.string().trim().min(1).max(1500) }).parse(input);
  return privileged(async (db) => {
    ensure((await db.query("select 1 from ggc.prompt_replies where id=$1 and status='published'", [v.reply_id]))[0], 404, "not_found");
    await db.query(
      "insert into ggc.prompt_reply_comments(id,reply_id,owner_id,author,body) values($1,$2,$3,$4,$5) on conflict(id) do nothing",
      [v.id, v.reply_id, a.id, authorName(v.author), v.body],
    );
    const row = (await db.query<Record<string, unknown>>(
      "select id,reply_id,author,body,created_at,owner_id from ggc.prompt_reply_comments where id=$1",
      [v.id],
    ))[0];
    ensure(row.owner_id === a.id, 409, "conflict");
    return { id: v.id, reply_id: v.reply_id, author: String(row.author), body: String(row.body), created_at: iso(row.created_at), mine: true } as ReplyComment;
  });
}
export async function deleteReplyComment(a: Actor, input: unknown) {
  const v = z.object({ id: z.uuid() }).parse(input);
  return privileged(async (db) => {
    await owned(db, "ggc.prompt_reply_comments", v.id, a);
    await db.query("delete from ggc.prompt_reply_comments where id=$1", [v.id]);
    return { ok: true as const };
  });
}
export async function toggleHeart(a: Actor, input: unknown) {
  const v = z.object({ reply_id: z.uuid() }).parse(input);
  return privileged(async (db) => {
    ensure((await db.query("select 1 from ggc.prompt_replies where id=$1 and status='published'", [v.reply_id]))[0], 404, "not_found");
    const removed = await db.query("delete from ggc.prompt_reply_reactions where reply_id=$1 and owner_id=$2 returning reply_id", [v.reply_id, a.id]);
    if (!removed.length)
      await db.query("insert into ggc.prompt_reply_reactions(reply_id,owner_id) values($1,$2) on conflict do nothing", [v.reply_id, a.id]);
    const hearts = Number((await db.query<{ n: number }>("select count(*)::int as n from ggc.prompt_reply_reactions where reply_id=$1", [v.reply_id]))[0].n);
    return { hearted: !removed.length, hearts };
  });
}
export async function recentActivity() {
  return privileged(async (db) => ({
    prompts: (await db.query<PromptRow>(`${PROMPT_SELECT} order by p.created_at desc limit 3`)).map((r) => shapePrompt(r, null)),
    replies: (await db.query<Record<string, unknown>>(
      `select r.id,r.author,left(r.body,140) as body,r.created_at,p.slug as prompt_slug,p.title as prompt_title
       from ggc.prompt_replies r join ggc.prompts p on p.id=r.prompt_id where r.status='published' order by r.created_at desc limit 3`,
    )).map((r) => ({ ...r, created_at: iso(r.created_at) })) as {
      id: string; author: string; body: string; created_at: string; prompt_slug: string; prompt_title: string;
    }[],
  }));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --import tsx --test tests/prompts.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/prompts.ts tests/prompts.test.ts
git commit -qm "feat: add shared prompts with replies, hearts and comments

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: API wiring, origin helper, poster upload

**Files:**
- Create: `src/lib/community-api.ts`, `src/lib/site-url.ts`, `src/lib/poster.ts`, `src/app/api/poster/route.ts`
- Modify: `src/app/api/[...path]/route.ts` (origin check + community dispatch), `src/app/api/upload/route.ts` (origin check), `next.config.ts` (CSP img-src)
- Test: `tests/community-api.test.ts`, `tests/site-url.test.ts`

**Interfaces:**
- Consumes: Task 4 and Task 5 exports; `actor`, `AppError`, `rateLimit`.
- Produces:
  - `isCommunityPath(path: string): boolean`
  - `communityRead(a: Actor | null, path: string, params: URLSearchParams): Promise<unknown>` — `ward/events`, `ward/event?slug=`, `ward/managers`, `think/prompts`, `think/prompt?slug=`, `home/activity`
  - `communityWrite(a: Actor, path: string, input: unknown): Promise<unknown>` — `ward/save`, `ward/status`, `ward/delete`, `ward/manager`, `think/save`, `think/delete`, `think/reply`, `think/reply-delete`, `think/comment`, `think/comment-delete`, `think/heart`
  - `siteOrigin(headers: Headers, requestUrl: string, env?: Record<string, string | undefined>): string`
  - `sameOrigin(headers: Headers, requestUrl: string, env?): boolean`
  - `POSTER_BUCKET = "ggc-posters"`, `POSTER_MAX = 2 * 1024 * 1024`, `sniffImage(bytes: Uint8Array): "png" | "jpg" | "webp" | null`, `posterUrl(path: string | null, base?: string): string | null`
  - HTTP `POST /api/poster?kind=events|prompts` (multipart `file`) → `{ path }`

- [ ] **Step 1: Write the failing tests**

```ts
// tests/site-url.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { siteOrigin, sameOrigin } from "../src/lib/site-url";
import { sniffImage, posterUrl } from "../src/lib/poster";

const h = (x: Record<string, string>) => new Headers(x);
test("origin comes from explicit setting, then forwarded host, then request url", () => {
  assert.equal(siteOrigin(h({}), "http://localhost:3000/api/x", { NEXT_PUBLIC_SITE_URL: "https://ward.example/" }), "https://ward.example");
  assert.equal(siteOrigin(h({ "x-forwarded-host": "gokbanjung.vercel.app", "x-forwarded-proto": "https" }), "http://internal/api/x", {}), "https://gokbanjung.vercel.app");
  assert.equal(siteOrigin(h({}), "http://localhost:3000/api/x", {}), "http://localhost:3000");
  assert.equal(sameOrigin(h({ origin: "https://evil.example", "x-forwarded-host": "gokbanjung.vercel.app", "x-forwarded-proto": "https" }), "http://internal/", {}), false);
  assert.equal(sameOrigin(h({ origin: "https://gokbanjung.vercel.app", "x-forwarded-host": "gokbanjung.vercel.app", "x-forwarded-proto": "https" }), "http://internal/", {}), true);
  assert.equal(sameOrigin(h({}), "http://localhost:3000/", {}), false);
});
test("poster helpers", () => {
  assert.equal(sniffImage(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), "png");
  assert.equal(sniffImage(new Uint8Array([0xff, 0xd8, 0xff, 0xe0])), "jpg");
  assert.equal(sniffImage(new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 ")), "webp");
  assert.equal(sniffImage(new TextEncoder().encode("<svg>")), null);
  assert.equal(posterUrl("events/a.webp", "https://x.supabase.co"), "https://x.supabase.co/storage/v1/object/public/ggc-posters/events/a.webp");
  assert.equal(posterUrl(null, "https://x.supabase.co"), null);
});
```

```ts
// tests/community-api.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Actor } from "../src/lib/types";

process.env.LOCAL_DATABASE_PATH = await mkdtemp(path.join(tmpdir(), "ggc-api-"));
const { privileged } = await import("../src/lib/db");
const C = await import("../src/lib/community-api");
const { AppError } = await import("../src/lib/errors");

test("dispatch covers community paths and lets nickname-less guests participate", async () => {
  assert.equal(C.isCommunityPath("ward/events"), true);
  assert.equal(C.isCommunityPath("think/reply"), true);
  assert.equal(C.isCommunityPath("home/activity"), true);
  assert.equal(C.isCommunityPath("reflection"), false);
  const [teacher, guest] = await privileged(async (db) => [
    (await db.query("insert into ggc.actors(kind,role,nickname) values('user','TEACHER','김선생') returning id,kind,role,nickname,course_id"))[0],
    (await db.query("insert into ggc.actors(kind,role,nickname) values('guest','GUEST','') returning id,kind,role,nickname,course_id"))[0],
  ]) as Actor[];
  const prompt = (await C.communityWrite(teacher, "think/save", { title: "질문", question: "무엇을 배웠나요?" })) as { id: string; slug: string };
  const reply = (await C.communityWrite(guest, "think/reply", { id: randomUUID(), prompt_id: prompt.id, body: "배움" })) as { id: string; author: string };
  assert.equal(reply.author, "익명");
  assert.deepEqual(await C.communityWrite(guest, "think/heart", { reply_id: reply.id }), { hearted: true, hearts: 1 });
  const view = (await C.communityRead(null, "think/prompt", new URLSearchParams({ slug: prompt.slug }))) as { replies: unknown[] };
  assert.equal(view.replies.length, 1);
  await assert.rejects(C.communityRead(null, "ward/nope", new URLSearchParams()), (e) => e instanceof AppError && e.status === 404);
  await assert.rejects(C.communityRead(null, "ward/managers", new URLSearchParams()), (e) => e instanceof AppError && e.status === 401);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --import tsx --test tests/site-url.test.ts tests/community-api.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement helpers and dispatch**

```ts
// src/lib/site-url.ts
// NEXT_PUBLIC_SITE_URL is optional. Browsers cannot forge Host/X-Forwarded-Host
// on cross-site requests, so the forwarded host is a safe CSRF reference.
type Env = Record<string, string | undefined>;
export function siteOrigin(headers: Headers, requestUrl: string, env: Env = process.env) {
  const explicit = env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return new URL(explicit).origin;
  const host = headers.get("x-forwarded-host") || headers.get("host");
  if (host) {
    const proto = headers.get("x-forwarded-proto") || new URL(requestUrl).protocol.replace(":", "");
    return `${proto}://${host}`;
  }
  return new URL(requestUrl).origin;
}
export function sameOrigin(headers: Headers, requestUrl: string, env: Env = process.env) {
  const origin = headers.get("origin");
  return !!origin && origin === siteOrigin(headers, requestUrl, env);
}
```

```ts
// src/lib/poster.ts
export const POSTER_BUCKET = "ggc-posters";
export const POSTER_MAX = 2 * 1024 * 1024;
export function sniffImage(b: Uint8Array): "png" | "jpg" | "webp" | null {
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "png";
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
  if (b.length >= 12 && String.fromCharCode(...b.slice(0, 4)) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP") return "webp";
  return null;
}
export function posterUrl(path: string | null, base = process.env.NEXT_PUBLIC_SUPABASE_URL) {
  if (!path || !base) return null;
  return `${base.replace(/\/$/, "")}/storage/v1/object/public/${POSTER_BUCKET}/${path}`;
}
```

```ts
// src/lib/community-api.ts
import { ensure, AppError } from "./errors";
import type { Actor } from "./types";

export function isCommunityPath(path: string) {
  return path.startsWith("ward/") || path.startsWith("think/") || path === "home/activity";
}
export async function communityRead(a: Actor | null, path: string, params: URLSearchParams) {
  const W = await import("./ward-events");
  const P = await import("./prompts");
  switch (path) {
    case "ward/events":
      return W.listEvents(a, params);
    case "ward/event":
      return W.getEvent(a, params.get("slug") || "");
    case "ward/managers":
      ensure(a, 401, "session_required");
      return W.listEventManagers(a);
    case "think/prompts":
      return P.listPrompts(a, params);
    case "think/prompt":
      return P.getPrompt(a, params.get("slug") || "");
    case "home/activity":
      return { events: await W.upcomingEvents(3), ...(await P.recentActivity()) };
    default:
      throw new AppError(404, "not_found");
  }
}
// Community writes skip gospel-class's nickname requirement on purpose:
// comefollowme lets anyone reply, heart or comment and shows "익명".
export async function communityWrite(a: Actor, path: string, input: unknown) {
  const { rateLimit } = await import("./service");
  await rateLimit("community:" + a.id, 120, 60);
  const W = await import("./ward-events");
  const P = await import("./prompts");
  const handlers: Record<string, (a: Actor, input: unknown) => Promise<unknown>> = {
    "ward/save": W.saveEvent,
    "ward/status": W.setEventStatus,
    "ward/delete": W.deleteEvent,
    "ward/manager": W.setEventManager,
    "think/save": P.savePrompt,
    "think/delete": P.deletePrompt,
    "think/reply": P.addReply,
    "think/reply-delete": P.deleteReply,
    "think/comment": P.addReplyComment,
    "think/comment-delete": P.deleteReplyComment,
    "think/heart": P.toggleHeart,
  };
  const handler = handlers[path];
  ensure(handler, 404, "not_found");
  return handler(a, input);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --import tsx --test tests/site-url.test.ts tests/community-api.test.ts`
Expected: PASS.

- [ ] **Step 5: Wire into the catch-all route**

In `src/app/api/[...path]/route.ts`:

Add imports at the top:
```ts
import { sameOrigin, siteOrigin } from "@/lib/site-url";
import { isCommunityPath, communityRead, communityWrite } from "@/lib/community-api";
```

Directly before `if (request.method === "GET")\n      return json(\n        await readData(` insert:
```ts
    if (request.method === "GET" && isCommunityPath(path)) {
      let viewer = null;
      try {
        viewer = await actor();
      } catch (e) {
        if (!(e instanceof AppError && e.status === 401)) throw e;
      }
      return json(await communityRead(viewer, path, request.nextUrl.searchParams));
    }
```

Replace
```ts
    const expected = new URL(process.env.NEXT_PUBLIC_SITE_URL || request.url)
      .origin;
    ensure(request.headers.get("origin") === expected, 403, "origin_rejected");
```
with
```ts
    const expected = siteOrigin(request.headers, request.url);
    ensure(sameOrigin(request.headers, request.url), 403, "origin_rejected");
```

Directly after `const input = body ? JSON.parse(body) : {};` insert:
```ts
    if (isCommunityPath(path))
      return json(await communityWrite(await actor(), path, input));
```

In `src/app/api/upload/route.ts` replace the `ensure(req.headers.get("origin") === new URL(process.env.NEXT_PUBLIC_SITE_URL || req.url).origin,)` call with `ensure(sameOrigin(req.headers, req.url), 403, "origin_rejected");` and add `import { sameOrigin } from "@/lib/site-url";`.

- [ ] **Step 6: Poster upload route**

```ts
// src/app/api/poster/route.ts
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { actor } from "@/lib/auth";
import { rateLimit } from "@/lib/service";
import { AppError, ensure } from "@/lib/errors";
import { sameOrigin } from "@/lib/site-url";
import { POSTER_BUCKET, POSTER_MAX, sniffImage } from "@/lib/poster";
import { canCreateEvents } from "@/lib/ward-events";
import { canAuthor } from "@/lib/prompts";
export const runtime = "nodejs";
const TYPES = { webp: "image/webp", png: "image/png", jpg: "image/jpeg" } as const;
export async function POST(req: NextRequest) {
  try {
    ensure(sameOrigin(req.headers, req.url), 403, "origin_rejected");
    const kind = req.nextUrl.searchParams.get("kind");
    ensure(kind === "events" || kind === "prompts", 400, "invalid_input");
    const a = await actor();
    ensure(kind === "events" ? await canCreateEvents(a) : canAuthor(a), 403, "forbidden");
    await rateLimit("poster:" + a.id, 30, 3600);
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    ensure(url && key, 503, "storage_unavailable");
    ensure(Number(req.headers.get("content-length") || 0) <= POSTER_MAX + 16384, 413, "too_large");
    const file = (await req.formData()).get("file");
    ensure(file instanceof File && file.size <= POSTER_MAX, 413, "too_large");
    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = sniffImage(buffer);
    ensure(ext, 400, "invalid_file");
    const path = `${kind}/${randomUUID()}.${ext}`;
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(url!, key!, { auth: { persistSession: false, autoRefreshToken: false } });
    const { error } = await supabase.storage
      .from(POSTER_BUCKET)
      .upload(path, buffer, { contentType: TYPES[ext], cacheControl: "31536000", upsert: false });
    ensure(!error, 503, "storage_unavailable");
    return NextResponse.json({ path }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.code }, { status: e.status });
    console.error("poster_failed", { category: "internal" });
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
```

- [ ] **Step 7: Allow poster images in CSP**

In `next.config.ts` change `img-src 'self' data: blob:;` to `img-src 'self' data: blob: https://*.supabase.co;`.

- [ ] **Step 8: Verify and commit**

Run: `npm test && npx tsc --noEmit`
Expected: all pass, no type errors.

```bash
git add src/lib/community-api.ts src/lib/site-url.ts src/lib/poster.ts src/app/api tests/community-api.test.ts tests/site-url.test.ts next.config.ts
git commit -qm "feat: expose ward/think API, poster upload and automatic site origin

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Client helpers (draft, refresh, poster compression, error messages)

**Files:**
- Create: `src/components/use-local-draft.ts`, `src/components/use-refresh.ts`, `src/lib/image-compress.ts`
- Modify: `src/components/provider.tsx` (error messages)

**Interfaces:**
- Produces:
  - `useLocalDraft<T extends Record<string,string>>(key: string | null, empty: T): { value: T; setField(field: keyof T, text: string): void; clear(): void; saved: boolean; typing: boolean }`
  - `useRefresh(fn: () => void, ms: number, paused: boolean): void`
  - `uploadPoster(file: File, kind: "events" | "prompts"): Promise<string>` (throws `RequestError`)
  - `newId(): string` (crypto.randomUUID)

- [ ] **Step 1: Draft hook**

```ts
// src/components/use-local-draft.ts
"use client";
import { useCallback, useEffect, useRef, useState } from "react";
// Device-only drafts for replies/comments (comefollowme behaviour): saved
// 800 ms after typing stops and on page hide; never sent to the server.
export function useLocalDraft<T extends Record<string, string>>(key: string | null, empty: T) {
  const storageKey = key ? "ggc_local_draft:" + key : null;
  const [value, setValue] = useState<T>(empty);
  const [saved, setSaved] = useState(false);
  const [typing, setTyping] = useState(false);
  const latest = useRef(value);
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const emptyRef = useRef(empty);
  useEffect(() => {
    if (!storageKey) return;
    let next = emptyRef.current;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) next = { ...emptyRef.current, ...JSON.parse(raw) };
    } catch {}
    latest.current = next;
    dirty.current = false;
    setValue(next);
    setSaved(false);
  }, [storageKey]);
  const flush = useCallback(() => {
    clearTimeout(timer.current);
    setTyping(false);
    if (!storageKey || !dirty.current) return;
    dirty.current = false;
    try {
      const v = latest.current;
      if (Object.values(v).some((x) => x.trim())) localStorage.setItem(storageKey, JSON.stringify(v));
      else localStorage.removeItem(storageKey);
      setSaved(true);
    } catch {}
  }, [storageKey]);
  useEffect(() => {
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [flush]);
  const setField = (field: keyof T, text: string) => {
    const next = { ...latest.current, [field]: text } as T;
    latest.current = next;
    setValue(next);
    dirty.current = true;
    setSaved(false);
    setTyping(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, 800);
  };
  const clear = () => {
    clearTimeout(timer.current);
    dirty.current = false;
    setTyping(false);
    if (storageKey)
      try {
        localStorage.removeItem(storageKey);
      } catch {}
    latest.current = emptyRef.current;
    setValue(emptyRef.current);
    setSaved(false);
  };
  return { value, setField, clear, saved, typing };
}
```

- [ ] **Step 2: Refresh hook**

```ts
// src/components/use-refresh.ts
"use client";
import { useEffect, useRef } from "react";
// Background refresh every `ms`, and when the window regains focus.
// Skipped while `paused` (e.g. the user is typing) or the tab is hidden.
export function useRefresh(fn: () => void, ms: number, paused: boolean) {
  const run = useRef(fn);
  const hold = useRef(paused);
  run.current = fn;
  hold.current = paused;
  useEffect(() => {
    const tick = () => {
      if (!hold.current && document.visibilityState === "visible") run.current();
    };
    const id = setInterval(tick, ms);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("focus", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("focus", tick);
    };
  }, [ms]);
}
```

- [ ] **Step 3: Poster compression/upload**

```ts
// src/lib/image-compress.ts
import { RequestError } from "./client";
const ACCEPTED = ["image/png", "image/jpeg", "image/webp"];
function encode(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}
export async function compressImage(file: File, maxSide = 1600): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  let blob = await encode(canvas, "image/webp", 0.85);
  // Older Safari silently returns PNG for WebP requests; JPEG keeps it small.
  if (!blob || blob.type !== "image/webp") blob = await encode(canvas, "image/jpeg", 0.85);
  if (!blob) throw new RequestError("invalid_file");
  return blob;
}
export async function uploadPoster(file: File, kind: "events" | "prompts") {
  if (!ACCEPTED.includes(file.type)) throw new RequestError("invalid_file");
  if (file.size > 5 * 1024 * 1024) throw new RequestError("too_large");
  const blob = await compressImage(file);
  if (blob.size > 2 * 1024 * 1024) throw new RequestError("too_large");
  const form = new FormData();
  form.append("file", new File([blob], blob.type === "image/webp" ? "poster.webp" : "poster.jpg", { type: blob.type }));
  const response = await fetch(`/api/poster?kind=${kind}`, { method: "POST", body: form, credentials: "same-origin" });
  const data = await response.json();
  if (!response.ok) throw new RequestError(data.error || "server_error");
  return String(data.path);
}
export const newId = () => crypto.randomUUID();
```

- [ ] **Step 4: Error messages**

In `src/components/provider.tsx`, inside the `errors` object (next to `nickname_required`), add:

```ts
  invalid_time: {
    ko: "날짜와 시간을 확인해 주세요. 끝나는 시간은 시작 시간보다 늦어야 합니다.",
    en: "Check the date and time. The end must be after the start.",
  },
  invalid_file: {
    ko: "PNG·JPG·WebP 사진만 올릴 수 있습니다.",
    en: "Only PNG, JPG or WebP images can be uploaded.",
  },
  too_large: {
    ko: "파일이 너무 큽니다. 5MB 이하 사진을 골라 주세요.",
    en: "The file is too large. Choose an image under 5 MB.",
  },
  storage_unavailable: {
    ko: "사진 저장소가 아직 연결되지 않았습니다. 포스터 없이 저장할 수 있습니다.",
    en: "Image storage is not connected yet. You can save without a poster.",
  },
  conflict: {
    ko: "이미 처리된 요청입니다. 새로고침해 주세요.",
    en: "This was already handled. Please refresh.",
  },
  not_found: {
    ko: "찾을 수 없거나 아직 공개되지 않았습니다.",
    en: "Not found or not published yet.",
  },
```
If a key already exists in the object, keep the existing entry and skip the duplicate.

- [ ] **Step 5: Verify and commit**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors (warnings acceptable only if they already existed in the baseline).

```bash
git add src/components/use-local-draft.ts src/components/use-refresh.ts src/lib/image-compress.ts src/components/provider.tsx
git commit -qm "feat: add local drafts, refresh hook and poster compression

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Ward calendar UI (`/ward`, `/e/[slug]`)

**Files:**
- Create: `src/components/ward/event-parts.tsx`, `src/components/ward/event-editor.tsx`, `src/components/ward/ward-page.tsx`, `src/components/ward/event-detail.tsx`, `src/app/ward/page.tsx`, `src/app/e/[slug]/page.tsx`, `src/app/community.css`
- Modify: `src/app/layout.tsx` (import `./community.css`)

**Interfaces:**
- Consumes: `api`, `useApp` (`{ t, lang, boot, notify, error }`), `Modal`, `Confirm`, `PageTitle`, `Empty`, `WardEvent`, ward-model helpers, `posterUrl`, `uploadPoster`, `useRefresh`.
- Produces: `WardPage()`, `EventDetail({ slug })`, `EventEditor({ open, onOpenChange, event, onSaved })`, `EventCard({ event })`, `MonthGrid(...)`, `orgLabel(id, lang)`, `formatRange(event, lang)`.

- [ ] **Step 1: Shared parts**

```tsx
// src/components/ward/event-parts.tsx
"use client";
import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";
import { useApp } from "../provider";
import { ORGANIZATIONS, ZONE, dayKey, onDay } from "@/lib/ward-model";
import { posterUrl } from "@/lib/poster";
import type { WardEvent } from "@/lib/ward-events";
import type { Lang } from "@/lib/types";

export function orgLabel(id: string, lang: Lang) {
  const o = ORGANIZATIONS.find((x) => x[0] === id);
  return o ? (lang === "ko" ? o[1] : o[2]) : id;
}
export function formatRange(e: Pick<WardEvent, "starts_at" | "ends_at">, lang: Lang) {
  const locale = lang === "ko" ? "ko-KR" : "en-US";
  const date = new Intl.DateTimeFormat(locale, { timeZone: ZONE, month: "long", day: "numeric", weekday: "short" });
  const time = new Intl.DateTimeFormat(locale, { timeZone: ZONE, hour: "numeric", minute: "2-digit" });
  const sameDay = dayKey(e.starts_at) === dayKey(e.ends_at);
  return sameDay
    ? `${date.format(new Date(e.starts_at))} ${time.format(new Date(e.starts_at))} – ${time.format(new Date(e.ends_at))}`
    : `${date.format(new Date(e.starts_at))} ${time.format(new Date(e.starts_at))} – ${date.format(new Date(e.ends_at))} ${time.format(new Date(e.ends_at))}`;
}
export function StatusBadge({ status }: { status: WardEvent["status"] }) {
  const { t } = useApp();
  if (status === "published") return null;
  return (
    <span className={`event-status ${status}`}>
      {status === "draft" ? t("임시 저장", "Draft") : t("취소됨", "Cancelled")}
    </span>
  );
}
export function EventCard({ event, preview = false }: { event: WardEvent; preview?: boolean }) {
  const { lang } = useApp();
  const poster = posterUrl(event.poster_path);
  const body = (
    <>
      {poster && <img className="event-thumb" src={poster} alt="" loading="lazy" />}
      <div className="event-card-body">
        <div className="event-tags">
          {event.organizations.map((o) => (
            <span className="org-chip" key={o}>{orgLabel(o, lang)}</span>
          ))}
          <StatusBadge status={event.status} />
        </div>
        <h3>{event.title}</h3>
        <p className="event-meta"><CalendarDays size={16} aria-hidden /> {formatRange(event, lang)}</p>
        {event.location && <p className="event-meta"><MapPin size={16} aria-hidden /> {event.location}</p>}
      </div>
    </>
  );
  if (preview || !event.slug) return <article className="event-card">{body}</article>;
  return <Link className="event-card" href={`/e/${event.slug}`}>{body}</Link>;
}
export function MonthGrid({
  year, month0, events, selected, onSelect,
}: {
  year: number; month0: number; events: WardEvent[]; selected: string; onSelect: (day: string) => void;
}) {
  const { t, lang } = useApp();
  const first = new Date(Date.UTC(year, month0, 1)).getUTCDay();
  const days = new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();
  const today = dayKey(new Date());
  const names = lang === "ko" ? ["일", "월", "화", "수", "목", "금", "토"] : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const cells = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  return (
    <div className="month-grid" role="grid" aria-label={t("월간 달력", "Month calendar")}>
      {names.map((n) => <div className="month-head" key={n} role="columnheader">{n}</div>)}
      {cells.map((d, i) => {
        if (!d) return <div key={"b" + i} className="month-cell blank" />;
        const key = `${year}-${String(month0 + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        const count = events.filter((e) => onDay(e, key)).length;
        return (
          <button
            key={key}
            type="button"
            className="month-cell"
            aria-pressed={selected === key}
            aria-current={today === key ? "date" : undefined}
            aria-label={`${key} ${count ? t(`일정 ${count}개`, `${count} events`) : ""}`}
            onClick={() => onSelect(key)}
          >
            <span>{d}</span>
            {count > 0 && <i className="dot" aria-hidden>{count > 1 ? count : ""}</i>}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Editor**

```tsx
// src/components/ward/event-editor.tsx
"use client";
import { useEffect, useState } from "react";
import { useApp } from "../provider";
import { Modal } from "../ui/dialog";
import { api } from "@/lib/client";
import { ORGANIZATIONS, dayKey, timeKey } from "@/lib/ward-model";
import { uploadPoster } from "@/lib/image-compress";
import { posterUrl } from "@/lib/poster";
import type { WardEvent } from "@/lib/ward-events";
import { EventCard } from "./event-parts";

type Form = { title: string; description: string; date: string; start: string; end_date: string; end: string; location: string; organizations: string[]; poster_path: string | null };
function toForm(e: WardEvent | null, day: string): Form {
  if (!e) return { title: "", description: "", date: day, start: "10:00", end_date: day, end: "11:00", location: "", organizations: ["all"], poster_path: null };
  return { title: e.title, description: e.description, date: dayKey(e.starts_at), start: timeKey(e.starts_at), end_date: dayKey(e.ends_at), end: timeKey(e.ends_at), location: e.location || "", organizations: e.organizations, poster_path: e.poster_path };
}
export function EventEditor({
  open, onOpenChange, event, day, managed, onSaved,
}: {
  open: boolean; onOpenChange: (v: boolean) => void; event: WardEvent | null; day: string; managed: string[]; onSaved: (e: WardEvent) => void;
}) {
  const { t, lang, error, notify } = useApp();
  const [form, setForm] = useState<Form>(() => toForm(event, day));
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) {
      setForm(toForm(event, day));
      setPreview(false);
    }
  }, [open, event, day]);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const allowed = ORGANIZATIONS.filter(([id]) => managed.includes("all") || managed.includes(id));
  const toggleOrg = (id: string) =>
    set("organizations", form.organizations.includes(id) ? form.organizations.filter((x) => x !== id) : [...form.organizations, id]);
  const save = async (status: "draft" | "published") => {
    setBusy(true);
    try {
      const saved = await api<WardEvent>("ward/save", { ...form, id: event?.id, status });
      notify(status === "draft" ? t("임시 저장했습니다. 아직 공개되지 않았습니다.", "Saved as a private draft.") : t("게시했습니다.", "Published."));
      onSaved(saved);
      onOpenChange(false);
    } catch (e) {
      error(e);
    } finally {
      setBusy(false);
    }
  };
  const pickPoster = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      set("poster_path", await uploadPoster(file, "events"));
    } catch (e) {
      error(e);
    } finally {
      setBusy(false);
    }
  };
  const draft: WardEvent = {
    id: event?.id || "", slug: "", title: form.title || t("(제목 없음)", "(Untitled)"), description: form.description,
    starts_at: `${form.date}T${form.start}:00+09:00`, ends_at: `${form.end_date}T${form.end}:00+09:00`,
    location: form.location || null, organizations: form.organizations, status: "draft", poster_path: form.poster_path,
    updated_at: "", can_edit: true,
  };
  return (
    <Modal title={event ? t("일정 수정", "Edit event") : t("새 일정", "New event")} open={open} onOpenChange={onOpenChange}>
      {preview ? (
        <div className="event-preview">
          <EventCard event={draft} preview />
          {form.description && <p className="preserve">{form.description}</p>}
        </div>
      ) : (
        <form className="event-form" onSubmit={(e) => e.preventDefault()}>
          <label className="field">{t("제목", "Title")}
            <input required maxLength={160} value={form.title} onChange={(e) => set("title", e.target.value)} />
          </label>
          <div className="field-row">
            <label className="field">{t("시작 날짜", "Start date")}
              <input type="date" value={form.date} onChange={(e) => { set("date", e.target.value); if (form.end_date < e.target.value) set("end_date", e.target.value); }} />
            </label>
            <label className="field">{t("시작 시간", "Start time")}
              <input type="time" value={form.start} onChange={(e) => set("start", e.target.value)} />
            </label>
          </div>
          <div className="field-row">
            <label className="field">{t("끝 날짜", "End date")}
              <input type="date" value={form.end_date} min={form.date} onChange={(e) => set("end_date", e.target.value)} />
            </label>
            <label className="field">{t("끝 시간", "End time")}
              <input type="time" value={form.end} onChange={(e) => set("end", e.target.value)} />
            </label>
          </div>
          <label className="field">{t("장소", "Location")}
            <input maxLength={300} value={form.location} onChange={(e) => set("location", e.target.value)} />
          </label>
          <fieldset className="org-picker">
            <legend>{t("대상 조직", "Organizations")}</legend>
            {allowed.map(([id, ko, en]) => (
              <label key={id} className="org-option">
                <input type="checkbox" checked={form.organizations.includes(id)} onChange={() => toggleOrg(id)} />
                {lang === "ko" ? ko : en}
              </label>
            ))}
          </fieldset>
          <label className="field">{t("설명", "Description")}
            <textarea rows={5} maxLength={5000} value={form.description} onChange={(e) => set("description", e.target.value)} />
          </label>
          <div className="field">
            {t("포스터 (선택, 5MB 이하 PNG·JPG·WebP)", "Poster (optional, PNG/JPG/WebP ≤ 5 MB)")}
            {form.poster_path && <img className="poster-preview" src={posterUrl(form.poster_path) || ""} alt="" />}
            <div className="button-row">
              <input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={(e) => pickPoster(e.target.files?.[0])} />
              {form.poster_path && <button type="button" className="text-button" onClick={() => set("poster_path", null)}>{t("포스터 빼기", "Remove poster")}</button>}
            </div>
          </div>
        </form>
      )}
      <div className="button-row editor-actions">
        <button type="button" className="button secondary" onClick={() => setPreview(!preview)}>
          {preview ? t("다시 수정", "Back to edit") : t("게시 전 미리 보기", "Preview")}
        </button>
        <button type="button" className="button secondary" disabled={busy || !form.title.trim() || !form.organizations.length} onClick={() => save("draft")}>
          {t("임시 저장", "Save draft")}
        </button>
        <button type="button" className="button" disabled={busy || !form.title.trim() || !form.organizations.length} onClick={() => save("published")}>
          {t("게시하기", "Publish")}
        </button>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 3: Page**

```tsx
// src/components/ward/ward-page.tsx
"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, List, CalendarDays } from "lucide-react";
import { useApp } from "../provider";
import { PageTitle, Empty } from "../learning/learn";
import { api } from "@/lib/client";
import { ORGANIZATIONS, dayKey, monthRange, onDay } from "@/lib/ward-model";
import type { WardEvent } from "@/lib/ward-events";
import { useRefresh } from "../use-refresh";
import { EventCard, MonthGrid } from "./event-parts";
import { EventEditor } from "./event-editor";

export function WardPage() {
  const { t, lang, boot, error } = useApp();
  const today = dayKey(new Date());
  const [year, setYear] = useState(Number(today.slice(0, 4)));
  const [month0, setMonth0] = useState(Number(today.slice(5, 7)) - 1);
  const [selected, setSelected] = useState(today);
  const [layout, setLayout] = useState<"list" | "month">("month");
  const [org, setOrg] = useState("everyone");
  const [query, setQuery] = useState("");
  const [data, setData] = useState<{ items: WardEvent[]; managed: string[] } | null>(null);
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    if (window.matchMedia("(max-width: 767px)").matches) setLayout("list");
  }, []);
  const load = useCallback(() => {
    const r = monthRange(year, month0);
    api<{ items: WardEvent[]; managed: string[] }>(`ward/events?from=${encodeURIComponent(r.start)}&to=${encodeURIComponent(r.end)}`)
      .then(setData)
      .catch(error);
  }, [year, month0, error]);
  useEffect(() => {
    if (boot) load();
  }, [boot, load]);
  useRefresh(load, 30000, editing);
  const move = (delta: number) => {
    const d = new Date(Date.UTC(year, month0 + delta, 1));
    setYear(d.getUTCFullYear());
    setMonth0(d.getUTCMonth());
    setSelected(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`);
  };
  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.items || []).filter(
      (e) =>
        (org === "everyone" || e.organizations.includes(org) || e.organizations.includes("all")) &&
        (!q || `${e.title} ${e.location || ""} ${e.description}`.toLowerCase().includes(q)),
    );
  }, [data, org, query]);
  const dayItems = items.filter((e) => onDay(e, selected));
  const monthLabel = new Intl.DateTimeFormat(lang === "ko" ? "ko-KR" : "en-US", { year: "numeric", month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(year, month0, 1)));
  return (
    <div className="page ward-page">
      <PageTitle
        eyebrow="WARD · CALENDAR"
        title={t("와드 일정", "Ward calendar")}
        description={t("모든 시간은 한국 시간입니다. 조직을 골라 필요한 일정만 볼 수 있어요.", "All times are Korea time. Filter by organization.")}
      />
      <div className="ward-toolbar">
        <div className="month-switch">
          <button type="button" className="icon-button" aria-label={t("이전 달", "Previous month")} onClick={() => move(-1)}><ChevronLeft /></button>
          <strong>{monthLabel}</strong>
          <button type="button" className="icon-button" aria-label={t("다음 달", "Next month")} onClick={() => move(1)}><ChevronRight /></button>
        </div>
        <div className="segmented" role="group" aria-label={t("보기 방식", "View")}>
          <button type="button" aria-pressed={layout === "month"} onClick={() => setLayout("month")}><CalendarDays size={18} /> {t("달력", "Month")}</button>
          <button type="button" aria-pressed={layout === "list"} onClick={() => setLayout("list")}><List size={18} /> {t("목록", "List")}</button>
        </div>
        {!!data?.managed.length && (
          <button type="button" className="button" onClick={() => setEditing(true)}><Plus size={18} /> {t("새 일정", "New event")}</button>
        )}
      </div>
      <div className="ward-filters">
        <div className="chip-row" role="group" aria-label={t("조직 필터", "Organization filter")}>
          <button type="button" className="chip" aria-pressed={org === "everyone"} onClick={() => setOrg("everyone")}>{t("전체", "All")}</button>
          {ORGANIZATIONS.filter(([id]) => id !== "all").map(([id, ko, en]) => (
            <button type="button" key={id} className="chip" aria-pressed={org === id} onClick={() => setOrg(id)}>{lang === "ko" ? ko : en}</button>
          ))}
        </div>
        <input className="search" type="search" value={query} placeholder={t("일정 검색", "Search events")} onChange={(e) => setQuery(e.target.value)} />
      </div>
      {!data ? (
        <div className="skeleton" />
      ) : layout === "month" ? (
        <div className="ward-split">
          <MonthGrid year={year} month0={month0} events={items} selected={selected} onSelect={setSelected} />
          <section className="day-list" aria-live="polite">
            <h2>{new Intl.DateTimeFormat(lang === "ko" ? "ko-KR" : "en-US", { month: "long", day: "numeric", weekday: "long", timeZone: "UTC" }).format(new Date(selected + "T00:00:00Z"))}</h2>
            {dayItems.length ? dayItems.map((e) => <EventCard key={e.id} event={e} />) : <p className="muted">{t("이날은 일정이 없습니다.", "No events on this day.")}</p>}
          </section>
        </div>
      ) : items.length ? (
        <div className="event-list">{items.map((e) => <EventCard key={e.id} event={e} />)}</div>
      ) : (
        <Empty title={t("이번 달 일정이 없습니다.", "No events this month.")} />
      )}
      <EventEditor open={editing} onOpenChange={setEditing} event={null} day={selected} managed={data?.managed || []} onSaved={load} />
    </div>
  );
}
```

- [ ] **Step 4: Detail**

```tsx
// src/components/ward/event-detail.tsx
"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Share2, ArrowLeft } from "lucide-react";
import { useApp } from "../provider";
import { Empty } from "../learning/learn";
import { Confirm } from "../ui/dialog";
import { api, RequestError } from "@/lib/client";
import { posterUrl } from "@/lib/poster";
import type { WardEvent } from "@/lib/ward-events";
import { EventCard } from "./event-parts";
import { EventEditor } from "./event-editor";
import { dayKey } from "@/lib/ward-model";

export async function share(title: string, t: (ko: string, en: string) => string, notify: (m: string) => void) {
  const url = location.href;
  try {
    if (navigator.share) await navigator.share({ title, url });
    else {
      await navigator.clipboard.writeText(url);
      notify(t("링크를 복사했습니다.", "Link copied."));
    }
  } catch {}
}
export function EventDetail({ slug }: { slug: string }) {
  const { t, boot, error, notify } = useApp();
  const [event, setEvent] = useState<WardEvent | null>(null);
  const [missing, setMissing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [managed, setManaged] = useState<string[]>([]);
  const load = useCallback(() => {
    api<WardEvent>(`ward/event?slug=${slug}`)
      .then(setEvent)
      .catch((e) => (e instanceof RequestError && e.code === "not_found" ? setMissing(true) : error(e)));
  }, [slug, error]);
  useEffect(() => {
    if (boot) load();
  }, [boot, load]);
  useEffect(() => {
    if (event?.can_edit)
      api<{ managed: string[] }>(`ward/events?from=${encodeURIComponent(event.starts_at)}&to=${encodeURIComponent(event.ends_at)}`)
        .then((d) => setManaged(d.managed))
        .catch(() => {});
  }, [event]);
  const status = async (next: WardEvent["status"]) => {
    try {
      setEvent(await api<WardEvent>("ward/status", { id: event!.id, status: next }));
    } catch (e) {
      error(e);
    }
  };
  const remove = async () => {
    try {
      await api("ward/delete", { id: event!.id });
      location.href = "/ward";
    } catch (e) {
      error(e);
    }
  };
  if (missing) return <div className="page"><Empty title={t("일정을 찾을 수 없습니다.", "Event not found.")} body={t("삭제되었거나 아직 공개되지 않았습니다.", "It was removed or is not published yet.")} /></div>;
  if (!event) return <div className="page"><div className="skeleton" /></div>;
  const poster = posterUrl(event.poster_path);
  return (
    <div className="page event-detail">
      <Link className="text-button back-link" href="/ward"><ArrowLeft size={18} /> {t("와드 일정", "Ward calendar")}</Link>
      {poster && <img className="event-poster" src={poster} alt={t("일정 포스터", "Event poster")} />}
      <EventCard event={{ ...event, slug: "" }} preview />
      {event.description && <p className="preserve event-description">{event.description}</p>}
      <div className="button-row">
        <button type="button" className="button secondary" onClick={() => share(event.title, t, notify)}><Share2 size={18} /> {t("공유", "Share")}</button>
      </div>
      {event.can_edit && (
        <div className="manager-bar">
          <button type="button" className="button secondary" onClick={() => setEditing(true)}>{t("수정", "Edit")}</button>
          {event.status !== "published" && <button type="button" className="button" onClick={() => status("published")}>{t("게시하기", "Publish")}</button>}
          {event.status === "published" && <button type="button" className="button secondary" onClick={() => status("draft")}>{t("비공개로 되돌리기", "Unpublish")}</button>}
          {event.status !== "cancelled" && <button type="button" className="button secondary" onClick={() => status("cancelled")}>{t("일정 취소", "Cancel event")}</button>}
          <Confirm
            trigger={<button type="button" className="button danger">{t("삭제", "Delete")}</button>}
            title={t("이 일정을 삭제할까요?", "Delete this event?")}
            description={t("삭제하면 되돌릴 수 없습니다.", "This cannot be undone.")}
            onConfirm={remove}
          />
        </div>
      )}
      <EventEditor open={editing} onOpenChange={setEditing} event={event} day={dayKey(event.starts_at)} managed={managed} onSaved={(e) => setEvent(e)} />
    </div>
  );
}
```

- [ ] **Step 5: Routes and stylesheet import**

```tsx
// src/app/ward/page.tsx
import { WardPage } from "@/components/ward/ward-page";
export const metadata = { title: "와드 일정 · 곡반정와드" };
export default function Page() {
  return <WardPage />;
}
```

```tsx
// src/app/e/[slug]/page.tsx
import { EventDetail } from "@/components/ward/event-detail";
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  return <EventDetail slug={(await params).slug} />;
}
```

In `src/app/layout.tsx`, after `import "./renewal.css";` add `import "./community.css";`.

Create `src/app/community.css` with the ward styles (Task 11 appends tablet/phone rules to the same file):

```css
/* gokbanjung: ward calendar, shared prompts, share tabs. Uses the tokens in globals.css. */
.ward-toolbar,.ward-filters{display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between;margin:16px 0}
.month-switch{display:flex;align-items:center;gap:8px}
.month-switch strong{font-size:1.2rem;min-width:9ch;text-align:center}
.icon-button{min-width:44px;min-height:44px;display:inline-grid;place-items:center;border:1px solid var(--line);border-radius:12px;background:var(--surface);color:var(--ink)}
.segmented{display:inline-flex;border:1px solid var(--line);border-radius:12px;overflow:hidden}
.segmented button{min-height:44px;padding:0 14px;display:inline-flex;gap:6px;align-items:center;background:var(--surface);color:var(--ink);border:0}
.segmented button[aria-pressed=true]{background:var(--navy);color:#fff}
.chip-row{display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;scrollbar-width:none}
.chip{min-height:40px;padding:0 14px;border-radius:999px;border:1px solid var(--line);background:var(--surface);color:var(--ink);white-space:nowrap}
.chip[aria-pressed=true]{background:var(--gold);border-color:var(--gold);color:#fff}
.search{min-height:44px;border:1px solid var(--line);border-radius:12px;padding:0 14px;background:var(--surface);color:var(--ink);min-width:0;flex:1 1 200px;max-width:320px}
.ward-split{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);gap:24px;align-items:start}
.month-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px;background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:12px}
.month-head{text-align:center;font-size:.85rem;color:var(--muted);padding:4px 0}
.month-cell{position:relative;aspect-ratio:1/1;min-height:44px;border:1px solid transparent;border-radius:12px;background:var(--soft);color:var(--ink);display:grid;place-items:center;font-weight:600}
.month-cell.blank{background:transparent}
.month-cell[aria-current=date]{border-color:var(--gold)}
.month-cell[aria-pressed=true]{background:var(--navy);color:#fff}
.month-cell .dot{position:absolute;bottom:6px;left:50%;transform:translateX(-50%);min-width:8px;height:8px;border-radius:999px;background:var(--gold);font-size:0;font-style:normal}
.day-list h2{font-size:1.1rem;margin:0 0 12px}
.day-list,.event-list{display:grid;gap:12px}
.event-card{display:flex;gap:14px;padding:14px;border:1px solid var(--line);border-radius:16px;background:var(--surface);color:inherit;text-decoration:none;box-shadow:var(--shadow)}
a.event-card:hover{border-color:var(--gold)}
.event-thumb{width:84px;height:84px;object-fit:cover;border-radius:12px;flex:none}
.event-card-body{min-width:0}
.event-card h3{margin:6px 0;font-size:1.1rem;overflow-wrap:anywhere}
.event-meta{display:flex;gap:6px;align-items:center;margin:2px 0;color:var(--muted);font-size:.95rem}
.event-tags{display:flex;flex-wrap:wrap;gap:6px}
.org-chip{font-size:.8rem;padding:2px 10px;border-radius:999px;background:var(--sage);color:var(--ink)}
.event-status{font-size:.8rem;padding:2px 10px;border-radius:999px;background:#f3e3c3;color:#6b4a12}
.event-status.cancelled{background:#f4d6d6;color:#7a1f1f;text-decoration:line-through}
.event-detail .event-poster{width:100%;max-height:70vh;object-fit:contain;border-radius:18px;background:var(--soft);margin:12px 0}
.event-description{margin:16px 0;line-height:1.8}
.manager-bar{display:flex;flex-wrap:wrap;gap:8px;margin-top:20px;padding-top:16px;border-top:1px dashed var(--line)}
.back-link{display:inline-flex;gap:6px;align-items:center;min-height:44px}
.event-form{display:grid;gap:12px}
.field-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.org-picker{display:flex;flex-wrap:wrap;gap:8px;border:1px solid var(--line);border-radius:12px;padding:10px}
.org-option{display:inline-flex;gap:6px;align-items:center;min-height:40px;padding:0 8px}
.poster-preview{max-width:220px;border-radius:12px;display:block;margin:8px 0}
.editor-actions{justify-content:flex-end;margin-top:16px;flex-wrap:wrap}
.button.danger{background:#9b2c2c;color:#fff}
```

- [ ] **Step 6: Verify and commit**

Run: `npx tsc --noEmit && npm run build`
Expected: build succeeds and lists `/ward` and `/e/[slug]`.

```bash
git add src/components/ward src/app/ward src/app/e src/app/community.css src/app/layout.tsx
git commit -qm "feat: add ward calendar pages

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: "함께 생각하기" UI (`/think`, `/p/[slug]`)

**Files:**
- Create: `src/components/think/prompt-editor.tsx`, `src/components/think/reply-item.tsx`, `src/components/think/prompt-view.tsx`, `src/components/think/think-page.tsx`, `src/app/think/page.tsx`, `src/app/p/[slug]/page.tsx`
- Modify: `src/app/community.css` (append prompt styles)

**Interfaces:**
- Consumes: `Prompt`, `Reply`, `ReplyComment` (Task 5), `useLocalDraft`, `useRefresh`, `uploadPoster`, `newId`, `posterUrl`, `share` (Task 8 `event-detail.tsx`), `WeekPicker`, `PageTitle`, `Empty`, `Modal`, `Confirm`, `useApp().weeks` (each has `number`, `title`, `reference`, `sourceUrl`).
- Produces: `ThinkPage()`, `PromptView({ slug, embedded? })`, `PromptEditor({ open, onOpenChange, prompt, onSaved })`, `ReplyItem({ reply, onChange })`, `useAuthorDefault(): string`.

- [ ] **Step 1: Editor**

```tsx
// src/components/think/prompt-editor.tsx
"use client";
import { useEffect, useState } from "react";
import { useApp } from "../provider";
import { Modal } from "../ui/dialog";
import { api } from "@/lib/client";
import { uploadPoster } from "@/lib/image-compress";
import { posterUrl } from "@/lib/poster";
import type { Prompt } from "@/lib/prompts";

type Form = { title: string; question: string; reading_text: string; source_url: string; reference_label: string; week: number | null; poster_path: string | null };
const blank: Form = { title: "", question: "", reading_text: "", source_url: "", reference_label: "", week: null, poster_path: null };
export function PromptEditor({ open, onOpenChange, prompt, onSaved }: { open: boolean; onOpenChange: (v: boolean) => void; prompt: Prompt | null; onSaved: (p: Prompt) => void }) {
  const { t, lang, weeks, error, notify } = useApp();
  const [form, setForm] = useState<Form>(blank);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open)
      setForm(prompt ? { title: prompt.title, question: prompt.question, reading_text: prompt.reading_text, source_url: prompt.source_url || "", reference_label: prompt.reference_label || "", week: prompt.week, poster_path: prompt.poster_path } : blank);
  }, [open, prompt]);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const chooseWeek = (value: string) => {
    const w = weeks.find((x) => x.number === Number(value));
    setForm((f) => ({ ...f, week: w ? w.number : null, source_url: w?.sourceUrl || f.source_url, reference_label: w ? w.reference[lang] : f.reference_label }));
  };
  const save = async () => {
    setBusy(true);
    try {
      const saved = await api<Prompt>("think/save", { ...form, id: prompt?.id, source_url: form.source_url.trim() || null });
      notify(t("질문을 게시했습니다.", "Question published."));
      onSaved(saved);
      onOpenChange(false);
    } catch (e) {
      error(e);
    } finally {
      setBusy(false);
    }
  };
  const pickPoster = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      set("poster_path", await uploadPoster(file, "prompts"));
    } catch (e) {
      error(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title={prompt ? t("질문 수정", "Edit question") : t("새 질문", "New question")} open={open} onOpenChange={onOpenChange}>
      <form className="event-form" onSubmit={(e) => { e.preventDefault(); save(); }}>
        <label className="field">{t("함께 읽을 공과", "Lesson to read together")}
          <select value={form.week ?? ""} onChange={(e) => chooseWeek(e.target.value)}>
            <option value="">{t("선택 안 함", "None")}</option>
            {weeks.map((w) => <option key={w.number} value={w.number}>{w.number}. {w.title[lang]}</option>)}
          </select>
        </label>
        <label className="field">{t("제목", "Title")}<input required maxLength={160} value={form.title} onChange={(e) => set("title", e.target.value)} /></label>
        <label className="field">{t("질문", "Question")}<textarea required rows={4} maxLength={3000} value={form.question} onChange={(e) => set("question", e.target.value)} /></label>
        <label className="field">{t("읽기 자료 (선택)", "Reading (optional)")}<textarea rows={5} maxLength={10000} value={form.reading_text} onChange={(e) => set("reading_text", e.target.value)} /></label>
        <label className="field">{t("원문 주소 (https)", "Source link (https)")}<input type="url" inputMode="url" maxLength={4096} value={form.source_url} onChange={(e) => set("source_url", e.target.value)} /></label>
        <label className="field">{t("성구·자료 표시 (선택)", "Reference label (optional)")}<input maxLength={200} value={form.reference_label} onChange={(e) => set("reference_label", e.target.value)} /></label>
        <div className="field">
          {t("질문 포스터 (선택, 5MB 이하 PNG·JPG·WebP)", "Poster (optional, PNG/JPG/WebP ≤ 5 MB)")}
          {form.poster_path && <img className="poster-preview" src={posterUrl(form.poster_path) || ""} alt="" />}
          <div className="button-row">
            <input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={(e) => pickPoster(e.target.files?.[0])} />
            {form.poster_path && <button type="button" className="text-button" onClick={() => set("poster_path", null)}>{t("포스터 빼기", "Remove poster")}</button>}
          </div>
        </div>
        <div className="button-row editor-actions">
          <button type="submit" className="button" disabled={busy || !form.title.trim() || !form.question.trim()}>{t("게시하기", "Publish")}</button>
        </div>
      </form>
    </Modal>
  );
}
```

- [ ] **Step 2: Reply item (hearts + comments)**

```tsx
// src/components/think/reply-item.tsx
"use client";
import { useState } from "react";
import { Heart, MessageCircle, Trash2 } from "lucide-react";
import { useApp } from "../provider";
import { api } from "@/lib/client";
import { newId } from "@/lib/image-compress";
import type { Reply, ReplyComment } from "@/lib/prompts";
import { useLocalDraft } from "../use-local-draft";

export function useAuthorDefault() {
  const { boot } = useApp();
  if (boot?.actor.nickname) return boot.actor.nickname;
  try {
    return localStorage.getItem("ggc_author") || "";
  } catch {
    return "";
  }
}
export function rememberAuthor(name: string) {
  try {
    if (name.trim()) localStorage.setItem("ggc_author", name.trim());
  } catch {}
}
export function when(iso: string, lang: string) {
  return new Intl.DateTimeFormat(lang === "ko" ? "ko-KR" : "en-US", { timeZone: "Asia/Seoul", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(iso));
}
export function ReplyItem({ reply, onChange, onRemove }: { reply: Reply; onChange: (r: Reply) => void; onRemove: () => void }) {
  const { t, lang, boot, error } = useApp();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const author = useAuthorDefault();
  const draft = useLocalDraft(boot && open ? `${boot.actor.id}:comment:${reply.id}` : null, { author, body: "" });
  const heart = async () => {
    try {
      const r = await api<{ hearted: boolean; hearts: number }>("think/heart", { reply_id: reply.id });
      onChange({ ...reply, ...r });
    } catch (e) {
      error(e);
    }
  };
  const comment = async () => {
    setBusy(true);
    try {
      const c = await api<ReplyComment>("think/comment", { id: newId(), reply_id: reply.id, author: draft.value.author, body: draft.value.body });
      rememberAuthor(draft.value.author);
      draft.clear();
      onChange({ ...reply, comments: [...reply.comments, c] });
    } catch (e) {
      error(e);
    } finally {
      setBusy(false);
    }
  };
  const removeComment = async (id: string) => {
    try {
      await api("think/comment-delete", { id });
      onChange({ ...reply, comments: reply.comments.filter((c) => c.id !== id) });
    } catch (e) {
      error(e);
    }
  };
  const removeReply = async () => {
    try {
      await api("think/reply-delete", { id: reply.id });
      onRemove();
    } catch (e) {
      error(e);
    }
  };
  return (
    <article className="reply">
      <header><strong>{reply.author}</strong><time>{when(reply.created_at, lang)}</time></header>
      <p className="preserve">{reply.body}</p>
      <div className="reply-actions">
        <button type="button" className="reply-action" aria-pressed={reply.hearted} onClick={heart}>
          <Heart size={18} fill={reply.hearted ? "currentColor" : "none"} /> {reply.hearts}
        </button>
        <button type="button" className="reply-action" aria-expanded={open} onClick={() => setOpen(!open)}>
          <MessageCircle size={18} /> {reply.comments.length}
        </button>
        {reply.mine && (
          <button type="button" className="reply-action" aria-label={t("내 답글 삭제", "Delete my reply")} onClick={removeReply}><Trash2 size={18} /></button>
        )}
      </div>
      {open && (
        <div className="reply-comments">
          {reply.comments.map((c) => (
            <div className="reply-comment" key={c.id}>
              <strong>{c.author}</strong> <span className="preserve">{c.body}</span>
              {c.mine && <button type="button" className="text-button" onClick={() => removeComment(c.id)}>{t("삭제", "Delete")}</button>}
            </div>
          ))}
          <form className="comment-form" onSubmit={(e) => { e.preventDefault(); comment(); }}>
            <input aria-label={t("이름 (비우면 익명)", "Name (blank = anonymous)")} placeholder={t("이름 (비우면 익명)", "Name (blank = anonymous)")} maxLength={50} value={draft.value.author} onChange={(e) => draft.setField("author", e.target.value)} />
            <textarea aria-label={t("댓글", "Comment")} placeholder={t("댓글을 남겨 주세요", "Write a comment")} rows={2} maxLength={1500} value={draft.value.body} onChange={(e) => draft.setField("body", e.target.value)} />
            <div className="button-row">
              {draft.saved && <small className="muted">{t("이 기기에 임시 저장됨", "Draft saved on this device")}</small>}
              <button type="submit" className="button" disabled={busy || !draft.value.body.trim()}>{t("댓글 등록", "Post comment")}</button>
            </div>
          </form>
        </div>
      )}
    </article>
  );
}
```

- [ ] **Step 3: Prompt view (used by `/p/[slug]` and the tablet right pane)**

```tsx
// src/components/think/prompt-view.tsx
"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Share2 } from "lucide-react";
import { useApp } from "../provider";
import { Empty } from "../learning/learn";
import { Confirm } from "../ui/dialog";
import { api, RequestError } from "@/lib/client";
import { newId } from "@/lib/image-compress";
import { posterUrl } from "@/lib/poster";
import type { Prompt, Reply } from "@/lib/prompts";
import { useLocalDraft } from "../use-local-draft";
import { useRefresh } from "../use-refresh";
import { share } from "../ward/event-detail";
import { ReplyItem, rememberAuthor, useAuthorDefault } from "./reply-item";
import { PromptEditor } from "./prompt-editor";

type View = { prompt: Prompt; replies: Reply[]; canAuthor: boolean };
export function PromptView({ slug, embedded = false }: { slug: string; embedded?: boolean }) {
  const { t, boot, error, notify } = useApp();
  const [data, setData] = useState<View | null>(null);
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const author = useAuthorDefault();
  const draft = useLocalDraft(boot && data ? `${boot.actor.id}:reply:${data.prompt.id}` : null, { author, body: "" });
  const load = useCallback(() => {
    api<View>(`think/prompt?slug=${slug}`)
      .then((d) => { setData(d); setMissing(false); })
      .catch((e) => (e instanceof RequestError && e.code === "not_found" ? setMissing(true) : error(e)));
  }, [slug, error]);
  useEffect(() => {
    setData(null);
    if (boot) load();
  }, [boot, load]);
  useRefresh(load, 30000, draft.typing || !!draft.value.body.trim() || editing);
  const submit = async () => {
    if (!data) return;
    setBusy(true);
    try {
      const reply = await api<Reply>("think/reply", { id: newId(), prompt_id: data.prompt.id, author: draft.value.author, body: draft.value.body });
      rememberAuthor(draft.value.author);
      draft.clear();
      setData({ ...data, replies: [...data.replies, reply] });
    } catch (e) {
      error(e);
    } finally {
      setBusy(false);
    }
  };
  const removePrompt = async () => {
    try {
      await api("think/delete", { id: data!.prompt.id });
      location.href = "/think";
    } catch (e) {
      error(e);
    }
  };
  if (missing) return <Empty title={t("질문을 찾을 수 없습니다.", "Question not found.")} />;
  if (!data) return <div className="skeleton" />;
  const { prompt } = data;
  const poster = posterUrl(prompt.poster_path);
  const canEdit = prompt.mine || boot?.actor.role === "ADMIN";
  return (
    <div className="prompt-view">
      {!embedded && <Link className="text-button back-link" href="/think"><ArrowLeft size={18} /> {t("함께 생각하기", "Think together")}</Link>}
      {poster && <img className="event-poster" src={poster} alt={t("질문 포스터", "Question poster")} />}
      <span className="overline">{prompt.reference_label || (prompt.week ? t(`${prompt.week}주차`, `Week ${prompt.week}`) : "")}</span>
      <h2 className="prompt-title">{prompt.title}</h2>
      <p className="prompt-question preserve">{prompt.question}</p>
      {prompt.reading_text && <blockquote className="prompt-reading preserve">{prompt.reading_text}</blockquote>}
      <div className="button-row">
        {prompt.source_url && <a className="button secondary" href={prompt.source_url} target="_blank" rel="noreferrer"><ExternalLink size={18} /> {t("공식 원문 열기", "Open official source")}</a>}
        <button type="button" className="button secondary" onClick={() => { history.replaceState(null, "", `/p/${prompt.slug}`); share(prompt.title, t, notify); }}><Share2 size={18} /> {t("공유", "Share")}</button>
        {canEdit && <button type="button" className="button secondary" onClick={() => setEditing(true)}>{t("수정", "Edit")}</button>}
        {canEdit && (
          <Confirm trigger={<button type="button" className="button danger">{t("삭제", "Delete")}</button>} title={t("이 질문을 삭제할까요?", "Delete this question?")} description={t("답글과 댓글도 함께 삭제됩니다.", "Replies and comments are deleted too.")} onConfirm={removePrompt} />
        )}
      </div>
      <section className="reply-composer" aria-label={t("답글 쓰기", "Write a reply")}>
        <h3>{t("나의 생각 나누기", "Share your thought")}</h3>
        <input aria-label={t("이름 (비우면 익명)", "Name (blank = anonymous)")} placeholder={t("이름 (비우면 익명)", "Name (blank = anonymous)")} maxLength={50} value={draft.value.author} onChange={(e) => draft.setField("author", e.target.value)} />
        <textarea aria-label={t("답글", "Reply")} placeholder={t("짧은 생각도 좋아요.", "A short thought is welcome.")} rows={4} maxLength={3000} value={draft.value.body} onChange={(e) => draft.setField("body", e.target.value)} />
        <div className="button-row">
          {draft.saved && <small className="muted">{t("이 기기에 임시 저장됨 · 등록 전에는 공개되지 않아요", "Saved on this device · not public until posted")}</small>}
          <button type="button" className="button" disabled={busy || !draft.value.body.trim()} onClick={submit}>{t("답글 등록", "Post reply")}</button>
        </div>
      </section>
      <section className="replies" aria-live="polite">
        <h3>{t(`다른 사람들의 생각 ${data.replies.length}`, `Replies ${data.replies.length}`)}</h3>
        {data.replies.length ? data.replies.map((r) => (
          <ReplyItem
            key={r.id}
            reply={r}
            onChange={(next) => setData((d) => d && { ...d, replies: d.replies.map((x) => (x.id === next.id ? next : x)) })}
            onRemove={() => setData((d) => d && { ...d, replies: d.replies.filter((x) => x.id !== r.id) })}
          />
        )) : <p className="muted">{t("첫 번째 생각을 남겨 주세요.", "Be the first to share.")}</p>}
      </section>
      <PromptEditor open={editing} onOpenChange={setEditing} prompt={prompt} onSaved={() => load()} />
    </div>
  );
}
```

- [ ] **Step 4: List page with tablet two-pane**

```tsx
// src/components/think/think-page.tsx
"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, MessageCircle } from "lucide-react";
import { useApp } from "../provider";
import { PageTitle, Empty } from "../learning/learn";
import { api } from "@/lib/client";
import type { Prompt } from "@/lib/prompts";
import { useRefresh } from "../use-refresh";
import { PromptEditor } from "./prompt-editor";
import { PromptView } from "./prompt-view";
import { when } from "./reply-item";

export function ThinkPage() {
  const { t, lang, weeks, boot, error } = useApp();
  const [week, setWeek] = useState<string>("");
  const [data, setData] = useState<{ items: Prompt[]; canAuthor: boolean } | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const load = useCallback(() => {
    api<{ items: Prompt[]; canAuthor: boolean }>(`think/prompts${week ? `?week=${week}` : ""}`).then(setData).catch(error);
  }, [week, error]);
  useEffect(() => {
    if (boot) load();
  }, [boot, load]);
  useRefresh(load, 30000, editing);
  const open = (e: React.MouseEvent, slug: string) => {
    if (window.matchMedia("(min-width: 768px)").matches) {
      e.preventDefault();
      setSelected(slug);
    }
  };
  return (
    <div className="page think-page">
      <PageTitle
        eyebrow="SHARE · THINK TOGETHER"
        title={t("함께 생각하기", "Think together")}
        description={t("선생님이 올린 질문을 읽고, 로그인 없이 생각을 나눠요.", "Read a question and share your thoughts — no sign-in needed.")}
      />
      <div className="ward-toolbar">
        <label className="week-picker">{t("주차", "Week")}
          <select value={week} onChange={(e) => { setWeek(e.target.value); setSelected(null); }}>
            <option value="">{t("전체", "All")}</option>
            {weeks.map((w) => <option key={w.number} value={w.number}>{w.number}. {w.title[lang]}</option>)}
          </select>
        </label>
        {data?.canAuthor && <button type="button" className="button" onClick={() => setEditing(true)}><Plus size={18} /> {t("새 질문", "New question")}</button>}
      </div>
      {!data ? <div className="skeleton" /> : !data.items.length ? (
        <Empty title={t("아직 올라온 질문이 없습니다.", "No questions yet.")} body={t("선생님이 질문을 올리면 여기에 보여요.", "Questions from teachers will appear here.")} />
      ) : (
        <div className={`think-split${selected ? " has-selection" : ""}`}>
          <div className="prompt-list">
            {data.items.map((p) => (
              <Link key={p.id} href={`/p/${p.slug}`} className="prompt-card" aria-current={selected === p.slug ? "true" : undefined} onClick={(e) => open(e, p.slug)}>
                <span className="overline">{p.reference_label || (p.week ? t(`${p.week}주차`, `Week ${p.week}`) : "")}</span>
                <h3>{p.title}</h3>
                <p>{p.question.length > 90 ? p.question.slice(0, 90) + "…" : p.question}</p>
                <small className="muted"><MessageCircle size={14} /> {p.reply_count} · {p.author} · {when(p.created_at, lang)}</small>
              </Link>
            ))}
          </div>
          <div className="prompt-pane">
            {selected ? <PromptView key={selected} slug={selected} embedded /> : <p className="muted pane-hint">{t("왼쪽에서 질문을 고르면 여기에서 답글을 볼 수 있어요.", "Pick a question to see replies here.")}</p>}
          </div>
        </div>
      )}
      <PromptEditor open={editing} onOpenChange={setEditing} prompt={null} onSaved={() => load()} />
    </div>
  );
}
```

```tsx
// src/app/think/page.tsx
import { ThinkPage } from "@/components/think/think-page";
export const metadata = { title: "함께 생각하기 · 곡반정와드" };
export default function Page() {
  return <ThinkPage />;
}
```

```tsx
// src/app/p/[slug]/page.tsx
import { PromptView } from "@/components/think/prompt-view";
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <div className="page">
      <PromptView slug={(await params).slug} />
    </div>
  );
}
```

- [ ] **Step 5: Append prompt styles to `src/app/community.css`**

```css
.think-split{display:grid;gap:16px}
.prompt-list{display:grid;gap:12px}
.prompt-pane{display:none}
.prompt-card{display:block;padding:18px;border:1px solid var(--line);border-radius:16px;background:var(--surface);color:inherit;text-decoration:none;box-shadow:var(--shadow)}
.prompt-card[aria-current=true],.prompt-card:hover{border-color:var(--gold)}
.prompt-card h3{margin:6px 0;font-size:1.15rem}
.prompt-card p{margin:0 0 8px;color:var(--muted)}
.prompt-card small{display:inline-flex;gap:4px;align-items:center}
.prompt-title{margin:6px 0 12px;font-size:1.5rem}
.prompt-question{font-size:1.1rem;line-height:1.8}
.prompt-reading{margin:16px 0;padding:16px 18px;border-left:4px solid var(--gold);background:var(--soft);border-radius:0 12px 12px 0;line-height:1.9;max-height:60vh;overflow:auto}
.reply-composer{display:grid;gap:10px;margin:24px 0;padding:18px;border:1px solid var(--line);border-radius:16px;background:var(--surface)}
.reply-composer h3,.replies h3{margin:0 0 4px;font-size:1.1rem}
.reply-composer input,.reply-composer textarea,.comment-form input,.comment-form textarea{width:100%;min-height:44px;border:1px solid var(--line);border-radius:12px;padding:10px 12px;background:var(--bg);color:var(--ink);font:inherit}
.replies{display:grid;gap:12px}
.reply{padding:16px;border:1px solid var(--line);border-radius:16px;background:var(--surface)}
.reply header{display:flex;justify-content:space-between;gap:8px;color:var(--muted);font-size:.9rem}
.reply header strong{color:var(--ink)}
.reply-actions{display:flex;gap:6px;margin-top:8px}
.reply-action{min-height:44px;min-width:44px;padding:0 12px;display:inline-flex;gap:6px;align-items:center;border:1px solid var(--line);border-radius:999px;background:transparent;color:var(--ink)}
.reply-action[aria-pressed=true]{color:#c0392b;border-color:#e3b3ad}
.reply-comments{display:grid;gap:8px;margin-top:10px;padding-top:10px;border-top:1px dashed var(--line)}
.reply-comment{font-size:.95rem}
.comment-form{display:grid;gap:8px}
.pane-hint{padding:40px 20px;text-align:center;border:1px dashed var(--line);border-radius:16px}
```

- [ ] **Step 6: Verify and commit**

Run: `npx tsc --noEmit && npm run build`
Expected: build succeeds and lists `/think` and `/p/[slug]`.

```bash
git add src/components/think src/app/think src/app/p src/app/community.css
git commit -qm "feat: add think-together prompts with replies, hearts and comments

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Navigation, share tabs, home cards, week voices, admin managers tab

**Files:**
- Create: `src/components/community/share-tabs.tsx`, `src/components/learning/home-community.tsx`, `src/components/learning/week-voices.tsx`, `src/components/admin/event-managers.tsx`
- Modify: `src/components/shell.tsx`, `src/app/think/page.tsx`, `src/app/community/page.tsx`, `src/app/discussion/page.tsx`, `src/components/learning/home.tsx`, `src/components/learning/learn.tsx` (WeekPage), `src/components/admin/admin.tsx`

**Interfaces:**
- Consumes: `communityRead` endpoints `home/activity`, `think/prompts?week=`, `ward/managers`, write `ward/manager`; `ThoughtWall({ week })`; `EventCard`; `ORGANIZATIONS`.
- Produces: `ShareTabs()`, `HomeCommunity()`, `WeekVoices({ week })`, `EventManagers()`, `isActive(path, href)` in shell.

- [ ] **Step 1: Share tabs**

```tsx
// src/components/community/share-tabs.tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "../provider";
export function ShareTabs() {
  const { t } = useApp();
  const path = usePathname();
  const tabs = [
    ["/think", t("함께 생각하기", "Think together")],
    ["/community", t("생각벽", "Thought wall")],
    ["/discussion", t("토론", "Discussion")],
  ];
  return (
    <nav className="share-tabs" aria-label={t("나눔 메뉴", "Sharing sections")}>
      {tabs.map(([href, label]) => (
        <Link key={href} href={href} aria-current={path.startsWith(href) ? "page" : undefined}>{label}</Link>
      ))}
    </nav>
  );
}
```

Render it at the top of the three share routes. `src/app/think/page.tsx` becomes:

```tsx
import { ThinkPage } from "@/components/think/think-page";
import { ShareTabs } from "@/components/community/share-tabs";
export const metadata = { title: "함께 생각하기 · 곡반정와드" };
export default function Page() {
  return (
    <>
      <ShareTabs />
      <ThinkPage />
    </>
  );
}
```
In `src/app/community/page.tsx` and `src/app/discussion/page.tsx` add `import { ShareTabs } from "@/components/community/share-tabs";` and wrap the returned `<Suspense ...>...</Suspense>` as `<><ShareTabs />{/* existing Suspense element unchanged */}</>`.

- [ ] **Step 2: Shell navigation (5 bottom items, share group active state)**

In `src/components/shell.tsx`:
- add `CalendarDays` to the lucide import list.
- replace the `links` constant with:

```tsx
  const links = [
    ["/", t("홈", "Home"), Home],
    ["/learn", t("말씀 학습", "Study the word"), BookOpen],
    ["/think", t("나눔", "Sharing"), MessageCircle],
    ["/ward", t("와드 일정", "Ward calendar"), CalendarDays],
    ["/journey", t("나의 여정", "My journey"), Compass],
  ] as const;
  const groups: Record<string, string[]> = {
    "/think": ["/think", "/p/", "/community", "/discussion"],
    "/ward": ["/ward", "/e/"],
  };
  const isActive = (href: string) =>
    href === "/" ? path === "/" : (groups[href] || [href]).some((p) => path.startsWith(p));
```
- in both the desktop nav and the mobile nav, replace the `aria-current` expressions (`path.startsWith(href) ? "page" : undefined` and `(href === "/" ? path === href : path.startsWith(href)) ? "page" : undefined`) with `isActive(href) ? "page" : undefined`.
- remove `NotebookPen` from the imports only if nothing else in the file uses it (the menu list still uses it for "주간 활동지", so keep it).

- [ ] **Step 3: Home cards**

```tsx
// src/components/learning/home-community.tsx
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useApp } from "../provider";
import { api } from "@/lib/client";
import type { WardEvent } from "@/lib/ward-events";
import type { Prompt } from "@/lib/prompts";
import { EventCard } from "../ward/event-parts";

type Activity = { events: WardEvent[]; prompts: Prompt[]; replies: { id: string; author: string; body: string; prompt_slug: string; prompt_title: string }[] };
export function HomeCommunity() {
  const { t, boot } = useApp();
  const [data, setData] = useState<Activity | null>(null);
  useEffect(() => {
    if (boot) api<Activity>("home/activity").then(setData).catch(() => setData({ events: [], prompts: [], replies: [] }));
  }, [boot]);
  if (!data) return null;
  return (
    <div className="home-community">
      <section className="home-card">
        <header><h2>{t("다가오는 와드 일정", "Upcoming ward events")}</h2><Link href="/ward">{t("전체 보기", "See all")} <ArrowRight size={16} /></Link></header>
        {data.events.length ? data.events.map((e) => <EventCard key={e.id} event={e} />) : <p className="muted">{t("예정된 일정이 없습니다.", "No upcoming events.")}</p>}
      </section>
      <section className="home-card">
        <header><h2>{t("최근 올라온 생각", "Recent thoughts")}</h2><Link href="/think">{t("함께 생각하기", "Think together")} <ArrowRight size={16} /></Link></header>
        {data.prompts.slice(0, 1).map((p) => (
          <Link key={p.id} className="prompt-card" href={`/p/${p.slug}`}><span className="overline">{t("새 질문", "New question")}</span><h3>{p.title}</h3></Link>
        ))}
        {data.replies.map((r) => (
          <Link key={r.id} className="recent-reply" href={`/p/${r.prompt_slug}`}>
            <strong>{r.author}</strong> <span>{r.body}</span>
            <small className="muted">{r.prompt_title}</small>
          </Link>
        ))}
        {!data.prompts.length && !data.replies.length && <p className="muted">{t("아직 나눈 생각이 없습니다.", "No thoughts shared yet.")}</p>}
      </section>
    </div>
  );
}
```

In `src/components/learning/home.tsx` add `import { HomeCommunity } from "./home-community";` and insert `<HomeCommunity />` on the line directly before `<section className="week-question">`.

- [ ] **Step 4: Week voices**

```tsx
// src/components/learning/week-voices.tsx
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { useApp } from "../provider";
import { api } from "@/lib/client";
import type { Prompt } from "@/lib/prompts";
import { ThoughtWall } from "../community/wall";

export function WeekVoices({ week }: { week: number }) {
  const { t, boot } = useApp();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  useEffect(() => {
    if (boot) api<{ items: Prompt[] }>(`think/prompts?week=${week}`).then((d) => setPrompts(d.items)).catch(() => setPrompts([]));
  }, [boot, week]);
  return (
    <section className="week-voices" aria-labelledby="week-voices-title">
      <h2 id="week-voices-title">{t("이번 주 다른 사람들의 생각", "What others are thinking this week")}</h2>
      {prompts.length > 0 && (
        <div className="prompt-list">
          {prompts.map((p) => (
            <Link key={p.id} href={`/p/${p.slug}`} className="prompt-card">
              <span className="overline">{t("함께 생각하기", "Think together")}</span>
              <h3>{p.title}</h3>
              <small className="muted"><MessageCircle size={14} /> {p.reply_count}</small>
            </Link>
          ))}
        </div>
      )}
      <ThoughtWall week={week} />
    </section>
  );
}
```

In `src/components/learning/learn.tsx` add `import { WeekVoices } from "./week-voices";` and, inside `WeekPage`'s main `return (` (the one after the `if (!w)` guard), insert `<WeekVoices week={number} />` as the last child of the outermost `<div className="page ...">`, immediately before its closing `</div>`.

- [ ] **Step 5: Admin "일정 담당자" tab**

```tsx
// src/components/admin/event-managers.tsx
"use client";
import { useCallback, useEffect, useState } from "react";
import { useApp } from "../provider";
import { api } from "@/lib/client";
import { ORGANIZATIONS } from "@/lib/ward-model";

type Data = { users: { id: string; nickname: string; role: string }[]; managers: { actor_id: string; organization: string }[] };
export function EventManagers() {
  const { t, lang, error } = useApp();
  const [data, setData] = useState<Data | null>(null);
  const load = useCallback(() => api<Data>("ward/managers").then(setData).catch(error), [error]);
  useEffect(() => {
    load();
  }, [load]);
  const toggle = async (actor_id: string, organization: string, enabled: boolean) => {
    try {
      await api("ward/manager", { actor_id, organization, enabled });
      await load();
    } catch (e) {
      error(e);
    }
  };
  if (!data) return <div className="skeleton" />;
  return (
    <div className="event-managers">
      <p className="muted">{t("체크한 조직의 와드 일정을 작성·게시할 수 있습니다. '전 회원'은 모든 조직을 관리합니다. 관리자는 항상 모든 일정을 관리합니다.", "Checked people can write and publish events for that organization. 'All members' covers every organization. Administrators can always manage all events.")}</p>
      <div className="table-scroll">
        <table>
          <thead><tr><th>{t("이름", "Name")}</th>{ORGANIZATIONS.map(([id, ko, en]) => <th key={id}>{lang === "ko" ? ko : en}</th>)}</tr></thead>
          <tbody>
            {data.users.filter((u) => u.role !== "ADMIN").map((u) => (
              <tr key={u.id}>
                <td>{u.nickname}</td>
                {ORGANIZATIONS.map(([id]) => {
                  const on = data.managers.some((m) => m.actor_id === u.id && m.organization === id);
                  return (
                    <td key={id}>
                      <input type="checkbox" aria-label={`${u.nickname} ${id}`} checked={on} onChange={() => toggle(u.id, id, !on)} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

In `src/components/admin/admin.tsx`: add `import { EventManagers } from "./event-managers";`, add `["ward-managers", "일정 담당자", "Calendar managers"],` to the tab list array right after the `["teachers", ...]` entry, and add next to the other contents:

```tsx
          <Tabs.Content value="ward-managers">
            <EventManagers />
          </Tabs.Content>
```

- [ ] **Step 6: Styles for tabs, home cards, managers — append to `src/app/community.css`**

```css
.share-tabs{display:flex;gap:6px;max-width:1180px;margin:12px auto 0;padding:0 16px;overflow-x:auto;scrollbar-width:none}
.share-tabs a{flex:none;min-height:44px;display:inline-flex;align-items:center;padding:0 18px;border-radius:999px;border:1px solid var(--line);background:var(--surface);color:var(--ink);text-decoration:none;font-weight:600}
.share-tabs a[aria-current=page]{background:var(--navy);border-color:var(--navy);color:#fff}
.home-community{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px;margin:28px 0}
.home-card{display:grid;gap:12px;align-content:start;padding:20px;border:1px solid var(--line);border-radius:20px;background:var(--surface)}
.home-card header{display:flex;justify-content:space-between;align-items:center;gap:8px}
.home-card header h2{font-size:1.15rem;margin:0}
.home-card header a{display:inline-flex;gap:4px;align-items:center;min-height:44px;color:var(--gold)}
.recent-reply{display:grid;gap:2px;padding:12px;border-radius:12px;background:var(--soft);color:inherit;text-decoration:none}
.recent-reply span{overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
.week-voices{margin-top:32px;display:grid;gap:16px}
.table-scroll{overflow-x:auto}
.event-managers table{border-collapse:collapse;min-width:640px}
.event-managers th,.event-managers td{padding:10px;border-bottom:1px solid var(--line);text-align:center}
.event-managers td:first-child,.event-managers th:first-child{text-align:left}
.event-managers input[type=checkbox]{width:22px;height:22px}
```

- [ ] **Step 7: Verify and commit**

Run: `npx tsc --noEmit && npm run lint && npm test && npm run build`
Expected: all pass.

```bash
git add -A src
git commit -qm "feat: add sharing hub navigation, home cards, week voices and calendar managers

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Tablet rail, phone polish, and browser verification

**Files:**
- Modify: `src/app/community.css` (append responsive rules)
- Modify: `src/app/layout.tsx` (viewport export)

**Interfaces:**
- Consumes: existing class names `.mobile-nav`, `.desktop-nav`, `main` from `shell.tsx` / `globals.css`.

- [ ] **Step 1: Inspect current nav breakpoints**

Run: `grep -n "mobile-nav\|desktop-nav" src/app/globals.css src/app/renewal.css`
Note which media query shows `.mobile-nav` and hides `.desktop-nav` (expected around the 850px/760px queries). The rules below must come after them (community.css is imported last, so equal-specificity rules win).

- [ ] **Step 2: Viewport**

In `src/app/layout.tsx` add (if no `viewport` export exists):

```ts
export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f6f1" },
    { media: "(prefers-color-scheme: dark)", color: "#141f28" },
  ],
};
```
`interactiveWidget: "resizes-content"` makes Android Chrome shrink the layout when the on-screen keyboard opens, so the reply box stays visible.

- [ ] **Step 3: Append responsive rules to `src/app/community.css`**

```css
/* ---------- Tablet 768–1199px: left icon rail + two panes ---------- */
@media (min-width:768px) and (max-width:1199px){
  .desktop-nav{display:none !important}
  .mobile-nav{display:flex !important;position:fixed;inset:0 auto 0 0;width:92px;height:100dvh;flex-direction:column;justify-content:flex-start;gap:6px;padding:calc(env(safe-area-inset-top) + 88px) 8px 16px calc(env(safe-area-inset-left) + 8px);border-top:0;border-right:1px solid var(--line);background:var(--surface);z-index:40}
  .mobile-nav a{flex:none;flex-direction:column;min-height:64px;border-radius:14px;font-size:.78rem;text-align:center}
  .mobile-nav a[aria-current=page]{background:var(--soft)}
  body{padding-bottom:0 !important}
  header,main,footer,.share-tabs{margin-left:92px !important}
  .ward-split{grid-template-columns:minmax(0,1.2fr) minmax(0,1fr)}
  .think-split{grid-template-columns:minmax(260px,1fr) minmax(0,1.4fr);align-items:start}
  .prompt-pane{display:block;position:sticky;top:16px;max-height:calc(100dvh - 32px);overflow:auto}
}
@media (min-width:1200px){
  .think-split{grid-template-columns:minmax(300px,1fr) minmax(0,1.6fr);align-items:start}
  .prompt-pane{display:block;position:sticky;top:16px;max-height:calc(100dvh - 32px);overflow:auto}
}
/* ---------- Phone <768px ---------- */
@media (max-width:767px){
  .ward-split,.home-community{grid-template-columns:1fr}
  .ward-toolbar{justify-content:flex-start}
  .search{max-width:none}
  .field-row{grid-template-columns:1fr}
  .event-thumb{width:64px;height:64px}
  .month-grid{padding:8px;gap:4px}
  .month-cell{border-radius:10px;font-size:.95rem}
  .editor-actions .button{flex:1 1 auto}
  .reply-composer,.comment-form{scroll-margin-bottom:calc(env(safe-area-inset-bottom) + 96px)}
  .mobile-nav{padding-bottom:env(safe-area-inset-bottom)}
}
.reply-composer textarea:focus,.comment-form textarea:focus{scroll-margin-bottom:calc(env(safe-area-inset-bottom) + 120px)}
@media (prefers-reduced-motion:reduce){.event-card,.prompt-card{transition:none}}
```

- [ ] **Step 4: Run locally**

Run (background): `npm run dev` → open `http://localhost:3000`.
Seed a teacher/admin locally for UI checks:

```bash
node --import tsx -e "
const { privileged } = await import('./src/lib/db.ts');
await privileged(async (db) => {
  const [a] = await db.query(\"insert into ggc.actors(kind,role,nickname) values('user','ADMIN','테스트관리자') returning id\");
  console.log('admin actor', a.id);
});"
```
(Admin sign-in needs Supabase Auth; for local UI checks it is enough to verify public pages and guest reply flows. Manager/editor screens are verified after deploy.)

- [ ] **Step 5: Browser checks at 390 / 820 / 1280 px**

Using the Chrome tools (resize window), check and screenshot each:
- `/` — 5 bottom items on phone; left rail on 820; top nav on 1280; home shows "다가오는 와드 일정" and "최근 올라온 생각" cards.
- `/ward` — phone defaults to list view; 820 shows calendar + day list side by side; no horizontal scroll (`document.documentElement.scrollWidth <= innerWidth`).
- `/think` → pick a question — 820/1280 open it in the right pane; phone navigates to `/p/<slug>`.
- `/p/<slug>` — type a reply, wait 1 s, reload → text is still there; post → text clears and reply appears; heart toggles; comment posts.
- `/week/40` — "이번 주 다른 사람들의 생각" section appears at the bottom.
- Light and dark theme both readable.

Fix any overflow or overlap found, then re-check that width.

- [ ] **Step 6: Commit**

```bash
git add src/app/community.css src/app/layout.tsx
git commit -qm "feat: tablet rail and phone layout polish

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Settings cleanup and operator scripts

**Files:**
- Create: `1_설치확인.cmd`, `2_DB업데이트.cmd`, `3_배포.cmd`
- Modify: `.env.example`, `package.json`, `README.md`, `vercel.json`, `.gitignore`, `CLAUDE.md`, `AGENTS.md`
- Delete: `01_INSTALL_AND_CHECK.cmd` … `07_REPAIR_VERCEL_LOGIN.cmd`, `START_HERE.html`, `START_HERE.md`, `DEPLOY_LATEST.md`, `manual-deploy/`, `scripts/manual-vercel.mjs`

- [ ] **Step 1: `.env.example`**

```dotenv
# ── 필수 4개 (Vercel → Settings → Environment Variables 에 넣습니다) ──
# Supabase → Connect → Transaction pooler 접속 주소. 서버 전용.
DATABASE_URL=
# Supabase → Project Settings → API
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
# 서버 전용 키. 교사 계정 생성·비밀번호 초기화·포스터 업로드에 사용. 절대 NEXT_PUBLIC_ 로 넣지 마세요.
SUPABASE_SERVICE_ROLE_KEY=

# ── 선택 ──
# 비우면 접속한 주소를 자동으로 사용합니다. 자체 도메인을 쓸 때만 입력.
NEXT_PUBLIC_SITE_URL=
# 비우면 AI 기능이 꺼지고 비용이 들지 않습니다.
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
```

- [ ] **Step 2: `package.json`**

Set `"name": "gokbanjung"` and `"version": "1.0.0"`; delete the `deploy:setup`, `deploy:link`, `deploy:env`, `deploy:production` scripts; add `"db:update": "node scripts/update-database.mjs"`. Then run `rm scripts/manual-vercel.mjs` and `grep -rn "manual-vercel" . --exclude-dir=node_modules` → expect no matches.

- [ ] **Step 3: Operator scripts (CRLF line endings, saved as UTF-8; first line switches the console to UTF-8)**

`1_설치확인.cmd`
```bat
@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
echo [1/3] Node.js 확인
node -v || (echo Node.js 22 이상을 먼저 설치하세요: https://nodejs.org & pause & exit /b 1)
echo [2/3] 부품 설치 (처음 한 번, 몇 분 걸립니다)
call npm ci || (echo 설치 실패 & pause & exit /b 1)
echo [3/3] 자동 검사와 사이트 조립
call npm test || (echo 검사 실패 & pause & exit /b 1)
call npm run build || (echo 조립 실패 & pause & exit /b 1)
echo 모두 통과했습니다.
pause
```

`2_DB업데이트.cmd`
```bat
@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
echo 기존 데이터는 그대로 두고, 와드 일정/함께 생각하기 표만 추가합니다.
node scripts/update-database.mjs
if errorlevel 1 (
 echo 실패했습니다. 바뀐 것은 없습니다. 사용설명서의 "자주 나는 오류"를 보세요.
 pause
 exit /b 1
)
echo 완료했습니다.
pause
```

`3_배포.cmd`
```bat
@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
git add -A
git commit -m "사이트 수정" || echo 새로 바뀐 파일이 없습니다.
git push || (echo GitHub 올리기 실패. 인터넷과 GitHub 로그인을 확인하세요. & pause & exit /b 1)
echo GitHub에 올렸습니다. 1~2분 뒤 Vercel이 사이트를 자동으로 새로 만듭니다.
pause
```

After writing, convert to CRLF: `for f in *.cmd; do sed -i 's/\r\?$/\r/' "$f"; done`.

- [ ] **Step 4: Remove superseded files**

```bash
git rm -q 01_INSTALL_AND_CHECK.cmd 02_LINK_VERCEL.cmd 03_LIST_ENVIRONMENT.cmd 04_DEPLOY_PRODUCTION.cmd 05_UPDATE_DATABASE.cmd 06_SETUP_ADMIN.cmd 07_REPAIR_VERCEL_LOGIN.cmd START_HERE.html START_HERE.md DEPLOY_LATEST.md
git rm -rq manual-deploy
```

- [ ] **Step 5: `vercel.json`, `.gitignore`**

`vercel.json`:
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "nextjs",
  "installCommand": "npm ci",
  "buildCommand": "npm run build",
  "regions": ["icn1"],
  "headers": [
    { "source": "/card-backgrounds/(.*)", "headers": [{ "key": "Cache-Control", "value": "public, max-age=604800, immutable" }] },
    { "source": "/fonts/(.*)", "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }] }
  ]
}
```
Append to `.gitignore`: `.env.smtp.local` and `*.backup-*`.

- [ ] **Step 6: README / CLAUDE.md / AGENTS.md**

Replace `README.md` with a short developer README: project name "곡반정와드 통합 학습 사이트 (gokbanjung)", origin (gospel-class + comefollowme features), `npm ci / npm run dev / npm test / npm run build`, the 4 required env vars table (from `.env.example`), migration note (`npm run db:update`, additive), the new routes (`/ward`, `/e/<slug>`, `/think`, `/p/<slug>`), and "사용 방법은 `사용설명서.html`". In `CLAUDE.md` and `AGENTS.md`, replace the project name/description lines that say gospel-class with gokbanjung and add one line: "와드 일정·함께 생각하기 코드는 `src/lib/ward-events.ts`, `src/lib/prompts.ts`, `src/lib/community-api.ts`." Leave the remaining rules unchanged.

- [ ] **Step 7: Verify and commit**

Run: `npm test && npm run build && git status --short`
Expected: pass; no `.env.local`/`.vercel` in status.

```bash
git add -A && git commit -qm "chore: simplify settings, scripts and docs for gokbanjung

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: 사용설명서.html

**Files:**
- Create: `사용설명서.html`

- [ ] **Step 1: Write the manual**

A single self-contained HTML file (inline CSS, no external scripts, works offline by double-click), Korean, readable on phone and PC, light/dark via `prefers-color-scheme`, table of contents at top. Required sections and content:

1. **이 사이트는?** — 곡반정와드 복음교리반 학습 + 와드 일정 + 함께 생각하기를 한곳에. 교회 공식 사이트가 아님.
2. **참여자용**
   - 처음 들어가기: 로그인 없이 바로. 오른쪽 위 ☰ → 이름(별명) 정하기.
   - 아래쪽 메뉴 5개 설명 표(홈/말씀 학습/나눔/와드 일정/나의 여정).
   - 매일 학습: 말씀 학습 → 주차 → 요일 → 마음에 남은 것·실천 기록 → 리워드.
   - 함께 생각하기: 나눔 → 질문 고르기 → 이름(비우면 익명) → 답글 등록. 하트·댓글. 쓰다가 나가도 이 기기에 자동 저장(0.8초), 등록 전엔 공개 안 됨, 다른 기기로는 안 이어짐.
   - 와드 일정: 달력/목록 전환, 조직 칩으로 거르기, 일정 눌러 포스터·장소 보기, 공유 버튼.
   - 휴대폰 홈 화면에 추가: 아이폰(Safari → 공유 → 홈 화면에 추가), 안드로이드(Chrome → ⋮ → 홈 화면에 추가).
3. **운영자용**
   - 처음 배포(한 번만) 단계: ① GitHub `gokbanjung` 저장소 확인 ② vercel.com 로그인 → Add New → Project → `gokbanjung` Import ③ Environment Variables 4개 입력 — 값은 기존 `gokbanjeong-gospel-class` 프로젝트 Settings → Environment Variables에서 복사(키 이름 표 포함) ④ Region 서울 확인 → Deploy ⑤ 발급된 주소 접속 확인.
   - DB 업데이트(한 번만): `2_DB업데이트.cmd` 더블클릭 → DATABASE_URL 붙여넣기(화면에 안 보이는 게 정상) → `UPDATE` 입력 → "완료". 기존 기록은 그대로.
   - 관리자 로그인: ☰ → 관리자. 교사 승인, 로그인 승인.
   - 일정 담당자 지정: 관리자 → "일정 담당자" 탭 → 사람별 조직 체크. 담당자는 먼저 기록관리/교사 계정이 있어야 함.
   - 일정 올리기: 와드 일정 → 새 일정 → 제목·날짜·시간·장소·조직·포스터 → 게시 전 미리 보기 → 임시 저장(비공개) 또는 게시하기. 수정/비공개로 되돌리기/일정 취소/삭제.
   - 질문 올리기(교사·관리자): 나눔 → 함께 생각하기 → 새 질문 → 공과 선택 시 원문 주소 자동 → 포스터(선택) → 게시.
   - 사이트 수정 후 다시 올리기: 파일 수정 → `1_설치확인.cmd`(검사) → `3_배포.cmd` → 1~2분 후 자동 반영.
   - AI 켜기(선택, 유료): OpenAI 키를 Vercel 환경변수 `OPENAI_API_KEY`에 넣고 Redeploy. 비우면 비용 0.
4. **자주 나는 오류** 표: `origin_rejected`(다른 주소로 접속 → 사이트 주소 확인 또는 `NEXT_PUBLIC_SITE_URL` 비우기), `storage_unavailable`(포스터 저장소 미연결 → 2_DB업데이트 실행, 서버 키 확인), `Schema verification failed`(DB 주소가 다른 프로젝트 → 기존 복음교리반 DB 주소인지 확인), Vercel `Build failed`(1_설치확인으로 먼저 검사), 로그인 안 됨(관리자에게 비밀번호 초기화 요청).
5. **개인정보·백업** — 공개 글은 방문자 모두가 봄, 이름을 비우면 익명, 브라우저 데이터를 지우면 내 글 관리 권한을 잃음.

Style: max-width 860px, 18px base font, `h2` section anchors, numbered step lists, `<kbd>` for buttons, tables with horizontal scroll on phone, 16px side padding.

- [ ] **Step 2: Check it renders**

Open the file in Chrome at 390px and 1280px; confirm no horizontal page scroll and the table of contents links jump correctly.

- [ ] **Step 3: Commit**

```bash
git add 사용설명서.html && git commit -qm "docs: add Korean user and operator manual

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: Final verification, GitHub upload, tool log

**Files:**
- Modify: `C:\Codework\Codework-도구조사.md` (append gh install entry)

- [ ] **Step 1: Full verification**

Run: `npm ci && npm test && npm run lint && npm run build`
Expected: all pass. Record the test count in the final report.

- [ ] **Step 2: Secret scan before publishing**

```bash
git ls-files | grep -Ei "\.env($|\.)|\.vercel|secret|\.pem" ; git grep -nE "(sk-[A-Za-z0-9]{20,}|eyJhbGciOi|postgres(ql)?://[^ \"']+@)" -- . ':!*.md' ':!.env.example'
```
Expected: first grep prints only `.env.example`; second prints nothing.

- [ ] **Step 3: Install GitHub CLI (announce to the user first)**

```powershell
winget install --id GitHub.cli -e --accept-source-agreements --accept-package-agreements
```
Then ask the user to run `! gh auth login --web --git-protocol https` (they log in once in the browser with kimhk35@ajou.ac.kr's GitHub account) and confirm with `gh auth status`.

- [ ] **Step 4: Create private repo and push**

```bash
cd "/c/Users/김홍겸/Desktop/gokbanjung"
gh repo create gokbanjung --private --source . --remote origin --push
gh repo view --json url,visibility
```
Expected: `"visibility":"PRIVATE"` and the repo URL.

- [ ] **Step 5: Tool log**

Append to `C:\Codework\Codework-도구조사.md` (read it first to match its format): decision entry "GitHub CLI(gh) — 사용자 전역 설치(winget). 용도: GitHub 저장소 생성·업로드. 2026-09-27 gokbanjung 업로드에 사용." plus an update-log line with the date.

- [ ] **Step 6: Report**

Tell the user (Korean, plain words): what was built, where (`Desktop\gokbanjung`), repo URL, test/build results, and the two remaining steps that need them (Task 15).

---

### Task 15: Go live (user-performed, guided)

These touch the shared production database and the user's Vercel account, so they are done by the user with step-by-step guidance, only after explicit confirmation.

- [ ] **Step 1: Database update** — user runs `2_DB업데이트.cmd`, pastes the `DATABASE_URL` of the existing gospel-class Supabase project, types `UPDATE`. Expected output: `Verified: accounts, quizzes, ward calendar, shared prompts. Existing records preserved.`
- [ ] **Step 2: Vercel project** — user imports the GitHub repo `gokbanjung` as a new Vercel project, copies the 4 env vars from `gokbanjeong-gospel-class`, deploys.
- [ ] **Step 3: Smoke test on the live URL** — open `/`, `/ward`, `/think` on phone and PC; admin signs in, assigns one calendar manager, creates a draft event, previews, publishes; a teacher posts a question with a poster; a guest replies, hearts, comments.
