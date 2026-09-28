"use client";
import { useState } from "react";
import Link from "next/link";
import { useApp } from "../provider";
import { recommendedQuestion } from "@/lib/recommendations";
import { officialUrl } from "@/lib/curriculum";
import type { Week } from "@/lib/types";
import { api } from "@/lib/client";
export function RecommendedDiscussion({ week }: { week: Week }) {
  const { uiLang, tl, t, boot, notify, error } = useApp();
  const [busy, setBusy] = useState(false);
  const q = recommendedQuestion(week, 1, uiLang);
  const follow = t("「{theme}」에 대해 서로 다르게 이해한 부분은 무엇이며, 각자 어떤 구절을 근거로 생각했나요?", "Where do your views on “{theme}” differ, and what passage supports each view?", { theme: q.theme });
  return (
    <section className="panel recommendation">
      <span className="overline">
        {t("오늘의 추천 토론 · {number}주차", "TODAY’S DISCUSSION · WEEK {number}", { number: week.number })}
      </span>
      <h2>{q.theme}</h2>
      <p className="recommended-question">{q.question}</p>
      <ol>
        <li>
          {t(
            "시작: 각자 마음에 남은 구절과 그 이유를 한 가지씩 나눕니다.",
            "Start: each person shares one passage and why it stood out.",
          )}
        </li>
        <li>{follow}</li>
        <li>
          {t(
            "마무리: 서로의 이야기를 듣고 새롭게 생각하게 된 점과 이번 주 실천 한 가지를 나눕니다.",
            "Close: share one new perspective and one action for the week.",
          )}
        </li>
      </ol>
      <p>
        {t(
          "생각할 시간 1분 → 각자 나누기 5분 → 비교·실천 정리 4분. 말하고 싶지 않은 경험은 나누지 않아도 됩니다.",
          "Think for 1 minute → share for 5 → compare and plan for 4. No one has to disclose a personal experience.",
        )}
      </p>
      <small>
        {t(
          "교재 주제를 바탕으로 재구성한 토론 제안이며 공식 질문이 아닙니다.",
          "Adapted discussion suggestion based on the manual, not an official question.",
        )}{" "}
        {tl(week.reference)} ·{" "}
        {t("교재 {sourcePage}쪽", "Manual p. {sourcePage}", { sourcePage: week.sourcePage })}
      </small>
      <div className="actions">
        <Link
          className="button secondary"
          href={`/discussion?week=${week.number}`}
        >
          {t("이번 주 토론방", "This week’s discussions")}
        </Link>
        <button
          className="button secondary"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(
                q.question + "\n" + follow + "\n" + officialUrl(week, uiLang),
              );
              notify(
                t("토론 질문을 복사했습니다.", "Discussion prompt copied."),
              );
            } catch {
              notify(
                t(
                  "복사가 차단되었습니다. 질문을 직접 선택해 복사하세요.",
                  "Copy was blocked. Select and copy the question manually.",
                ),
              );
            }
          }}
        >
          {t("토론 질문 복사", "Copy discussion prompt")}
        </button>
        <a href={officialUrl(week, uiLang)} target="_blank" rel="noreferrer">
          {t("교재 원문 ↗", "Read manual ↗")}
        </a>
        {["TEACHER", "ADMIN"].includes(boot?.actor.role || "") && (
          <button
            className="button primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await api("create-room", {
                  week: week.number,
                  title: q.question,
                  mode: "POST_BEFORE_VIEW",
                });
                notify(
                  t(
                    "토론방을 만들었습니다. 토론 목록을 새로고침해 주세요.",
                    "Discussion created. Refresh the discussion list.",
                  ),
                );
              } catch (e) {
                error(e);
              } finally {
                setBusy(false);
              }
            }}
          >
            {t(
              "이 질문으로 토론방 만들기",
              "Create discussion with this question",
            )}
          </button>
        )}
      </div>
    </section>
  );
}
