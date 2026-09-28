"use client";
import Link from "next/link";
import { useApp } from "../provider";
import { officialUrl } from "@/lib/curriculum";
import { recommendedQuestion } from "@/lib/recommendations";
import type { Week } from "@/lib/types";

export function Recommendation({
  week,
  day,
  lesson = false,
}: {
  week: Week;
  day: number;
  lesson?: boolean;
}) {
  const { uiLang, tl, t, notify } = useApp();
  const item = recommendedQuestion(week, day, uiLang);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(
        `${item.question}\n${tl(week.reference)} · ${t("교재", "Manual")} p. ${item.sourcePage}\n${officialUrl(week, uiLang)}`,
      );
      notify(t("질문과 출처를 복사했습니다.", "Question and source copied."));
    } catch {
      notify(
        t(
          "복사 권한이 없습니다. 질문 문장을 선택해서 복사해 주세요.",
          "Clipboard access is unavailable. Select and copy the question text.",
        ),
      );
    }
  };
  return (
    <section
      className="recommendation panel"
      aria-label={t("오늘의 추천 질문", "Today’s recommended question")}
    >
      <span className="overline">
        {t("오늘의 추천 질문", "TODAY’S RECOMMENDED QUESTION")} ·{" "}
        {t("{number}주차 {day}일차", "WEEK {number} / DAY {day}", { number: week.number, day })}
      </span>
      <h2>{item.theme}</h2>
      <p className="recommended-question">{item.question}</p>
      <p className="recommendation-source">
        {tl(week.reference)} ·{" "}
        {t("교재 {sourcePage}쪽부터", "Manual from p. {sourcePage}", { sourcePage: item.sourcePage })}
      </p>
      <small>
        {t(
          "교재의 주간 주제를 참고해 재구성한 학습용 질문입니다. 공식 원문 질문이나 공식 일별 일정이 아닙니다.",
          "A study prompt adapted from the weekly manual theme, not an official quotation or daily schedule.",
        )}
      </small>
      <div className="actions">
        {lesson ? (
          <a className="button primary" href="#recommended-answer">
            {t("나의 생각 적기", "Write my reflection")}
          </a>
        ) : (
          <Link
            className="button primary"
            href={`/week/${week.number}/day/${day}#recommended-answer`}
          >
            {t("이 질문으로 학습하기", "Reflect on this question")}
          </Link>
        )}
        <button type="button" className="button secondary" onClick={copy}>
          {t("질문 복사", "Copy question")}
        </button>
        <a
          className="button secondary"
          href={officialUrl(week, uiLang)}
          target="_blank"
          rel="noreferrer"
        >
          {t("교재에서 확인", "View the source")}
        </a>
      </div>
    </section>
  );
}
