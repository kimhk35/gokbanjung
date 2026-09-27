import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { actor } from "@/lib/auth";
import { rateLimit } from "@/lib/service";
import { AppError, ensure } from "@/lib/errors";
import { sameOrigin } from "@/lib/site-url";
import { POSTER_BUCKET, POSTER_MAX, sniffImage } from "@/lib/poster";
import { canCreateEvents } from "@/lib/ward-events";
import { canAuthor } from "@/lib/prompts";
export const runtime = "nodejs";
const TYPES = {
  webp: "image/webp",
  png: "image/png",
  jpg: "image/jpeg",
} as const;
export async function POST(req: NextRequest) {
  try {
    ensure(sameOrigin(req.headers, req.url), 403, "origin_rejected");
    const kind = req.nextUrl.searchParams.get("kind");
    ensure(kind === "events" || kind === "prompts", 400, "invalid_input");
    const a = await actor();
    ensure(
      kind === "events" ? await canCreateEvents(a) : canAuthor(a),
      403,
      "forbidden",
    );
    await rateLimit("poster:" + a.id, 30, 3600);
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key =
      process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    ensure(url && key, 503, "storage_unavailable");
    ensure(
      Number(req.headers.get("content-length") || 0) <= POSTER_MAX + 16384,
      413,
      "too_large",
    );
    const file = (await req.formData()).get("file");
    ensure(file instanceof File && file.size <= POSTER_MAX, 413, "too_large");
    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = sniffImage(buffer);
    ensure(ext, 400, "invalid_file");
    const path = `${kind}/${randomUUID()}.${ext}`;
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(url!, key!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await supabase.storage
      .from(POSTER_BUCKET)
      .upload(path, buffer, {
        contentType: TYPES[ext],
        cacheControl: "31536000",
        upsert: false,
      });
    ensure(!error, 503, "storage_unavailable");
    return NextResponse.json(
      { path },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    if (e instanceof AppError)
      return NextResponse.json({ error: e.code }, { status: e.status });
    console.error("poster_failed", { category: "internal" });
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
