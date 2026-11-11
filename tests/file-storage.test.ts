import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import {
  fileResponseHeaders,
  readStoredFile,
  storeFile,
} from "../src/lib/file-storage";
import type { DB } from "../src/lib/db";
import type { Actor } from "../src/lib/types";

const id = "11111111-1111-1111-1111-111111111111";
const admin: Actor = {
  id,
  kind: "user",
  role: "ADMIN",
  nickname: "admin",
  course_id: "course",
};
const path = `events/${id}.png`;
const documentPath = `course/${id}.txt`;
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

test("database files preserve bytes and private documents cannot use public poster reads", async () => {
  const database = new PGlite();
  try {
    await database.exec(
      "create schema ggc; create role anon; create role authenticated; create table ggc.actors(id uuid primary key)",
    );
    const migration = await readFile(
      "supabase/migrations/20261019030000_database_file_storage.sql",
      "utf8",
    );
    await database.exec(migration);
    await database.exec(migration);
    await database.query("insert into ggc.actors values($1)", [id]);
    const db: DB = {
      query: async (sql, params = []) =>
        (await database.query(sql, params)).rows as never,
    };
    await storeFile(db, {
      bucket: "posters",
      path,
      createdBy: id,
      filename: "poster.png",
      contentType: "image/png",
      buffer: png,
    });
    await storeFile(db, {
      bucket: "materials",
      path: documentPath,
      createdBy: id,
      filename: "비공개 자료.txt",
      contentType: "text/plain; charset=utf-8",
      buffer: Buffer.from("private material"),
    });
    const publicPoster = await readStoredFile(db, "posters", path, null);
    assert.deepEqual(publicPoster.buffer, png);
    assert.equal(
      fileResponseHeaders("posters", publicPoster)["Cache-Control"],
      "public, max-age=31536000, immutable",
    );
    for (const a of [
      null,
      { ...admin, role: "MEMBER" as const },
      { ...admin, kind: "guest" as const },
      { ...admin, course_id: "another-course" },
    ]) {
      await assert.rejects(readStoredFile(db, "materials", documentPath, a), {
        code: "forbidden",
      });
    }
    await assert.rejects(readStoredFile(db, "posters", documentPath, null), {
      code: "not_found",
    });
    await assert.rejects(
      readStoredFile(db, "posters", `../materials/${documentPath}`, null),
      { code: "not_found" },
    );
    const privateFile = await readStoredFile(
      db,
      "materials",
      documentPath,
      admin,
    );
    assert.equal(privateFile.buffer.toString(), "private material");
    const headers = fileResponseHeaders("materials", privateFile);
    assert.equal(headers["Cache-Control"], "private, no-store");
    assert.equal(headers.Vary, "Cookie");
    assert.match(
      headers["Content-Disposition"],
      /^attachment; filename\*=UTF-8''%/,
    );
    await assert.rejects(
      storeFile(db, {
        bucket: "posters",
        path,
        createdBy: id,
        filename: "bad.png",
        contentType: "image/png",
        buffer: Buffer.from("<svg>bad</svg>"),
      }),
      { code: "invalid_file" },
    );
    await assert.rejects(
      storeFile(db, {
        bucket: "posters",
        path,
        createdBy: id,
        filename: "big.png",
        contentType: "image/png",
        buffer: Buffer.alloc(2097153),
      }),
      { code: "too_large" },
    );
    await database.exec(
      "grant usage on schema ggc to authenticated; set role authenticated",
    );
    await assert.rejects(
      database.query("select bytes from ggc.stored_files"),
      /permission denied/,
    );
  } finally {
    await database.close();
  }
});
