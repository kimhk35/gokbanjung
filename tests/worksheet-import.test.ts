import test from "node:test";
import assert from "node:assert/strict";
import { extractQuestions } from "../src/lib/worksheet-import";

const sheet = `곡반정와드 복음교리반 학습지 (40주차)
이름: ________   날짜: ____

1. 이사야 40:31을 읽어 보세요. "새 힘을 얻는다"는 말은
   나에게 어떤 의미인가요?
답: ____________________________

2) 주님이 목자처럼 양을 품에 안으시는 모습에서 무엇을 느끼나요?
(                                    )

③ 이번 주에 위로가 필요한 사람은 누구인가요? 어떻게 도울 수 있을까요?

문4. 오늘 배운 것을 한 문장으로 적어 보세요.
Q5 What does "comfort ye my people" teach you?

- 참고: 교재 13쪽
이번 주에도 말씀과 함께하세요!`;

test("finds numbered questions, joins wrapped lines, skips blanks and notes", () => {
  assert.deepEqual(extractQuestions(sheet), [
    '이사야 40:31을 읽어 보세요. "새 힘을 얻는다"는 말은 나에게 어떤 의미인가요?',
    "주님이 목자처럼 양을 품에 안으시는 모습에서 무엇을 느끼나요?",
    "이번 주에 위로가 필요한 사람은 누구인가요? 어떻게 도울 수 있을까요?",
    "오늘 배운 것을 한 문장으로 적어 보세요.",
    'What does "comfort ye my people" teach you?',
  ]);
});

test("unnumbered question lines are used when there is no numbering", () => {
  const plain =
    "오늘의 말씀\n\n이 구절에서 가장 마음에 남는 단어는 무엇인가요?\n배경 설명입니다.\n가족과 나눌 수 있는 이야기는 무엇일까요?";
  assert.deepEqual(extractQuestions(plain), [
    "이 구절에서 가장 마음에 남는 단어는 무엇인가요?",
    "가족과 나눌 수 있는 이야기는 무엇일까요?",
  ]);
});

test("caps at 20 questions and removes duplicates", () => {
  const many = Array.from(
    { length: 30 },
    (_, i) => `${i + 1}. 질문 ${i % 25}은 무엇인가요?`,
  ).join("\n");
  const out = extractQuestions(many);
  assert.equal(out.length, 20);
  assert.equal(new Set(out).size, 20);
  assert.deepEqual(extractQuestions(""), []);
});
