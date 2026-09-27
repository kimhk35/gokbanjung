import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import type { Actor } from "./types";
import { databaseJsonType } from "./json-data";
export type Params = (string | number | boolean | null | object)[];
export type DB = {
  query<T extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    params?: Params,
  ): Promise<T[]>;
};
type Local = import("@electric-sql/pglite").PGlite;
let localPromise: Promise<Local> | undefined;
async function localDb() {
  if (process.env.NODE_ENV === "production")
    throw new Error("DATABASE_URL required");
  if (!localPromise)
    localPromise = (async () => {
      const { PGlite } = await import("@electric-sql/pglite");
      const db = new PGlite(
        path.resolve(
          /* turbopackIgnore: true */
          process.cwd(),
          process.env.LOCAL_DATABASE_PATH || ".local-db",
        ),
      );
      await db.exec(
        "create schema if not exists ggc; create table if not exists ggc.local_migrations(name text primary key); alter table ggc.local_migrations enable row level security;",
      );
      const roles = await db.query(
        "select rolname from pg_roles where rolname='authenticated'",
      );
      if (!roles.rows.length)
        await db.exec("create role authenticated;create role anon;");
      const existing = await db.query(
        "select to_regclass('ggc.actors') as table_name",
      );
      const applied = await db.query("select name from ggc.local_migrations");
      const names = new Set(
        applied.rows.map((row) => (row as { name: string }).name),
      );
      const files = (await readdir("supabase/migrations")).sort();
      // Existing local databases made before migration tracking already contain these schemas.
      if (
        (existing.rows[0] as { table_name: unknown }).table_name &&
        !names.size
      ) {
        for (const file of files) {
          if(!['20260914080029_gospel_learning.sql','20260914083915_learning_rewards.sql','20260914084627_moderation_integrity.sql'].includes(file))continue;
          await db.query(
            "insert into ggc.local_migrations values($1) on conflict do nothing",
            [file],
          );
          names.add(file);
        }
      }
      for (const file of files)
        if (!names.has(file)) {
          await db.transaction(async (tx) => {
            await tx.exec(
              await readFile("supabase/migrations/" + file, "utf8"),
            );
            await tx.query("insert into ggc.local_migrations values($1)", [
              file,
            ]);
          });
        }
      if (!(existing.rows[0] as { table_name: unknown }).table_name)
        await db.exec(await readFile("supabase/seed.sql", "utf8"));
      return db;
    })();
  return localPromise;
}
let postgresPromise: Promise<import("postgres").Sql> | undefined;
async function remoteDb() {
  if (!postgresPromise)
    postgresPromise = import("postgres").then(({ default: postgres }) =>
      postgres(process.env.DATABASE_URL!, {
        // Avoid JSON.stringify(JSON.stringify(value)) for JSON/JSONB parameters.
        // Also recover legacy double-encoded containers when reading JSON columns.
        types: { json: databaseJsonType },
        prepare: false,
        max: 5,
        ssl: process.env.DATABASE_URL!.includes("localhost")
          ? false
          : "require",
      }),
    );
  return postgresPromise;
}
export async function privileged<T>(fn: (db: DB) => Promise<T>): Promise<T> {
  if (!process.env.DATABASE_URL) {
    const db = await localDb();
    return db.transaction(async (tx) =>
      fn({
        query: async (text, params = []) =>
          (await tx.query(text, params)).rows as never,
      }),
    );
  }
  const db = await remoteDb();
  return db.begin(async (tx) =>
    fn({
      query: async (text, params = []) =>
        (await tx.unsafe(text, params as never[])) as never,
    }),
  ) as Promise<T>;
}
export async function asActor<T>(
  actor: Actor,
  fn: (db: DB) => Promise<T>,
): Promise<T> {
  return privileged(async (db) => {
    await db.query("set local role authenticated");
    await db.query("select set_config('request.jwt.claims',$1,true)", [
      JSON.stringify({ sub: actor.id }),
    ]);
    return fn(db);
  });
}
