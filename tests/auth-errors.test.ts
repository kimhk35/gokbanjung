import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { APIError } from "better-auth/api";
import type { AccountAuthClient } from "../src/lib/database-auth";
import { authFailure } from "../src/lib/database-auth";
import { AppError, serverFailure } from "../src/lib/errors";
import type { Actor } from "../src/lib/types";
import { privileged } from "../src/lib/db";
import { requestTeacher } from "../src/lib/teacher-accounts";
import { requestAccount } from "../src/lib/account-security";

test("provider rejections map to stable codes without blaming the ID", () => {
  const code = (e: unknown, fallback = "teacher_request_failed") =>
    authFailure(e, fallback).code;
  assert.equal(
    code(APIError.from("UNPROCESSABLE_ENTITY", { code: "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL", message: "" })),
    "username_taken",
  );
  assert.equal(
    code(APIError.from("BAD_REQUEST", { code: "PASSWORD_TOO_SHORT", message: "" })),
    "invalid_input",
  );
  assert.equal(
    code(APIError.from("TOO_MANY_REQUESTS", { code: "RATE_LIMITED", message: "" })),
    "rate_limited",
  );
  assert.equal(
    code(APIError.from("INTERNAL_SERVER_ERROR", { code: "FAILED_TO_CREATE_USER", message: "" })),
    "teacher_request_failed",
  );
  assert.equal(code(new AppError(503, "auth_unavailable")), "auth_unavailable");
  assert.equal(code(null, "account_request_failed"), "account_request_failed");
});

test("database failures are reported as setup or temporary problems", () => {
  const pg = (code: string) => Object.assign(new Error("db"), { code });
  assert.deepEqual(serverFailure(pg("42P01")), { status: 503, code: "setup_required" });
  assert.deepEqual(serverFailure(pg("08006")), { status: 503, code: "service_unavailable" });
  assert.deepEqual(serverFailure(pg("57P01")), { status: 503, code: "service_unavailable" });
  assert.deepEqual(serverFailure(pg("ECONNREFUSED")), { status: 503, code: "service_unavailable" });
  assert.deepEqual(serverFailure(pg("42501")), { status: 403, code: "forbidden" });
  assert.equal(serverFailure(new Error("other")), null);
});

test("signup paths surface the provider reason", async () => {
  process.env.LOCAL_DATABASE_PATH = await mkdtemp(
    (await import("node:path")).join((await import("node:os")).tmpdir(), "ggc-auth-errors-"),
  );
  const guests = [randomUUID(), randomUUID(), randomUUID()];
  await privileged(async (db) => {
    for (const id of guests)
      await db.query(
        "insert into ggc.actors(id,kind,role,nickname) values($1,'guest','GUEST','')",
        [id],
      );
  });
  const guest = (id: string): Actor => ({
    id,
    kind: "guest",
    role: "GUEST",
    nickname: "",
    course_id: "old-testament-2026",
  });
  const failing = (error: unknown) =>
    ({
      auth: {
        admin: {
          createUser: async () => {
            if (error instanceof Error && !(error instanceof APIError)) throw error;
            return { error, data: { user: null } };
          },
          deleteUser: async () => ({ error: null }),
        },
      },
    }) as unknown as AccountAuthClient;
  const taken = failing(
    APIError.from("UNPROCESSABLE_ENTITY", { code: "USER_ALREADY_EXISTS", message: "" }),
  );
  await assert.rejects(
    requestTeacher(guest(guests[0]), { username: "taken_id", password: "MyPassword123!" }, taken, taken),
    /username_taken/,
  );
  await assert.rejects(
    requestAccount(guest(guests[1]), { username: "taken_id", password: "MyPassword123!" }, taken, "https://unused.invalid", taken),
    /username_taken/,
  );
  // An outage must not be reported as a duplicate ID.
  const down = failing(Object.assign(new Error("connect"), { code: "ECONNREFUSED" }));
  await assert.rejects(
    requestTeacher(guest(guests[2]), { username: "free_id", password: "MyPassword123!" }, down, down),
    (e: unknown) => !(e instanceof AppError) && serverFailure(e)?.code === "service_unavailable",
  );
  const links = await privileged((db) => db.query("select 1 from ggc.account_requests"));
  assert.equal(links.length, 0, "failed signups leave no links");
});
