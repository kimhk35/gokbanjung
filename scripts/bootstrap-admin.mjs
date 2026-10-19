import { existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import postgres from "postgres";
import { ask } from "./terminal-input.mjs";
import { parseDatabaseUrl } from "./database-url.mjs";
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const parsed = parseDatabaseUrl(
  process.env.DATABASE_URL || (await ask("DATABASE_URL (hidden): ", true)),
);
if (parsed.error) throw new Error(parsed.error);
const login = (await ask("Administrator login ID or email: ")).toLowerCase();
if (
  !/^[a-z0-9_]{4,24}$/.test(login) &&
  !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(login)
)
  throw new Error("Enter a valid login ID or email.");
const email = login.includes("@")
  ? login
  : `${login}@accounts.gokbanjeong.invalid`;
console.log("Database host:", parsed.host, "Administrator login:", login);
if (
  (await ask("Create or assign this administrator? Type ADMIN: ")) !== "ADMIN"
)
  process.exit(1);
const sql = postgres(parsed.url, {
  prepare: false,
  max: 1,
  ssl: parsed.host === "localhost" ? false : "require",
});
try {
  const [ready] =
    await sql`select to_regclass('public.ggc_auth_user') as users,to_regclass('ggc.account_requests') as accounts`;
  if (!ready.users || !ready.accounts)
    throw new Error("Run npm run db:update first.");
  const [existing] =
    await sql`select id from public.ggc_auth_user where lower(email)=lower(${email})`;
  let passwordHash;
  if (!existing) {
    const password = await ask(
      "New password (10-128 characters, hidden): ",
      true,
    );
    if (password.length < 10 || password.length > 128)
      throw new Error("Password must be 10-128 characters.");
    passwordHash = await hashPassword(password);
  }
  await sql.begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(20261019,4)`;
    let [user] =
      await tx`select id from public.ggc_auth_user where lower(email)=lower(${email})`;
    if (!user) {
      if (!passwordHash) throw new Error("Account changed. Run setup again.");
      const id = randomUUID();
      [user] =
        await tx`insert into public.ggc_auth_user(id,name,email,"emailVerified") values(${id},'관리자',${email},true) returning id`;
      await tx`insert into public.ggc_auth_account(id,"accountId","providerId","userId",password) values(${randomUUID()},${id},'credential',${id},${passwordHash})`;
    }
    const [linked] =
      await tx`select actor_id from ggc.account_requests where user_id=${user.id}`;
    const id = linked?.actor_id || user.id;
    await tx`insert into ggc.actors(id,kind,role,nickname) values(${id},'user','ADMIN','관리자') on conflict(id) do update set kind='user',role='ADMIN'`;
    await tx`update ggc.account_requests set status='approved',reviewed_by=${id} where user_id=${user.id}`;
    await tx`delete from ggc.guest_sessions where actor_id=${id}`;
    await tx`delete from public.ggc_auth_session where "userId"=${user.id}`;
  });
  console.log(
    "Administrator ready. Sign in at /admin. Existing passwords were preserved.",
  );
} catch (error) {
  console.error(
    "Administrator setup failed. Category:",
    error.code || "configuration",
  );
  process.exitCode = 1;
} finally {
  await sql.end();
}
