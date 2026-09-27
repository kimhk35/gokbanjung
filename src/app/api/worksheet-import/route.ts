import { NextRequest, NextResponse } from "next/server";
import { actor } from "@/lib/auth";
import { rateLimit } from "@/lib/service";
import { AppError, ensure } from "@/lib/errors";
import { sameOrigin } from "@/lib/site-url";
import { canAuthor } from "@/lib/prompts";
import { extractText, fileKind } from "@/lib/file-text";
import { extractQuestions } from "@/lib/worksheet-import";
export const runtime = "nodejs";
export const maxDuration = 60;
const MAX = 4 * 1024 * 1024;

// Teachers/admins upload a worksheet file; the response is a list of question
// drafts only. Nothing is stored — the teacher edits and publishes as usual.
export async function POST(req: NextRequest) {
  try {
    ensure(sameOrigin(req.headers, req.url), 403, "origin_rejected");
    const a = await actor();
    ensure(canAuthor(a), 403, "forbidden");
    await rateLimit("worksheet-import:" + a.id, 30, 3600);
    ensure(
      Number(req.headers.get("content-length") || 0) <= MAX + 16384,
      413,
      "too_large",
    );
    const file = (await req.formData()).get("file");
    ensure(file instanceof File && file.size <= MAX, 413, "too_large");
    const bytes = new Uint8Array(await file.arrayBuffer());
    const kind = fileKind(file.name, bytes);
    ensure(kind, 400, "invalid_file");
    let text = "";
    try {
      text = await extractText(bytes, kind);
    } catch {
      throw new AppError(400, "unreadable_file");
    }
    const questions = extractQuestions(text);
    ensure(questions.length, 400, "no_questions");
    return NextResponse.json(
      { questions },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    if (e instanceof AppError)
      return NextResponse.json({ error: e.code }, { status: e.status });
    console.error("worksheet_import_failed", { category: "internal" });
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
