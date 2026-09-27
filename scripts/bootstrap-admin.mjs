import { existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";
import { ask } from "./terminal-input.mjs";
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  (await ask("Supabase Project URL (https://...supabase.co): "));
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  (await ask("Supabase service_role / secret key (hidden): ", true));
const databaseUrl =
  process.env.DATABASE_URL || (await ask("DATABASE_URL (hidden): ", true));
const email =
  (await ask("Admin email [kimhk35@ajou.ac.kr]: ")) || "kimhk35@ajou.ac.kr";
const projectRef=new URL(url).hostname.split('.')[0];
const databaseTarget=new URL(databaseUrl);
if(databaseTarget.hostname!==`db.${projectRef}.supabase.co` && decodeURIComponent(databaseTarget.username)!==`postgres.${projectRef}`)throw new Error('API and database project references do not match. No account was created.');
console.log(
  "Target Supabase:",
  new URL(url).hostname,
  "Database:",
  new URL(databaseUrl).hostname,
  "Admin email:",
  email,
);
if (
  (await ask("Create or assign this administrator? Type ADMIN: ")) !== "ADMIN"
)
  process.exit(1);
const client = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const sql = postgres(databaseUrl, { prepare: false, max: 1, ssl: "require" });
try {
  const [ready] =
    await sql`select to_regclass('ggc.account_requests') as accounts`;
  if (!ready.accounts) throw new Error("Run 05_UPDATE_DATABASE first.");
  let [user] =
    await sql`select id from auth.users where lower(email)=lower(${email})`;
  if (user) {
    const verified = await client.auth.admin.getUserById(user.id);
    if (
      verified.error ||
      verified.data.user.email?.toLowerCase() !== email.toLowerCase()
    )
      throw new Error("API and database targets do not match.");
  } else {
    const password = await ask(
      "New administrator password (10+ characters, hidden): ",
      true,
    );
    if (password.length < 10)
      throw new Error("Password must contain at least 10 characters.");
    const created = await client.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (created.error || !created.data.user)
      throw new Error("Auth user creation failed.");
    [user] =
      await sql`select id from auth.users where id=${created.data.user.id}`;
    if (!user) throw new Error("API and database targets do not match.");
  }
  await sql.begin(async (tx) => {
    const [linked] =
      await tx`select actor_id from ggc.account_requests where user_id=${user.id}`;
    const id = linked?.actor_id || user.id;
    await tx`insert into ggc.actors(id,kind,role,nickname) values(${id},'user','ADMIN','관리자') on conflict(id) do update set kind='user',role='ADMIN'`;
    await tx`update ggc.account_requests set status='approved',reviewed_by=${id} where user_id=${user.id}`;
    await tx`delete from ggc.guest_sessions where actor_id=${id}`;
  });
  console.log(
    "Administrator assigned. Existing passwords were not changed. Sign in at /admin.",
  );
} catch (e) {
  console.error(
    "Administrator setup failed. Category:",
    e.code || "configuration",
    "Check matching project credentials and email.",
  );
  process.exitCode = 1;
} finally {
  await sql.end();
}
