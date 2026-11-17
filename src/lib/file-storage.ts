import type { DB } from "./db";
import type { Actor } from "./types";
import { ensure } from "./errors";
import { POSTER_MAX, sniffImage } from "./poster";

export const MATERIAL_MAX = 4 * 1024 * 1024;
export type FileBucket = "posters" | "materials";
const POSTER_PATH =
  /^(events|prompts|insights)\/[a-f0-9-]{36}\.(png|jpg|webp)$/;
const MATERIAL_PATH = /^[a-zA-Z0-9_-]+\/[a-f0-9-]{36}\.(pdf|docx|pptx|txt|md)$/;

export function validateFilePath(
  bucket: string,
  path: string,
): asserts bucket is FileBucket {
  ensure(
    (bucket === "posters" && POSTER_PATH.test(path)) ||
      (bucket === "materials" && MATERIAL_PATH.test(path)),
    404,
    "not_found",
  );
}

type StoredFileInput = {
  bucket: FileBucket;
  path: string;
  createdBy: string;
  filename: string;
  contentType: string;
  buffer: Buffer;
};

// The caller must check write permissions before entering its DB transaction.
// This table deliberately has no grants for the authenticated or anon roles.
export async function storeFile(db: DB, file: StoredFileInput) {
  validateFilePath(file.bucket, file.path);
  ensure(
    file.buffer.length > 0 &&
      file.buffer.length <=
        (file.bucket === "posters" ? POSTER_MAX : MATERIAL_MAX),
    413,
    "too_large",
  );
  ensure(
    file.filename.length > 0 && file.filename.length <= 255,
    400,
    "invalid_file",
  );
  if (file.bucket === "posters") {
    const ext = sniffImage(file.buffer);
    const mime = ext === "jpg" ? "image/jpeg" : `image/${ext}`;
    ensure(
      ext && file.contentType === mime && file.path.endsWith(`.${ext}`),
      400,
      "invalid_file",
    );
  }
  await db.query(
    "insert into ggc.stored_files(bucket,path,created_by,filename,content_type,bytes) values($1,$2,$3,$4,$5,decode($6,'base64'))",
    [
      file.bucket,
      file.path,
      file.createdBy,
      file.filename,
      file.contentType,
      file.buffer.toString("base64"),
    ],
  );
}

export async function readStoredFile(
  db: DB,
  bucket: string,
  path: string,
  a: Actor | null,
) {
  validateFilePath(bucket, path);
  if (bucket === "materials")
    ensure(
      a?.kind === "user" &&
        a.role === "ADMIN" &&
        path.startsWith(`${a.course_id}/`),
      403,
      "forbidden",
    );
  const file = (
    await db.query<{ filename: string; content_type: string; encoded: string }>(
      "select filename,content_type,encode(bytes,'base64') as encoded from ggc.stored_files where bucket=$1 and path=$2",
      [bucket, path],
    )
  )[0];
  ensure(file, 404, "not_found");
  return { ...file, buffer: Buffer.from(file.encoded, "base64") };
}

export function fileResponseHeaders(
  bucket: FileBucket,
  file: { filename: string; content_type: string; buffer: Buffer },
) {
  const filename = encodeURIComponent(file.filename).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  const headers: Record<string, string> = {
    "Content-Type": file.content_type,
    "Content-Length": String(file.buffer.length),
    "Content-Disposition":
      bucket === "posters"
        ? "inline"
        : `attachment; filename*=UTF-8''${filename}`,
    "X-Content-Type-Options": "nosniff",
    "Cache-Control":
      bucket === "posters"
        ? "public, max-age=31536000, immutable"
        : "private, no-store",
  };
  if (bucket === "materials") headers.Vary = "Cookie";
  return headers;
}
