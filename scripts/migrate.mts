import postgres from "postgres";
import { readFile, readdir } from "node:fs/promises";
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const sql = postgres(process.env.DATABASE_URL, {
  prepare: false,
  max: 1,
  ssl: "require",
});
try {
  await sql`create schema if not exists ggc_migrations`;
  await sql`revoke all on schema ggc_migrations from public`;
  await sql`create table if not exists ggc_migrations.applied(name text primary key,applied_at timestamptz default now())`;
  const applied = await sql`select name from ggc_migrations.applied`;
  const names = new Set(applied.map((r) => r.name));
  for (const name of (await readdir("supabase/migrations")).sort())
    if (!names.has(name))
      await sql.begin(async (tx) => {
        await tx.unsafe(await readFile("supabase/migrations/" + name, "utf8"));
        await tx`insert into ggc_migrations.applied(name) values(${name})`;
      });
  const courses =
    await sql`select id from ggc.courses where id='old-testament-2026'`;
  if (!courses.length)
    await sql.unsafe(await readFile("supabase/seed.sql", "utf8"));
  // Private Storage bucket. Only server-side administrator routes handle objects.
  await sql`insert into storage.buckets(id,name,public,file_size_limit) values('gospel-materials','gospel-materials',false,4194304) on conflict(id) do nothing`;
  await sql`insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('ggc-posters','ggc-posters',true,2097152,array['image/webp','image/png','image/jpeg']) on conflict(id) do nothing`;
  console.log("Migrations and curriculum applied.");
} finally {
  await sql.end();
}
