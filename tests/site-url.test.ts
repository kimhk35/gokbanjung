import test from "node:test";
import assert from "node:assert/strict";
import { siteOrigin, sameOrigin } from "../src/lib/site-url";
import { sniffImage, posterUrl } from "../src/lib/poster";

const h = (x: Record<string, string>) => new Headers(x);
test("origin comes from explicit setting, then forwarded host, then request url", () => {
  assert.equal(siteOrigin(h({}), "http://localhost:3000/api/x", { NEXT_PUBLIC_SITE_URL: "https://ward.example/" }), "https://ward.example");
  assert.equal(siteOrigin(h({ "x-forwarded-host": "gokbanjung.vercel.app", "x-forwarded-proto": "https" }), "http://internal/api/x", {}), "https://gokbanjung.vercel.app");
  assert.equal(siteOrigin(h({}), "http://localhost:3000/api/x", {}), "http://localhost:3000");
  assert.equal(sameOrigin(h({ origin: "https://evil.example", "x-forwarded-host": "gokbanjung.vercel.app", "x-forwarded-proto": "https" }), "http://internal/", {}), false);
  assert.equal(sameOrigin(h({ origin: "https://gokbanjung.vercel.app", "x-forwarded-host": "gokbanjung.vercel.app", "x-forwarded-proto": "https" }), "http://internal/", {}), true);
  assert.equal(sameOrigin(h({}), "http://localhost:3000/", {}), false);
});
test("poster helpers", () => {
  assert.equal(sniffImage(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), "png");
  assert.equal(sniffImage(new Uint8Array([0xff, 0xd8, 0xff, 0xe0])), "jpg");
  assert.equal(sniffImage(new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 ")), "webp");
  assert.equal(sniffImage(new TextEncoder().encode("<svg>")), null);
  assert.equal(posterUrl("events/a.webp", "https://x.supabase.co"), "https://x.supabase.co/storage/v1/object/public/ggc-posters/events/a.webp");
  assert.equal(posterUrl(null, "https://x.supabase.co"), null);
});
