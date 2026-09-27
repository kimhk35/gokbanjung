import { RequestError } from "./client";
const ACCEPTED = ["image/png", "image/jpeg", "image/webp"];
function encode(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, type, quality),
  );
}
export async function compressImage(file: File, maxSide = 1600): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  let blob = await encode(canvas, "image/webp", 0.85);
  // Older Safari silently returns PNG for WebP requests; JPEG keeps it small.
  if (!blob || blob.type !== "image/webp")
    blob = await encode(canvas, "image/jpeg", 0.85);
  if (!blob) throw new RequestError("invalid_file");
  return blob;
}
export async function uploadPoster(file: File, kind: "events" | "prompts" | "insights") {
  if (!ACCEPTED.includes(file.type)) throw new RequestError("invalid_file");
  if (file.size > 5 * 1024 * 1024) throw new RequestError("too_large");
  const blob = await compressImage(file);
  if (blob.size > 2 * 1024 * 1024) throw new RequestError("too_large");
  const form = new FormData();
  form.append(
    "file",
    new File(
      [blob],
      blob.type === "image/webp" ? "poster.webp" : "poster.jpg",
      { type: blob.type },
    ),
  );
  const response = await fetch(`/api/poster?kind=${kind}`, {
    method: "POST",
    body: form,
    credentials: "same-origin",
  });
  const data = await response.json();
  if (!response.ok) throw new RequestError(data.error || "server_error");
  return String(data.path);
}
export const newId = () => crypto.randomUUID();
