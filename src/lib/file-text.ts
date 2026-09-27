// Plain text from an uploaded worksheet file. The type is decided by both the
// file name and its first bytes, so a renamed file of another kind is refused.
export type FileKind = "pdf" | "docx" | "hwp" | "hwpx" | "txt";

export function fileKind(name: string, bytes: Uint8Array): FileKind | null {
  const ext = name.split(".").at(-1)?.toLowerCase();
  const zip = bytes[0] === 0x50 && bytes[1] === 0x4b;
  const ole =
    bytes[0] === 0xd0 &&
    bytes[1] === 0xcf &&
    bytes[2] === 0x11 &&
    bytes[3] === 0xe0;
  if (ext === "pdf")
    return new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-"
      ? "pdf"
      : null;
  if (ext === "docx") return zip ? "docx" : null;
  if (ext === "hwpx") return zip ? "hwpx" : null;
  if (ext === "hwp") return ole ? "hwp" : null;
  if (ext === "txt" || ext === "md") return zip || ole ? null : "txt";
  return null;
}

// Markdown list markers ("1. ", "- ") from HWP/HWPX conversion are kept, so
// numbered questions stay numbered for worksheet-import.
export async function extractText(
  bytes: Uint8Array,
  kind: FileKind,
): Promise<string> {
  const buffer = Buffer.from(bytes);
  if (kind === "txt") return buffer.toString("utf8");
  if (kind === "pdf") {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    try {
      return (await parser.getText()).text;
    } finally {
      await parser.destroy();
    }
  }
  if (kind === "docx") {
    const mammoth = await import("mammoth");
    return (await mammoth.extractRawText({ buffer })).value;
  }
  const { parse } = await import("kordoc");
  const result = await parse(buffer);
  if (!result.success) throw new Error("unreadable_file");
  return result.markdown
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/^\|.*\|$/gm, (row) => row.replace(/\|/g, " ").trim());
}
