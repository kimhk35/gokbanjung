"use client";
import { useState } from "react";
import Link from "next/link";
import { useApp } from "../provider";
import { api } from "@/lib/client";
import { quizCounts, quizPoints, type QuizKind } from "@/lib/quiz";
type Quiz = {
  id: string;
  kind: QuizKind;
  period: string;
  scope: { references: string[] };
  questions: { question: string; options: string[]; hint: string }[];
};
type Result = {
  correct: number;
  total: number;
  percent: number;
  passed: boolean;
  newReward: boolean;
  points: number;
  review: {
    question: string;
    answer: number;
    selected: number;
    options: string[];
    explanation: string;
    reference: string;
    sourceUrl: string;
  }[];
};
export function QuizPage() {
  const { lang } = useApp();
  return <QuizContent key={lang} />;
}
function QuizContent() {
  const { lang, t, boot, error } = useApp();
  const [kind, setKind] = useState<QuizKind>("daily"),
    [quiz, setQuiz] = useState<Quiz | null>(null),
    [answers, setAnswers] = useState<number[]>([]),
    [result, setResult] = useState<Result | null>(null),
    [busy, setBusy] = useState(false);
  const start = async () => {
    setBusy(true);
    setResult(null);
    setQuiz(null);
    try {
      const q = await api<Quiz>("quiz/start", { kind, language: lang });
      setQuiz(q);
      setAnswers(q.questions.map(() => -1));
    } catch (e) {
      error(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="page narrow">
      <h1>{t("경전 퀴즈", "Scripture quiz")}</h1>
      <p>
        {t(
          "한국 시간 기준 오늘·이번 주·이번 달의 학습 범위를 복습합니다. 이번 달은 현재까지 시작된 주차를 포함합니다.",
          "Review today’s, this week’s, or this month’s study in Korean time. Monthly scope includes weeks that have started so far.",
        )}
      </p>
      <div
        className="tabs"
        role="group"
        aria-label={t("퀴즈 기간", "Quiz period")}
      >
        {(["daily", "weekly", "monthly"] as const).map((k) => (
          <button
            key={k}
            aria-pressed={kind === k}
            disabled={busy}
            onClick={() => {
              setKind(k);
              setQuiz(null);
              setResult(null);
            }}
          >
            {t({ daily: "일간", weekly: "주간", monthly: "월간" }[k], k)} ·{" "}
            {quizCounts[k]}
            {t("문항", " questions")}
          </button>
        ))}
      </div>
      <p className="notice">
        {t("80% 이상 정답이면 {v} 학습 포인트와 배지를 받습니다. 일간 3/3 · 주간 8/10 · 월간 16/20. 재도전은 가능하며 같은 기간의 보상은 한 번만 지급합니다.", "Earn {v} learning points and a badge at 80%: daily 3/3, weekly 8/10, monthly 16/20. Retry freely; rewards are awarded once per period.", { v: quizPoints[kind] })}
      </p>
      {!quiz && (
        <button
          className="button primary"
          disabled={busy || !boot}
          onClick={start}
        >
          {busy
            ? t("경전 자료로 퀴즈 준비 중…", "Preparing quiz from scripture…")
            : t("퀴즈 시작", "Start quiz")}
        </button>
      )}
      {!boot?.aiAvailable && (
        <p>
          {t(
            "새 퀴즈 생성에는 관리자의 OpenAI API 설정이 필요합니다. 이미 준비된 퀴즈는 이용할 수 있습니다.",
            "New quizzes require the administrator’s OpenAI API setup. Previously prepared quizzes remain available.",
          )}
        </p>
      )}
      <small>
        {t(
          "AI 학습 보조 퀴즈입니다. 공식 경전 원문을 참고해 만들지만 오류가 있을 수 있습니다. 제출 후 해설·근거 구절을 확인하세요. 개인 묵상은 퀴즈 생성에 전송하지 않습니다.",
          "AI learning quiz: grounded in official scripture, but errors are possible. Check explanations and source verses after submitting. Private reflections are not sent for quiz generation.",
        )}
      </small>
      {quiz && !result && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              setResult(
                await api<Result>("quiz/submit", { id: quiz.id, answers }),
              );
            } catch (e) {
              error(e);
            } finally {
              setBusy(false);
            }
          }}
        >
          <p>
            {quiz.period} ·{" "}
            {t("{length}/{length2}문항 응답", "Answered {length}/{length2}", { length: answers.filter((a) => a >= 0).length, length2: quiz.questions.length })}
          </p>
          {quiz.questions.map((q, i) => (
            <section
              className="panel quiz-question"
              role="group"
              aria-labelledby={`quiz-question-${i}`}
              key={i}
            >
              <h2 className="quiz-question-title" id={`quiz-question-${i}`}>
                {i + 1}. {q.question}
              </h2>
              {q.options.map((option, j) => (
                <label className="quiz-option" key={j}>
                  <input
                    type="radio"
                    name={"q" + i}
                    value={j}
                    required
                    checked={answers[i] === j}
                    onChange={() =>
                      setAnswers((a) => a.map((v, n) => (n === i ? j : v)))
                    }
                  />
                  <span>
                    {String.fromCharCode(65 + j)}. {option}
                  </span>
                </label>
              ))}
              <details>
                <summary>{t("힌트", "Hint")}</summary>
                <p>{q.hint}</p>
              </details>
            </section>
          ))}
          <button
            className="button primary"
            disabled={busy || answers.some((a) => a < 0)}
          >
            {busy
              ? t("채점 중…", "Grading…")
              : t("정답 제출 · 채점", "Submit & grade")}
          </button>
        </form>
      )}
      {result && (
        <section>
          <div className="panel" role="status">
            <h2>
              {result.correct}/{result.total} · {result.percent}%
            </h2>
            <p>
              {result.newReward
                ? t("추가 보상 +{points}포인트!", "Bonus reward: +{points} points!", { points: result.points })
                : result.passed
                  ? t(
                      "통과했습니다. 이 기간의 보상은 이미 받았습니다.",
                      "Passed. You have already earned this period’s reward.",
                    )
                  : t(
                      "해설을 읽고 다시 도전해 보세요.",
                      "Read the explanations and try again.",
                    )}
            </p>
            <div className="actions">
              <button
                className="button secondary"
                onClick={() => {
                  setResult(null);
                  setAnswers(quiz!.questions.map(() => -1));
                }}
              >
                {t("다시 도전", "Try again")}
              </button>
              <Link className="button secondary" href="/rewards">
                {t("보상 보기", "View rewards")}
              </Link>
            </div>
          </div>
          {result.review.map((q, i) => (
            <article className="panel" key={i}>
              <h3>
                {i + 1}. {q.question}
              </h3>
              <p>
                {q.selected === q.answer
                  ? t("정답", "Correct")
                  : t("다시 살펴보기", "Review")}{" "}
                · {t("정답: ", "Answer: ")}
                {q.options[q.answer]}
              </p>
              <p>{q.explanation}</p>
              <a href={q.sourceUrl} target="_blank" rel="noreferrer">
                {q.reference} ·{" "}
                {t("공식 원문 확인 ↗", "Read official source ↗")}
              </a>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
