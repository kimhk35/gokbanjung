import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { actor } from "@/lib/auth";
import { asActor } from "@/lib/db";
import { requireAdmin, rateLimit } from "@/lib/service";
import { AppError, ensure } from "@/lib/errors";
import { sameOrigin } from "@/lib/site-url";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(req: NextRequest) {
  try {
    ensure(sameOrigin(req.headers, req.url), 403, "origin_rejected");
    const a = await actor();
    await requireAdmin(a);
    await rateLimit("upload:" + a.id, 10, 3600);
    ensure(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.SUPABASE_SERVICE_ROLE_KEY,
      503,
      "storage_unavailable",
    );
    ensure(
      Number(req.headers.get("content-length") || 0) <= 4 * 1024 * 1024,
      413,
      "too_large",
    );
    const form = await req.formData();
    const file = form.get("file");
    ensure(
      file instanceof File && file.size <= 4 * 1024 * 1024,
      413,
      "too_large",
    );
    const ext = file.name.split(".").at(-1)?.toLowerCase();
    ensure(
      ["pdf", "docx", "pptx", "txt", "md"].includes(ext || ""),
      400,
      "invalid_file",
    );
    const buffer = Buffer.from(await file.arrayBuffer());
    let extracted = "";
    if (ext === "txt" || ext === "md") extracted = buffer.toString("utf8");
    else if (ext === "pdf") {
      ensure(buffer.subarray(0, 5).toString() === "%PDF-", 400, "invalid_file");
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: buffer });
      try {
        extracted = (await parser.getText()).text;
      } finally {
        await parser.destroy();
      }
    } else if (ext === "docx") {
      const mammoth = await import("mammoth");
      extracted = (await mammoth.extractRawText({ buffer })).value;
    } else {
      const { default: JSZip } = await import("jszip");
      const zip = await JSZip.loadAsync(buffer);
      const slides = Object.keys(zip.files)
        .filter((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p))
        .sort(
          (a, b) => Number(a.match(/\d+/)?.[0]) - Number(b.match(/\d+/)?.[0]),
        );
      ensure(slides.length <= 300, 400, "too_large");
      for (const name of slides) {
        const text = await zip.files[name].async("string");
        ensure(text.length < 2000000, 400, "too_large");
        extracted +=
          "\n" +
          Array.from(
            text.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g),
            (m) => m[1],
          ).join(" ");
      }
    }
    ensure(extracted.trim().length > 20, 400, "no_text");
    ensure(extracted.length <= 500000, 413, "too_large");
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const storagePath = `${a.course_id}/${randomUUID()}.${ext}`;
    const uploaded = await supabase.storage
      .from("gospel-materials")
      .upload(storagePath, buffer, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });
    ensure(!uploaded.error, 502, "upload_failed");
    try {
      const data = await asActor(a, (db) =>
        db.query(
          "insert into ggc.resources(course_id,created_by,name,storage_path,extracted_text) values($1,$2,$3,$4,$5) returning id,name,status",
          [a.course_id, a.id, file.name, storagePath, extracted],
        ),
      );
      return NextResponse.json(data[0]);
    } catch (error) {
      await supabase.storage.from("gospel-materials").remove([storagePath]);
      throw error;
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof AppError ? error.code : "upload_failed" },
      { status: error instanceof AppError ? error.status : 500 },
    );
  }
}
