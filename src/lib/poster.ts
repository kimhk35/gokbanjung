export const POSTER_BUCKET = "ggc-posters";
export const POSTER_MAX = 2 * 1024 * 1024;
export function sniffImage(b: Uint8Array): "png" | "jpg" | "webp" | null {
  if (
    b.length >= 8 &&
    b[0] === 0x89 &&
    b[1] === 0x50 &&
    b[2] === 0x4e &&
    b[3] === 0x47
  )
    return "png";
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff)
    return "jpg";
  if (
    b.length >= 12 &&
    String.fromCharCode(...b.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...b.slice(8, 12)) === "WEBP"
  )
    return "webp";
  return null;
}
export function posterUrl(
  path: string | null,
  base = process.env.NEXT_PUBLIC_SUPABASE_URL,
) {
  if (!path || !base) return null;
  return `${base.replace(/\/$/, "")}/storage/v1/object/public/${POSTER_BUCKET}/${path}`;
}
