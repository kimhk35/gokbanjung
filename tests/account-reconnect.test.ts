import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import type { Pool } from "pg";
import { hashPassword } from "better-auth/crypto";
import { configureDatabaseAuth, resolveSessionSecret } from "../src/lib/database-auth";
import { reconnectAccount, reconnectCandidates } from "../src/lib/account-reconnect";
import { resolveAuthActor } from "../src/lib/auth";
import type { DB } from "../src/lib/db";

test("operators can reconnect former accounts to their existing records", async () => {
  const sql = new PGlite();
  try {
    await sql.exec("create role authenticated; create role anon;");
    for (const file of (await readdir("supabase/migrations")).sort())
      await sql.exec(await readFile("supabase/migrations/" + file, "utf8"));
    await sql.exec(await readFile("supabase/seed.sql", "utf8"));
    const db: DB = {
      query: async (query, params = []) => (await sql.query(query, params)).rows as never,
    };
    // Former Supabase-era people whose provider sign-ins no longer exist.
    const admin = "a0000000-0000-4000-8000-000000000001";
    const member = "a0000000-0000-4000-8000-000000000003";
    const guest = "a0000000-0000-4000-8000-000000000004";
    const deadMemberLogin = "b0000000-0000-4000-8000-000000000003";
    await sql.exec(`
      insert into ggc.actors(id,kind,role,nickname) values
        ('${admin}','user','ADMIN','관리자A'),
        ('${member}','user','MEMBER','회원C'),
        ('${guest}','guest','GUEST','게스트D');
      insert into ggc.account_requests(user_id,actor_id,email,status) values
        ('${deadMemberLogin}','${member}','member_c@accounts.gokbanjeong.invalid','approved');
      insert into ggc.reflections(owner_id,week,day,content) values('${member}',45,1,'{"text":"keep"}');`);

    const candidates = await reconnectCandidates(db);
    assert.deepEqual(candidates.map((c) => c.actor_id).sort(), [admin, member]);
    assert.equal(
      candidates.find((c) => c.actor_id === member)?.former_login,
      "member_c@accounts.gokbanjeong.invalid",
    );

    const run = (actorId: string, login: string, password: string) =>
      hashPassword(password).then((passwordHash) =>
        sql.transaction((tx) =>
          reconnectAccount(
            { query: async (q, p = []) => (await tx.query(q, p)).rows as never },
            { actorId, login, passwordHash },
          ),
        ),
      );
    const linkedAdmin = await run(admin, "Admin_A", "AdminPassword123!");
    const linkedMember = await run(member, "member_c", "MemberPassword123!");
    await assert.rejects(run(guest, "guest_d", "GuestPassword123!"), /invalid_transition/);
    await assert.rejects(run(member, "member_c2", "MemberPassword123!"), /already_connected/);
    await assert.rejects(run(admin, "member_c", "AdminPassword123!"), /already_connected/);
    // A login ID already in use is refused, and the failed attempt leaves nothing behind.
    const teacher = "a0000000-0000-4000-8000-000000000002";
    await sql.query("insert into ggc.actors(id,kind,role,nickname) values($1,'user','TEACHER','교사B')", [teacher]);
    await assert.rejects(run(teacher, "member_c", "TeacherPassword123!"), /username_taken/);
    assert.deepEqual((await reconnectCandidates(db)).map((c) => c.actor_id), [teacher]);
    await run(teacher, "teacher_b", "TeacherPassword123!");
    assert.equal((await reconnectCandidates(db)).length, 0);

    // A real Better Auth sign-in now resolves to the original actor and role.
    const client = {
      query: async (query: string, params: unknown[] = []) => {
        const result = await sql.query(query, params);
        return { rows: result.rows, rowCount: result.affectedRows || 0, command: query.trim().split(/\s/)[0].toUpperCase() };
      },
      release() {},
    };
    const pool = { connect: async () => client, query: client.query, end: async () => {} } as unknown as Pool;
    const auth = configureDatabaseAuth(pool, await resolveSessionSecret(db), "https://example.com");
    const signIn = async (email: string, password: string) =>
      (await auth.api.signInEmail({ body: { email, password } })).user;
    const adminUser = await signIn("admin_a@accounts.gokbanjeong.invalid", "AdminPassword123!");
    assert.equal(adminUser.id, linkedAdmin.userId);
    const adminActor = await resolveAuthActor(db, adminUser);
    assert.equal(adminActor.id, admin);
    assert.equal(adminActor.role, "ADMIN");
    const memberUser = await signIn("member_c@accounts.gokbanjeong.invalid", "MemberPassword123!");
    const memberActor = await resolveAuthActor(db, memberUser);
    assert.equal(memberActor.id, member);
    assert.equal(memberActor.role, "MEMBER");
    assert.equal(memberActor.account_status, "approved");
    assert.equal(linkedMember.actorId, member);
    await assert.rejects(signIn("member_c@accounts.gokbanjeong.invalid", "WrongPassword123!"));

    const kept = await db.query("select content from ggc.reflections where owner_id=$1", [member]);
    assert.equal(kept.length, 1, "existing records stay with the reconnected member");
    const actors = await db.query<{ n: number }>("select count(*)::int as n from ggc.actors");
    assert.equal(actors[0].n, 4, "no new actor is created");
  } finally {
    await sql.close();
  }
});
