import test from "node:test";
import assert from "node:assert/strict";
import { contentSecurityPolicy } from "../src/lib/security-headers";

test("production pages may not turn text into code (no unsafe-eval)", () => {
  const prod = contentSecurityPolicy(false);
  assert.match(prod, /script-src 'self' 'unsafe-inline';/);
  assert.doesNotMatch(prod, /unsafe-eval/);
  assert.match(prod, /frame-ancestors 'none'/);
  assert.match(prod, /img-src 'self' data: blob: https:\/\/\*\.supabase\.co/);
});
test("the local development server keeps eval for hot reload", () => {
  assert.match(contentSecurityPolicy(true), /script-src 'self' 'unsafe-inline' 'unsafe-eval';/);
});
