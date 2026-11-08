import { getStudyDay, studyDayTitle } from "./cfm-study-plan";
import { reading } from "./curriculum";
import { translate, type UiLang } from "./i18n";
import { recommendedQuestion } from "./recommendations";
import type { Week } from "./types";

// Home and the daily card must describe the same day that their links open.
export function dailyStudyContent(week: Week, day: number, lang: UiLang) {
  const allocated = getStudyDay(week.number, day);
  if (!allocated) {
    const recommended = recommendedQuestion(week, day, lang);
    return {
      title: recommended.theme,
      question: recommended.question,
      topic: reading(week, day, lang),
    };
  }
  const title = translate(
    lang,
    studyDayTitle(allocated, week.number),
    studyDayTitle(allocated, week.number, true),
  );
  // Audited question/labels are Korean; use the reader's existing English
  // title fallback until translations are supplied, not another day's prompt.
  const references = allocated.adultTasks
    .filter((task) => task.kind === "scripture")
    .map((task) => task.label);
  const count = translate(lang, "자료 {n}개", "{n} materials", undefined, {
    n: allocated.adultTasks.length,
  });
  return {
    title,
    question: translate(
      lang,
      allocated.question,
      studyDayTitle(allocated, week.number, true),
    ),
    topic: `${lang === "ko" && references.length ? references.join("; ") : title} · ${count}`,
  };
}
