"use client";
import { useState } from "react";
import Link from "next/link";
import { useApp } from "../provider";
import { useStudyDate } from "../use-study-date";
import { lessonDate, studyProgress } from "@/lib/study-progress";
export function ProgressDashboard({
  progress,
  reflections,
  bookmarks,
}: {
  progress: { week: number; day: number }[];
  reflections: number;
  bookmarks: number;
}) {
  const { weeks, lang, t } = useApp();
  const today = useStudyDate();
  const activeWeek =
    weeks.find((w) => today && w.start <= today && w.end >= today) || weeks[0];
  const [selected, setSelected] = useState<number | null>(null),
    [month, setMonth] = useState<string | null>(null);
  const week = weeks.find((w) => w.number === selected) || activeWeek;
  const { scheduled, complete, months } = studyProgress(weeks, progress);
  const weekDates = Array.from({ length: 7 }, (_, i) =>
    lessonDate(week.start, i + 1),
  );
  const done = weekDates.filter((date) => complete.has(date)).length,
    percent = Math.round((done / 7) * 100);
  const selectedMonth =
    month || (today?.startsWith("2026") ? today.slice(0, 7) : "2026-09");
  const monthInfo = months.find((m) => m.month === selectedMonth)!;
  const first = new Date(selectedMonth + "-01T00:00:00Z");
  const length = new Date(
    Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0),
  ).getUTCDate();
  return (
    <section
      className="progress-dashboard"
      aria-label={t("학습 진행 현황", "Learning progress")}
    >
      <div className="progress-stats">
        <article>
          <strong>{complete.size}</strong>
          <span>{t("완료한 학습일", "Completed study days")}</span>
        </article>
        <article>
          <strong>{reflections}</strong>
          <span>{t("남긴 묵상 기록", "Written reflections")}</span>
        </article>
        <article>
          <strong>{bookmarks}</strong>
          <span>{t("저장한 말씀", "Saved readings")}</span>
        </article>
      </div>
      <div className="panel progress-week">
        <div
          className="progress-ring"
          role="img"
          aria-label={t(
            `${week.number}주차 ${done}/7일 완료, ${percent}%`,
            `Week ${week.number}: ${done}/7 days completed, ${percent}%`,
          )}
        >
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <circle
              cx="60"
              cy="60"
              r="51"
              fill="none"
              stroke="var(--line)"
              strokeWidth="9"
            />
            <circle
              cx="60"
              cy="60"
              r="51"
              fill="none"
              stroke="var(--gold)"
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray={`${percent * 3.2044} 320.44`}
              transform="rotate(-90 60 60)"
            />
          </svg>
          <div>
            <strong>{percent}%</strong>
            <small>{done} / 7</small>
          </div>
        </div>
        <div className="progress-week-content">
          <label className="field">
            {t("주간 진행 보기", "Weekly progress")}
            <select
              aria-label={t("주간 진행 보기", "Weekly progress")}
              value={week.number}
              onChange={(e) => setSelected(Number(e.target.value))}
            >
              {weeks.map((w) => (
                <option value={w.number} key={w.number}>
                  {w.number}
                  {t("주차 · ", " · ")}
                  {w.reference[lang]}
                </option>
              ))}
            </select>
          </label>
          <div className="progress-days">
            {weekDates.map((date, i) => (
              <Link
                key={date}
                href={`/week/${week.number}/day/${i + 1}`}
                className={`${complete.has(date) ? "complete" : ""} ${new Date(date + "T00:00:00Z").getUTCDay() === 0 ? "sunday" : ""}`}
                aria-label={`${date} ${complete.has(date) ? t("완료", "Complete") : t("학습하기", "Study")}`}
              >
                <small>
                  {new Date(date + "T00:00:00Z").toLocaleDateString(
                    lang === "ko" ? "ko-KR" : "en-US",
                    { weekday: "short", timeZone: "UTC" },
                  )}
                </small>
                <strong>{Number(date.slice(-2))}</strong>
                <span>{complete.has(date) ? "✓" : "○"}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
      <div className="panel">
        <div className="section-heading">
          <h2>{t("나의 학습 달력", "My study calendar")}</h2>
          <label className="field">
            {t("월 선택", "Choose month")}
            <select
              aria-label={t("월 선택", "Choose month")}
              value={selectedMonth}
              onChange={(e) => setMonth(e.target.value)}
            >
              {months.map((m) => (
                <option key={m.month} value={m.month}>
                  {m.month}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p>
          {t(
            `이 달의 학습 ${monthInfo.done}/${monthInfo.total}일 완료`,
            `This month: ${monthInfo.done}/${monthInfo.total} study days completed`,
          )}
        </p>
        <div className="progress-calendar">
          {(lang === "ko"
            ? ["일", "월", "화", "수", "목", "금", "토"]
            : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
          ).map((day, i) => (
            <span key={day} className={i === 0 ? "sunday" : ""}>
              {day}
            </span>
          ))}
          {Array.from({ length: first.getUTCDay() }, (_, i) => (
            <span key={`empty-${i}`} />
          ))}
          {Array.from({ length }, (_, i) => {
            const date = `${selectedMonth}-${String(i + 1).padStart(2, "0")}`;
            const lesson = scheduled.get(date);
            const className = `${complete.has(date) ? "complete" : ""} ${new Date(date + "T00:00:00Z").getUTCDay() === 0 ? "sunday" : ""} ${date === today ? "today" : ""}`;
            return lesson ? (
              <Link
                className={className}
                key={date}
                href={`/week/${lesson.week}/day/${lesson.day}`}
                title={`${date} · ${complete.has(date) ? t("완료", "Complete") : t("학습하기", "Study")}`}
              >
                <strong>{i + 1}</strong>
                <small>{complete.has(date) ? "✓" : ""}</small>
              </Link>
            ) : (
              <span key={date}>{i + 1}</span>
            );
          })}
        </div>
        <small>
          {t(
            "✓ 학습 완료 · 테두리 오늘 · 날짜를 누르면 해당 학습으로 이동합니다.",
            "✓ Completed · outline marks today · select a date to open its lesson.",
          )}
        </small>
      </div>
      <div className="panel">
        <h2>{t("월별 학습 발자취", "Monthly learning progress")}</h2>
        <div className="progress-months">
          {months.map((m, i) => (
            <button
              key={m.month}
              onClick={() => setMonth(m.month)}
              aria-pressed={selectedMonth === m.month}
              aria-label={t(
                `${i + 1}월 ${m.done}/${m.total}일 완료`,
                `${m.month}: ${m.done}/${m.total} days complete`,
              )}
            >
              <span>
                {t(
                  `${i + 1}월`,
                  new Date(Date.UTC(2026, i, 1)).toLocaleDateString("en-US", {
                    month: "short",
                    timeZone: "UTC",
                  }),
                )}
              </span>
              <span className="progress-bar">
                <span
                  style={{
                    width: `${m.total ? (m.done / m.total) * 100 : 0}%`,
                  }}
                />
              </span>
              <strong>
                {m.done}
                <small> / {m.total}</small>
              </strong>
            </button>
          ))}
        </div>
        <p className="muted">
          {t(
            "학습 완료를 누른 날짜별로 표시합니다. 빠르지 않아도 괜찮아요. 나만의 속도로 이어 가세요.",
            "Based on the scheduled lesson dates you marked complete. Continue at your own pace.",
          )}
        </p>
      </div>
    </section>
  );
}
