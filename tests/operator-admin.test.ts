import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import type { Pool } from "pg";
import { hashPassword } from "better-auth/crypto";
import { configureDatabaseAuth, resolveSessionSecret } from "../src/lib/database-auth";
import { reconnectAccount } from "../src/lib/account-reconnect";
import { adminOverview, setAdminPassword } from "../src/lib/operator-admin";
import type { DB } from "../src/lib/db";

test("operators can inspect administrators and replace a forgotten password", async () => {
  const sql = new PGlite();
  try {
    await sql.exec("create role authenticated; create role anon;");
    for (const file of (await readdir("supabase/migrations")).sort())
      await sql.exec(await readFile("supabase/migrations/" + file, "utf8"));
    await sql.exec(await readFile("supabase/seed.sql", "utf8"));
    const db: DB = {
      query: async (query, params = []) => (await sql.query(query, params)).rows as never,
    };
    const empty = await adminOverview(db);
    assert.equal(empty.weeks, 52);
    assert.deepEqual(empty.admins, []);

    const admin = "a0000000-0000-4000-8000-000000000001";
    const teacher = "a0000000-0000-4000-8000-000000000002";
    const lost = "a0000000-0000-4000-8000-000000000003";
    await sql.exec(`insert into ggc.actors(id,kind,role,nickname) values
      ('${admin}','user','ADMIN','관리자A'),
      ('${teacher}','user','TEACHER','교사B'),
      ('${lost}','user','ADMIN','관리자C');`);
    const transact = <T>(fn: (tx: DB) => Promise<T>) =>
      sql.transaction((tx) =>
        fn({ query: async (q, p = []) => (await tx.query(q, p)).rows as never }),
      );
    for (const [actorId, login] of [[admin, "admin_a"], [teacher, "teacher_b"]] as const) {
      const passwordHash = await hashPassword("OldPassword123!");
      await transact((tx) => reconnectAccount(tx, { actorId, login, passwordHash }));
    }
    const overview = await adminOverview(db);
    assert.deepEqual(
      overview.admins.map((a) => [a.actor_id, a.login, a.has_login, a.status]),
      [
        [admin, "admin_a@accounts.gokbanjeong.invalid", true, "approved"],
        [lost, null, false, null],
      ],
    );
    assert.equal(overview.teachers, 1);

    const client = {
      query: async (query: string, params: unknown[] = []) => {
        const result = await sql.query(query, params);
        return { rows: result.rows, rowCount: result.affectedRows || 0, command: query.trim().split(/\s/)[0].toUpperCase() };
      },
      release() {},
    };
    const pool = { connect: async () => client, query: client.query, end: async () => {} } as unknown as Pool;
    const auth = configureDatabaseAuth(pool, await resolveSessionSecret(db), "https://example.com");
    const signIn = (email: string, password: string) =>
      auth.api.signInEmail({ body: { email, password } });
    const email = "admin_a@accounts.gokbanjeong.invalid";
    const teacherEmail = "teacher_b@accounts.gokbanjeong.invalid";
    await signIn(email, "OldPassword123!");
    await signIn(teacherEmail, "OldPassword123!");
    const sessions = async () =>
      (await db.query<{ n: number }>('select count(*)::int as n from public.ggc_auth_session'))[0].n;
    assert.equal(await sessions(), 2);
    const before = await db.query("select * from ggc.account_requests order by user_id");
    const actorsBefore = await db.query("select * from ggc.actors order by id");

    const passwordHash = await hashPassword("NewPassword123!");
    const reset = (actorId: string) =>
      transact((tx) => setAdminPassword(tx, { actorId, passwordHash }));
    // Only an administrator that already has a sign-in can be reset here.
    await assert.rejects(reset(teacher), /not_administrator/);
    await assert.rejects(reset(lost), /not_connected/);
    await assert.rejects(reset("a0000000-0000-4000-8000-00000000ffff"), /not_found/);
    assert.equal((await reset(admin)).email, email);

    await assert.rejects(signIn(email, "OldPassword123!"));
    assert.equal(await sessions(), 1, "only the administrator's sessions end");
    await signIn(email, "NewPassword123!");
    await signIn(teacherEmail, "OldPassword123!");
    assert.deepEqual(await db.query("select * from ggc.account_requests order by user_id"), before);
    assert.deepEqual(await db.query("select * from ggc.actors order by id"), actorsBefore);

    // A sign-in record without a password row is completed instead of failing.
    await sql.exec(`delete from public.ggc_auth_account where "accountId"=(select id from public.ggc_auth_user where email='${email}')`);
    await assert.rejects(signIn(email, "NewPassword123!"));
    await reset(admin);
    await signIn(email, "NewPassword123!");
  } finally {
    await sql.close();
  }
});
