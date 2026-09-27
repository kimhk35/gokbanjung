import type { LessonConfig, LessonItem } from "./lesson-config";
import type { Lang, Week } from "./types";

export function defaultLessonItems(week: Week, lang: Lang): LessonItem[] {
  const t = (ko: string, en: string) => (lang === "ko" ? ko : en);
  const slides: Pick<LessonItem, "kind" | "title" | "text">[] = [
    {
      kind: "start",
      title: t("오늘의 주제", "TODAY’S TOPIC"),
      text: week.title[lang],
    },
    {
      kind: "reading",
      title: t("함께 읽을 말씀", "OUR READING"),
      text: week.reference[lang],
    },
    {
      kind: "question",
      title: t("첫 번째 질문", "FIRST QUESTION"),
      text: t(
        "이 말씀에서 마음에 남은 것은 무엇인가요?",
        "What stayed with you in this reading?",
      ),
    },
    { kind: "wall", title: t("우리의 생각", "OUR THOUGHTS"), text: "" },
    {
      kind: "question",
      title: t("두 번째 질문", "SECOND QUESTION"),
      text: t(
        "서로의 생각을 듣고, 새롭게 발견한 것은 무엇인가요?",
        "What did you discover by listening to one another?",
      ),
    },
    {
      kind: "activity",
      title: t("오늘의 한 걸음", "ONE STEP TODAY"),
      text: t(
        "이번 주, 어떤 작은 실천을 이어 가고 싶나요?",
        "What small practice would you like to carry into this week?",
      ),
    },
  ];
  return slides.map((slide, i) => ({
    ...slide,
    id: `default-${week.number}-${i}`,
    enabled: true,
  }));
}

export function resizeLesson(
  config: LessonConfig,
  count: number,
  defaults: LessonItem[],
  createId: () => string,
  lang: Lang,
): LessonConfig {
  if (!Number.isInteger(count) || count < 1 || count > 40)
    throw new Error("invalid_input");
  const items = (config.items.length ? config.items : defaults).map((item) => ({
    ...item,
  }));
  // Preserve existing visible slides; restore hidden ones before adding any.
  const visible = items
    .filter((item) => item.enabled)
    .slice(0, count)
    .map((item) => item.id);
  for (const item of items) {
    if (visible.length >= count) break;
    if (!visible.includes(item.id)) visible.push(item.id);
  }
  while (items.length < count) {
    const item: LessonItem = {
      id: createId(),
      kind: "explanation",
      title:
        lang === "ko"
          ? `수업 ${items.length + 1}`
          : `Slide ${items.length + 1}`,
      text: "",
      enabled: true,
    };
    items.push(item);
    visible.push(item.id);
  }
  const selected = new Set(visible);
  return {
    ...config,
    items: items.map((item) => ({ ...item, enabled: selected.has(item.id) })),
    activeId:
      config.activeId && selected.has(config.activeId) ? config.activeId : null,
  };
}
