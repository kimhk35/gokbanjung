"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink, Presentation, Share2 } from "lucide-react";
import { useApp } from "../provider";
import { Empty } from "../learning/learn";
import { Confirm } from "../ui/dialog";
import { api, RequestError } from "@/lib/client";
import { newId } from "@/lib/image-compress";
import { posterUrl } from "@/lib/poster";
import type { Prompt, Reply } from "@/lib/prompts";
import { useLocalDraft } from "../use-local-draft";
import { useRefresh } from "../use-refresh";
import { share } from "../ward/event-detail";
import { ReplyItem, rememberAuthor, useAuthorDefault } from "./reply-item";
import { PresentMode, QueuePanel, usePresentQueue } from "./present-mode";
import { PromptEditor } from "./prompt-editor";

type View = { prompt: Prompt; replies: Reply[]; canAuthor: boolean };
export function PromptView({
  slug,
  embedded = false,
}: {
  slug: string;
  embedded?: boolean;
}) {
  const { t, boot, error, notify } = useApp();
  const router = useRouter();
  const [data, setData] = useState<View | null>(null);
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const author = useAuthorDefault();
  const [preparing, setPreparing] = useState(false);
  const [presenting, setPresenting] = useState(false);
  const draft = useLocalDraft(
    boot && data ? `${boot.actor.id}:reply:${data.prompt.id}` : null,
    { author, body: "" },
  );
  const load = useCallback(() => {
    api<View>(`think/prompt?slug=${slug}`)
      .then((d) => {
        setData(d);
        setMissing(false);
      })
      .catch((e) =>
        e instanceof RequestError && e.code === "not_found"
          ? setMissing(true)
          : error(e),
      );
  }, [slug, error]);
  useEffect(() => {
    if (boot) load();
  }, [boot, load]);
  useRefresh(load, 30000, draft.typing || !!draft.value.body.trim() || editing);
  const submit = async () => {
    if (!data) return;
    setBusy(true);
    try {
      const reply = await api<Reply>("think/reply", {
        id: newId(),
        prompt_id: data.prompt.id,
        author: draft.value.author,
        body: draft.value.body,
      });
      rememberAuthor(draft.value.author);
      draft.clear();
      setData({ ...data, replies: [...data.replies, reply] });
    } catch (e) {
      error(e);
    } finally {
      setBusy(false);
    }
  };
  const removePrompt = async () => {
    try {
      await api("think/delete", { id: data!.prompt.id });
      router.push("/think");
    } catch (e) {
      error(e);
    }
  };
  if (missing)
    return (
      <Empty title={t("질문을 찾을 수 없습니다.", "Question not found.")} />
    );
  if (!data) return <div className="skeleton" />;
  const { prompt } = data;
  const poster = posterUrl(prompt.poster_path);
  const canEdit = prompt.mine || boot?.actor.role === "ADMIN";
  const presenter =
    boot?.actor.kind === "user" &&
    ["TEACHER", "ADMIN"].includes(boot.actor.role);
  return (
    <div className="prompt-view">
      {!embedded && (
        <Link className="text-button back-link" href="/think">
          <ArrowLeft size={18} /> {t("함께 생각하기", "Think together")}
        </Link>
      )}
      {poster && (
        <img
          className="event-poster"
          src={poster}
          alt={t("질문 포스터", "Question poster")}
        />
      )}
      <span className="overline">
        {prompt.reference_label ||
          (prompt.week ? t("{week}주차", "Week {week}", { week: prompt.week }) : "")}
      </span>
      <h2 className="prompt-title">{prompt.title}</h2>
      <p className="prompt-question preserve">{prompt.question}</p>
      {prompt.reading_text && (
        <blockquote className="prompt-reading preserve">
          {prompt.reading_text}
        </blockquote>
      )}
      <div className="button-row">
        {prompt.source_url && (
          <a
            className="button secondary"
            href={prompt.source_url}
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink size={18} />{" "}
            {t("공식 원문 열기", "Open official source")}
          </a>
        )}
        <button
          type="button"
          className="button secondary"
          onClick={() => {
            history.replaceState(null, "", `/p/${prompt.slug}`);
            share(prompt.title, t, notify);
          }}
        >
          <Share2 size={18} /> {t("공유", "Share")}
        </button>
        {presenter && (
          <button
            type="button"
            className="button secondary"
            aria-pressed={preparing}
            onClick={() => setPreparing(!preparing)}
          >
            <Presentation size={18} /> {t("발표 준비", "Prepare to present")}
          </button>
        )}
        {canEdit && (
          <button
            type="button"
            className="button secondary"
            onClick={() => setEditing(true)}
          >
            {t("수정", "Edit")}
          </button>
        )}
        {canEdit && (
          <Confirm
            trigger={
              <button type="button" className="button danger">
                {t("삭제", "Delete")}
              </button>
            }
            title={t("이 질문을 삭제할까요?", "Delete this question?")}
            description={t(
              "답글과 댓글도 함께 삭제됩니다.",
              "Replies and comments are deleted too.",
            )}
            onConfirm={removePrompt}
          />
        )}
      </div>
      <section
        className="reply-composer"
        aria-label={t("답글 쓰기", "Write a reply")}
      >
        <h3>{t("나의 생각 나누기", "Share your thought")}</h3>
        <input
          aria-label={t("이름 (비우면 익명)", "Name (blank = anonymous)")}
          placeholder={t("이름 (비우면 익명)", "Name (blank = anonymous)")}
          maxLength={50}
          value={draft.value.author}
          onChange={(e) => draft.setField("author", e.target.value)}
        />
        <textarea
          aria-label={t("답글", "Reply")}
          placeholder={t("짧은 생각도 좋아요.", "A short thought is welcome.")}
          rows={4}
          maxLength={3000}
          value={draft.value.body}
          onChange={(e) => draft.setField("body", e.target.value)}
        />
        <div className="button-row">
          {draft.saved && (
            <small className="muted">
              {t(
                "이 기기에 임시 저장됨 · 등록 전에는 공개되지 않아요",
                "Saved on this device · not public until posted",
              )}
            </small>
          )}
          <button
            type="button"
            className="button"
            disabled={busy || !draft.value.body.trim()}
            onClick={submit}
          >
            {t("답글 등록", "Post reply")}
          </button>
        </div>
      </section>
      <ReplyList
        prompt={prompt}
        replies={data.replies}
        setReplies={(update) =>
          setData((d) => d && { ...d, replies: update(d.replies) })
        }
        presenter={!!presenter}
        preparing={preparing}
        presenting={presenting}
        setPresenting={setPresenting}
      />
      <PromptEditor
        open={editing}
        onOpenChange={setEditing}
        prompt={prompt}
        onSaved={() => load()}
      />
    </div>
  );
}

function ReplyList({
  prompt,
  replies,
  setReplies,
  presenter,
  preparing,
  presenting,
  setPresenting,
}: {
  prompt: Prompt;
  replies: Reply[];
  setReplies: (update: (r: Reply[]) => Reply[]) => void;
  presenter: boolean;
  preparing: boolean;
  presenting: boolean;
  setPresenting: (v: boolean) => void;
}) {
  const { t, boot } = useApp();
  const q = usePresentQueue(boot?.actor.id, prompt.id);
  return (
    <div className={preparing ? "replies-with-panel" : undefined}>
      <section className="replies" aria-live="polite">
        <h3>
          {t("다른 사람들의 생각 {length}", "Replies {length}", { length: replies.length })}
        </h3>
        {replies.length ? (
          replies.map((r) => (
            <ReplyItem
              key={r.id}
              reply={r}
              queued={q.queue.includes(r.id)}
              prompt={prompt}
              onQueue={
                presenter && preparing ? () => q.toggle(r.id) : undefined
              }
              onChange={(next) =>
                setReplies((list) =>
                  list.map((x) => (x.id === next.id ? next : x)),
                )
              }
              onRemove={() =>
                setReplies((list) => list.filter((x) => x.id !== r.id))
              }
            />
          ))
        ) : (
          <p className="muted">
            {t("첫 번째 생각을 남겨 주세요.", "Be the first to share.")}
          </p>
        )}
      </section>
      {presenter && preparing && (
        <QueuePanel
          replies={replies}
          queue={q.queue}
          onMove={q.move}
          onToggle={q.toggle}
          onStart={() => setPresenting(true)}
        />
      )}
      {presenting && (
        <PresentMode
          prompt={prompt}
          replies={replies}
          queue={q.queue}
          onClose={() => setPresenting(false)}
        />
      )}
    </div>
  );
}
