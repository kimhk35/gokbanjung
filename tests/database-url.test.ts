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

test("accepts the connection string and psql command that Neon shows", () => {
  const neon = "postgresql://owner:pw@ep-a-pooler.ap-southeast-1.aws.neon.tech/neondb";
  // postgres.js would send channel_binding to the server, which rejects it.
  for (const pasted of [
    `${neon}?sslmode=require&channel_binding=require`,
    `psql '${neon}?channel_binding=require&sslmode=require'`,
  ]) {
    const { url, host, error } = parseDatabaseUrl(pasted);
    assert.equal(error, undefined);
    assert.equal(url, `${neon}?sslmode=require`);
    assert.equal(host, "ep-a-pooler.ap-southeast-1.aws.neon.tech");
  }
  assert.equal(parseDatabaseUrl(`${neon}?channel_binding=require`).url, neon);
});
