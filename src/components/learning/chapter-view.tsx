"use client";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { useApp } from "../provider";
import { api } from "@/lib/client";
import { scriptureBooks } from "@/lib/scriptures";
import type { ChapterText } from "@/lib/scripture-text";

const LANG_NAMES: Record<string, [string, string]> = {
  kor: ["한국어", "Korean"],
  eng: ["영어", "English"],
  spa: ["스페인어", "Spanish"],
  tgl: ["필리핀어", "Filipino"],
};

// Reads one chapter inside the site. Verse numbers are buttons that start a
// verse note. The Church is always named as the source and copyright holder.
export function ChapterView({
  bookId,
  chapter,
  onChapter,
  onVerse,
}: {
  bookId: string;
  chapter: number;
  onChapter: (chapter: number) => void;
  onVerse: (verse: number) => void;
}) {
  const { t, tl, uiLang } = useApp();
  const [state, setState] = useState<{
    key: string;
    text: ChapterText | null;
    failed: boolean;
  } | null>(null);
  const key = `${bookId}:${chapter}:${uiLang}`;
  useEffect(() => {
    let active = true;
    api<ChapterText>(
      `scripture/chapter?book=${encodeURIComponent(bookId)}&chapter=${chapter}&lang=${uiLang}`,
    )
      .then((text) => active && setState({ key, text, failed: false }))
      .catch(() => active && setState({ key, text: null, failed: true }));
    return () => {
      active = false;
    };
  }, [bookId, chapter, uiLang, key]);
  const book = scriptureBooks.find((b) => b.id === bookId)!;
  const current = state?.key === key ? state : null;
  const text = current?.text;
  const wanted = { ko: "kor", en: "eng", es: "spa", fil: "tgl" }[uiLang];
  return (
    <section
      className="chapter-view"
      aria-label={t("경전 본문", "Scripture text")}
      aria-busy={!current}
    >
      <header className="chapter-head">
        <button
          type="button"
          className="ward-nav-button"
          aria-label={t("이전 장", "Previous chapter")}
          disabled={chapter <= 1}
          onClick={() => onChapter(chapter - 1)}
        >
          <ChevronLeft />
        </button>
        <h2>
          {tl(book)} {chapter}
        </h2>
        <button
          type="button"
          className="ward-nav-button"
          aria-label={t("다음 장", "Next chapter")}
          disabled={chapter >= book.chapters}
          onClick={() => onChapter(chapter + 1)}
        >
          <ChevronRight />
        </button>
      </header>
      {!current ? (
        <div className="skeleton" />
      ) : !text ? (
        <p role="status">
          {t(
            "본문을 불러오지 못했습니다. 잠시 후 다시 시도하거나 아래 공식 원문을 열어 주세요.",
            "The text could not be loaded. Try again shortly or open the official text below.",
          )}
        </p>
      ) : (
        <>
          {text.lang !== wanted && (
            <p className="guide-note">
              {t(
                `이 장은 선택한 언어로 제공되지 않아 ${LANG_NAMES[text.lang]?.[0] || text.lang}로 보여 드립니다.`,
                `This chapter is not available in your language, so it is shown in ${LANG_NAMES[text.lang]?.[1] || text.lang}.`,
              )}
            </p>
          )}
          {text.summary && <p className="chapter-summary">{text.summary}</p>}
          <ol className="verses">
            {text.verses.map((v) => (
              <li key={v.verse} id={`v${v.verse}`}>
                <button
                  type="button"
                  className="verse-number"
                  aria-label={t(
                    `${v.verse}절에 의견 달기`,
                    `Add a note to verse ${v.verse}`,
                  )}
                  onClick={() => onVerse(v.verse)}
                >
                  {v.verse}
                </button>
                <span>{v.text}</span>
              </li>
            ))}
          </ol>
        </>
      )}
      <footer className="chapter-source">
        <p>
          {t("출처", "Source")}:{" "}
          <a
            href={
              text?.source_url ||
              "https://www.churchofjesuschrist.org/study/scriptures"
            }
            target="_blank"
            rel="noopener noreferrer"
          >
            churchofjesuschrist.org <ExternalLink size={13} />
          </a>
        </p>
        <p>
          © The Church of Jesus Christ of Latter-day Saints.{" "}
          {t(
            "모든 경전 본문의 저작권은 교회에 있습니다.",
            "All scripture text is owned by the Church.",
          )}
        </p>
        <p className="muted">
          {t(
            "절 번호를 누르면 그 절에 의견을 달 수 있어요.",
            "Tap a verse number to add a note to that verse.",
          )}
        </p>
      </footer>
    </section>
  );
}
