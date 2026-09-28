"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useApp } from "../provider";
import { api } from "@/lib/client";
import { canManageRecords } from "@/lib/access";
import { RecordsGate } from "../account";
import { Translated } from "../community/wall";
type Post = {
  id: string;
  week: number;
  content: string;
  kind: string;
  created_at: string;
};
export function MyPosts() {
  const { boot, t, error } = useApp();
  const [posts, setPosts] = useState<Post[]>([]);
  const [search, setSearch] = useState("");
  useEffect(() => {
    let active = true;
    setPosts([]);
    if (canManageRecords(boot?.actor))
      api<Post[]>("my-posts")
        .then((r) => {
          if (active) setPosts(r);
        })
        .catch(error);
    return () => {
      active = false;
    };
  }, [boot]);
  return (
    <RecordsGate>
      <div className="page narrow">
        <h1>
          {t("{nickname}님의 글", "{nickname}'s writing", { nickname: boot?.actor.nickname ?? "" })}
        </h1>
        <p>
          {t(
            "닉네임이 아닌 개인 ID를 기준으로 본인이 쓴 글만 보여 줍니다.",
            "Only your own writing is shown, identified by your private ID—not by nickname.",
          )}
        </p>
        <div className="actions">
          <Link className="button secondary" href="/journey">
            {t("개인 묵상 · 학습 기록", "Private reflections & learning")}
          </Link>
          <Link className="button secondary" href="/privacy">
            {t("닉네임 · 기록 관리", "Nickname & record settings")}
          </Link>
        </div>
        <label className="field">
          {t("내 글 검색", "Search my writing")}
          <input value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
        {posts
          .filter((p) => p.content.includes(search))
          .map((p) => (
            <article className="panel" key={p.kind + p.id}>
              <small>
                {t("{week}주차 · ", "Week {week} · ", { week: p.week })}
                {t(
                  p.kind === "note"
                    ? "생각벽"
                    : p.kind === "discussion"
                      ? "토론"
                      : "질문",
                  p.kind,
                )}
              </small>
              <Translated text={p.content} week={p.week} />
              <Link
                href={
                  p.kind === "discussion"
                    ? "/discussion"
                    : p.kind === "note"
                      ? "/community"
                      : "/questions"
                }
              >
                {t("게시판에서 보기", "Open board")}
              </Link>
            </article>
          ))}
        {!posts.length && (
          <p>{t("아직 작성한 글이 없습니다.", "No writing yet.")}</p>
        )}
      </div>
    </RecordsGate>
  );
}
