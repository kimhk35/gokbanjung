import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Actor } from "../src/lib/types";

process.env.LOCAL_DATABASE_PATH = await mkdtemp(
  path.join(tmpdir(), "ggc-verse-"),
);
const { privileged } = await import("../src/lib/db");
const V = await import("../src/lib/verse-notes");
const { AppError } = await import("../src/lib/errors");

async function make(role: Actor["role"], nickname = ""): Promise<Actor> {
  const kind = role === "GUEST" ? "guest" : "user";
  return privileged(
    async (db) =>
      (
        await db.query(
          "insert into ggc.actors(kind,role,nickname) values($1,$2,$3) returning id,kind,role,nickname,course_id",
          [kind, role, nickname],
        )
      )[0] as Actor,
  );
}
const status = (code: number) => (e: unknown) =>
  e instanceof AppError && e.status === code;
const isaiah = (verse: number, extra: object = {}) => ({
  id: randomUUID(),
  book_id: "ot/isa",
  chapter: 40,
  verse_start: verse,
  body: "힘이 됩니다",
  ...extra,
});

test("guests add notes on real verses; invalid places are rejected", async () => {
  const guest = await make("GUEST");
  const note = await V.saveVerseNote(
    guest,
    isaiah(31, { author: "", quote: "독수리가 날개치며" }),
  );
  assert.equal(note.author, "익명");
  assert.equal(note.verse_end, 31);
  const again = await V.saveVerseNote(guest, { ...isaiah(31), id: note.id });
  assert.equal(again.id, note.id);
  await assert.rejects(
    V.saveVerseNote(guest, isaiah(1, { chapter: 67 })),
    status(400),
  );
  await assert.rejects(
    V.saveVerseNote(guest, isaiah(31, { verse_end: 30 })),
    status(400),
  );
  await assert.rejects(
    V.saveVerseNote(guest, isaiah(1, { book_id: "ot/nope" })),
    status(400),
  );
  await assert.rejects(
    V.saveVerseNote(guest, isaiah(1, { quote: "가".repeat(201) })),
  );
});

test("listing by chapter is ordered by verse; by week covers the week's chapters", async () => {
  const a = await make("GUEST");
  await V.saveVerseNote(a, isaiah(11));
  await V.saveVerseNote(a, isaiah(3));
  await V.saveVerseNote(a, { ...isaiah(2), chapter: 44 });
  await V.saveVerseNote(a, { ...isaiah(1), book_id: "ot/gen", chapter: 1 });
  const chapter = await V.listVerseNotes(
    null,
    new URLSearchParams({ book: "ot/isa", chapter: "40" }),
  );
  const verses = chapter.items.map((n) => n.verse_start);
  assert.deepEqual(
    verses,
    [...verses].sort((x, y) => x - y),
  );
  assert.ok(verses.includes(3) && verses.includes(11));
  const week = await V.listVerseNotes(
    null,
    new URLSearchParams({ week: "40" }),
  );
  assert.ok(week.items.some((n) => n.chapter === 44));
  assert.ok(!week.items.some((n) => n.book_id === "ot/gen"));
  assert.ok(
    week.chapters.some((c) => c.book_id === "ot/isa" && c.chapter === 49),
  );
  await assert.rejects(
    V.listVerseNotes(null, new URLSearchParams({ book: "ot/isa" })),
    status(400),
  );
});

test("hearts, comments and owner-only deletion", async () => {
  const a = await make("GUEST"),
    b = await make("GUEST"),
    admin = await make("ADMIN", "관리자");
  const note = await V.saveVerseNote(a, isaiah(29));
  assert.deepEqual(await V.toggleVerseHeart(b, { note_id: note.id }), {
    hearted: true,
    hearts: 1,
  });
  const c = await V.addVerseComment(b, {
    id: randomUUID(),
    note_id: note.id,
    body: "공감",
    author: "나",
  });
  await assert.rejects(V.deleteVerseComment(a, { id: c.id }), status(403));
  const seen = await V.listVerseNotes(
    b,
    new URLSearchParams({ book: "ot/isa", chapter: "40" }),
  );
  const mine = seen.items.find((n) => n.id === note.id)!;
  assert.equal(mine.hearted, true);
  assert.equal(mine.comments[0].mine, true);
  await assert.rejects(V.deleteVerseNote(b, { id: note.id }), status(403));
  await V.deleteVerseNote(admin, { id: note.id });
  const after = await V.listVerseNotes(
    null,
    new URLSearchParams({ book: "ot/isa", chapter: "40" }),
  );
  assert.ok(!after.items.some((n) => n.id === note.id));
});
