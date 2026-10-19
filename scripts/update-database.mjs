import { existsSync } from "node:fs";
import { readFile as read } from "node:fs/promises";
import postgres from "postgres";
import { ask } from "./terminal-input.mjs";
import { parseDatabaseUrl } from "./database-url.mjs";
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const parsed = parseDatabaseUrl(
  process.env.DATABASE_URL ||
    (await ask(
      "DATABASE_URL 값을 붙여 넣고 Enter (화면에 안 보이는 것이 정상) / Paste DATABASE_URL (hidden): ",
      true,
    )),
);
if (parsed.error) {
  console.error(parsed.error);
  console.error("연결하지 않았습니다. 바뀐 것은 없습니다.");
  process.exit(1);
}
const { url, host } = parsed;
console.log("연결할 곳 / Database host:", host);
if (
  (
    await ask("새 표를 추가하려면 UPDATE 를 입력하고 Enter / Type UPDATE: ")
  ).trim() !== "UPDATE"
) {
  console.error("UPDATE 가 아니어서 멈췄습니다. 바뀐 것은 없습니다.");
  process.exit(1);
}
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
    if (!check.accounts)
      await tx.unsafe(
        await read(
          "supabase/migrations/20260914130515_guest_accounts_quizzes.sql",
          "utf8",
        ),
      );
    const [materials] =
      await tx`select to_regclass('ggc.lesson_materials') as installed`;
    if (!materials.installed)
      await tx.unsafe(
        await read(
          "supabase/migrations/20260915132630_lesson_material_images.sql",
          "utf8",
        ),
      );
    const [ward] = await tx`select to_regclass('ggc.events') as installed`;
    if (!ward.installed)
      await tx.unsafe(
        await read(
          "supabase/migrations/20260927000000_ward_community.sql",
          "utf8",
        ),
      );
    const [notes] =
      await tx`select to_regclass('ggc.verse_notes') as installed`;
    if (!notes.installed)
      await tx.unsafe(
        await read("supabase/migrations/20260928000000_notes.sql", "utf8"),
      );
    const [insights] =
      await tx`select to_regclass('ggc.daily_insights') as installed`;
    if (!insights.installed)
      await tx.unsafe(
        await read(
          "supabase/migrations/20260929000000_daily_insights.sql",
          "utf8",
        ),
      );
    // Idempotent migrations also repair a partially installed reader schema.
    for (const file of [
      "20261018010000_study_community.sql",
      "20261018020000_study_material_progress.sql",
      "20261019030000_database_file_storage.sql",
      "20261019040000_database_auth.sql",
    ]) {
      await tx.unsafe(await read(`supabase/migrations/${file}`, "utf8"));
    }
    const [reader] = await tx`select
      to_regclass('ggc.study_prompt_assignments') as assignments,
      to_regclass('ggc.study_range_thoughts') as thoughts,
      to_regclass('ggc.study_material_progress') as progress,
      to_regclass('ggc.study_day_completion') as completion`;
    if (Object.values(reader).some((table) => !table))
      throw new Error("Study reader schema verification failed");
    const [neon] = await tx`select to_regclass('ggc.stored_files') as files,
      to_regclass('public.ggc_auth_user') as users,
      to_regclass('public.ggc_auth_session') as sessions`;
    if (Object.values(neon).some(table => !table))
      throw new Error("Database authentication/storage verification failed");
    const [verified] =
      await tx`select to_regclass('ggc.quiz_sets') as quizzes,to_regclass('ggc.account_requests') as accounts,to_regclass('ggc.events') as events,to_regclass('ggc.prompt_reply_reactions') as prompts,to_regclass('ggc.text_note_comments') as notes,to_regclass('ggc.daily_insights') as insights`;
    if (
      !verified.quizzes ||
      !verified.accounts ||
      !verified.events ||
      !verified.prompts ||
      !verified.notes ||
      !verified.insights
    )
      throw new Error("Schema verification failed");
    console.log(
      "Verified: accounts, quizzes, ward calendar, shared prompts, notes, reader questions and progress. Existing records preserved.",
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
