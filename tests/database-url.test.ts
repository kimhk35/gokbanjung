import test from "node:test";
import assert from "node:assert/strict";
import { parseDatabaseUrl } from "../scripts/database-url.mjs";

const good =
  "postgresql://postgres.abc:pa%40ss@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres";

test("accepts the value as copied, with common paste noise removed", () => {
  assert.equal(parseDatabaseUrl(good).url, good);
  assert.equal(parseDatabaseUrl(`  ${good}\r\n`).url, good);
  assert.equal(parseDatabaseUrl(`"${good}"`).url, good);
  assert.equal(parseDatabaseUrl(`DATABASE_URL=${good}`).url, good);
  assert.equal(
    parseDatabaseUrl(good.replace("postgresql:", "postgres:")).host,
    "aws-0-ap-northeast-2.pooler.supabase.com",
  );
});

test("explains in Korean what went wrong", () => {
  assert.match(parseDatabaseUrl("").error!, /비어/);
  assert.match(parseDatabaseUrl("DATABASE_URLDATABASE_URL").error!, /이름.*값/);
  assert.match(parseDatabaseUrl(good + good).error!, /두 번 이상/);
  assert.match(
    parseDatabaseUrl("https://vercel.com/x").error!,
    /postgresql:\/\//,
  );
  assert.match(parseDatabaseUrl("postgresql://nohost").error!, /올바른 주소/);
});
