"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  Highlighter,
  MessageSquarePlus,
  X,
} from "lucide-react";
import { useApp } from "../provider";
import { Empty } from "../learning/learn";
import { api } from "@/lib/client";
import { newId } from "@/lib/image-compress";
import { parseMarkdown, plainText } from "@/lib/markdown-lite";
import { pieces, type Mark } from "@/lib/text-marks";
import { locate, makeAnchor, type Anchor } from "@/lib/text-anchor";
import type { LessonText, TextNote } from "@/lib/lesson-texts";
import { useLocalDraft } from "../use-local-draft";
import { useRefresh } from "../use-refresh";
import { rememberAuthor, useAuthorDefault } from "../think/reply-item";
import { NoteItem } from "./note-item";
import { LessonTextEditor } from "./lesson-text-editor";

// Renders Markdown blocks; every block carries its offset in plainText().
export function TextBlocks({
  markdown,
  marks,
  onNoteClick,
}: {
  markdown: string;
  marks: Mark[];
  onNoteClick?: (ids: string[]) => void;
}) {
  const blocks = useMemo(() => parseMarkdown(markdown), [markdown]);
  return (
    <>
      {blocks.map((b) => {
        const Tag = b.kind === "li" ? "p" : b.kind;
        return (
          <Tag
            key={b.start}
            data-block-start={b.start}
            className={b.kind === "li" ? "text-li" : undefined}
          >
            {pieces(b, marks).map((p) => {
              let node: React.ReactNode = p.text;
              if (p.bold) node = <strong>{node}</strong>;
              if (p.italic) node = <em>{node}</em>;
              if (p.href)
                node = (
                  <a href={p.href} target="_blank" rel="noopener noreferrer">
                    {node}
                  </a>
                );
              const cls = [p.highlight && "hl", p.notes.length && "has-note"]
                .filter(Boolean)
                .join(" ");
              return cls ? (
                <span
                  key={p.start}
                  className={cls}
                  onClick={
                    p.notes.length && onNoteClick
                      ? () => onNoteClick(p.notes)
                      : undefined
                  }
                >
                  {node}
                </span>
              ) : (
                <span key={p.start}>{node}</span>
              );
            })}
          </Tag>
        );
      })}
    </>
  );
}

// Offset of (node, offset) inside plainText(), using data-block-start.
function plainOffset(node: Node, offset: number): number | null {
  const el = (
    node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement
  ) as Element | null;
  const block = el?.closest("[data-block-start]");
  if (!block) return null;
  let count = 0;
  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (n === node)
      return Number(block.getAttribute("data-block-start")) + count + offset;
    count += (n.textContent || "").length;
  }
  // Selection ended on an element boundary: count its preceding text.
  if (node === block) {
    const before = [...block.childNodes]
      .slice(0, offset)
      .reduce((s, c) => s + (c.textContent || "").length, 0);
    return Number(block.getAttribute("data-block-start")) + before;
  }
  return null;
}

type Data = {
  text: LessonText | null;
  draft: LessonText | null;
  canEdit: boolean;
};
const hlKey = (week: number, lang: string) => `ggc_hl:${week}:${lang}`;
function readHighlights(key: string): Anchor[] {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}

export function LessonTextReader({ week }: { week: number }) {
  const { t, lang, boot, error } = useApp();
  const [data, setData] = useState<Data | null>(null);
  const [notes, setNotes] = useState<TextNote[]>([]);
  // Private highlights, cached per week/language after the first read.
  const [hlStore, setHlStore] = useState<Record<string, Anchor[]>>({});
  const [selection, setSelection] = useState<{
    start: number;
    end: number;
  } | null>(null);
  const [composing, setComposing] = useState<Anchor | null>(null);
  const [focus, setFocus] = useState<string[] | null>(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const body = useRef<HTMLDivElement>(null);
  const author = useAuthorDefault();
  const load = useCallback(() => {
    const fetchText = (l: string) =>
      api<Data>(`notes/text-get?week=${week}&lang=${l}`);
    return fetchText(lang)
      .then((d) =>
        d.text || d.draft
          ? d
          : fetchText(lang === "ko" ? "en" : "ko").then((other) =>
              other.text ? { ...other, canEdit: d.canEdit } : d,
            ),
      )
      .then(async (d) => {
        setData(d);
        if (d.text)
          setNotes(
            (
              await api<{ items: TextNote[] }>(
                `notes/text-list?text_id=${d.text.id}`,
              )
            ).items,
          );
      })
      .catch(error);
  }, [week, lang, error]);
  useEffect(() => {
    if (boot) void load();
  }, [boot, load]);
  const text = data?.text || null;
  const plain = useMemo(
    () => (text ? plainText(text.body_markdown) : ""),
    [text],
  );
  const storeKey = text ? hlKey(week, text.lang) : null;
  const highlights: Anchor[] = storeKey
    ? (hlStore[storeKey] ?? readHighlights(storeKey))
    : [];
  const saveHighlights = (next: Anchor[]) => {
    if (!storeKey) return;
    setHlStore((store) => ({ ...store, [storeKey]: next }));
    try {
      localStorage.setItem(storeKey, JSON.stringify(next));
    } catch {}
  };
  const draft = useLocalDraft(
    boot && text && composing
      ? `${boot.actor.id}:text:${text.id}:${composing.start}`
      : null,
    { author, body: "" },
  );
  useRefresh(() => void load(), 30000, !!composing || draft.typing);

  // Track the reader's text selection inside the body.
  useEffect(() => {
    const onChange = () => {
      const sel = document.getSelection();
      if (!sel || sel.isCollapsed || !sel.rangeCount || !body.current)
        return setSelection(null);
      const r = sel.getRangeAt(0);
      if (
        !body.current.contains(r.startContainer) ||
        !body.current.contains(r.endContainer)
      )
        return setSelection(null);
      const s = plainOffset(r.startContainer, r.startOffset),
        e = plainOffset(r.endContainer, r.endOffset);
      if (s === null || e === null || e <= s) return setSelection(null);
      // Trim surrounding spaces/line breaks from the selection.
      let a = s,
        b = e;
      while (a < b && /\s/.test(plain[a])) a++;
      while (b > a && /\s/.test(plain[b - 1])) b--;
      setSelection(b > a ? { start: a, end: Math.min(b, a + 300) } : null);
    };
    document.addEventListener("selectionchange", onChange);
    return () => document.removeEventListener("selectionchange", onChange);
  }, [plain]);

  const located = useMemo(
    () =>
      notes.map((n) => ({
        note: n,
        range: plain ? locate(plain, n.anchor) : null,
      })),
    [notes, plain],
  );
  const marks: Mark[] = useMemo(
    () => [
      ...highlights.flatMap((h, i) => {
        const r = locate(plain, h);
        return r ? [{ ...r, kind: "highlight" as const, id: `h${i}` }] : [];
      }),
      ...located.flatMap(({ note, range }) =>
        range ? [{ ...range, kind: "note" as const, id: note.id }] : [],
      ),
    ],
    [highlights, located, plain],
  );
  const addHighlight = () => {
    if (!selection) return;
    saveHighlights([
      ...highlights,
      makeAnchor(plain, selection.start, selection.end),
    ]);
    document.getSelection()?.removeAllRanges();
  };
  const startNote = () => {
    if (!selection) return;
    setComposing(makeAnchor(plain, selection.start, selection.end));
    document.getSelection()?.removeAllRanges();
  };
  const submit = async () => {
    if (!text || !composing) return;
    setBusy(true);
    try {
      const note = await api<TextNote>("notes/text-save", {
        id: newId(),
        lesson_text_id: text.id,
        anchor: composing,
        body: draft.value.body,
        author: draft.value.author,
      });
      rememberAuthor(draft.value.author);
      draft.clear();
      setComposing(null);
      setNotes((list) => [...list, note]);
      setFocus([note.id]);
    } catch (e) {
      error(e);
    } finally {
      setBusy(false);
    }
  };

  if (!data)
    return (
      <div className="page">
        <div className="skeleton" />
      </div>
    );
  const shown = focus
    ? located.filter(({ note }) => focus.includes(note.id))
    : located.filter(({ range }) => range);
  const orphans = located.filter(({ range }) => !range);
  return (
    <div className="page lesson-text-page">
      <Link className="text-button back-link" href={`/week/${week}`}>
        <ArrowLeft size={18} /> {t(`${week}주차로`, `Back to week ${week}`)}
      </Link>
      {data.canEdit && (
        <div className="manager-bar">
          <button
            type="button"
            className="button secondary"
            onClick={() => setEditing(true)}
          >
            {text || data.draft
              ? t("본문 수정", "Edit text")
              : t("본문 올리기", "Upload text")}
          </button>
          {data.draft && (
            <span className="event-status draft">
              {t(
                "게시 전 임시 저장본이 있습니다",
                "An unpublished draft exists",
              )}
            </span>
          )}
        </div>
      )}
      {!text ? (
        <Empty
          title={t(
            "아직 올라온 공과 본문이 없습니다.",
            "No lesson text has been posted yet.",
          )}
          body={t(
            "절 번호로 의견 달기는 주차 페이지에서 할 수 있어요.",
            "You can still add notes to verses on the week page.",
          )}
        />
      ) : (
        <div className="lesson-text-layout">
          <article className="lesson-text">
            <header className="lesson-text-source">
              <h1>{text.title}</h1>
              <p>
                {t("출처", "Source")}:{" "}
                <a
                  href={text.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {text.source_url.replace(/^https:\/\//, "").slice(0, 60)}{" "}
                  <ExternalLink size={14} />
                </a>
              </p>
              <p className="muted">{text.rights_note}</p>
              <p className="muted small-hint">
                {t(
                  "문장을 길게 누르거나 드래그해 선택하면 형광펜(나만 보기)이나 의견 달기(모두에게 공개)를 할 수 있어요.",
                  "Select a sentence to highlight it (only you) or add a note (public).",
                )}
              </p>
            </header>
            <div className="lesson-text-body" ref={body}>
              <TextBlocks
                markdown={text.body_markdown}
                marks={marks}
                onNoteClick={setFocus}
              />
            </div>
            {highlights.length > 0 && (
              <button
                type="button"
                className="text-button"
                onClick={() => saveHighlights([])}
              >
                {t("내 형광펜 모두 지우기", "Clear my highlights")}
              </button>
            )}
          </article>
          <aside
            className="lesson-text-notes"
            aria-label={t("본문 의견", "Notes on the text")}
          >
            {composing && (
              <form
                className="reply-composer"
                onSubmit={(e) => {
                  e.preventDefault();
                  submit();
                }}
              >
                <h3>{t("이 문장에 의견 달기", "Note on this passage")}</h3>
                <blockquote className="note-quote">
                  “{composing.exact}”
                </blockquote>
                <input
                  aria-label={t(
                    "이름 (비우면 익명)",
                    "Name (blank = anonymous)",
                  )}
                  placeholder={t(
                    "이름 (비우면 익명)",
                    "Name (blank = anonymous)",
                  )}
                  maxLength={50}
                  value={draft.value.author}
                  onChange={(e) => draft.setField("author", e.target.value)}
                />
                <textarea
                  aria-label={t("나의 생각", "My thought")}
                  rows={3}
                  maxLength={3000}
                  value={draft.value.body}
                  onChange={(e) => draft.setField("body", e.target.value)}
                />
                <div className="button-row">
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => setComposing(null)}
                  >
                    {t("취소", "Cancel")}
                  </button>
                  <button
                    type="submit"
                    className="button"
                    disabled={busy || !draft.value.body.trim()}
                  >
                    {t("의견 등록", "Post note")}
                  </button>
                </div>
              </form>
            )}
            <header className="notes-head">
              <h3>
                {focus
                  ? t("선택한 문장의 의견", "Notes on this passage")
                  : t(`본문 의견 ${notes.length}`, `Notes ${notes.length}`)}
              </h3>
              {focus && (
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setFocus(null)}
                >
                  {t("모두 보기", "Show all")}
                </button>
              )}
            </header>
            {shown.length ? (
              shown.map(({ note }) => (
                <NoteItem
                  key={note.id}
                  kind="text"
                  note={note}
                  onChange={(n) =>
                    setNotes((list) => list.map((x) => (x.id === n.id ? n : x)))
                  }
                  onRemove={() =>
                    setNotes((list) => list.filter((x) => x.id !== note.id))
                  }
                  quote={
                    <blockquote className="note-quote">
                      “{note.quote}”
                    </blockquote>
                  }
                />
              ))
            ) : (
              <p className="muted">
                {t(
                  "문장을 선택해 첫 의견을 남겨 보세요.",
                  "Select a sentence to leave the first note.",
                )}
              </p>
            )}
            {!focus && orphans.length > 0 && (
              <section className="orphan-notes">
                <h4>
                  {t(
                    "원래 문장 (본문이 수정됨)",
                    "Original passage (text was edited)",
                  )}
                </h4>
                {orphans.map(({ note }) => (
                  <NoteItem
                    key={note.id}
                    kind="text"
                    note={note}
                    onChange={(n) =>
                      setNotes((list) =>
                        list.map((x) => (x.id === n.id ? n : x)),
                      )
                    }
                    onRemove={() =>
                      setNotes((list) => list.filter((x) => x.id !== note.id))
                    }
                    quote={
                      <blockquote className="note-quote">
                        “{note.quote}”
                      </blockquote>
                    }
                  />
                ))}
              </section>
            )}
          </aside>
        </div>
      )}
      {selection && text && (
        <div
          className="selection-bar"
          role="toolbar"
          aria-label={t("선택한 문장", "Selected passage")}
        >
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={addHighlight}
          >
            <Highlighter size={18} /> {t("형광펜", "Highlight")}
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={startNote}
          >
            <MessageSquarePlus size={18} /> {t("의견 달기", "Add note")}
          </button>
          <button
            type="button"
            aria-label={t("닫기", "Close")}
            onClick={() => document.getSelection()?.removeAllRanges()}
          >
            <X size={18} />
          </button>
        </div>
      )}
      <LessonTextEditor
        week={week}
        base={data.draft || text}
        open={editing}
        onOpenChange={setEditing}
        onSaved={() => void load()}
      />
    </div>
  );
}
