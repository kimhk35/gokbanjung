import { readFile, rename } from "node:fs/promises";
import { worksheetPdf } from "../src/lib/export";
import { fields } from "../src/lib/curriculum";
const previous = globalThis.fetch;
globalThis.fetch = async (url) => {
  if (url === "/fonts/NotoSansKR-Regular.ttf")
    return new Response(await readFile("public/fonts/NotoSansKR-Regular.ttf"));
  return previous(url);
};
await worksheetPdf({
  title: "하나님은 나의 구원이시라",
  reference: "이사야 1~12장",
  items: fields.map((f) => f.ko),
  answers: {
    "0": "이사야서를 읽으며 내 삶에 연결할 질문을 찾아보았습니다.",
    "1": "오늘의 실천을 구체적으로 적으며 말씀을 다시 살펴봅니다.",
  },
  lang: "ko",
  week: 38,
});
await rename("gokbanjeong-week-38-ko.pdf", "docs/worksheet-export-test.pdf");
console.log("Production worksheet exporter generated Korean A4 PDF");
