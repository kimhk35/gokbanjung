import test from "node:test";
import assert from "node:assert/strict";
import { loginStatus } from "../src/lib/login-status";
import type { Actor } from "../src/lib/types";

const guest = { id: "g", kind: "guest", role: "GUEST", nickname: "", course_id: null } as unknown as Actor;
test("login status is written in all four languages", () => {
  assert.equal(loginStatus(guest, "ko"), "게스트(이름 미입력)");
  assert.equal(loginStatus(guest, "en"), "Guest (unnamed)");
  assert.equal(loginStatus(guest, "es"), "Invitado (sin nombre)");
  assert.equal(loginStatus(guest, "fil"), "Bisita (walang pangalan)");
});
