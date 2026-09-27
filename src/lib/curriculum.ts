import raw from "@/data/curriculum.json";
import type { Week, Lang, Localized } from "./types";
export const curriculum: Week[] = raw as Week[];
export const COURSE = "old-testament-2026";
export const fields: Localized[] = [
  { ko: "가장 마음에 남은 구절", en: "A scripture that stayed with me" },
  { ko: "그 이유", en: "Why it mattered" },
  { ko: "새롭게 발견한 것", en: "Something I discovered" },
  { ko: "아직 이해되지 않는 것", en: "A question I still have" },
  { ko: "토론 전 나의 생각", en: "My thoughts before the discussion" },
  { ko: "토론 후 달라진 생각", en: "How my thinking changed" },
  { ko: "내 삶과의 연결", en: "A connection to my life" },
  { ko: "이번 주 실천", en: "My practice this week" },
  { ko: "한 문장으로 정리하기", en: "This week in one sentence" },
];
export const prompts: Localized[] = [
  {
    ko: "이 말씀에서 마음에 남은 것은 무엇인가요?",
    en: "What stayed with you as you read?",
  },
  {
    ko: "이 말씀은 나의 삶과 어떻게 연결되나요?",
    en: "How does this scripture connect with your life?",
  },
  {
    ko: "오늘 내가 실천할 수 있는 것은 무엇인가요?",
    en: "What is one thing you can put into practice today?",
  },
];
export function localDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
export function currentWeek(date = localDate()) {
  return curriculum.find((w) => w.start <= date && w.end >= date);
}
export function dayIndex(week: Week, date = localDate()) {
  return Math.max(
    1,
    Math.min(
      7,
      Math.floor((Date.parse(date) - Date.parse(week.start)) / 86400000) + 1,
    ),
  );
}
export function referenceChapters(w: Week) {
  const out: string[] = [];
  let book = "";
  for (const piece of w.reference.en.split(";")) {
    const m = piece
      .trim()
      .match(/^((?:[123] )?[A-Za-z ]+?)?\s*(\d+)(?:[–~-](\d+))?$/);
    if (!m) {
      out.push(piece.trim());
      continue;
    }
    if (m[1]) book = m[1].trim();
    for (let n = Number(m[2]); n <= Number(m[3] || m[2]); n++)
      out.push(book + " " + n);
  }
  return out;
}
const bookNames: Record<string, string> = {
  Genesis: "창세기",
  Moses: "모세서",
  Abraham: "아브라함서",
  Exodus: "출애굽기",
  Leviticus: "레위기",
  Numbers: "민수기",
  Deuteronomy: "신명기",
  Joshua: "여호수아",
  Judges: "사사기",
  Ruth: "룻기",
  "1 Samuel": "사무엘상",
  "2 Samuel": "사무엘하",
  "1 Kings": "열왕기상",
  "2 Kings": "열왕기하",
  "2 Chronicles": "역대하",
  Ezra: "에스라",
  Nehemiah: "느헤미야",
  Esther: "에스더",
  Job: "욥기",
  Psalms: "시편",
  Proverbs: "잠언",
  Ecclesiastes: "전도서",
  Isaiah: "이사야",
  Jeremiah: "예레미야",
  Lamentations: "예레미야애가",
  Ezekiel: "에스겔",
  Daniel: "다니엘",
  Hosea: "호세아",
  Joel: "요엘",
  Amos: "아모스",
  Obadiah: "오바댜",
  Jonah: "요나",
  Micah: "미가",
  Nahum: "나훔",
  Habakkuk: "하박국",
  Zephaniah: "스바냐",
  Haggai: "학개",
  Zechariah: "스가랴",
  Malachi: "말라기",
  Easter: "부활절",
  Christmas: "성탄절",
  "Introduction to the Old Testament": "구약전서 소개",
};
export function reading(w: Week, day: number, lang: Lang) {
  if (day === 7) return w.reference[lang];
  const chapters = referenceChapters(w);
  const a = Math.floor(((day - 1) * chapters.length) / 6),
    b = Math.floor((day * chapters.length) / 6);
  const chunk = chapters.slice(a, Math.max(a + 1, b));
  return chunk
    .map((c) =>
      lang === "en"
        ? c
        : c.replace(
            /^(.+?)( \d+)?$/,
            (_, book, num) =>
              (bookNames[book] || book) +
              (num ? num + (book === "Psalms" ? "편" : "장") : ""),
          ),
    )
    .join("; ");
}
export function officialUrl(w: Week, lang: Lang) {
  return w.sourceUrl.replace(
    "lang=kor",
    `lang=${lang === "ko" ? "kor" : "eng"}`,
  );
}
