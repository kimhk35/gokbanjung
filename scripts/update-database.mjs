import { readFile, existsSync } from "node:fs";
import { readFile as read } from "node:fs/promises";
import postgres from "postgres";
import { ask } from "./terminal-input.mjs";
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const url =
  process.env.DATABASE_URL ||
  (await ask("Paste DATABASE_URL (hidden): ", true));
const host = new URL(url).hostname;
console.log("Database host:", host);
if (
  (await ask("Update this gospel-class database? Type UPDATE: ")) !== "UPDATE"
)
  process.exit(1);
const sql = postgres(url, {
  prepare: false,
  max: 1,
  ssl: host === "localhost" ? "prefer" : "require",
});
try {
  await sql.begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(20260914,4)`;
    const [check] =
      await tx`select to_regclass('ggc.actors') as actors,to_regclass('ggc.account_requests') as accounts`;
    if (!check.actors)
      throw new Error(
        "Initial gospel-class database is missing. Use the supplied original migrations first.",
      );
    const [course] =
      await tx`select id from ggc.courses where id='old-testament-2026'`;
    if (!course) throw new Error("This is not the expected course database.");
    if (!check.accounts) await tx.unsafe(
      await read(
        "supabase/migrations/20260914130515_guest_accounts_quizzes.sql",
        "utf8",
      ),
    );
    const [materials] = await tx`select to_regclass('ggc.lesson_materials') as installed`;
    if (!materials.installed) await tx.unsafe(await read("supabase/migrations/20260915132630_lesson_material_images.sql","utf8"));
    const [verified] =
      await tx`select to_regclass('ggc.quiz_sets') as quizzes,to_regclass('ggc.account_requests') as accounts`;
    if (!verified.quizzes || !verified.accounts)
      throw new Error("Schema verification failed");
    console.log(
      "Verified: account approval, private quiz sets, attempts and reward rules. Existing records preserved.",
    );
  });
} catch (e) {
  console.error(
    "Database update failed. Transaction rolled back. Category:",
    e.code || "configuration",
  );
  process.exitCode = 1;
} finally {
  await sql.end();
}
