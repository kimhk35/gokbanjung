import { getStudyDay, isStudyRestDay, studyDayTitle } from "./cfm-study-plan";
import { reading } from "./curriculum";
import { translate, type UiLang } from "./i18n";
import { recommendedQuestion } from "./recommendations";
import type { Week } from "./types";

// Home and the daily card must describe the same day that their links open.
export function dailyStudyContent(week: Week, day: number, lang: UiLang) {
  if (isStudyRestDay(week.number, day))
    return {
      title: translate(
        lang,
        "일요일 · 휴식과 이어 읽기",
        "Sunday · Rest and catch up",
      ),
      question: translate(
        lang,
        "오늘은 쉬어 가세요. 밀린 분량은 읽던 요일에서 이어 갈 수 있어요.",
        "Rest today, or choose an earlier day to pick up where you left off.",
      ),
      topic: "",
    };
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
