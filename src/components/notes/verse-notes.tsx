"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import { useApp } from "../provider";
import { api } from "@/lib/client";
import { newId } from "@/lib/image-compress";
import { scriptureBooks, scriptureUrl } from "@/lib/scriptures";
import type { VerseNote } from "@/lib/verse-notes";
import { useLocalDraft } from "../use-local-draft";
import { useRefresh } from "../use-refresh";
import { rememberAuthor, useAuthorDefault } from "../think/reply-item";
import { NoteItem } from "./note-item";

type Place = { book_id: string; chapter: number };
type Data = { chapters: Place[]; items: VerseNote[] };

// Notes attached to scripture verses: a fixed chapter (scripture reader)
// or every chapter of a curriculum week (week page).
export function VerseNotes({
  bookId,
  chapter,
  week,
  verseHint,
}: {
  bookId?: string;
  chapter?: number;
  week?: number;
  verseHint?: string;
}) {
  const { t, tl, uiLang, boot, error } = useApp();
  const [data, setData] = useState<Data | null>(null);
  const [placeKey, setPlaceKey] = useState("");
  const [busy, setBusy] = useState(false);
  const author = useAuthorDefault();
  const query = week
    ? `week=${week}`
    : `book=${encodeURIComponent(bookId || "")}&chapter=${chapter}`;
  const load = useCallback(() => {
    api<Data>(`notes/verse-list?${query}`).then(setData).catch(error);
  }, [query, error]);
  useEffect(() => {
    if (boot) load();
  }, [boot, load]);
  const places = data?.chapters || [];
  const place =
    places.find((p) => `${p.book_id}:${p.chapter}` === placeKey) || places[0];
  const draft = useLocalDraft(
    boot && place
      ? `${boot.actor.id}:verse:${place.book_id}:${place.chapter}`
      : null,
    {
      author,
      body: "",
      quote: "",
      start: verseHint?.split(/[-–~]/)[0] || "",
      end: "",
    },
  );
  useRefresh(load, 30000, draft.typing || !!draft.value.body.trim());
  const bookOf = (id: string) => scriptureBooks.find((b) => b.id === id);
  const label = (p: Place, v?: number, e?: number) =>
    `${bookOf(p.book_id) ? tl(bookOf(p.book_id)) : p.book_id} ${p.chapter}${v ? `:${v}${e && e !== v ? `–${e}` : ""}` : ""}`;
  const groups = useMemo(() => {
    const map = new Map<string, VerseNote[]>();
    for (const n of data?.items || []) {
      const k = `${n.book_id}|${n.chapter}|${n.verse_start}|${n.verse_end}`;
      map.set(k, [...(map.get(k) || []), n]);
    }
    return [...map.entries()];
  }, [data]);
  const start = Number(draft.value.start);
  const end = draft.value.end ? Number(draft.value.end) : start;
  const valid =
    place &&
    Number.isInteger(start) &&
    start >= 1 &&
    start <= 200 &&
    end >= start &&
    end <= 200;
  const submit = async () => {
    if (!place || !valid) return;
    setBusy(true);
    try {
      const note = await api<VerseNote>("notes/verse-save", {
        id: newId(),
        book_id: place.book_id,
        chapter: place.chapter,
        verse_start: start,
        verse_end: end,
        quote: draft.value.quote,
        body: draft.value.body,
        author: draft.value.author,
        week: week ?? null,
      });
      rememberAuthor(draft.value.author);
      draft.clear();
      setData((d) => d && { ...d, items: [...d.items, note] });
    } catch (e) {
      error(e);
    } finally {
      setBusy(false);
    }
  };
  const update = (next: VerseNote) =>
    setData(
      (d) =>
        d && { ...d, items: d.items.map((x) => (x.id === next.id ? next : x)) },
    );
  const remove = (id: string) =>
    setData((d) => d && { ...d, items: d.items.filter((x) => x.id !== id) });
  if (!data) return <div className="skeleton" />;
  return (
    <section
      className="verse-notes"
      aria-label={t("절에 의견 달기", "Notes on verses")}
    >
      <form
        className="reply-composer"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <h3>{t("절에 의견 달기", "Add a note to a verse")}</h3>
        {places.length > 1 && (
          <label className="field">
            {t("장", "Chapter")}
            <select
              value={place ? `${place.book_id}:${place.chapter}` : ""}
              onChange={(e) => setPlaceKey(e.target.value)}
            >
              {places.map((p) => (
                <option
                  key={`${p.book_id}:${p.chapter}`}
                  value={`${p.book_id}:${p.chapter}`}
                >
                  {label(p)}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="field-row">
          <label className="field">
            {t("시작 절", "From verse")}
            <input
              inputMode="numeric"
              maxLength={3}
              value={draft.value.start}
              onChange={(e) =>
                draft.setField("start", e.target.value.replace(/\D/g, ""))
              }
            />
          </label>
          <label className="field">
            {t("끝 절 (선택)", "To verse (optional)")}
            <input
              inputMode="numeric"
              maxLength={3}
              value={draft.value.end}
              onChange={(e) =>
                draft.setField("end", e.target.value.replace(/\D/g, ""))
              }
            />
          </label>
        </div>
        <input
          aria-label={t(
            "짧은 인용 (선택, 200자)",
            "Short quote (optional, 200 chars)",
          )}
          placeholder={t(
            "짧은 인용 (선택, 200자)",
            "Short quote (optional, 200 chars)",
          )}
          maxLength={200}
          value={draft.value.quote}
          onChange={(e) => draft.setField("quote", e.target.value)}
        />
        <input
          aria-label={t("이름 (비우면 익명)", "Name (blank = anonymous)")}
          placeholder={t("이름 (비우면 익명)", "Name (blank = anonymous)")}
          maxLength={50}
          value={draft.value.author}
          onChange={(e) => draft.setField("author", e.target.value)}
        />
        <textarea
          aria-label={t("나의 생각", "My thought")}
          placeholder={t(
            "이 절에서 발견한 것을 나눠 주세요.",
            "Share what you found in this verse.",
          )}
          rows={3}
          maxLength={3000}
          value={draft.value.body}
          onChange={(e) => draft.setField("body", e.target.value)}
        />
        <div className="button-row">
          {place && valid && (
            <a
              className="text-button"
              href={scriptureUrl(
                bookOf(place.book_id)!,
                place.chapter,
                uiLang,
                start,
                end,
              )}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink size={16} /> {label(place, start, end)}
            </a>
          )}
          <button
            type="submit"
            className="button"
            disabled={busy || !valid || !draft.value.body.trim()}
          >
            {t("의견 등록", "Post note")}
          </button>
        </div>
      </form>
      {groups.length ? (
        groups.map(([key, notes]) => {
          const n = notes[0];
          const book = bookOf(n.book_id);
          return (
            <div className="verse-group" key={key}>
              <h4>
                {book ? (
                  <a
                    href={scriptureUrl(
                      book,
                      n.chapter,
                      uiLang,
                      n.verse_start,
                      n.verse_end,
                    )}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {label(n, n.verse_start, n.verse_end)} ↗
                  </a>
                ) : (
                  label(n, n.verse_start, n.verse_end)
                )}
              </h4>
              {notes.map((note) => (
                <NoteItem
                  key={note.id}
                  kind="verse"
                  note={note}
                  onChange={update}
                  onRemove={() => remove(note.id)}
                  quote={
                    note.quote ? (
                      <blockquote className="note-quote">
                        “{note.quote}”
                      </blockquote>
                    ) : undefined
                  }
                />
              ))}
            </div>
          );
        })
      ) : (
        <p className="muted">
          {t(
            "아직 절에 달린 의견이 없습니다. 첫 의견을 남겨 주세요.",
            "No verse notes yet. Be the first.",
          )}
        </p>
      )}
    </section>
  );
}
