// "오늘의 Insight": a daily card built from the curriculum (no AI, no cost).
// Teachers can replace any day's text or picture (daily-insight-service.ts).
import { curriculum, dayIndex, reading } from "./curriculum";
import { recommendedQuestion } from "./recommendations";
import { cardBackgrounds } from "./card-backgrounds";
import type { Lang } from "./types";

export type InsightText = {
  kicker: string;
  title: string;
  question: string;
  topic: string;
  message: string;
};
export type AutoInsight = {
  date: string;
  week: number;
  day: number;
  background: string;
  ko: InsightText;
  en: InsightText;
};
const WEEKDAYS = {
  ko: ["일", "월", "화", "수", "목", "금", "토"],
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
};

export function autoInsight(date: string): AutoInsight | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const week = curriculum.find((w) => w.start <= date && w.end >= date);
  if (!week) return null;
  const day = dayIndex(week, date);
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  const text = (lang: Lang): InsightText => {
    const rec = recommendedQuestion(week, day, lang);
    return {
      kicker:
        lang === "ko"
          ? `${day}일차 (${WEEKDAYS.ko[weekday]})`
          : `Day ${day} (${WEEKDAYS.en[weekday]})`,
      title: rec.theme,
      question: rec.question,
      topic: reading(week, day, lang),
      message: `“${week.title[lang].replace(/^[“"]+|[”"]+$/g, "")}” · ${week.reference[lang]}`,
    };
  };
  // Rotate the 20 illustrations so consecutive days look different.
  const serial = Math.round(Date.parse(`${date}T00:00:00Z`) / 86400000);
  return {
    date,
    week: week.number,
    day,
    background: cardBackgrounds[serial % cardBackgrounds.length].id,
    ko: text("ko"),
    en: text("en"),
  };
}
