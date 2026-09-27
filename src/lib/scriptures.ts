import { churchLangCode, type UiLang } from "./i18n";
import type { Lang } from "./types";

export const collections = {
  ot: { ko: "구약전서", en: "Old Testament" },
  nt: { ko: "신약전서", en: "New Testament" },
  bofm: { ko: "몰몬경", en: "Book of Mormon" },
  dc: { ko: "교리와 성약", en: "Doctrine and Covenants" },
  pgp: { ko: "값진 진주", en: "Pearl of Great Price" },
};
type Collection = keyof typeof collections;
type Row = [Collection, string, string, string, number];
const rows: Row[] = [
  ["ot", "gen", "창세기", "Genesis", 50],
  ["ot", "ex", "출애굽기", "Exodus", 40],
  ["ot", "lev", "레위기", "Leviticus", 27],
  ["ot", "num", "민수기", "Numbers", 36],
  ["ot", "deut", "신명기", "Deuteronomy", 34],
  ["ot", "josh", "여호수아", "Joshua", 24],
  ["ot", "judg", "사사기", "Judges", 21],
  ["ot", "ruth", "룻기", "Ruth", 4],
  ["ot", "1-sam", "사무엘상", "1 Samuel", 31],
  ["ot", "2-sam", "사무엘하", "2 Samuel", 24],
  ["ot", "1-kgs", "열왕기상", "1 Kings", 22],
  ["ot", "2-kgs", "열왕기하", "2 Kings", 25],
  ["ot", "1-chr", "역대상", "1 Chronicles", 29],
  ["ot", "2-chr", "역대하", "2 Chronicles", 36],
  ["ot", "ezra", "에스라", "Ezra", 10],
  ["ot", "neh", "느헤미야", "Nehemiah", 13],
  ["ot", "esth", "에스더", "Esther", 10],
  ["ot", "job", "욥기", "Job", 42],
  ["ot", "ps", "시편", "Psalms", 150],
  ["ot", "prov", "잠언", "Proverbs", 31],
  ["ot", "eccl", "전도서", "Ecclesiastes", 12],
  ["ot", "song", "아가", "Song of Solomon", 8],
  ["ot", "isa", "이사야", "Isaiah", 66],
  ["ot", "jer", "예레미야", "Jeremiah", 52],
  ["ot", "lam", "예레미야애가", "Lamentations", 5],
  ["ot", "ezek", "에스겔", "Ezekiel", 48],
  ["ot", "dan", "다니엘", "Daniel", 12],
  ["ot", "hosea", "호세아", "Hosea", 14],
  ["ot", "joel", "요엘", "Joel", 3],
  ["ot", "amos", "아모스", "Amos", 9],
  ["ot", "obad", "오바댜", "Obadiah", 1],
  ["ot", "jonah", "요나", "Jonah", 4],
  ["ot", "micah", "미가", "Micah", 7],
  ["ot", "nahum", "나훔", "Nahum", 3],
  ["ot", "hab", "하박국", "Habakkuk", 3],
  ["ot", "zeph", "스바냐", "Zephaniah", 3],
  ["ot", "hag", "학개", "Haggai", 2],
  ["ot", "zech", "스가랴", "Zechariah", 14],
  ["ot", "mal", "말라기", "Malachi", 4],
  ["nt", "matt", "마태복음", "Matthew", 28],
  ["nt", "mark", "마가복음", "Mark", 16],
  ["nt", "luke", "누가복음", "Luke", 24],
  ["nt", "john", "요한복음", "John", 21],
  ["nt", "acts", "사도행전", "Acts", 28],
  ["nt", "rom", "로마서", "Romans", 16],
  ["nt", "1-cor", "고린도전서", "1 Corinthians", 16],
  ["nt", "2-cor", "고린도후서", "2 Corinthians", 13],
  ["nt", "gal", "갈라디아서", "Galatians", 6],
  ["nt", "eph", "에베소서", "Ephesians", 6],
  ["nt", "philip", "빌립보서", "Philippians", 4],
  ["nt", "col", "골로새서", "Colossians", 4],
  ["nt", "1-thes", "데살로니가전서", "1 Thessalonians", 5],
  ["nt", "2-thes", "데살로니가후서", "2 Thessalonians", 3],
  ["nt", "1-tim", "디모데전서", "1 Timothy", 6],
  ["nt", "2-tim", "디모데후서", "2 Timothy", 4],
  ["nt", "titus", "디도서", "Titus", 3],
  ["nt", "philem", "빌레몬서", "Philemon", 1],
  ["nt", "heb", "히브리서", "Hebrews", 13],
  ["nt", "james", "야고보서", "James", 5],
  ["nt", "1-pet", "베드로전서", "1 Peter", 5],
  ["nt", "2-pet", "베드로후서", "2 Peter", 3],
  ["nt", "1-jn", "요한일서", "1 John", 5],
  ["nt", "2-jn", "요한이서", "2 John", 1],
  ["nt", "3-jn", "요한삼서", "3 John", 1],
  ["nt", "jude", "유다서", "Jude", 1],
  ["nt", "rev", "요한계시록", "Revelation", 22],
  ["bofm", "1-ne", "니파이전서", "1 Nephi", 22],
  ["bofm", "2-ne", "니파이후서", "2 Nephi", 33],
  ["bofm", "jacob", "야곱서", "Jacob", 7],
  ["bofm", "enos", "이노스서", "Enos", 1],
  ["bofm", "jarom", "예이롬서", "Jarom", 1],
  ["bofm", "omni", "옴나이서", "Omni", 1],
  ["bofm", "w-of-m", "몰몬의 말씀", "Words of Mormon", 1],
  ["bofm", "mosiah", "모사이야서", "Mosiah", 29],
  ["bofm", "alma", "앨마서", "Alma", 63],
  ["bofm", "hel", "힐라맨서", "Helaman", 16],
  ["bofm", "3-ne", "제3니파이", "3 Nephi", 30],
  ["bofm", "4-ne", "제4니파이", "4 Nephi", 1],
  ["bofm", "morm", "몰몬서", "Mormon", 9],
  ["bofm", "ether", "이더서", "Ether", 15],
  ["bofm", "moro", "모로나이서", "Moroni", 10],
  ["dc", "dc", "교리와 성약", "Doctrine and Covenants", 138],
  ["pgp", "moses", "모세서", "Moses", 8],
  ["pgp", "abr", "아브라함서", "Abraham", 5],
  ["pgp", "js-m", "조셉 스미스—마태", "Joseph Smith—Matthew", 1],
  ["pgp", "js-h", "조셉 스미스—역사", "Joseph Smith—History", 1],
  ["pgp", "a-of-f", "신앙개조", "Articles of Faith", 1],
];
export const scriptureBooks = rows.map(
  ([collection, slug, ko, en, chapters]) => ({
    collection,
    slug,
    ko,
    en,
    chapters,
    id: `${collection === "dc" ? "dc-testament" : collection}/${slug}`,
  }),
);
export type ScriptureBook = (typeof scriptureBooks)[number];
const normalize = (s: string) => s.toLowerCase().replace(/[\s—–-]/g, "");
export function findBook(name: string) {
  const key = normalize(name);
  return scriptureBooks.find((b) =>
    [
      b.ko,
      b.ko + "서",
      b.en,
      b.slug,
      b.id,
      ...(b.slug === "ps" ? ["시", "Psalm"] : []),
      ...(b.slug === "dc" ? ["D&C", "교성"] : []),
    ].some((n) => normalize(n) === key),
  );
}
export function scriptureUrl(
  book: ScriptureBook,
  chapter: number,
  lang: Lang | UiLang,
  verse?: number,
  endVerse?: number,
) {
  if (
    !scriptureBooks.some((b) => b.id === book.id) ||
    !Number.isInteger(chapter) ||
    chapter < 1 ||
    chapter > book.chapters
  )
    throw new RangeError("Invalid chapter");
  if (
    verse !== undefined &&
    (!Number.isInteger(verse) || verse < 1 || verse > 176)
  )
    throw new RangeError("Invalid verse");
  if (
    endVerse !== undefined &&
    (verse === undefined ||
      !Number.isInteger(endVerse) ||
      endVerse < verse ||
      endVerse > 176)
  )
    throw new RangeError("Invalid verse range");
  const url = new URL(
    `https://www.churchofjesuschrist.org/study/scriptures/${book.id}/${chapter}`,
  );
  url.searchParams.set("lang", churchLangCode(lang));
  if (verse !== undefined) {
    url.searchParams.set(
      "id",
      `p${verse}${endVerse && endVerse !== verse ? `-p${endVerse}` : ""}`,
    );
    url.hash = `p${verse}`;
  }
  return url.toString();
}
export function parseScripture(input: string) {
  const match = input
    .trim()
    .match(
      /^(.+?)\s*(\d+)\s*(?:[장편]\s*)?(?:(?::|\s)\s*(\d+)\s*(?:절)?(?:\s*[~–-]\s*(\d+)\s*절?)?)?\s*$/,
    );
  if (!match) return null;
  const book = findBook(match[1]);
  if (!book) return null;
  const chapter = Number(match[2]);
  const verse = match[3] ? Number(match[3]) : undefined;
  const endVerse = match[4] ? Number(match[4]) : undefined;
  try {
    scriptureUrl(book, chapter, "ko", verse, endVerse);
  } catch {
    return null;
  }
  return { book, chapter, verse, endVerse };
}
