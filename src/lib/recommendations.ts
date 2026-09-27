import { questionTopics } from "../data/question-topics";
import type { Lang, Week } from "./types";

export function recommendedQuestion(week: Week, day: number, lang: Lang) {
  if (!Number.isInteger(day) || day < 1 || day > 7) throw new RangeError("Invalid study day");
  const topic = questionTopics[week.number - 1];
  if (!topic) throw new RangeError("Invalid study week");
  const theme = topic[lang === "ko" ? 0 : 1];
  const anchor = topic[lang === "ko" ? 2 : 3];
  const questions = lang === "ko" ? [
    anchor,
    `‘${theme}’에 관한 생각을 뒷받침하는 대목 하나를 찾아보세요. 그 앞뒤 문맥을 읽으면 무엇을 더 알게 되나요?`,
    `‘${theme}’를 공부하며 이전에 생각했던 것과 다르게 발견한 점은 무엇인가요? 아직 남은 질문도 적어 보세요.`,
    `‘${theme}’와 연결되는 나의 경험은 무엇인가요? 경전 속 상황과 닮은 점과 다른 점을 함께 살펴보세요.`,
    `‘${theme}’를 나와 다른 경험을 가진 사람은 어떻게 읽을까요? 판단하기 전에 듣고 싶은 이야기는 무엇인가요?`,
    `‘${theme}’에서 배운 것을 담아 오늘 할 수 있는 작은 행동은 무엇인가요? 누구에게 어떤 도움이 될까요?`,
    `이번 주 ‘${theme}’를 돌아보며 가장 달라진 생각은 무엇인가요? 그 계기가 된 대목과 다음 주에 이어갈 질문을 남겨 보세요.`,
  ] : [
    anchor,
    `Find a passage supporting your thoughts about “${theme}.” What more do you notice when you read the surrounding context?`,
    `While exploring “${theme},” what differed from your earlier understanding? What question remains?`,
    `What experience in your life connects with “${theme}”? Consider both similarities and differences from the scriptural setting.`,
    `How might someone with different experiences read “${theme}”? What would you want to hear before making a judgment?`,
    `What small action could you take today from your study of “${theme}”? Whom might it help, and how?`,
    `Looking back on “${theme},” what changed in your thinking? Note the passage that prompted it and a question to carry into next week.`,
  ];
  // The first study idea appears on each lesson's opening printed page.
  return { id: `manual-v1-w${week.number}-d${day}`, theme, question: questions[day - 1], sourcePage: week.sourcePage };
}
