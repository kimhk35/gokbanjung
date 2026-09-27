import type { Lang } from "./types";
export async function worksheetPdf({
  title,
  reference,
  items,
  answers,
  lang,
  week,
}: {
  title: string;
  reference: string;
  items: string[];
  answers: Record<string, string>;
  lang: Lang;
  week: number;
}) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const font = await fetch("/fonts/NotoSansKR-Regular.ttf");
  if (!font.ok) throw new Error("font_unavailable");
  const bytes = new Uint8Array(await font.arrayBuffer());
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  doc.addFileToVFS("NotoSansKR.ttf", btoa(bin));
  doc.addFont("NotoSansKR.ttf", "NotoSansKR", "normal");
  doc.setFont("NotoSansKR");
  let y = 22;
  const write = (text: string, size: number, gap = 7) => {
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(text, 170) as string[];
    for (const line of lines) {
      if (y > 272) {
        doc.addPage();
        y = 22;
      }
      doc.text(line, 20, y);
      y += gap;
    }
  };
  write(
    lang === "ko"
      ? "곡반정와드 복음교리반"
      : "Gokbanjeong Ward Gospel Doctrine",
    12,
  );
  write(`WEEK ${week}`, 10);
  y += 3;
  write(title, 19, 10);
  write(reference, 11);
  y += 7;
  items.forEach((item, i) => {
    if (y > 230) {
      doc.addPage();
      y = 22;
    }
    write(`${i + 1}. ${item}`, 12);
    const answer = answers[String(i)]?.trim();
    if (answer) {
      write(answer, 11);
      y += 7;
    } else {
      for (let n = 0; n < 3; n++) {
        doc.setDrawColor(205, 211, 213);
        doc.line(20, y, 190, y);
        y += 9;
      }
      y += 5;
    }
  });
  const pages = doc.getNumberOfPages();
  for (let n = 1; n <= pages; n++) {
    doc.setPage(n);
    doc.setFontSize(8);
    doc.text(`${n} / ${pages}`, 183, 286);
    doc.text(
      lang === "ko"
        ? "개인 기록 · 제출 전에는 나만 볼 수 있습니다."
        : "Personal record · Private until submitted.",
      20,
      286,
    );
  }
  doc.save(`gokbanjeong-week-${week}-${lang}.pdf`);
}
