import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

test("ward/community tables exist with their constraints", async () => {
  process.env.LOCAL_DATABASE_PATH = await mkdtemp(path.join(tmpdir(), "ggc-schema-"));
  const { privileged } = await import("../src/lib/db");
  await privileged(async (db) => {
    const rows = await db.query<{ t: string | null }>(
      "select to_regclass(x) as t from unnest(array['ggc.event_managers','ggc.events','ggc.prompts','ggc.prompt_replies','ggc.prompt_reply_comments','ggc.prompt_reply_reactions']) x",
    );
    assert.deepEqual(rows.map((r) => r.t && String(r.t)), [
      "ggc.event_managers", "ggc.events", "ggc.prompts",
      "ggc.prompt_replies", "ggc.prompt_reply_comments", "ggc.prompt_reply_reactions",
    ]);
  });
  const actor = await privileged(async (db) =>
    (await db.query<{ id: string }>(
      "insert into ggc.actors(kind,role,nickname) values('user','ADMIN','a') returning id",
    ))[0].id,
  );
  await assert.rejects(
    privileged((db) =>
      db.query(
        "insert into ggc.events(title,starts_at,ends_at,organizations,created_by) values('x','2026-10-01T10:00Z','2026-10-01T09:00Z',array['all'],$1)",
        [actor],
      ),
    ),
    "ends_at must be after starts_at",
  );
  await assert.rejects(
    privileged((db) =>
      db.query(
        "insert into ggc.events(title,starts_at,ends_at,organizations,created_by) values('x','2026-10-01T09:00Z','2026-10-01T10:00Z',array['choir'],$1)",
        [actor],
      ),
    ),
    "unknown organization is rejected",
  );
  await assert.rejects(
    privileged((db) =>
      db.query(
        "insert into ggc.prompts(title,question,author,created_by,source_url) values('t','q','a',$1,'javascript:alert(1)')",
        [actor],
      ),
    ),
    "non-https source is rejected",
  );
});
