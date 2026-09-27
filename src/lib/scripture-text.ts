// In-site scripture reading: fetches one chapter from the Church's official
// site when a reader opens it (cached for a day by Next.js) and returns plain
// text only. Nothing is stored in the database. Every view shows the source
// and "© The Church of Jesus Christ of Latter-day Saints".
import { churchLangCode, type UiLang } from "./i18n";
import { scriptureUrl, type ScriptureBook } from "./scriptures";

export type ChapterText = {
  book_id: string;
  chapter: number;
  lang: string; // Church language code actually used (kor, eng, spa, tgl)
  summary: string;
  verses: { verse: number; text: string }[];
  source_url: string;
};

const decode = (s: string) =>
  s
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
const plain = (html: string) =>
  decode(
    html
      .replace(/<sup\b[\s\S]*?<\/sup>/g, "")
      .replace(
        /<span[^>]*class="[^"]*verse-number[^"]*"[^>]*>[\s\S]*?<\/span>/g,
        "",
      )
      // Inline tags join words; other tags separate them.
      .replace(/<\/?(?:a|span|em|strong|i|b|u|small)\b[^>]*>/g, "")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();

export function parseChapter(html: string) {
  const summary = plain(
    html.match(
      /<p[^>]*class="[^"]*study-summary[^"]*"[^>]*>([\s\S]*?)<\/p>/,
    )?.[1] || "",
  );
  const verses: ChapterText["verses"] = [];
  for (const m of html.matchAll(
    /<p\b[^>]*\bid=["']p(\d+)["'][^>]*>([\s\S]*?)<\/p>/g,
  )) {
    const verse = Number(m[1]);
    // Some pages repeat the number as plain text at the start.
    const text = plain(m[2]).replace(new RegExp(`^${verse}\\s+`), "");
    if (text && !verses.some((v) => v.verse === verse))
      verses.push({ verse, text });
  }
  return { summary, verses };
}

// Requested language first, then English (e.g. the Tagalog Old Testament is
// not published, so Filipino readers get English for those chapters).
export function sourceLangs(ui: UiLang) {
  const code = churchLangCode(ui);
  return code === "eng" ? ["eng"] : [code, "eng"];
}

export async function fetchChapter(
  book: ScriptureBook,
  chapter: number,
  ui: UiLang,
): Promise<ChapterText | null> {
  for (const lang of sourceLangs(ui)) {
    const url = scriptureUrl(book, chapter, "en").replace(
      "lang=eng",
      `lang=${lang}`,
    );
    const response = await fetch(url, {
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(12000),
      headers: { "Accept-Language": lang },
    }).catch(() => null);
    if (!response?.ok) continue;
    const { summary, verses } = parseChapter(await response.text());
    if (verses.length)
      return {
        book_id: book.id,
        chapter,
        lang,
        summary,
        verses,
        source_url: url,
      };
  }
  return null;
}
