"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useApp } from "../provider";
import { api } from "@/lib/client";
import { PageTitle, Empty, WeekPicker } from "./learn";
import { Translated } from "../community/wall";
import { currentWeek } from "@/lib/curriculum";
import type { Localized } from "@/lib/types";
import { canManageRecords } from "@/lib/access";
import { ProgressDashboard } from "./progress-dashboard";
import { RecordsGate } from "../account";
export function JourneyPage() {
  const { t, lang, boot, weeks, error } = useApp();
  const [data, setData] = useState<{
    reflections: {
      week: number;
      day: number;
      content: Record<string, string>;
      updated_at: string;
    }[];
    progress: { week: number; day: number }[];
    bookmarks: { id: string; week: number }[];
    questions: { week: number; content: string }[];
  } | null>(null);
  useEffect(() => {
    setData(null);
    if (canManageRecords(boot?.actor))
      api<typeof data>("journey").then(setData).catch(error);
  }, [boot]);
  if (!canManageRecords(boot?.actor)) return <RecordsGate>{null}</RecordsGate>;
  return (
    <div className="page narrow">
      <PageTitle
        eyebrow={t("나만의 기록", "MY PERSONAL RECORD")}
        title={t("말씀과 함께 걸어온 길", "Your journey with the word")}
        description={t(
          "어제의 생각과 오늘의 발견이 내일의 질문으로 이어집니다.",
          "Yesterday’s thoughts and today’s discoveries become tomorrow’s questions.",
        )}
      />
      {data ? (
        <ProgressDashboard
          progress={data.progress}
          reflections={data.reflections.length}
          bookmarks={data.bookmarks.length}
        />
      ) : (
        <p role="status">
          {t("학습 진행을 불러오는 중…", "Loading learning progress…")}
        </p>
      )}
      <Link className="button secondary" href="/rewards">
        {t("나의 리워드 정원", "My rewards garden")} →
      </Link>
      <h2>{t("마음에 담은 말씀", "Bookmarked readings")}</h2>
      <div className="chips">
        {data?.bookmarks.map((b) => (
          <Link key={b.id} href={`/week/${b.week}`}>
            {weeks.find((w) => w.number === b.week)?.reference[lang]}
          </Link>
        ))}
      </div>
      <h2>{t("나의 생각 기록", "My reflections")}</h2>
      {data?.reflections.length ? (
        <div className="timeline">
          {data.reflections.map((r) => (
            <article key={`${r.week}-${r.day}`}>
              <span className="overline">
                {t(
                  `${r.week}주차 · ${r.day}일차`,
                  `WEEK ${r.week} · DAY ${r.day}`,
                )}
              </span>
              <h3>{weeks.find((w) => w.number === r.week)?.reference[lang]}</h3>
              <p>
                <Translated
                  text={
                    r.content.recommended ||
                    r.content["0"] ||
                    r.content["1"] ||
                    r.content["2"] ||
                    ""
                  }
                  week={r.week}
                />
              </p>
              <Link href={`/week/${r.week}/day/${r.day}`}>
                {t("기록 이어 쓰기", "Continue this reflection")} →
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <Empty
          title={t(
            "첫 번째 발견을 기다리고 있어요.",
            "Your first discovery begins here.",
          )}
          body={t(
            "오늘의 학습에서 생각을 적으면 이곳에 이어집니다.",
            "Thoughts you write during a lesson will appear here.",
          )}
        />
      )}
    </div>
  );
}
export function QuestionsPage() {
  const { boot, t, error, notify } = useApp();
  const [week, setWeek] = useState(currentWeek()?.number || 38);
  const [teacher, setTeacher] = useState("");
  const [visibility, setVisibility] = useState("TEACHER");
  const [text, setText] = useState("");
  const [questions, setQuestions] = useState<
    {
      id: string;
      content: string;
      response: string | null;
      visibility: string;
    }[]
  >([]);
  const load = () =>
    api<typeof questions>(`questions?week=${week}`).then(setQuestions);
  useEffect(() => {
    if (boot) load().catch(error);
  }, [boot, week]);
  return (
    <div className="page narrow">
      <PageTitle
        eyebrow={t("질문함", "QUESTION BOX")}
        title={t("궁금한 마음도 배움입니다", "Questions belong here")}
        description={t(
          "아직 이해되지 않는 것, 함께 생각해 보고 싶은 것을 남겨 주세요.",
          "Leave a question you are still exploring.",
        )}
      />
      <WeekPicker week={week} onChange={setWeek} />
      <div className="panel">
        <label className="field">
          {t("나의 질문", "My question")}
          <textarea
            rows={5}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </label>
        <div className="two-col">
          <label className="field">
            {t("담당 교사", "Teacher")}
            <select
              value={teacher}
              onChange={(e) => setTeacher(e.target.value)}
            >
              <option value="">{t("선택해 주세요", "Choose a teacher")}</option>
              {boot?.teachers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nickname}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            {t("공개 범위", "Visibility")}
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value)}
            >
              <option value="TEACHER">{t("교사에게만", "Teacher only")}</option>
              <option value="ANONYMOUS">
                {t("이름 없이 반에 공개", "Anonymous to class")}
              </option>
              <option value="CLASS">{t("반 전체", "Whole class")}</option>
            </select>
          </label>
        </div>
        <button
          disabled={!teacher || !text.trim()}
          className="button primary"
          onClick={() =>
            api("question", {
              week,
              content: text,
              teacher_id: teacher,
              visibility,
            })
              .then(() => {
                setText("");
                load();
                notify(t("질문을 남겼습니다.", "Your question was sent."));
              })
              .catch(error)
          }
        >
          {t("질문 보내기", "Send question")}
        </button>
      </div>
      {questions.map((q) => (
        <article className="panel" key={q.id}>
          <span className="badge">
            {q.visibility === "TEACHER"
              ? t("교사에게만", "Teacher only")
              : t("반에 공개", "Shared with class")}
          </span>
          <p>
            <Translated text={q.content} week={week} />
          </p>
          {q.response && (
            <blockquote>
              <strong>{t("선생님의 답변", "Teacher’s response")}</strong>
              <p>
                <Translated text={q.response} week={week} />
              </p>
            </blockquote>
          )}
        </article>
      ))}
    </div>
  );
}
export function CalendarPage() {
  const { t, lang, weeks } = useApp();
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  return (
    <div className="page">
      <PageTitle
        eyebrow="2026"
        title={t("말씀을 만나는 달력", "Your learning calendar")}
      />
      <label className="field">
        {t("월 선택", "Month")}
        <select
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
        >
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i} value={i + 1}>
              {new Date(2026, i, 1).toLocaleDateString(
                lang === "ko" ? "ko-KR" : "en-US",
                { month: "long" },
              )}
            </option>
          ))}
        </select>
      </label>
      <div className="calendar-grid">
        {Array.from({ length: new Date(2026, month, 0).getDate() }, (_, i) => {
          const date = `2026-${String(month).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`;
          const w = weeks.find((w) => w.start <= date && w.end >= date);
          const day = w
            ? Math.floor((Date.parse(date) - Date.parse(w.start)) / 86400000) +
              1
            : 0;
          return w ? (
            <Link key={i} href={`/week/${w.number}/day/${day}`}>
              <strong>{i + 1}</strong>
              <small>{w.reference[lang]}</small>
            </Link>
          ) : (
            <div key={i}>
              <strong>{i + 1}</strong>
            </div>
          );
        })}
      </div>
    </div>
  );
}
