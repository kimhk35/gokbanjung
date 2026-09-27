"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Heart, MessageCircle, Flag, Trash2, Pin } from "lucide-react";
import { useApp } from "../provider";
import { api } from "@/lib/client";
import { currentWeek } from "@/lib/curriculum";
import { PageTitle, WeekPicker, Empty } from "../learning/learn";
import { Modal, Confirm } from "../ui/dialog";
import type { Note } from "@/lib/types";
export function Translated({ text, week }: { text: string; week: number }) {
  const { lang, boot } = useApp();
  const [translated, setTranslated] = useState("");
  useEffect(() => {
    setTranslated("");
    if (lang === "en" && boot?.aiAvailable && /[가-힣]/.test(text)) {
      let cancelled = false;
      api<{ content: { translation: string } }>("ai", {
        feature: "translate",
        week,
        language: "en",
        text,
      })
        .then((d) => {
          if (!cancelled) setTranslated(d.content.translation);
        })
        .catch(() => {});
      return () => {
        cancelled = true;
      };
    }
  }, [text, lang, week, boot?.aiAvailable]);
  return (
    <>
      <span className="preserve">{translated || text}</span>
      {lang === "en" && /[가-힣]/.test(text) && (
        <small className="translation-label">
          {translated
            ? "AI translation · Original preserved"
            : "Original text · Translation requires AI connection"}
        </small>
      )}
    </>
  );
}
export function WallPage() {
  const { t } = useApp();
  const params = useSearchParams();
  const [week, setWeek] = useState(
    Number(params.get("week")) || currentWeek()?.number || 38,
  );
  return (
    <div className="page">
      <PageTitle
        eyebrow="SHARE · OUR THOUGHTS"
        title={t("같은 말씀, 서로 다른 발견", "One reading, many discoveries")}
        description={t(
          "크고 멋진 생각이 아니어도 괜찮아요. 마음에 남은 한 문장을 나눠 주세요.",
          "A thought doesn’t need to be profound. Share a sentence that stayed with you.",
        )}
      />
      <WeekPicker week={week} onChange={setWeek} />
      <ThoughtWall key={week} week={week} />
    </div>
  );
}
export function ThoughtWall({
  week,
  live = false,
}: {
  week: number;
  live?: boolean;
}) {
  const { boot, t, error, notify } = useApp();
  const [notes, setNotes] = useState<Note[]>([]);
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [comment, setComment] = useState<Note | null>(null);
  const [comments, setComments] = useState<
    { id: string; content: string; display_name: string }[]
  >([]);
  const [reply, setReply] = useState("");
  const [report, setReport] = useState<Note | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const load = () => api<Note[]>(`notes?week=${week}`).then(setNotes);
  useEffect(() => {
    if (!boot) return;
    load().catch(error);
    const id = setInterval(
      () => {
        if (!document.hidden) load().catch(() => {});
      },
      live ? 3000 : 10000,
    );
    return () => clearInterval(id);
  }, [boot, week, live]);
  const save = async () => {
    setBusy(true);
    try {
      await api(editing ? "edit-note" : "note", {
        id: editing,
        week,
        content,
        anonymous,
      });
      setOpen(false);
      setContent("");
      setEditing(null);
      await load();
      notify(t("생각을 저장했습니다.", "Your thought was saved."));
    } catch (e) {
      error(e);
    } finally {
      setBusy(false);
    }
  };
  const showComments = (n: Note) => {
    setComment(n);
    api<typeof comments>(`note-comments?id=${n.id}`)
      .then(setComments)
      .catch(error);
  };
  return (
    <>
      {!live && (
        <div className="wall-toolbar">
          <span>
            {t(
              "우리 반에서 나눈 생각만 표시됩니다.",
              "Only thoughts shared with your class appear here.",
            )}
          </span>
          <button
            className="button primary"
            onClick={() => {
              setEditing(null);
              setContent("");
              setOpen(true);
            }}
          >
            <Plus size={19} />
            {t("생각 남기기", "Leave a thought")}
          </button>
        </div>
      )}
      {notes.length ? (
        <div className="thought-grid">
          {notes
            .filter((n) => !live || n.status === "published")
            .map((n, i) => (
              <article className={`sticky sticky-${i % 4}`} key={n.id}>
                {n.is_pinned && <Pin className="pin" size={17} />}
                <p>
                  <Translated text={n.content} week={week} />
                </p>
                <div className="note-author">
                  {n.is_anonymous || !n.display_name
                    ? t("이름 없이 나눈 생각", "Shared anonymously")
                    : n.display_name}
                  {n.status === "pending" && (
                    <span className="badge">
                      {t("교사 검토 중", "Awaiting review")}
                    </span>
                  )}
                </div>
                {!live && (
                  <div className="note-actions">
                    <button
                      aria-label={t("공감", "Appreciate")}
                      onClick={() =>
                        api("react-note", { id: n.id })
                          .then(() =>
                            notify(
                              t(
                                "공감하는 마음을 전했습니다.",
                                "Your appreciation was shared.",
                              ),
                            ),
                          )
                          .catch(error)
                      }
                    >
                      <Heart size={18} />
                    </button>
                    <button
                      aria-label={t("댓글", "Comments")}
                      onClick={() => showComments(n)}
                    >
                      <MessageCircle size={18} />
                    </button>
                    {n.mine && (
                      <button
                        onClick={() => {
                          setEditing(n.id);
                          setContent(n.content);
                          setOpen(true);
                        }}
                      >
                        {t("수정", "Edit")}
                      </button>
                    )}
                    {n.mine && (
                      <Confirm
                        title={t(
                          "이 생각을 삭제할까요?",
                          "Delete this thought?",
                        )}
                        description={t(
                          "삭제하면 댓글도 함께 삭제됩니다.",
                          "Comments will also be deleted.",
                        )}
                        onConfirm={() =>
                          api("delete-note", { id: n.id })
                            .then(load)
                            .catch(error)
                        }
                        trigger={
                          <button aria-label={t("삭제", "Delete")}>
                            <Trash2 size={17} />
                          </button>
                        }
                      />
                    )}
                    <button
                      aria-label={t("신고", "Report")}
                      onClick={() => setReport(n)}
                    >
                      <Flag size={16} />
                    </button>
                  </div>
                )}
              </article>
            ))}
        </div>
      ) : (
        <Empty
          title={t("아직 나눈 생각이 없습니다.", "No thoughts shared yet.")}
          body={t(
            "이번 주 마음에 남은 한 문장을 첫 번째로 남겨보세요.",
            "Be the first to share a sentence from this week.",
          )}
        />
      )}
      <Modal
        title={
          editing
            ? t("생각 다듬기", "Edit your thought")
            : t("마음에 남은 한 문장", "A sentence that stayed with you")
        }
        open={open}
        onOpenChange={setOpen}
      >
        <label className="field">
          {t("우리 반과 나눌 생각", "A thought to share with the class")}
          <textarea
            rows={5}
            maxLength={1200}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </label>
        {!editing && (
          <label className="checkbox">
            <input
              type="checkbox"
              checked={anonymous}
              onChange={(e) => setAnonymous(e.target.checked)}
            />
            {t("이름 없이 나누기", "Share anonymously")}
          </label>
        )}
        <button
          disabled={busy || !content.trim()}
          className="button primary"
          onClick={save}
        >
          {t("생각 나누기", "Share thought")}
        </button>
      </Modal>
      <Modal
        title={t("생각에 답하기", "Respond to a thought")}
        open={!!comment}
        onOpenChange={(v) => !v && setComment(null)}
      >
        {comments.map((c) => (
          <div className="comment" key={c.id}>
            <strong>{c.display_name || t("참여자", "Participant")}</strong>
            <p>
              <Translated text={c.content} week={week} />
            </p>
          </div>
        ))}
        <label className="field">
          {t("댓글", "Comment")}
          <textarea value={reply} onChange={(e) => setReply(e.target.value)} />
        </label>
        <button
          className="button primary"
          disabled={!reply.trim()}
          onClick={() =>
            api("note-comment", { id: comment?.id, content: reply })
              .then(() => {
                setReply("");
                if (comment) showComments(comment);
              })
              .catch(error)
          }
        >
          {t("댓글 남기기", "Add comment")}
        </button>
      </Modal>
      <Modal
        title={t("교사에게 검토 요청", "Request teacher review")}
        open={!!report}
        onOpenChange={(v) => !v && setReport(null)}
      >
        <label className="field">
          {t("검토가 필요한 이유", "Reason for review")}
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </label>
        <button
          disabled={!reason.trim()}
          className="button primary"
          onClick={() =>
            api("report", { type: "note", id: report?.id, reason })
              .then(() => {
                setReport(null);
                setReason("");
                notify(t("검토를 요청했습니다.", "Review requested."));
              })
              .catch(error)
          }
        >
          {t("요청 보내기", "Send request")}
        </button>
      </Modal>
    </>
  );
}
