// "오늘의 Insight": a daily card built from the curriculum (no AI, no cost).
// Teachers can replace any day's text or picture (daily-insight-service.ts).
import { curriculum, dayIndex, reading } from "./curriculum";
import { recommendedQuestion } from "./recommendations";
import { cardBackgrounds } from "./card-backgrounds";
import { localeOf, translate, type UiLang } from "./i18n";

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
} & Record<UiLang, InsightText>;

export function autoInsight(date: string): AutoInsight | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const week = curriculum.find((w) => w.start <= date && w.end >= date);
  if (!week) return null;
  const day = dayIndex(week, date);
  const text = (lang: UiLang): InsightText => {
    const rec = recommendedQuestion(week, day, lang);
    const weekday = new Date(`${date}T00:00:00Z`).toLocaleDateString(
      localeOf(lang),
      { weekday: "short", timeZone: "UTC" },
    );
    const title = translate(lang, week.title.ko, week.title.en);
    return {
      kicker: translate(lang, "{day}일차 ({weekday})", "Day {day} ({weekday})", undefined, { day, weekday }),
      title: rec.theme,
      question: rec.question,
      topic: reading(week, day, lang),
      message: `“${title.replace(/^[“"]+|[”"]+$/g, "")}” · ${translate(lang, week.reference.ko, week.reference.en)}`,
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
    es: text("es"),
    fil: text("fil"),
  };
}
