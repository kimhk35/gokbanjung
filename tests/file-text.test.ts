import test from "node:test";
import assert from "node:assert/strict";
import { Document, Packer, Paragraph } from "docx";
import { markdownToHwpx } from "kordoc";
import { extractText, fileKind } from "../src/lib/file-text";
import { extractQuestions } from "../src/lib/worksheet-import";

test("recognises worksheet file types by name and bytes", () => {
  assert.equal(
    fileKind("학습지.hwpx", new Uint8Array([0x50, 0x4b, 3, 4])),
    "hwpx",
  );
  assert.equal(fileKind("a.docx", new Uint8Array([0x50, 0x4b, 3, 4])), "docx");
  assert.equal(fileKind("a.pdf", new TextEncoder().encode("%PDF-1.7")), "pdf");
  assert.equal(
    fileKind("a.hwp", new Uint8Array([0xd0, 0xcf, 0x11, 0xe0])),
    "hwp",
  );
  assert.equal(fileKind("a.txt", new TextEncoder().encode("1. 질문")), "txt");
  assert.equal(fileKind("a.pdf", new TextEncoder().encode("not a pdf")), null);
  assert.equal(fileKind("a.exe", new Uint8Array([0x4d, 0x5a])), null);
});

test("Word and Hangul worksheets become questions", async () => {
  const docx = await Packer.toBuffer(
    new Document({
      sections: [
        {
          children: [
            new Paragraph("1. 이 말씀에서 무엇을 배웠나요?"),
            new Paragraph("2. 이번 주 실천은 무엇인가요?"),
          ],
        },
      ],
    }),
  );
  assert.deepEqual(
    extractQuestions(await extractText(new Uint8Array(docx), "docx")),
    ["이 말씀에서 무엇을 배웠나요?", "이번 주 실천은 무엇인가요?"],
  );
  const hwpx = new Uint8Array(
    await markdownToHwpx(
      "# 학습지\n\n1. 위로가 된 구절은 무엇인가요?\n\n2. 누구에게 전하고 싶나요?",
    ),
  );
  assert.deepEqual(extractQuestions(await extractText(hwpx, "hwpx")), [
    "위로가 된 구절은 무엇인가요?",
    "누구에게 전하고 싶나요?",
  ]);
});

test("zip-based files that expand too much are refused before unpacking", async () => {
  const { default: JSZip } = await import("jszip");
  const { zipTooLarge } = await import("../src/lib/file-text");
  const bomb = new JSZip();
  bomb.file("word/document.xml", new Uint8Array(60 * 1024 * 1024)); // 60 MB of zeros
  const bombBytes = await bomb.generateAsync({ type: "uint8array", compression: "DEFLATE" });
  assert.ok(bombBytes.length < 1024 * 1024, "compressed size stays small");
  assert.equal(zipTooLarge(bombBytes), true);
  const many = new JSZip();
  for (let i = 0; i < 3001; i++) many.file(`f${i}.xml`, "x");
  assert.equal(zipTooLarge(await many.generateAsync({ type: "uint8array" })), true);
  const docx = await Packer.toBuffer(
    new Document({ sections: [{ children: [new Paragraph("1. 질문")] }] }),
  );
  assert.equal(zipTooLarge(new Uint8Array(docx)), false);
  // Not a readable zip at all: refuse rather than guess.
  assert.equal(zipTooLarge(new Uint8Array([0x50, 0x4b, 3, 4, 0, 0])), true);
});
