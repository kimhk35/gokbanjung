import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { actor } from "@/lib/auth";
import { rateLimit } from "@/lib/service";
import { AppError, ensure } from "@/lib/errors";
import { sameOrigin } from "@/lib/site-url";
import { POSTER_MAX, sniffImage } from "@/lib/poster";
import { privileged } from "@/lib/db";
import { storeFile } from "@/lib/file-storage";
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
    ensure(
      kind === "events" || kind === "prompts" || kind === "insights",
      400,
      "invalid_input",
    );
    const a = await actor();
    ensure(
      kind === "events" ? await canCreateEvents(a) : canAuthor(a),
      403,
      "forbidden",
    );
    await rateLimit("poster:" + a.id, 30, 3600);
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
    await privileged((db) =>
      storeFile(db, {
        bucket: "posters",
        path,
        createdBy: a.id,
        filename: `poster.${ext}`,
        contentType: TYPES[ext],
        buffer,
      }),
    );
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
