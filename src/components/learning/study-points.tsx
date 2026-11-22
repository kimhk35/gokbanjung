"use client";

import { useApp } from "../provider";
import type { StudyPointSummary } from "@/lib/study-points";

export function StudyPoints({ summary }: { summary: StudyPointSummary }) {
  const { t, locale } = useApp();
  const number = new Intl.NumberFormat(locale);
  const date = new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  const formatDate = (value: string) =>
    date.format(new Date(value + "T00:00:00Z"));
  const points = (n: number) =>
    t("{n}점", "{n} points", { n: number.format(n) });
  const activities = {
    reading: t("하루 분량 완료", "Study day completed"),
    thought: t("첫 생각 기록", "First thought recorded"),
    quiz_daily: t("일일 경전 퀴즈", "Daily scripture quiz"),
    quiz_weekly: t("주간 경전 퀴즈", "Weekly scripture quiz"),
    quiz_monthly: t("월간 경전 퀴즈", "Monthly scripture quiz"),
  };
  return (
    <section className="study-points" aria-labelledby="study-points-title">
      <div className="study-points-card">
        <h2 id="study-points-title">{t("학습 포인트", "Learning points")}</h2>
        <p className="study-points-period">
          {formatDate(summary.weekStart)} – {formatDate(summary.weekEnd)} ·{" "}
          {t("한국 시간", "Korea time")}
        </p>
        <dl className="study-points-totals">
          <div>
            <dt>{t("이번 주 포인트", "This week’s points")}</dt>
            <dd>{points(summary.weekly)}</dd>
          </div>
          <div>
            <dt>{t("누적 포인트", "Lifetime points")}</dt>
            <dd>{points(summary.total)}</dd>
          </div>
        </dl>
        <p className="study-points-breakdown">
          <span>
            {t("읽기", "Reading")} {points(summary.reading)}
          </span>
          <span>
            {t("생각", "Thoughts")} {points(summary.thought)}
          </span>
          <span>
            {t("퀴즈", "Quizzes")} {points(summary.quiz)}
          </span>
        </p>
      </div>
      <details className="study-points-history">
        <summary>
          {t("최근 적립 내역과 기준", "Recent points and how to earn them")}
        </summary>
        {summary.recent.length > 0 && (
          <ul>
            {summary.recent.map((entry, i) => (
              <li key={i}>
                <span>
                  <time dateTime={entry.date}>{formatDate(entry.date)}</time>
                  {entry.week && entry.day
                    ? t("{week}주차 {day}일차", "Week {week}, day {day}", {
                        week: entry.week,
                        day: entry.day,
                      }) + " · "
                    : ""}
                  {activities[entry.kind]}
                </span>
                <strong>+{points(entry.points)}</strong>
              </li>
            ))}
          </ul>
        )}
        <p className="muted">
          {t(
            "기본·가족 과정 중 하나의 하루 분량을 마치면 10점, 그 학습일의 첫 생각이나 개인 메모를 저장하면 2점이 쌓여요. 밀린 분량은 마친 주에 적립돼요.",
            "Earn 10 points for finishing either reading track for a study day, and 2 points for the first thought or private note for that day. Catch-up reading counts in the week you finish it.",
          )}
        </p>
      </details>
      <div className="study-points-ward">
        <div>
          <h3>
            {t("우리 와드가 함께 읽은 분량", "What our ward has read together")}
          </h3>
          <p className="muted">
            {t("이번 주 회원 전체 합계", "This week’s member total")}
          </p>
        </div>
        <strong>
          {t("{n}일치", "{n} study days", {
            n: number.format(summary.wardCompletions),
          })}
        </strong>
      </div>
    </section>
  );
}
