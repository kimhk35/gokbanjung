"use client";
import { useState, type ReactNode } from "react";
import { Heart, MessageCircle, Trash2 } from "lucide-react";
import { useApp } from "../provider";
import { api } from "@/lib/client";
import { newId } from "@/lib/image-compress";
import type { NoteComment, ThreadFields } from "@/lib/note-threads";
import { useLocalDraft } from "../use-local-draft";
import { rememberAuthor, useAuthorDefault, when } from "../think/reply-item";

type Note = ThreadFields & {
  id: string;
  author: string;
  body: string;
  created_at: string;
};

// One public note (verse or lesson text) with heart, comments and delete.
export function NoteItem<T extends Note>({
  kind,
  note,
  onChange,
  onRemove,
  quote,
}: {
  kind: "verse" | "text";
  note: T;
  onChange: (n: T) => void;
  onRemove: () => void;
  quote?: ReactNode;
}) {
  const { t, locale, boot, error } = useApp();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const author = useAuthorDefault();
  const draft = useLocalDraft(
    boot && open ? `${boot.actor.id}:${kind}-comment:${note.id}` : null,
    { author, body: "" },
  );
  const call = <R,>(action: string, input: unknown) =>
    api<R>(`notes/${kind}-${action}`, input);
  const heart = async () => {
    try {
      onChange({
        ...note,
        ...(await call<{ hearted: boolean; hearts: number }>("heart", {
          note_id: note.id,
        })),
      });
    } catch (e) {
      error(e);
    }
  };
  const comment = async () => {
    setBusy(true);
    try {
      const c = await call<NoteComment>("comment", {
        id: newId(),
        note_id: note.id,
        author: draft.value.author,
        body: draft.value.body,
      });
      rememberAuthor(draft.value.author);
      draft.clear();
      onChange({ ...note, comments: [...note.comments, c] });
    } catch (e) {
      error(e);
    } finally {
      setBusy(false);
    }
  };
  const removeComment = async (id: string) => {
    try {
      await call("comment-delete", { id });
      onChange({ ...note, comments: note.comments.filter((c) => c.id !== id) });
    } catch (e) {
      error(e);
    }
  };
  const remove = async () => {
    try {
      await call("delete", { id: note.id });
      onRemove();
    } catch (e) {
      error(e);
    }
  };
  return (
    <article className="reply note-item">
      <header>
        <strong>{note.author}</strong>
        <time>{when(note.created_at, locale)}</time>
      </header>
      {quote}
      <p className="preserve">{note.body}</p>
      <div className="reply-actions">
        <button
          type="button"
          className="reply-action"
          aria-pressed={note.hearted}
          onClick={heart}
        >
          <Heart size={18} fill={note.hearted ? "currentColor" : "none"} />{" "}
          {note.hearts}
        </button>
        <button
          type="button"
          className="reply-action"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          <MessageCircle size={18} /> {note.comments.length}
        </button>
        {(note.mine || boot?.actor.role === "ADMIN") && (
          <button
            type="button"
            className="reply-action"
            aria-label={t("삭제", "Delete")}
            onClick={remove}
          >
            <Trash2 size={18} />
          </button>
        )}
      </div>
      {open && (
        <div className="reply-comments">
          {note.comments.map((c) => (
            <div className="reply-comment" key={c.id}>
              <strong>{c.author}</strong>{" "}
              <span className="preserve">{c.body}</span>
              {c.mine && (
                <button
                  type="button"
                  className="text-button"
                  onClick={() => removeComment(c.id)}
                >
                  {t("삭제", "Delete")}
                </button>
              )}
            </div>
          ))}
          <form
            className="comment-form"
            onSubmit={(e) => {
              e.preventDefault();
              comment();
            }}
          >
            <input
              aria-label={t("이름 (비우면 익명)", "Name (blank = anonymous)")}
              placeholder={t("이름 (비우면 익명)", "Name (blank = anonymous)")}
              maxLength={50}
              value={draft.value.author}
              onChange={(e) => draft.setField("author", e.target.value)}
            />
            <textarea
              aria-label={t("댓글", "Comment")}
              placeholder={t("댓글을 남겨 주세요", "Write a comment")}
              rows={2}
              maxLength={1500}
              value={draft.value.body}
              onChange={(e) => draft.setField("body", e.target.value)}
            />
            <div className="button-row">
              <button
                type="submit"
                className="button"
                disabled={busy || !draft.value.body.trim()}
              >
                {t("댓글 등록", "Post comment")}
              </button>
            </div>
          </form>
        </div>
      )}
    </article>
  );
}
