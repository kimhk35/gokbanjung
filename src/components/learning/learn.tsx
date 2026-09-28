"use client";
import { lessonDate } from "@/lib/study-progress";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useApp } from "../provider";
import { api } from "@/lib/client";
import {
  prompts,
  reading,
  currentWeek,
  officialUrl,
  dayIndex,
} from "@/lib/curriculum";
import { useDraft } from "../use-draft";
import { Recommendation } from "./recommendation";
import { ReadingLinks } from "./scriptures";
import {
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  Check,
  LockKeyhole,
  BookOpen,
  Search,
} from "lucide-react";
import { WeekVoices } from "./week-voices";
export function WeekPicker({
  week,
  onChange,
}: {
  week: number;
  onChange: (w: number) => void;
}) {
  const { tl, weeks, t } = useApp();
  return (
    <label className="week-picker">
      {t("주차 선택", "Choose a week")}
      <select value={week} onChange={(e) => onChange(Number(e.target.value))}>
        {weeks.map((w) => (
          <option key={w.number} value={w.number}>
            {String(w.number).padStart(2, "0")} · {tl(w.reference)}
          </option>
        ))}
      </select>
    </label>
  );
}
export function PageTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="page-title">
      <span className="overline">{eyebrow}</span>
      <h1>{title}</h1>
      {description && <p>{description}</p>}
    </div>
  );
}
export function Empty({ title, body }: { title: string; body?: string }) {
  return (
    <div className="empty">
      <BookOpen size={30} strokeWidth={1} />
      <h3>{title}</h3>
      {body && <p>{body}</p>}
    </div>
  );
}
export function LearnPage() {
  const { locale, tl, weeks, t } = useApp();
  const [query, setQuery] = useState("");
  const thisWeek = currentWeek();
  const monthOptions = Array.from(
    new Map(
      weeks.map((w) => [
        w.start.slice(0, 7),
        new Date(w.start + "T12:00:00").toLocaleDateString(locale, {
          year: "numeric",
          month: "long",
        }),
      ]),
    ).entries(),
  );
  const [view, setView] = useState<"all" | "month" | "week">("all");
  const [month, setMonth] = useState(
    thisWeek?.start.slice(0, 7) || weeks[0]?.start.slice(0, 7) || "",
  );
  const [selectedWeek, setSelectedWeek] = useState(
    thisWeek?.number || weeks[0]?.number || 1,
  );
  const weeksInMonth = weeks.filter((w) => w.start.slice(0, 7) === month);
  useEffect(() => {
    if (!weeksInMonth.some((w) => w.number === selectedWeek))
      setSelectedWeek(weeksInMonth[0]?.number || weeks[0]?.number || 1);
  }, [month, selectedWeek, weeksInMonth, weeks]);
  const searched = weeks.filter((w) =>
    (tl(w.title) + tl(w.reference) + w.number)
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const filtered = searched.filter((w) =>
    view === "all"
      ? true
      : view === "month"
        ? w.start.slice(0, 7) === month
        : w.number === selectedWeek,
  );
  return (
    <div className="page">
      <PageTitle
        eyebrow="READ · THINK · SHARE · LIVE"
        title={t("말씀을 따라, 한 주씩", "One week at a time")}
        description={t(
          "2026 구약전서 교재의 일정에 맞추어 함께 배웁니다.",
          "Follow the 2026 Old Testament study schedule.",
        )}
      />
      <label className="search">
        <Search size={21} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t(
            "주제, 경전, 주차 검색",
            "Search topics, readings, or weeks",
          )}
          aria-label={t("학습 검색", "Search learning")}
        />
      </label>
      <section
        className="study-browser"
        aria-label={t("학습 범위 선택", "Study range")}
      >
        <div
          className="study-view-tabs"
          role="tablist"
          aria-label={t("보기 방식", "View mode")}
        >
          {[
            ["all", "전체 보기", "All weeks"],
            ["month", "월별 보기", "By month"],
            ["week", "주별 보기", "By week"],
          ].map(([id, ko, en]) => (
            <button
              type="button"
              key={id}
              role="tab"
              aria-selected={view === id}
              className={view === id ? "active" : ""}
              onClick={() => setView(id as "all" | "month" | "week")}
            >
              {t(ko, en)}
            </button>
          ))}
        </div>
        {view !== "all" && (
          <div className="study-filter-controls">
            <label className="field">
              {t("월 선택", "Choose a month")}
              <select value={month} onChange={(e) => setMonth(e.target.value)}>
                {monthOptions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            {view === "week" && (
              <label className="field">
                {t("주 선택", "Choose a week")}
                <select
                  value={selectedWeek}
                  onChange={(e) => setSelectedWeek(Number(e.target.value))}
                >
                  {weeksInMonth.map((w) => (
                    <option key={w.number} value={w.number}>
                      {t("{number}주차 · {ko}", "Week {number} · {en}", { number: w.number, ko: w.title.ko, en: w.title.en })}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
        )}
        <p className="muted">
          {view === "all"
            ? t(
                "전체 52주 일정을 순서대로 봅니다.",
                "Showing the complete 52-week schedule in order.",
              )
            : view === "month"
              ? t(
                  "선택한 달에 시작하는 주차만 봅니다.",
                  "Showing weeks that begin in the selected month.",
                )
              : t(
                  "선택한 달과 주차의 학습만 봅니다.",
                  "Showing only the selected month and week.",
                )}
        </p>
      </section>
      <div className="week-grid">
        {filtered.map((w) => (
          <Link
            key={w.number}
            className={`week-card ${w.number === thisWeek?.number ? "current" : ""}`}
            href={`/week/${w.number}`}
          >
            <div>
              <span className="overline">
                WEEK {String(w.number).padStart(2, "0")}
              </span>
              {w.number === thisWeek?.number && (
                <span className="badge">{t("이번 주", "This week")}</span>
              )}
            </div>
            <span className="muted">
              {w.start.slice(5)} — {w.end.slice(5)}
            </span>
            <h2>{tl(w.title)}</h2>
            <p>{tl(w.reference)}</p>
            <ArrowUpRight size={20} />
          </Link>
        ))}
      </div>
      {!filtered.length && (
        <Empty title={t("검색 결과가 없습니다.", "No results found.")} />
      )}
    </div>
  );
}
export function WeekPage({ number }: { number: number }) {
  const { uiLang, tl, weeks, t, boot, notify, error } = useApp();
  const w = weeks.find((w) => w.number === number);
  const [completed, setCompleted] = useState<number[]>([]);
  useEffect(() => {
    if (boot)
      api<{ progress: { week: number; day: number }[] }>("journey")
        .then((d) =>
          setCompleted(
            d.progress.filter((p) => p.week === number).map((p) => p.day),
          ),
        )
        .catch(error);
  }, [boot, number]);
  if (!w)
    return (
      <div className="page">
        <Empty
          title={t(
            "공개된 주차를 찾을 수 없습니다.",
            "This week is not available.",
          )}
        />
      </div>
    );
  return (
    <div className="page narrow">
      <Link href="/learn" className="back-link">
        ← {t("전체 주차", "All weeks")}
      </Link>
      <PageTitle
        eyebrow={`WEEK ${number} · ${w.start} — ${w.end}`}
        title={tl(w.title)}
        description={tl(w.reference)}
      />
      {w.sourceNote && <p className="notice">{tl(w.sourceNote)}</p>}
      <div className="source-card">
        <BookOpen size={27} />
        <div>
          <strong>
            {t("이번 주 말씀 읽기", "Read this week’s scriptures")}
          </strong>
          <p>{tl(w.reference)}</p>
          <a href={officialUrl(w, uiLang)} target="_blank" rel="noreferrer">
            {t("공식 교재에서 읽기", "Read the official manual")}{" "}
            <ArrowUpRight size={17} />
          </a>
          <small>
            {t("제공된 교재 {sourcePage}쪽 · 주간 일정 원문 기준", "Provided manual, page {sourcePage} · English titles are study translations", { sourcePage: w.sourcePage })}
          </small>
        </div>
        <button
          className="icon-button"
          aria-label={t("마음에 담기", "Bookmark")}
          onClick={() =>
            api("bookmark", { week: number })
              .then(() =>
                notify(
                  t("나의 말씀에 담았습니다.", "Added to your bookmarks."),
                ),
              )
              .catch(error)
          }
        >
          <Bookmark size={23} />
        </button>
      </div>
      <h2>{t("나의 일주일", "Your week")}</h2>
      <p className="muted">
        {t(
          "일별 분량은 주간 경전 범위를 나눈 학습 제안입니다. 일요일에는 한 주를 돌아봅니다.",
          "Daily portions are suggested divisions of the weekly reading. Sunday is for looking back.",
        )}
      </p>
      <div className="days">
        {Array.from({ length: 7 }, (_, i) => (
          <Link
            key={i}
            href={`/week/${number}/day/${i + 1}`}
            className={completed.includes(i + 1) ? "done" : ""}
          >
            <span>
              {t(
                ["월", "화", "수", "목", "금", "토", "일"][i],
                ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"][i],
              )}
            </span>
            <strong>
              {completed.includes(i + 1) ? (
                <Check size={21} />
              ) : (
                String(i + 1).padStart(2, "0")
              )}
            </strong>
          </Link>
        ))}
      </div>
      <div className="stack">
        {Array.from({ length: 7 }, (_, i) => (
          <Link
            className="day-row"
            href={`/week/${number}/day/${i + 1}`}
            key={i}
          >
            <span>{String(i + 1).padStart(2, "0")}</span>
            <div>
              <strong>
                {i === 6
                  ? t("이번 주 돌아보기", "Reflect on the week")
                  : reading(w, i + 1, uiLang)}
              </strong>
              <small>
                {i === 6
                  ? t(
                      "다음 주에 이어 갈 질문을 남겨 보세요.",
                      "Leave a question to carry into next week.",
                    )
                  : t(
                      "읽고 · 생각하고 · 실천하기",
                      "Read · Reflect · Put into practice",
                    )}
              </small>
            </div>
            <ArrowRight size={20} />
          </Link>
        ))}
      </div>
      <PublishedQuestions week={number} />
      <div className="actions">
        <Link className="button primary" href={`/worksheet?week=${number}`}>
          {t("주간 활동지", "Weekly worksheet")}
        </Link>
        <Link className="button secondary" href={`/discussion?week=${number}`}>
          {t("주간 토론", "Weekly discussion")}
        </Link>
      </div>
      <WeekVoices week={number} />
    </div>
  );
}
export function LessonPage({ number, day }: { number: number; day: number }) {
  const { uiLang, tl, locale, weeks, t, boot, error, notify } = useApp();
  const w = weeks.find((w) => w.number === number);
  const [initial, setInitial] = useState<Record<string, string>>();
  const [prior, setPrior] = useState("");
  const [sharing, setSharing] = useState(false);
  const [shared, setShared] = useState("");
  const [complete, setComplete] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setInitial(undefined);
    if (boot) {
      api<{ content: Record<string, string> } | null>(
        `reflection?week=${number}&day=${day}`,
      )
        .then((d) => setInitial(d?.content || {}))
        .catch(error);
      api<{
        questions: { week: number; content: string }[];
        progress: { week: number; day: number }[];
      }>("journey")
        .then((d) => {
          setPrior(
            d.questions.find((q) => q.week === number - 1)?.content || "",
          );
          setComplete(
            d.progress.some((p) => p.week === number && p.day === day),
          );
        })
        .catch(error);
    }
  }, [boot, number, day]);
  const draft = useDraft(
    `reflection:${number}:${day}`,
    "reflection",
    { week: number, day },
    initial,
  );
  if (!w || day < 1 || day > 7)
    return <Empty title={t("학습을 찾을 수 없습니다.", "Lesson not found.")} />;
  const finish = async () => {
    setBusy(true);
    try {
      await api("reflection", { week: number, day, content: draft.value });
      await api("complete", { week: number, day });
      setComplete(true);
      notify(
        t(
          "오늘의 학습을 마쳤습니다. 리워드 정원에 새싹을 확인해 보세요.",
          "Learning complete. Check your rewards garden for today’s sprout.",
        ),
      );
    } catch (e) {
      error(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="page lesson-page">
      <Link className="back-link" href={`/week/${number}`}>
        ← {t("이번 주 학습", "This week")}
      </Link>
      <PageTitle
        eyebrow={`WEEK ${number} / DAY ${day}`}
        title={
          day === 7
            ? t("이번 주를 돌아보며", "Looking back on this week")
            : t("오늘, 말씀에 머무는 시간", "A moment in the word")
        }
        description={tl(w.title)}
      />
      {prior && (
        <aside className="notice">
          <strong>
            {t("지난주 당신이 남긴 질문", "Your question from last week")}
          </strong>
          <p>{prior}</p>
        </aside>
      )}
      <div className="lesson-layout">
        <article>
          <section className="reading-panel">
            <span className="overline">01 · READ</span>
            <h2>{reading(w, day, uiLang)}</h2>
            <ReadingLinks week={w} day={day} />
            <p>
              {t(
                "말씀을 천천히 읽으며 마음에 남는 단어와 질문을 찾아보세요.",
                "Read slowly and notice the words and questions that stay with you.",
              )}
            </p>
            <a
              className="button secondary"
              href={officialUrl(w, uiLang)}
              target="_blank"
              rel="noreferrer"
            >
              {t("공식 교재 열기", "Open the official manual")}
              <ArrowUpRight size={18} />
            </a>
            <small>
              {t("교재 {sourcePage}쪽 · 일별 학습 분량 제안", "Manual p. {sourcePage} · Suggested daily portion", { sourcePage: w.sourcePage })}
            </small>
          </section>
          <Recommendation week={w} day={day} lesson />
          <section className="reflection-panel">
            <div className="section-heading">
              <span className="overline">02 · THINK</span>
              <span className="private">
                <LockKeyhole size={15} />
                {t("나만 보는 기록", "Only you can read this")}
              </span>
            </div>
            <h2>{t("내 마음에 남은 것", "What stayed with me")}</h2>
            <label className="field" id="recommended-answer">
              {t(
                "추천 질문에 대한 나의 생각 (선택)",
                "My response to the recommended question (optional)",
              )}
              <textarea
                rows={4}
                value={draft.value.recommended || ""}
                onChange={(e) => draft.change("recommended", e.target.value)}
                placeholder={t(
                  "정답을 찾기보다 떠오르는 생각을 편하게 적어 보세요.",
                  "There is no required answer. Write what comes to mind.",
                )}
              />
            </label>
            {prompts.map((p, i) => (
              <label className="field" key={i}>
                {tl(p)}
                <textarea
                  value={draft.value[String(i)] || ""}
                  onChange={(e) => draft.change(String(i), e.target.value)}
                  placeholder={t(
                    "잘 정리된 문장이 아니어도 괜찮아요.",
                    "Your thoughts don’t need to be polished.",
                  )}
                  rows={4}
                />
              </label>
            ))}
            <p role="status" className="save-status">
              {draft.status ||
                t(
                  "생각은 입력 후 자동으로 저장됩니다.",
                  "Your thoughts save automatically as you type.",
                )}
            </p>
          </section>
          <section className="reflection-panel">
            <span className="overline">03 · SHARE</span>
            <h2>{t("원한다면, 함께 나누어요", "Share, if you’d like")}</h2>
            <p>
              {t(
                "묵상은 공개되지 않습니다. 아래에서 공유할 문장을 따로 골라 주세요.",
                "Your reflection stays private. Choose a separate sentence to share below.",
              )}
            </p>
            <button
              className="button secondary"
              onClick={() => setSharing(!sharing)}
            >
              {t(
                "생각벽에 한 문장 나누기",
                "Share a sentence on the thought wall",
              )}
            </button>
            {sharing && (
              <div className="field">
                <label>
                  {t("함께 나눌 문장", "Your shared sentence")}
                  <textarea
                    maxLength={1200}
                    value={shared}
                    onChange={(e) => setShared(e.target.value)}
                  />
                </label>
                <button
                  disabled={!shared.trim()}
                  className="button primary"
                  onClick={() =>
                    api("note", {
                      week: number,
                      content: shared,
                      anonymous: false,
                    })
                      .then(() => {
                        setShared("");
                        setSharing(false);
                        notify(
                          t("생각을 나누었습니다.", "Your thought was shared."),
                        );
                      })
                      .catch(error)
                  }
                >
                  {t("우리 반과 나누기", "Share with the class")}
                </button>
              </div>
            )}
          </section>
          {day === 7 && (
            <section className="reflection-panel">
              <span className="overline">04 · LIVE</span>
              <h2>{t("다음 주에 가져갈 질문", "A question for next week")}</h2>
              <label className="field">
                {t(
                  "계속 생각해 보고 싶은 것은 무엇인가요?",
                  "What would you like to keep thinking about?",
                )}
                <textarea
                  value={draft.value.nextQuestion || ""}
                  onChange={(e) => draft.change("nextQuestion", e.target.value)}
                />
              </label>
              <button
                className="button secondary"
                disabled={!draft.value.nextQuestion?.trim()}
                onClick={() =>
                  api("personal-question", {
                    week: number,
                    content: draft.value.nextQuestion,
                  })
                    .then(() =>
                      notify(
                        t(
                          "다음 주에 이 질문을 다시 보여드릴게요.",
                          "We’ll bring this question back next week.",
                        ),
                      ),
                    )
                    .catch(error)
                }
              >
                {t("질문 이어 가기", "Carry this question forward")}
              </button>
            </section>
          )}
          {complete && (
            <div className="reward-banner">
              <p>
                {t(
                  "오늘의 배움이 작은 새싹이 되었습니다.",
                  "Today’s learning is a new sprout.",
                )}
              </p>
              <Link href="/rewards">
                {t("나의 리워드 보기", "View my rewards")} →
              </Link>
            </div>
          )}
          <div className="actions">
            <button
              className="button primary"
              disabled={
                busy || !draft.value["0"]?.trim() || !draft.value["2"]?.trim()
              }
              onClick={finish}
            >
              {complete ? <Check size={19} /> : null}
              {complete
                ? t("오늘의 학습 완료", "Completed today")
                : t("오늘의 학습 마치기", "Complete today’s learning")}
            </button>
            <Link className="button secondary" href={`/insight?week=${number}`}>
              {t("오늘의 Insight", "Today’s insight")}
              <ArrowRight size={17} />
            </Link>
          </div>
        </article>
        <aside className="lesson-aside">
          <span className="overline">YOUR WEEK</span>
          <h3>{tl(w.reference)}</h3>
          {Array.from({ length: 7 }, (_, i) => (
            <Link
              key={i}
              className={
                new Date(
                  lessonDate(w.start, i + 1) + "T00:00:00Z",
                ).getUTCDay() === 0
                  ? "sunday"
                  : undefined
              }
              href={`/week/${number}/day/${i + 1}`}
              aria-current={i + 1 === day ? "page" : undefined}
            >
              {t(
                [
                  "월요일",
                  "화요일",
                  "수요일",
                  "목요일",
                  "금요일",
                  "토요일",
                  "일요일",
                ][i],
                [
                  "Monday",
                  "Tuesday",
                  "Wednesday",
                  "Thursday",
                  "Friday",
                  "Saturday",
                  "Sunday",
                ][i],
              )}
              <span>
                {new Date(
                  lessonDate(w.start, i + 1) + "T00:00:00Z",
                ).toLocaleDateString(locale, {
                  month: "numeric",
                  day: "numeric",
                  timeZone: "UTC",
                })}
              </span>
            </Link>
          ))}
          <Link href={`/worksheet?week=${number}`}>
            {t("주간 활동지", "Weekly worksheet")}
            <ArrowUpRight size={16} />
          </Link>
        </aside>
      </div>
    </div>
  );
}

function PublishedQuestions({ week }: { week: number }) {
  const { boot, lang, t, error } = useApp();
  const [rows, setRows] = useState<
    {
      id: string;
      content: { questions?: string[]; summary?: string };
      language: string;
    }[]
  >([]);
  useEffect(() => {
    if (boot)
      api<typeof rows>(`published-ai?week=${week}`).then(setRows).catch(error);
  }, [boot, week]);
  if (!rows.length) return null;
  return (
    <section className="panel">
      <span className="overline">
        {t(
          "교사가 검토한 AI 학습 보조자료",
          "TEACHER-REVIEWED AI LEARNING AID",
        )}
      </span>
      {rows
        .filter((r) => r.language === lang)
        .map((r) => (
          <div key={r.id}>
            {r.content.summary && <p>{r.content.summary}</p>}
            {r.content.questions?.map((q, i) => (
              <p key={i}>
                {i + 1}. {q}
              </p>
            ))}
          </div>
        ))}
    </section>
  );
}
