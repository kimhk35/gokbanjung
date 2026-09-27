"use client";
import { useState, useEffect } from "react";
import { VerseNotes } from "../notes/verse-notes";
import { ChapterView } from "./chapter-view";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useApp } from "../provider";
import {
  scriptureBooks,
  collections,
  scriptureUrl,
  parseScripture,
  findBook,
} from "@/lib/scriptures";
import { reading, referenceChapters } from "@/lib/curriculum";
import { api } from "@/lib/client";
import type { Week } from "@/lib/types";

export function ScriptureReader() {
  const { uiLang, tl, t, lang } = useApp();
  const params = useSearchParams();
  const [bookId, setBookId] = useState(() => {
    const b = params.get("book");
    return scriptureBooks.some((x) => x.id === b) ? b! : "ot/isa";
  });
  const [chapter, setChapter] = useState(() => {
    const c = Number(params.get("chapter"));
    return Number.isInteger(c) && c >= 1 ? c : 1;
  });
  const [picked, setPicked] = useState<number | undefined>(undefined);
  const [verse, setVerse] = useState("1");
  const [search, setSearch] = useState("");
  const [invalid, setInvalid] = useState(false);
  const [verified, setVerified] = useState<{
    key: string;
    verses: number[];
  } | null>(null);
  const [sourceError, setSourceError] = useState(false);
  const sourceKey = bookId + ":" + chapter + ":" + lang;
  useEffect(() => {
    let active = true;
    setSourceError(false);
    api<number[]>(
      `scripture/verses?book=${encodeURIComponent(bookId)}&chapter=${chapter}&language=${lang}`,
    )
      .then((verses) => {
        if (active) setVerified({ key: sourceKey, verses });
      })
      .catch(() => {
        if (active) setSourceError(true);
      });
    return () => {
      active = false;
    };
  }, [sourceKey, bookId, chapter, lang]);
  const book = scriptureBooks.find((b) => b.id === bookId)!;
  let href: string | undefined;
  const parts = verse.trim().split(/[-–~]/).map(Number);
  try {
    href = scriptureUrl(
      book,
      chapter,
      uiLang,
      verse.trim() ? parts[0] : undefined,
      parts[1],
    );
  } catch {
    /* The UI shows the validation message. */
  }
  if (
    verse.trim() &&
    (!/^\d+(?:[-–~]\d+)?$/.test(verse.trim()) ||
      verified?.key !== sourceKey ||
      parts.some((v) => !verified.verses.includes(v)))
  )
    href = undefined;
  const searchRef = (e: React.FormEvent) => {
    e.preventDefault();
    const ref = parseScripture(search);
    setInvalid(!ref);
    if (ref) {
      setBookId(ref.book.id);
      setChapter(ref.chapter);
      setVerse(
        ref.verse
          ? String(ref.verse) + (ref.endVerse ? "-" + ref.endVerse : "")
          : "",
      );
    }
  };
  return (
    <div className="page narrow">
      <div className="page-title">
        <span className="overline">{t("경전 읽기", "SCRIPTURES")}</span>
        <h1>{t("경전 읽기", "Read scriptures")}</h1>
        <p>
          {t(
            "책과 장을 고르면 본문을 바로 읽을 수 있어요. 본문은 교회 공식 사이트에서 그대로 가져오며, 저작권은 The Church of Jesus Christ of Latter-day Saints에 있습니다.",
            "Choose a book and chapter to read it right here. The text comes unchanged from the Church's official site and is © The Church of Jesus Christ of Latter-day Saints.",
          )}
        </p>
      </div>
      <section className="panel">
        <form onSubmit={searchRef}>
          <label className="field">
            {t("구절로 찾기", "Find a reference")}
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setInvalid(false);
              }}
              placeholder={t(
                "예: 이사야서 1:1 또는 모세서 1:39",
                "e.g. Isaiah 1:1 or Moses 1:39",
              )}
            />
          </label>
          <button type="submit" className="button secondary">
            {t("선택에 반영", "Select reference")}
          </button>
          {invalid && (
            <p role="alert">
              {t(
                "책 이름과 장·절을 확인해 주세요. 예: 이사야 1:1",
                "Check the book, chapter and verse. Example: Isaiah 1:1",
              )}
            </p>
          )}
        </form>
        <div className="scripture-fields">
          <label className="field">
            {t("책", "Book")}
            <select
              value={bookId}
              onChange={(e) => {
                setBookId(e.target.value);
                setChapter(1);
                setVerse("1");
              }}
            >
              {Object.entries(collections).map(([id, label]) => (
                <optgroup key={id} label={tl(label)}>
                  {scriptureBooks
                    .filter((b) => b.collection === id)
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {tl(b)}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </label>
          <label className="field">
            {t("장 / 편", "Chapter / section")}
            <select
              value={chapter}
              onChange={(e) => {
                setChapter(Number(e.target.value));
                setVerse("1");
              }}
            >
              {Array.from({ length: book.chapters }, (_, i) => (
                <option key={i} value={i + 1}>
                  {i + 1}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            {t("절 (비우면 장 전체)", "Verse (blank for chapter)")}
            <input
              inputMode="numeric"
              maxLength={7}
              value={verse}
              onChange={(e) => setVerse(e.target.value)}
            />
          </label>
        </div>
        <h2 aria-live="polite">
          {tl(book)} {chapter}
          {verse ? `:${verse}` : ""}
        </h2>
        {href ? (
          <a
            className="button primary"
            href={href}
            target="_blank"
            rel="noreferrer"
          >
            {t(
              "공식 원문에서 이 구절 읽기 ↗",
              "Read this passage in the official text ↗",
            )}
          </a>
        ) : (
          <p role="status">
            {sourceError
              ? t(
                  "원문 확인에 실패했습니다. 아래에서 장 전체를 열어 주세요.",
                  "Source verification failed. Open the whole chapter below.",
                )
              : verified?.key !== sourceKey
                ? t(
                    "실제 절 번호를 확인 중입니다…",
                    "Checking actual verse numbers…",
                  )
                : t(
                    "이 장에 없는 절 번호이거나 올바르지 않은 범위입니다.",
                    "This verse does not exist in the chapter, or the range is invalid.",
                  )}
          </p>
        )}
        <a
          className="button secondary"
          href={scriptureUrl(book, chapter, uiLang)}
          target="_blank"
          rel="noreferrer"
        >
          {t("장 전체 읽기 ↗", "Read whole chapter ↗")}
        </a>
        <small>
          {t(
            "장마다 마지막 절 번호가 다릅니다. 원문에서 절 번호를 확인하세요. 한국어/EN 선택에 따라 공식 원문의 언어도 바뀝니다.",
            "The last verse differs by chapter; check the official text. The Korean/EN selector also changes the source language.",
          )}
        </small>
      </section>
      <ChapterView
        bookId={bookId}
        chapter={chapter}
        onChapter={(c) => {
          setChapter(c);
          setPicked(undefined);
        }}
        onVerse={(n) => {
          setVerse(String(n));
          setPicked(n);
          requestAnimationFrame(() =>
            document
              .querySelector(".verse-notes")
              ?.scrollIntoView({ behavior: "smooth", block: "start" }),
          );
        }}
      />
      <VerseNotes
        key={`${bookId}:${chapter}:${picked ?? ""}`}
        pickedVerse={picked}
        bookId={bookId}
        chapter={chapter}
        verseHint={verse}
      />
    </div>
  );
}

export function ReadingLinks({ week, day }: { week: Week; day: number }) {
  const { uiLang, tl, lang, t } = useApp();
  return (
    <div className="scripture-links">
      <p>
        {t(
          "아래 장을 누르면 이 사이트에서 바로 경전을 읽을 수 있어요.",
          "Choose a chapter to read the scripture right here.",
        )}
      </p>
      <div className="actions">
        {(day === 7
          ? referenceChapters(week)
          : reading(week, day, "en").split("; ")
        ).map((part) => {
          const ref = parseScripture(part);
          const wholeBook = findBook(part);
          if (!ref && !wholeBook) return null;
          const book = ref?.book || wholeBook!;
          const chapter = ref?.chapter || 1;
          return (
            <Link
              className="button secondary"
              key={part}
              href={`/scriptures?book=${encodeURIComponent(book.id)}&chapter=${chapter}`}
            >
              {tl(book)} {chapter}
            </Link>
          );
        })}
      </div>
      <Link href="/scriptures" className="button secondary">
        {t("다른 책·장·절 찾기", "Find another passage")}
      </Link>
    </div>
  );
}
