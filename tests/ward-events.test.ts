import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { Actor } from "../src/lib/types";

process.env.LOCAL_DATABASE_PATH = await mkdtemp(path.join(tmpdir(), "ggc-ward-"));
const { privileged } = await import("../src/lib/db");
const W = await import("../src/lib/ward-events");
const { AppError } = await import("../src/lib/errors");

async function make(role: Actor["role"], kind: Actor["kind"] = role === "GUEST" ? "guest" : "user"): Promise<Actor> {
  return privileged(async (db) =>
    (await db.query(
      "insert into ggc.actors(kind,role,nickname) values($1,$2,$3) returning id,kind,role,nickname,course_id",
      [kind, role, role.toLowerCase()],
    ))[0] as Actor,
  );
}
const status = (code: number) => (e: unknown) => e instanceof AppError && e.status === code;
const base = { title: "와드 바자회", description: "", date: "2026-10-10", start: "10:00", end_date: "2026-10-10", end: "13:00", location: "와드 문화관", organizations: ["all"], status: "draft" };
const october = new URLSearchParams({ from: "2026-09-30T15:00:00.000Z", to: "2026-10-31T15:00:00.000Z" });

test("drafts are private to managers; published events are public", async () => {
  const admin = await make("ADMIN"), guest = await make("GUEST");
  await assert.rejects(W.saveEvent(guest, base), status(403));
  const draft = await W.saveEvent(admin, base);
  assert.equal(draft.status, "draft");
  assert.equal(draft.starts_at, "2026-10-10T01:00:00.000Z");
  assert.equal((await W.listEvents(guest, october)).items.length, 0);
  assert.equal((await W.listEvents(null, october)).items.length, 0);
  await assert.rejects(W.getEvent(guest, draft.slug), status(404));
  assert.equal((await W.listEvents(admin, october)).items[0].can_edit, true);
  await W.setEventStatus(admin, { id: draft.id, status: "published" });
  const seen = (await W.listEvents(null, october)).items;
  assert.equal(seen.length, 1);
  assert.equal(seen[0].can_edit, false);
  assert.equal((await W.getEvent(guest, draft.slug)).title, "와드 바자회");
  await W.setEventStatus(admin, { id: draft.id, status: "cancelled" });
  assert.equal((await W.getEvent(null, draft.slug)).status, "cancelled");
  await W.deleteEvent(admin, { id: draft.id });
  await assert.rejects(W.getEvent(admin, draft.slug), status(404));
});

test("organization managers are scoped", async () => {
  const admin = await make("ADMIN"), member = await make("MEMBER"), guest = await make("GUEST");
  await assert.rejects(W.setEventManager(member, { actor_id: member.id, organization: "youth", enabled: true }), status(403));
  await assert.rejects(W.setEventManager(admin, { actor_id: guest.id, organization: "youth", enabled: true }), status(400));
  await W.setEventManager(admin, { actor_id: member.id, organization: "youth", enabled: true });
  assert.equal(await W.canCreateEvents(member), true);
  const youth = await W.saveEvent(member, { ...base, organizations: ["youth"] });
  await assert.rejects(W.saveEvent(member, { ...base, organizations: ["youth", "primary"] }), status(403));
  const primary = await W.saveEvent(admin, { ...base, organizations: ["primary"] });
  await assert.rejects(W.saveEvent(member, { ...base, id: primary.id, organizations: ["youth"] }), status(403));
  await assert.rejects(W.deleteEvent(member, { id: primary.id }), status(403));
  await W.saveEvent(member, { ...base, id: youth.id, title: "청소년 밤샘", organizations: ["youth"] });
  const managers = await W.listEventManagers(admin);
  assert.ok(managers.users.some((u) => u.id === member.id));
  assert.deepEqual(managers.managers.filter((m) => m.actor_id === member.id).map((m) => m.organization), ["youth"]);
  await W.setEventManager(admin, { actor_id: member.id, organization: "youth", enabled: false });
  assert.equal(await W.canCreateEvents(member), false);
});

test("time validation and KST month boundary", async () => {
  const admin = await make("ADMIN");
  await assert.rejects(W.saveEvent(admin, { ...base, end: "09:00" }), status(400));
  await assert.rejects(W.saveEvent(admin, { ...base, date: "2026-02-30", end_date: "2026-02-30" }), status(400));
  const early = await W.saveEvent(admin, { ...base, title: "새벽", date: "2026-11-01", start: "08:00", end_date: "2026-11-01", end: "09:00", status: "published" });
  assert.equal(early.starts_at, "2026-10-31T23:00:00.000Z");
  const nov = new URLSearchParams({ from: "2026-10-31T15:00:00.000Z", to: "2026-11-30T15:00:00.000Z" });
  assert.ok((await W.listEvents(null, nov)).items.some((e) => e.id === early.id));
  assert.ok(!(await W.listEvents(null, october)).items.some((e) => e.id === early.id));
  await assert.rejects(W.listEvents(null, new URLSearchParams({ from: "2026-01-01T00:00:00Z", to: "2028-01-01T00:00:00Z" })), status(400));
  assert.ok((await W.upcomingEvents(3)).length <= 3);
});
