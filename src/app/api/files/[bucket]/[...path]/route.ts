import { NextResponse } from "next/server";
import { actor } from "@/lib/auth";
import { privileged } from "@/lib/db";
import { AppError } from "@/lib/errors";
import {
  fileResponseHeaders,
  readStoredFile,
  validateFilePath,
} from "@/lib/file-storage";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  context: { params: Promise<{ bucket: string; path: string[] }> },
) {
  try {
    const { bucket, path: parts } = await context.params;
    const path = parts.join("/");
    validateFilePath(bucket, path);
    // Public poster requests never create a visitor session or expose documents.
    const a = bucket === "materials" ? await actor() : null;
    const file = await privileged((db) => readStoredFile(db, bucket, path, a));
    return new Response(new Uint8Array(file.buffer), {
      headers: fileResponseHeaders(bucket, file),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof AppError ? error.code : "storage_unavailable" },
      {
        status: error instanceof AppError ? error.status : 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
