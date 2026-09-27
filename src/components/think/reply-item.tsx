"use client";
import { useState } from "react";
import { Heart, MessageCircle, Star, Trash2 } from "lucide-react";
import { useApp } from "../provider";
import { api } from "@/lib/client";
import { newId } from "@/lib/image-compress";
import type { Reply, ReplyComment } from "@/lib/prompts";
import { useLocalDraft } from "../use-local-draft";

export function useAuthorDefault() {
  const { boot } = useApp();
  if (boot?.actor.nickname) return boot.actor.nickname;
  try {
    return localStorage.getItem("ggc_author") || "";
  } catch {
    return "";
  }
}
export function rememberAuthor(name: string) {
  try {
    if (name.trim()) localStorage.setItem("ggc_author", name.trim());
  } catch {}
}
export function when(iso: string, lang: string) {
  return new Intl.DateTimeFormat(lang === "ko" ? "ko-KR" : "en-US", {
    timeZone: "Asia/Seoul",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}
export function ReplyItem({
  reply,
  onChange,
  onRemove,
  queued,
  onQueue,
}: {
  reply: Reply;
  onChange: (r: Reply) => void;
  onRemove: () => void;
  queued?: boolean;
  onQueue?: () => void;
}) {
  const { t, lang, boot, error } = useApp();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const author = useAuthorDefault();
  const draft = useLocalDraft(
    boot && open ? `${boot.actor.id}:comment:${reply.id}` : null,
    { author, body: "" },
  );
  const heart = async () => {
    try {
      const r = await api<{ hearted: boolean; hearts: number }>("think/heart", {
        reply_id: reply.id,
      });
      onChange({ ...reply, ...r });
    } catch (e) {
      error(e);
    }
  };
  const comment = async () => {
    setBusy(true);
    try {
      const c = await api<ReplyComment>("think/comment", {
        id: newId(),
        reply_id: reply.id,
        author: draft.value.author,
        body: draft.value.body,
      });
      rememberAuthor(draft.value.author);
      draft.clear();
      onChange({ ...reply, comments: [...reply.comments, c] });
    } catch (e) {
      error(e);
    } finally {
      setBusy(false);
    }
  };
  const removeComment = async (id: string) => {
    try {
      await api("think/comment-delete", { id });
      onChange({
        ...reply,
        comments: reply.comments.filter((c) => c.id !== id),
      });
    } catch (e) {
      error(e);
    }
  };
  const removeReply = async () => {
    try {
      await api("think/reply-delete", { id: reply.id });
      onRemove();
    } catch (e) {
      error(e);
    }
  };
  return (
    <article className="reply">
      <header>
        <strong>{reply.author}</strong>
        <time>{when(reply.created_at, lang)}</time>
      </header>
      <p className="preserve">{reply.body}</p>
      <div className="reply-actions">
        <button
          type="button"
          className="reply-action"
          aria-pressed={reply.hearted}
          onClick={heart}
        >
          <Heart size={18} fill={reply.hearted ? "currentColor" : "none"} />{" "}
          {reply.hearts}
        </button>
        <button
          type="button"
          className="reply-action"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          <MessageCircle size={18} /> {reply.comments.length}
        </button>
        {onQueue && (
          <button
            type="button"
            className="reply-action"
            aria-pressed={!!queued}
            onClick={onQueue}
          >
            <Star size={18} fill={queued ? "currentColor" : "none"} />{" "}
            {queued ? t("담김", "Added") : t("담기", "Add")}
          </button>
        )}
        {reply.mine && (
          <button
            type="button"
            className="reply-action"
            aria-label={t("내 답글 삭제", "Delete my reply")}
            onClick={removeReply}
          >
            <Trash2 size={18} />
          </button>
        )}
      </div>
      {open && (
        <div className="reply-comments">
          {reply.comments.map((c) => (
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
              {draft.saved && (
                <small className="muted">
                  {t("이 기기에 임시 저장됨", "Draft saved on this device")}
                </small>
              )}
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
