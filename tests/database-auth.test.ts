import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import type { Pool } from "pg";
import { NextRequest, NextResponse } from "next/server";
import {
  configureDatabaseAuth,
  resolveSessionSecret,
  updateDatabasePassword,
  verifyCreatedAuthUser,
} from "../src/lib/database-auth";
import type { DB } from "../src/lib/db";

test("database auth signs in UUID users and revokes sessions on logout and password reset", async () => {
  const sql = new PGlite();
  try {
    await sql.exec("create role anon; create role authenticated;");
    const migration = await readFile(
      "supabase/migrations/20261019040000_database_auth.sql",
      "utf8",
    );
    await sql.exec(migration);
    await sql.exec(migration);
    const db: DB = {
      query: async (query, params = []) =>
        (await sql.query(query, params)).rows as never,
    };
    const secret = await resolveSessionSecret(db);
    assert.equal(await resolveSessionSecret(db), secret);
    assert.equal(await resolveSessionSecret(db, ""), secret);
    assert.ok(secret.length >= 32);
    await assert.rejects(resolveSessionSecret(db, "short"), /auth_unavailable/);
    // Kysely's PG driver only needs query/release. SQL and transactions still run
    // through PostgreSQL itself rather than a mocked authentication provider.
    const client = {
      query: async (query: string, params: unknown[] = []) => {
        const result = await sql.query(query, params);
        return {
          rows: result.rows,
          rowCount: result.affectedRows || 0,
          command: query.trim().split(/\s/)[0].toUpperCase(),
        };
      },
      release() {},
    };
    const pool = {
      connect: async () => client,
      query: client.query,
      end: async () => {},
    } as unknown as Pool;
    const auth = configureDatabaseAuth(pool, secret, "https://example.com");
    const email = "teacher1@accounts.gokbanjeong.invalid";
    const password = "InitialPassword123!";
    const signup = await auth.api.signUpEmail({
      body: { email, password, name: "Teacher" },
      returnHeaders: true,
    });
    assert.match(signup.response.user.id, /^[0-9a-f-]{36}$/);
    assert.equal(signup.response.token, null);
    assert.equal(
      signup.headers.getSetCookie().length,
      0,
      "creating a teacher must not replace an admin session",
    );
    await verifyCreatedAuthUser(db, signup.response.user);
    const duplicate = await auth.api.signUpEmail({
      body: { email, password, name: "Duplicate" },
    });
    await assert.rejects(
      verifyCreatedAuthUser(db, duplicate.user),
      /username_taken/,
    );
    assert.equal(
      (await db.query("select count(*)::int as n from public.ggc_auth_user"))[0]
        .n,
      1,
    );
    await assert.rejects(
      auth.api.signInEmail({ body: { email, password: "WrongPassword123!" } }),
    );
    const login = await auth.api.signInEmail({
      body: { email, password },
      returnHeaders: true,
    });
    const cookie = login.headers
      .getSetCookie()
      .map((x) => x.split(";")[0])
      .join("; ");
    assert.match(cookie, /__Secure-ggc_auth\.session_token=/);
    assert.match(login.headers.getSetCookie()[0], /HttpOnly/i);
    assert.match(login.headers.getSetCookie()[0], /SameSite=Lax/i);
    const outgoing = new NextResponse(null, { headers: login.headers });
    const incoming = new NextRequest("https://example.com/account");
    for (const item of outgoing.cookies.getAll())
      incoming.cookies.set(item.name, item.value);
    assert.equal(
      (
        await auth.api.getSession({
          headers: new Headers({ cookie: incoming.cookies.toString() }),
        })
      )?.user.id,
      signup.response.user.id,
      "Next.js cookie parsing must preserve the signed session",
    );
    const headers = new Headers({ cookie });
    assert.equal(
      (await auth.api.getSession({ headers }))?.user.id,
      signup.response.user.id,
    );
    assert.equal(
      await auth.api.getSession({
        headers: new Headers({ cookie: cookie.replace(/.$/, "X") }),
      }),
      null,
    );
    // An administrator resetting someone else keeps their own session.
    const adminEmail = "admin1@accounts.gokbanjeong.invalid";
    await auth.api.signUpEmail({
      body: { email: adminEmail, password: "AdminPassword123!", name: "Admin" },
    });
    const adminLogin = await auth.api.signInEmail({
      body: { email: adminEmail, password: "AdminPassword123!" },
      returnHeaders: true,
    });
    const adminHeaders = new Headers({
      cookie: adminLogin.headers
        .getSetCookie()
        .map((x) => x.split(";")[0])
        .join("; "),
    });
    await updateDatabasePassword(
      db,
      signup.response.user.id,
      "ReplacementPassword123!",
    );
    assert.equal(
      (await auth.api.getSession({ headers: adminHeaders }))?.user.email,
      adminEmail,
      "resetting another account keeps the administrator signed in",
    );
    assert.equal(
      await auth.api.getSession({ headers }),
      null,
      "password reset revokes existing sessions",
    );
    await assert.rejects(auth.api.signInEmail({ body: { email, password } }));
    const replacement = await auth.api.signInEmail({
      body: { email, password: "ReplacementPassword123!" },
      returnHeaders: true,
    });
    const changedHeaders = new Headers({
      cookie: replacement.headers
        .getSetCookie()
        .map((x) => x.split(";")[0])
        .join("; "),
    });
    await auth.api.signOut({ headers: changedHeaders });
    assert.equal(await auth.api.getSession({ headers: changedHeaders }), null);
    await sql.exec("set role authenticated");
    for (const table of [
      "ggc_auth_user",
      "ggc_auth_account",
      "ggc_auth_session",
      "ggc_auth_config",
    ])
      await assert.rejects(
        sql.query(`select * from public.${table}`),
        /permission denied/,
      );
    await sql.exec("reset role");
  } finally {
    await sql.close();
  }
});
