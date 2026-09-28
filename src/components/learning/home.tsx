"use client";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  MessageCircle,
  Feather,
  Compass,
  ArrowUpRight,
} from "lucide-react";
import { useApp } from "../provider";
import { dayIndex, reading } from "@/lib/curriculum";
import { recommendedQuestion } from "@/lib/recommendations";
import { Recommendation } from "./recommendation";
import { ContinueLearning } from "./continue-learning";
import { RecommendedDiscussion } from "./recommended-discussion";
import { useStudyDate } from "../use-study-date";
import { Announcements } from "./announcements";
import { HomeCommunity } from "./home-community";
import { DailyInsightHome } from "./daily-insight";
export function HomePage() {
  const { tl, locale, t, uiLang, weeks } = useApp();
  const date = useStudyDate();
  if (!date)
    return (
      <div className="page" aria-busy="true">
        {t("오늘의 학습을 불러오는 중…", "Loading today’s learning…")}
      </div>
    );
  const w =
    weeks.find((w) => w.start <= date && w.end >= date) ||
    (date < weeks[0].start ? weeks[0] : weeks.at(-1)!);
  const day = dayIndex(w, date);
  return (
    <div className="page home">
      <div className="eyebrow">
        <span>{t("와서 나를 따르라", "COME, FOLLOW ME")}</span>
        <span>2026 · {t("구약전서", "OLD TESTAMENT")}</span>
      </div>
      <DailyInsightHome />
      <section className="hero">
        <div className="hero-copy">
          <span className="overline">
            {t(
              "예수 그리스도를 중심에 두는 한 주",
              "A WEEK CENTERED ON JESUS CHRIST",
            )}
          </span>
          <h1>
            {t("말씀을 펼치는 순간,", "Open the scriptures.")}
            <br />
            <em>{t("구주께 한 걸음 더.", "Draw closer to Christ.")}</em>
          </h1>
          <p>
            {t(
              "경전의 말씀을 읽고 깊이 생각하며,",
              "Read the scriptures, ponder deeply,",
            )}
            <br className="desktop-only" />
            {t(
              "가정과 삶에서 복음을 실천해 보세요.",
              "and live the gospel at home and in daily life.",
            )}
          </p>
          <Link
            className="button primary"
            href={`/week/${w.number}/day/${day}`}
          >
            {t("오늘의 학습 시작하기", "Begin today’s learning")}
            <ArrowRight size={19} />
          </Link>
          <span className="quiet-note">
            {t(
              "와서 나를 따르라 · 나의 속도로 말씀과 함께 시작하세요.",
              "Come, Follow Me · Begin with the word at your own pace.",
            )}
          </span>
        </div>
      </section>
      <section className="weekly-feature">
        <div className="feature-top">
          <span>
            {t("와서 나를 따르라 · 이번 주 말씀", "COME, FOLLOW ME · READING")}
          </span>
          <span>WEEK {String(w.number).padStart(2, "0")}</span>
        </div>
        <div className="feature-center">
          <BookOpen size={34} strokeWidth={1} />
          <p className="date">
            {w.start.slice(5).replace("-", ".")} —{" "}
            {w.end.slice(5).replace("-", ".")}
          </p>
          <h2>{tl(w.title)}</h2>
          <p>{tl(w.reference)}</p>
        </div>
        <Link href={`/week/${w.number}`}>
          {t("이번 주 학습 살펴보기", "Explore this week")}
          <ArrowUpRight size={22} />
        </Link>
        <span className="feature-line" />
      </section>
      <ContinueLearning />
      <Announcements />
      <RecommendedDiscussion week={w} />
      <Recommendation week={w} day={day} />
      <section
        className="rhythm"
        aria-label={t("학습의 흐름", "Learning rhythm")}
      >
        {[
          ["01", "READ", "말씀을 읽고", "Read the word"],
          ["02", "THINK", "나의 생각을 적고", "Write a reflection"],
          ["03", "SHARE", "서로의 이야기를 듣고", "Listen and share"],
          ["04", "LIVE", "오늘의 삶에 담습니다", "Put it into practice"],
        ].map(([n, en, ko, desc]) => (
          <div key={n}>
            <span>{n}</span>
            <strong>
              {t(
                (
                  {
                    READ: "읽기",
                    THINK: "생각",
                    SHARE: "나눔",
                    LIVE: "실천",
                  } as Record<string, string>
                )[en],
                en,
              )}
            </strong>
            <p>{t(ko, desc)}</p>
          </div>
        ))}
      </section>
      <section>
        <div className="section-heading">
          <div>
            <span className="overline">
              {t("오늘, 한 걸음", "ONE STEP TODAY")}
            </span>
            <h2>{t("오늘의 작은 발견", "A small discovery for today")}</h2>
          </div>
          <span className="muted">
            {new Date(date + "T12:00:00").toLocaleDateString(locale, {
              month: "long",
              day: "numeric",
              weekday: "long",
            })}
          </span>
        </div>
        <div className="feature-grid">
          {[
            {
              icon: BookOpen,
              label: t("오늘의 말씀", "Today’s reading"),
              body: reading(w, day, uiLang),
              href: `/week/${w.number}/day/${day}`,
              n: "01",
            },
            {
              icon: Feather,
              label: t("오늘의 질문", "Today’s question"),
              body: recommendedQuestion(w, day, uiLang).question,
              href: `/week/${w.number}/day/${day}`,
              n: "02",
            },
            {
              icon: MessageCircle,
              label: t("우리 반 생각", "Our shared thoughts"),
              body: t(
                "같은 말씀, 서로 다른 발견. 함께 나누어 보세요.",
                "One reading, different discoveries. Share yours.",
              ),
              href: "/community",
              n: "03",
            },
            {
              icon: Compass,
              label: t("나의 학습 여정", "My learning journey"),
              body: t(
                "지난 생각에서 다음 질문으로, 나의 이야기를 이어갑니다.",
                "Carry your reflections forward into new questions.",
              ),
              href: "/journey",
              n: "04",
            },
          ].map((c) => (
            <Link href={c.href} className="feature-card" key={c.n}>
              <div>
                <c.icon size={24} strokeWidth={1.5} />
                <span>{c.n}</span>
              </div>
              <h3>{c.label}</h3>
              <p>{c.body}</p>
              <ArrowRight size={18} />
            </Link>
          ))}
        </div>
      </section>
      <HomeCommunity />
      <section className="week-question">
        <span className="overline">
          {t("이번 주 질문", "QUESTION OF THE WEEK")}
        </span>
        <h2>
          {t(
            "말씀에서 발견한 한 가지를,\n이번 주 어떻게 살아 볼 수 있을까요?",
            "What is one discovery from your reading\nthat you could live out this week?",
          )}
        </h2>
        <Link href={`/worksheet?week=${w.number}`}>
          {t(
            "활동지에 나의 생각 남기기",
            "Capture your thoughts in the worksheet",
          )}{" "}
          <ArrowRight size={18} />
        </Link>
      </section>
    </div>
  );
}
