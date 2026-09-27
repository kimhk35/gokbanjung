"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { LockKeyhole, MessageCircle, ArrowRight } from "lucide-react";
import { useApp } from "../provider";
import { api } from "@/lib/client";
import type { Room, Post } from "@/lib/types";
import { currentWeek } from "@/lib/curriculum";
import { PageTitle, WeekPicker, Empty } from "../learning/learn";
import { Translated } from "./wall";
import {RecommendedDiscussion} from '../learning/recommended-discussion';
export function DiscussionPage() {
  const { boot, t, error, weeks } = useApp();
  const params = useSearchParams();
  const [week, setWeek] = useState(
    Number(params.get("week")) || currentWeek()?.number || 38,
  );
  const [rooms, setRooms] = useState<Room[]>([]);
  const [room, setRoom] = useState<Room | null>(null);
  useEffect(() => {
    setRoom(null);
    if (boot) api<Room[]>(`rooms?week=${week}`).then(setRooms).catch(error);
  }, [boot, week]);
  return (
    <div className="page narrow">
      <PageTitle
        eyebrow="SHARE · DISCUSSION"
        title={t("질문을 가운데 두고", "Gather around a question")}
        description={t(
          "먼저 나의 생각을 적고, 서로의 경험을 들어 보세요.",
          "Write your own thoughts, then listen to each other’s experiences.",
        )}
      />
      <WeekPicker week={week} onChange={setWeek} />
      {weeks.find(w=>w.number===week)&&<RecommendedDiscussion week={weeks.find(w=>w.number===week)!}/>}
      {room ? (
        <>
          <button className="back-link" onClick={() => setRoom(null)}>
            ← {t("토론 목록", "All discussions")}
          </button>
          <DiscussionRoom key={room.id} room={room} />
        </>
      ) : rooms.length ? (
        <div className="stack">
          {rooms.map((r) => (
            <button key={r.id} className="room-card" onClick={() => setRoom(r)}>
              <MessageCircle size={25} />
              <div>
                <h2>
                  <Translated text={r.title} week={week} />
                </h2>
                <span className="muted">
                  {r.mode === "POST_BEFORE_VIEW"
                    ? t(
                        "먼저 작성 후 다른 의견 보기",
                        "Post before viewing others",
                      )
                    : r.status === "closed"
                      ? t("종료된 토론", "Closed discussion")
                      : t("함께 나누는 토론", "Class discussion")}
                </span>
              </div>
              <ArrowRight size={20} />
            </button>
          ))}
        </div>
      ) : (
        <Empty
          title={t(
            "아직 열린 토론이 없습니다.",
            "No discussions are open yet.",
          )}
          body={t(
            "교사가 이번 주 질문을 등록하면 이곳에서 함께 이야기할 수 있습니다.",
            "Your teacher’s discussion questions will appear here.",
          )}
        />
      )}
    </div>
  );
}
function DiscussionRoom({ room }: { room: Room }) {
  const { t, error, boot, notify } = useApp();
  const [data, setData] = useState<{
    posts: Post[];
    canView: boolean;
    canWrite: boolean;
  }>({ posts: [], canView: false, canWrite: false });
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const load = () => api<typeof data>(`posts?id=${room.id}`).then(setData);
  useEffect(() => {
    load().catch(error);
  }, [room.id]);
  const submit = async () => {
    setBusy(true);
    try {
      await api("post", { id: room.id, content });
      setContent("");
      await load();
      notify(t("의견을 남겼습니다.", "Your response was posted."));
    } catch (e) {
      error(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="discussion-room">
      <span className="overline">WEEK {room.week}</span>
      <h2>
        <Translated text={room.title} week={room.week} />
      </h2>
      {!data.canView && (
        <div className="notice">
          <LockKeyhole size={20} />
          <p>
            {t(
              "다른 사람의 의견을 보기 전에 나의 생각을 먼저 적어 주세요.",
              "Write your own response before seeing other perspectives.",
            )}
          </p>
        </div>
      )}
      {data.canWrite ? (
        <>
          <label className="field">
            {t("나의 생각", "My response")}
            <textarea
              rows={5}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={6000}
            />
          </label>
          <button
            className="button primary"
            disabled={!content.trim() || busy}
            onClick={submit}
          >
            {t("의견 남기기", "Post my response")}
          </button>
        </>
      ) : (
        <p className="badge">
          {t(
            "종료된 토론 · 읽기만 가능합니다.",
            "Discussion closed · Read only.",
          )}
        </p>
      )}
      <div className="stack">
        {data.posts.map((p) => (
          <article className="post" key={p.id}>
            <strong>
              {p.display_name || t("이름 없는 참여자", "Anonymous participant")}
            </strong>
            <p>
              <Translated text={p.content} week={room.week} />
            </p>
            {p.status === "pending" && (
              <span className="badge">
                {t("교사 승인 대기", "Pending teacher review")}
              </span>
            )}
            {data.canView && (
              <PostComments
                post={p}
                week={room.week}
                canWrite={data.canWrite}
              />
            )}{" "}
            {(boot?.actor.role === "TEACHER" || boot?.actor.role === "ADMIN") &&
              p.status === "pending" && (
                <button
                  className="button secondary"
                  onClick={() =>
                    api("moderate", {
                      type: "post",
                      id: p.id,
                      status: "published",
                    })
                      .then(load)
                      .catch(error)
                  }
                >
                  {t("의견 공개 승인", "Approve response")}
                </button>
              )}
          </article>
        ))}
      </div>
    </section>
  );
}
function PostComments({
  post,
  week,
  canWrite,
}: {
  post: Post;
  week: number;
  canWrite: boolean;
}) {
  const { t, error } = useApp();
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<Post[]>([]);
  const [text, setText] = useState("");
  const load = () =>
    api<Post[]>(`post-comments?id=${post.id}`).then(setComments);
  return (
    <div>
      <button
        className="text-button"
        onClick={() => {
          setOpen(!open);
          load().catch(error);
        }}
      >
        {t("댓글 보기 / 남기기", "View / add comments")}
      </button>
      {open && (
        <>
          <div>
            {comments.map((c) => (
              <div className="comment" key={c.id}>
                <strong>{c.display_name || t("참여자", "Participant")}</strong>
                <p>
                  <Translated text={c.content} week={week} />
                </p>
              </div>
            ))}
          </div>
          {canWrite && (
            <>
              <label className="field">
                {t("댓글", "Comment")}
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
              </label>
              <button
                disabled={!text.trim()}
                className="button secondary"
                onClick={() =>
                  api("post-comment", { id: post.id, content: text })
                    .then(() => {
                      setText("");
                      return load();
                    })
                    .catch(error)
                }
              >
                {t("댓글 남기기", "Post comment")}
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}
