import test from "node:test";
import assert from "node:assert/strict";
import postgres from "postgres";
import { PGlite } from "@electric-sql/pglite";
import { databaseJsonType, decodeJsonContainer } from "../src/lib/json-data";
import { parseAiContent } from "../src/lib/ai-content";

test("Postgres JSON parameters remain containers, including legacy AI rows", async () => {
  // Use the installed production driver's actual serializer tables and a real
  // PostgreSQL JSONB query in PGlite. No remote credentials are involved.
  const oldDriver = postgres({ max: 1 });
  const fixedDriver = postgres({ max: 1, types: { json: databaseJsonType } });
  const db = new PGlite();
  try {
    const content = {
      questions: ["이사야의 말씀을 삶에 어떻게 적용할 수 있을까요?"],
    };
    const encoded = JSON.stringify(content);
    const oldWire = oldDriver.options.serializers[3802](encoded);
    const broken = await db.query<{ kind: string; content: unknown }>(
      "select jsonb_typeof($1::jsonb) as kind, $1::jsonb as content",
      [oldWire],
    );
    assert.equal(broken.rows[0].kind, "string");
    assert.equal(typeof broken.rows[0].content, "string");
    assert.deepEqual(
      parseAiContent("questions", broken.rows[0].content),
      content,
    );
    for (const oid of [114, 3802]) {
      const wire = fixedDriver.options.serializers[oid](encoded);
      const saved = await db.query<{ kind: string; question: string }>(
        "select jsonb_typeof($1::jsonb) as kind, $1::jsonb->'questions'->>0 as question",
        [wire],
      );
      assert.equal(saved.rows[0].kind, "object");
      assert.equal(saved.rows[0].question, content.questions[0]);
      assert.deepEqual(fixedDriver.options.parsers[oid](oldWire), content);
      assert.deepEqual(fixedDriver.options.parsers[oid](wire), content);
    }
    assert.deepEqual(decodeJsonContainer(JSON.stringify(encoded)), content);
    assert.deepEqual(
      parseAiContent(
        "worksheet",
        JSON.stringify({ items: [{ ko: "질문", en: "Question" }] }),
      ),
      { items: [{ ko: "질문", en: "Question" }] },
    );
    for (const malformed of [
      null,
      "broken",
      { questions: null },
      { questions: [{}] },
      {},
    ])
      assert.equal(parseAiContent("questions", malformed), null);
    assert.equal(decodeJsonContainer("123"), "123");
    assert.equal(decodeJsonContainer("plain text"), "plain text");
    assert.equal(databaseJsonType.parse('"gpt-4.1-mini"'), "gpt-4.1-mini");
    assert.deepEqual(databaseJsonType.parse('"[1,2]"'), [1, 2]);
  } finally {
    await db.close();
    await oldDriver.end();
    await fixedDriver.end();
  }
});
