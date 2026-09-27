# GPT-6 Astra 개발 지시서

## 프로젝트명

**곡반정와드 복음교리반 전용 학습 사이트**

이 프로젝트는 첨부된 복음교리 학습자료를 기반으로 하는 단순 홈페이지나 자료실이 아니다.

다음 요소를 하나의 서비스 안에서 자연스럽게 연결하는 **복음교리 학습 플랫폼**을 실제 배포 가능한 수준으로 개발한다.

- 주차별 학습
- 일별 경전 학습
- 개인 묵상 및 생각 기록
- AI 기반 성찰 질문
- 포스트잇 형태의 생각 공유
- 주차별 토론방
- 활동지 작성
- PDF 활동지 다운로드
- 활동지 교사 제출
- 교사의 피드백
- 교사 전용 학습관리
- 관리자 교사 승인
- AI Daily Insight 이미지
- 주간 회고
- 교사용 수업 Presentation Mode
- 개인정보 보호
- 모바일 최적화

프로토타입이나 목업에서 끝내지 말고 **실제로 동작하는 풀스택 웹 애플리케이션**을 완성한다.

---

# 0. 가장 중요한 기본 원칙

첨부파일을 이 프로젝트의 **Primary Source / Source of Truth**로 사용한다.

먼저 첨부자료 전체를 분석한 후 사이트 구조를 설계한다.

첨부파일에 포함된:

- 주제
- 차시
- 날짜
- 학습 목표
- 경전
- 질문
- 활동
- 설명
- 참고자료

를 가능한 한 정확하게 구조화한다.

원자료에 없는 내용을 사실처럼 생성하지 않는다.

특히 예수 그리스도 후기 성도 교회의 교리, 경전, 역사, 지도자의 말씀 등을 AI가 임의로 만들어내서는 안 된다.

AI가 새롭게 만든 내용은 반드시 다음과 같이 구분한다.

> AI 학습 보조자료

AI는 학습과 성찰을 돕는 도구이며 공식 교리 자료를 대체하지 않는다.

---

# 1. 사이트의 핵심 철학

사이트 경험은 다음 네 가지 단계로 이루어진다.

### READ

말씀을 읽는다.

### THINK

말씀의 의미를 생각한다.

### SHARE

다른 사람의 생각을 듣고 자신의 생각을 나눈다.

### LIVE

오늘 삶에서 무엇을 실천할지 결정한다.

모든 UI와 학습 흐름은 이 네 단계가 자연스럽게 연결되도록 설계한다.

---

# 2. 전체 사용자 유형

서비스에는 네 가지 Role이 존재한다.

```text
GUEST
TEACHER_PENDING
TEACHER
ADMIN

```

각 Role의 권한을 명확하게 분리한다.

---

# 3. GUEST의 개념

일반 참여자는 회원가입을 강요하지 않는다.

링크 또는 QR코드를 통해 사이트에 접속하면 즉시 학습할 수 있다.

첫 방문 시 다음 정도만 선택적으로 입력한다.

```text
닉네임
담당 교사 선택
반 선택

```

이메일과 전화번호는 기본적으로 요구하지 않는다.

브라우저 Local Storage와 서버의 익명 Guest ID를 연결하여 동일 기기에서 다시 방문했을 때 자신의 기록을 이어서 볼 수 있도록 한다.

Guest UUID를 생성한다.

예:

```text
guest_8f719d2a...

```

사용자에게 UUID 자체를 보여줄 필요는 없다.

---

# 4. 교사 신청

교사가 되고 싶은 사용자는 별도의 페이지에서 신청한다.

경로 예:

```text
/teacher/apply

```

필드:

```text
이름
이메일
와드 또는 반
담당 역할
간단한 소개

```

신청 상태:

```text
pending
approved
rejected
suspended

```

신청 직후 교사 권한을 주지 않는다.

ADMIN이 승인해야 한다.

승인되면:

```text
TEACHER_PENDING → TEACHER

```

으로 변경한다.

---

# 5. 관리자

관리자는 다음 항목을 통합 관리한다.

- 교사 승인
- 교사 권한 관리
- 교육과정
- 주차
- 일별 학습
- 자료
- 토론
- 신고
- AI 생성 결과
- 활동지
- 공지
- Insight Card
- 사이트 설정
- AI 호출 사용량
- 콘텐츠 버전
- 백업

---

# 6. 사이트 전체 구조

사이트 구조는 다음과 같이 구성한다.

```text
HOME
│
├─ 오늘의 말씀
├─ 이번 주 학습
├─ 오늘의 질문
├─ 오늘의 Insight
└─ 최근 생각
     
LEARN
│
├─ 이번 주
├─ 전체 주차
│   ├─ Week 01
│   ├─ Week 02
│   ├─ Week 03
│   └─ ...
│
└─ 일별 학습
    ├─ Monday
    ├─ Tuesday
    ├─ Wednesday
    ├─ Thursday
    ├─ Friday
    ├─ Saturday
    └─ Sunday

REFLECTION
│
├─ 오늘의 생각
├─ 나의 기록
├─ 나의 경전
└─ 나의 학습 여정

COMMUNITY
│
├─ 생각벽
├─ 주간 토론
├─ 질문함
└─ 지난 토론

WORKSHEET
│
├─ 이번 주 활동지
├─ 직접 작성
├─ PDF 다운로드
├─ 제출
└─ 나의 제출 기록

MY JOURNEY
│
├─ 이번 주
├─ 지난 기록
├─ 마음에 남은 말씀
├─ 실천
└─ AI 주간 회고

TEACHER
│
├─ Dashboard
├─ 수업 관리
├─ 질문 생성
├─ 토론 관리
├─ 활동지 관리
├─ 제출물
├─ 피드백
├─ 학생 질문
├─ 수업 Presentation
└─ 자료

ADMIN
│
├─ Dashboard
├─ 교사 승인
├─ 사용자
├─ 교육과정
├─ 자료 업로드
├─ 콘텐츠 검수
├─ 토론 관리
├─ 신고
├─ AI 관리
└─ 설정

```

---

# 7. 홈 화면

홈 화면은 사이트의 가장 중요한 화면이다.

첫 화면은 행정 LMS처럼 보여서는 안 된다.

느낌은:

> 조용하고 아름다운 디지털 경전 학습 공간

이어야 한다.

Hero 영역:

```text
이번 주,
말씀 속에서 한 가지를 발견해 보세요.

복음은 읽는 것에서 끝나지 않습니다.
생각하고, 나누고,
삶에서 실천할 때 우리의 이야기가 됩니다.

[이번 주 학습 시작하기]

```

Hero 아래에는 네 개의 핵심 카드를 제공한다.

```text
오늘의 말씀
오늘의 질문
우리 반 생각
나의 학습 여정

```

---

# 8. 홈 화면 — 오늘의 학습

오늘 날짜에 따라 자동으로 콘텐츠를 표시한다.

예:

```text
9월 14일 월요일

이번 주 주제
예수 그리스도를 바라보며

오늘 읽을 말씀
Alma 32:21

오늘 생각해 볼 질문
보이지 않는 것을 믿는다는 것은
나에게 어떤 의미일까요?

[오늘의 학습 시작]

```

---

# 9. 주간 학습 화면

URL 예:

```text
/week/12

```

화면 상단:

```text
WEEK 12

예수 그리스도를 바라보며

이번 주 핵심 질문

“나는 어떤 순간에 믿음을 선택하는가?”

```

이어지는 구성:

```text
이번 주 말씀
이번 주 학습목표
핵심 개념
이번 주 질문
이번 주 실천
주간 활동지
주간 토론

```

---

# 10. 주간 진행 상황

7일 진행표를 제공한다.

예:

```text
월 ●
화 ●
수 ○
목 ○
금 ○
토 ○
일 ○

```

진도율 숫자를 지나치게 강조하지 않는다.

게임형 점수나 Rank를 사용하지 않는다.

경쟁보다는 학습의 흐름을 보여준다.

---

# 11. 일별 학습

각 날짜는 하나의 독립적인 학습 Experience를 가진다.

URL 예:

```text
/week/12/day/3

```

화면 흐름:

```text
1. 오늘의 말씀
↓
2. 말씀 읽기
↓
3. 짧은 맥락
↓
4. 생각해 볼 질문
↓
5. 나의 생각
↓
6. 오늘의 Insight
↓
7. 오늘의 실천
↓
8. 학습 완료

```

---

# 12. 오늘의 말씀

표시 예:

```text
오늘의 말씀

앨마서 32:21

믿음은 사물에 대한 완전한 지식을 갖는 것이 아닙니다.

```

긴 경전 내용을 사이트 DB에 임의 복제하지 않는다.

가능하면:

```text
Scripture Reference
Short Quote
Official Source URL

```

형식으로 저장한다.

---

# 13. 경전 검증

AI가 경전 구절을 생성할 경우 반드시 검증 과정을 둔다.

확실하지 않은 경전 문장은 생성하지 않는다.

다음 구조를 권장한다.

```json
{
  "book": "Alma",
  "chapter": 32,
  "verse_start": 21,
  "verse_end": 21,
  "reference": "Alma 32:21",
  "quote": "...",
  "verified": true
}

```

verified=false인 내용은 사용자 화면에 직접 게시하지 않는다.

---

# 14. 오늘의 생각

각 학습 페이지에는 다음 입력란을 제공한다.

```text
이 말씀에서 마음에 남은 것은 무엇인가요?

[Text Area]

이 말씀은 나의 삶과 어떻게 연결되나요?

[Text Area]

오늘 내가 실천할 수 있는 것은 무엇인가요?

[Text Area]

```

입력은 자동 저장한다.

---

# 15. 자동 저장

사용자의 생각이 사라지지 않도록 autosave를 구현한다.

입력 후 700\~1500ms debounce로 저장한다.

화면에는 작은 상태 메시지를 표시한다.

```text
저장 중...
저장되었습니다.

```

---

# 16. 공개 여부

개인 묵상은 반드시 기본값을 PRIVATE로 설정한다.

사용자가 직접:

```text
우리 반과 나누기

```

를 선택한 경우에만 COMMUNITY로 공유한다.

옵션:

```text
PRIVATE
CLASS
PUBLIC_WITHIN_COURSE

```

---

# 17. 생각벽

Padlet과 유사한 느낌의 **Thought Wall**을 만든다.

메뉴명:

**우리의 생각**

또는

**생각벽**

포스트 형태는 작은 포스트잇이다.

내용 예:

```text
오늘은 “기다림”이라는 단어가
가장 마음에 남았습니다.

```

---

# 18. 생각벽 UI

Masonry Layout 또는 자연스러운 카드 Grid를 이용한다.

카드는 지나치게 다양한 색을 사용하지 않는다.

밝은:

```text
cream
sand
sage
sky
warm gray

```

계열을 사용한다.

---

# 19. 생각벽 기능

지원 기능:

```text
생각 작성
수정
삭제
공감
댓글
신고
익명 공개
주차 필터
주제 필터
교사 고정

```

SNS처럼 경쟁적으로 보이지 않도록:

```text
좋아요 127
좋아요 342

```

같은 숫자를 크게 강조하지 않는다.

---

# 20. 교사 질문 고정

교사는 생각벽 상단에 질문을 고정할 수 있다.

예:

```text
이번 주 생각거리

“기도의 응답을 기다린다는 것은
어떤 의미일까요?”

```

---

# 21. 토론방

주차별 Discussion Room을 만든다.

예:

```text
Week 12 Discussion

신앙은 확신일까요,
아니면 선택일까요?

```

---

# 22. 토론 유형

교사가 다음 중 선택할 수 있다.

```text
OPEN
POST_BEFORE_VIEW
ANONYMOUS
TEACHER_MODERATED
READ_ONLY_AFTER_CLOSE

```

특히

```text
POST_BEFORE_VIEW

```

기능을 반드시 지원한다.

사용자가 먼저 자기 의견을 작성해야 다른 사람 의견을 볼 수 있게 한다.

집단 동조를 줄이는 교육적 기능이다.

---

# 23. 토론 기능

지원:

```text
본문
댓글
대댓글
경전 연결
공감
교사 코멘트
고정
신고
마감

```

---

# 24. 질문함

사용자가 학습 중 궁금한 내용을 자유롭게 남길 수 있다.

메뉴명:

**궁금해요**

예:

```text
이 구절에서 ‘믿음’은
일반적으로 말하는 믿음과 어떤 차이가 있나요?

```

질문의 공개 범위:

```text
교사에게만
익명 공개
반 전체 공개

```

---

# 25. 활동지

각 주차마다 Interactive Worksheet를 생성한다.

구성 예:

```text
이번 주 말씀

가장 마음에 남은 구절

그 이유

새롭게 발견한 것

아직 이해되지 않는 것

토론 전 나의 생각

토론 후 달라진 생각

내 삶과의 연결

이번 주 실천

한 문장으로 정리하기

```

---

# 26. 활동지 작성 모드

두 방식을 모두 지원한다.

### Online Mode

사이트에서 직접 작성한다.

Autosave를 지원한다.

### Printable Mode

PDF로 생성한다.

A4 규격.

한글 폰트 문제 없이 출력되어야 한다.

---

# 27. 활동지 다운로드

다음 버튼을 제공한다.

```text
온라인 작성
PDF 내려받기
인쇄

```

가능하면 DOCX 다운로드도 구현한다.

---

# 28. 활동지 제출

사용자가 활동지를 작성한 뒤:

```text
[교사에게 제출]

```

을 누른다.

Modal:

```text
제출할 교사를 선택하세요.

○ 김○○ 교사
○ 이○○ 교사
○ 박○○ 교사

```

---

# 29. 제출 상태

상태:

```text
DRAFT
SUBMITTED
VIEWED
FEEDBACK
RETURNED

```

사용자는 자신의 상태를 확인할 수 있다.

예:

```text
제출 완료

김○○ 교사에게 제출했습니다.

2026.09.14 21:32

```

---

# 30. 교사 피드백

교사는 활동지 전체를 평가하는 방식보다 간단한 응답을 제공한다.

예:

```text
선생님의 생각

이 부분을 삶의 경험과 연결한 점이 좋았습니다.

다음 주에는 이 질문도 한번 생각해 보세요.

“믿음과 기다림의 관계는 무엇일까요?”

```

점수 중심 LMS로 만들지 않는다.

---

# 31. Daily Insight

매일 학습이 끝난 뒤 AI가 사용자의 학습을 기반으로 작은 Insight를 제공한다.

구조:

```text
오늘의 말씀

오늘의 한 문장

오늘의 질문

오늘의 실천

```

---

# 32. Insight 이미지 카드

Insight는 이미지 카드로 생성할 수 있다.

지원 비율:

```text
1:1
1080×1080

4:5
1080×1350

9:16
1080×1920

```

---

# 33. Insight 카드 디자인

사진 후보:

```text
하늘
빛
길
산
나무
호수
아침
저녁
창문 빛
경전책의 추상적 이미지

```

사람 얼굴이 등장하는 사진은 기본적으로 피한다.

이미지가 경전보다 더 강하게 보이지 않도록 한다.

---

# 34. Insight 카드 문구

예:

```text
TODAY'S INSIGHT

보이지 않아도
걸어갈 수 있습니다.

Alma 32:21

오늘의 질문

나는 지금 무엇을 믿으며
한 걸음을 내딛을 수 있을까?

```

---

# 35. 이미지 카드 기능

버튼:

```text
이미지 만들기
저장
공유
다시 만들기

```

AI가 생성한 이미지라는 표시를 작은 글씨로 남긴다.

---

# 36. 주간 회고

일요일에는 일반 Daily Lesson과 별도로:

```text
이번 주 돌아보기

```

를 제공한다.

질문 예:

```text
이번 주 가장 마음에 남은 말씀은?

이번 주 생각이 가장 많이 바뀐 부분은?

내가 실천한 것은?

다음 주에도 이어가고 싶은 것은?

```

---

# 37. AI Weekly Reflection

사용자의 PRIVATE 기록을 기반으로 개인에게만 AI가 다음을 정리한다.

```text
이번 주 내가 발견한 것

반복해서 등장한 생각

마음에 남은 말씀

이번 주 변화

다음 주 이어갈 질문

이번 주 나의 한 문장

```

맨 아래에 반드시 표시:

```text
AI가 사용자의 학습 기록을 바탕으로 만든
개인용 참고 요약입니다.

```

---

# 38. 나의 복음 학습 여정

메뉴명:

**나의 여정**

Timeline 형태로 만든다.

예:

```text
Week 10
믿음

“확신보다는 선택에 가깝다는 생각이 들었다.”

↓

Week 11
기도

“응답을 기다리는 것도 기도라는 생각이 들었다.”

↓

Week 12
소망

```

사용자가 자신의 생각 변화를 볼 수 있게 한다.

---

# 39. 마음에 남은 말씀

사용자가 말씀을 Bookmark 할 수 있다.

버튼:

```text
♡ 마음에 담기

```

별도의 메뉴:

```text
나의 말씀

```

에서 모아서 보여준다.

---

# 40. 교사 Dashboard

URL:

```text
/teacher/dashboard

```

상단에는 다음 정보가 있다.

```text
이번 주 학습 참여

새로운 활동지 제출

새로운 질문

진행 중 토론

미확인 피드백

```

---

# 41. 교사 Dashboard는 감시도구가 아니다

개인의 종교적 묵상을 교사가 자유롭게 열람할 수 있게 만들지 않는다.

교사가 볼 수 있는 것은:

```text
사용자가 제출한 활동지
사용자가 공개한 생각
사용자가 작성한 토론
교사에게 보낸 질문

```

이다.

PRIVATE 묵상은 교사도 볼 수 없다.

---

# 42. 교사 학습관리

교사는:

```text
주차 선택
일별 학습 확인
질문 편집
토론 생성
활동지 편집
자료 추가

```

를 할 수 있다.

---

# 43. AI 질문 생성기

교사는 학습자료를 선택하고 AI 질문을 생성할 수 있다.

설정:

```text
학습 대상
성인
청소년
가족

질문 유형
이해
성찰
적용
경험
토론
비판적 사고
삶과 연결

```

---

# 44. AI 질문 생성 결과

예:

```text
성찰 질문

1.
이 말씀에서 지금 나에게 가장 필요한 부분은 무엇일까요?

2.
이 말씀을 실천하는 데 가장 어려운 점은 무엇일까요?

토론 질문

3.
믿음과 확신은 같은 것일까요?

4.
기도의 응답이 늦어진 경험은
우리의 믿음에 어떤 영향을 줄까요?

```

---

# 45. 교사 AI 콘텐츠 승인 Workflow

AI가 생성한 내용을 바로 게시하지 않는다.

반드시:

```text
GENERATED
↓
EDIT
↓
TEACHER_APPROVED
↓
PUBLISHED

```

과정을 거친다.

---

# 46. 교사용 Presentation Mode

복음교리 수업시간에 프로젝터로 바로 사용할 수 있는 기능을 만든다.

버튼:

```text
수업 화면

```

Full Screen Mode.

한 화면에 하나의 콘텐츠만 크게 보여준다.

화면 순서:

```text
오늘의 주제

오늘의 말씀

첫 번째 질문

생각벽 Live View

두 번째 질문

토론 결과

오늘의 한 문장

```

---

# 47. Presentation Mode 조작

교사는:

```text
←
→
SPACE
ESC

```

등의 키보드로 페이지를 넘길 수 있다.

글자는 매우 크게 표시한다.

---

# 48. Live Thought Wall

수업 중 참여자들이 스마트폰에서 글을 올리면 교사의 Presentation 화면에 실시간으로 나타나게 한다.

Supabase Realtime 등을 사용할 수 있다.

---

# 49. Moderator 기능

교사는 Live 화면에 표시하기 전에:

```text
자동 공개
교사 승인 후 공개

```

중 하나를 선택할 수 있다.

---

# 50. Question of the Week

홈 화면에 매주 하나의 큰 질문을 보여준다.

예:

```text
이번 주 질문

“나는 무엇을 알기 때문에 믿는가,
아니면 무엇을 믿기 때문에 행동하는가?”

```

---

# 51. Scripture Map

고급 기능으로 Scripture Concept Map을 제공한다.

예:

```text
믿음
 │
 ├── 소망
 │
 ├── 기도
 │
 └── 행동
        │
        └── 변화

```

각 Node를 누르면 관련:

```text
경전
주차
질문
토론

```

으로 이동한다.

React Flow 또는 유사 라이브러리를 사용할 수 있다.

---

# 52. Thought Keyword

반에서 공유된 공개 글을 분석하여 주간 Keyword를 보여준다.

예:

```text
믿음
기다림
기도
가족
용기
선택

```

개인 PRIVATE 데이터는 사용하지 않는다.

---

# 53. Weekly Class Insight

공개 공유된 생각만 기반으로 AI가 정리한다.

예:

```text
이번 주 우리 반에서는
‘기다림’과 ‘선택’이라는 표현이 자주 등장했습니다.

많은 참여자가 믿음을
‘확신’보다 ‘행동’과 연결하여 생각했습니다.

```

개별 사용자 이름은 포함하지 않는다.

---

# 54. Calendar View

월간 학습 달력을 제공한다.

예:

```text
September 2026

```

날짜 클릭:

```text
오늘의 경전
오늘의 Insight
학습 페이지

```

로 이동한다.

---

# 55. 일정 자동 배치

첨부자료에 날짜가 있다면 자동 반영한다.

날짜가 없으면 관리자 설정을 통해:

```text
Course Start Date

```

를 설정한다.

그 기준으로 Week 1, Week 2...를 자동 계산한다.

---

# 56. PWA

가능하면 Progressive Web App으로 만든다.

사용자가 휴대폰 홈 화면에 추가할 수 있게 한다.

앱 이름:

```text
곡반정와드 복음교리반

```

---

# 57. 알림

초기에는 Push Notification보다 웹 내부 알림을 우선한다.

예:

```text
오늘의 학습이 열렸습니다.

이번 주 새로운 토론 질문이 등록되었습니다.

선생님의 피드백이 도착했습니다.

```

---

# 58. 검색

전체 검색을 제공한다.

검색 대상:

```text
경전
주제
주차
질문
토론
활동지

```

검색 결과 그룹:

```text
경전 3
학습 5
토론 2

```

---

# 59. 사이트 디자인 원칙

UI 목표:

```text
따뜻함
경건함
현대적
차분함
여백
고급스러움

```

피해야 할 디자인:

```text
교회 행사 포스터 느낌
오래된 LMS
과도한 종교 상징
형광색
무거운 갈색 UI
과도한 그림자
과도한 Gradient

```

---

# 60. 디자인 키워드

참고 감성:

```text
Apple
Notion
Linear
Arc
현대적인 Editorial Website
Museum Guide
Premium Learning Platform

```

그러나 그대로 복제하지 않는다.

---

# 61. 컬러 시스템

예시:

```text
Background
#FAFAF7

Primary Navy
#20364A

Warm White
#FFFFFF

Sand
#EEE9DF

Muted Gold
#B89B67

Sage
#84998A

Text
#1F2933

Secondary Text
#68737D

```

Dark Mode도 제공한다.

---

# 62. Typography

한글 가독성을 최우선으로 한다.

본문:

```text
Pretendard
Noto Sans KR

```

등을 고려한다.

제목에는 너무 장식적인 폰트를 사용하지 않는다.

---

# 63. 사진 사용

배경 사진은:

```text
빛
자연
하늘
길
산
책
창문

```

등을 활용한다.

예수님의 모습을 AI로 임의 생성해서 메인 이미지로 사용하지 않는다.

---

# 64. 로고

공식 교회 로고를 무단으로 사용하지 않는다.

사이트 자체 Wordmark를 만든다.

예:

```text
GOKBANJEONG
GOSPEL CLASS

```

또는

```text
곡반정와드
복음교리반

```

---

# 65. 모바일 UX

이 서비스는 모바일 사용 비율이 높을 것으로 가정한다.

Mobile First.

하단 메뉴:

```text
홈
학습
생각
토론
더보기

```

---

# 66. Tablet / Desktop

Desktop에는 Left Sidebar 또는 Top Navigation을 제공한다.

1200px 이상 화면에서는 콘텐츠 최대 폭을 제한한다.

본문이 지나치게 넓어지지 않게:

```text
max-width 1080~1280px

```

정도로 제한한다.

---

# 67. 접근성

WCAG 원칙을 최대한 준수한다.

지원:

```text
Keyboard Navigation
Focus State
aria-label
High Contrast
Large Touch Target
Text Resize

```

---

# 68. 기술 Stack

Frontend:

```text
Next.js
TypeScript
React
Tailwind CSS
shadcn/ui

```

최신 안정 버전을 사용한다.

---

# 69. Backend

```text
Supabase

```

사용:

```text
PostgreSQL
Auth
Storage
Realtime
Row Level Security
Edge Functions

```

---

# 70. AI

AI 기능은 OpenAI API를 사용한다.

AI 기능:

```text
질문 생성
주간 회고
Daily Insight
공개 생각 요약
활동지 질문 생성
교사 수업 질문
자료 분석

```

---

# 71. AI 호출 최소화

매 페이지 로드마다 AI를 호출하지 않는다.

AI 생성 결과를 Cache한다.

예:

```text
daily_insights
ai_questions
weekly_summary

```

DB에 저장한다.

---

# 72. 파일 업로드

관리자는 다음 파일을 업로드할 수 있다.

```text
PDF
DOCX
PPTX
TXT

```

파일은 Supabase Storage에 저장한다.

---

# 73. 자료 분석 Pipeline

새 자료 업로드:

```text
UPLOAD
↓
TEXT EXTRACTION
↓
STRUCTURE ANALYSIS
↓
WEEK DETECTION
↓
TOPIC EXTRACTION
↓
SCRIPTURE EXTRACTION
↓
QUESTION SUGGESTION
↓
ADMIN REVIEW
↓
PUBLISH

```

---

# 74. 콘텐츠 Version 관리

교사가 콘텐츠를 수정할 경우 기존 내용을 덮어쓰지 말고 Version History를 유지할 수 있게 설계한다.

예:

```text
Lesson v1
Lesson v2
Lesson v3

```

---

# 75. 데이터베이스

다음 스키마를 기준으로 실제 SQL Migration을 만든다.

## profiles

```text
id uuid
role
display_name
email
created_at
updated_at

```

---

# 76. guest\_profiles

```text
id uuid
guest_token
nickname
selected_teacher_id
course_id
created_at
last_seen_at

```

---

# 77. teacher\_applications

```text
id
user_id
name
email
ward
class_name
message
status
reviewed_by
reviewed_at
created_at

```

---

# 78. courses

```text
id
title
description
start_date
end_date
is_active
created_by
created_at

```

---

# 79. course\_teachers

```text
course_id
teacher_id
role

```

---

# 80. weeks

```text
id
course_id
week_number
title
subtitle
description
start_date
end_date
main_question
learning_objectives
status

```

---

# 81. daily\_lessons

```text
id
week_id
day_number
date
title
scripture_summary
context
reflection_prompt
application_prompt
status

```

---

# 82. scriptures

```text
id
daily_lesson_id
book
chapter
verse_start
verse_end
reference
short_quote
source_url
verified

```

---

# 83. reflections

```text
id
guest_id
user_id
lesson_id
reflection_type
content
visibility
created_at
updated_at

```

---

# 84. lesson\_progress

```text
id
guest_id
user_id
lesson_id
status
completed_at

```

---

# 85. bookmarks

```text
id
guest_id
user_id
scripture_id
created_at

```

---

# 86. sticky\_notes

```text
id
week_id
author_guest_id
author_user_id
content
display_name
is_anonymous
status
is_pinned
created_at

```

---

# 87. sticky\_reactions

```text
id
sticky_note_id
guest_id
user_id
reaction_type
created_at

```

---

# 88. discussion\_rooms

```text
id
week_id
teacher_id
title
description
discussion_mode
is_anonymous
opens_at
closes_at
status
created_at

```

---

# 89. discussion\_posts

```text
id
room_id
guest_id
user_id
content
is_anonymous
status
created_at
updated_at

```

---

# 90. discussion\_comments

```text
id
post_id
parent_comment_id
guest_id
user_id
content
created_at

```

---

# 91. questions

```text
id
week_id
guest_id
user_id
content
visibility
status
teacher_response
created_at

```

---

# 92. worksheets

```text
id
week_id
title
description
version
published_at
created_by

```

---

# 93. worksheet\_items

```text
id
worksheet_id
order_index
type
prompt
placeholder
required

```

type:

```text
short_text
long_text
scripture
reflection
checkbox
rating

```

---

# 94. worksheet\_submissions

```text
id
worksheet_id
guest_id
user_id
teacher_id
status
submitted_at
viewed_at

```

---

# 95. worksheet\_answers

```text
id
submission_id
worksheet_item_id
answer

```

---

# 96. teacher\_feedback

```text
id
submission_id
teacher_id
content
created_at

```

---

# 97. insight\_cards

```text
id
lesson_id
guest_id
user_id
headline
scripture
question
action
image_url
ratio
created_at

```

---

# 98. weekly\_reflections

```text
id
week_id
guest_id
user_id
summary
key_theme
key_scripture
next_question
personal_sentence
created_at

```

---

# 99. notifications

```text
id
recipient_user_id
guest_id
type
title
message
read_at
created_at

```

---

# 100. resources

```text
id
course_id
week_id
title
type
file_url
source
created_by
created_at

```

---

# 101. ai\_generations

AI 감사 및 비용 관리용이다.

```text
id
feature
model
input_hash
status
tokens_input
tokens_output
cost_estimate
created_by
created_at

```

개인의 PRIVATE 묵상 원문을 불필요하게 저장하지 않는다.

---

# 102. moderation\_reports

```text
id
content_type
content_id
reporter_id
reason
status
reviewed_by
created_at

```

---

# 103. announcements

```text
id
title
content
target
starts_at
ends_at
created_by

```

---

# 104. site\_settings

```text
key
value_json
updated_at
updated_by

```

---

# 105. RLS

Supabase Row Level Security를 반드시 활성화한다.

모든 개인정보 테이블은 RLS 없이 운영하지 않는다.

---

# 106. Reflection RLS

사용자의 PRIVATE reflection은:

```text
본인만 SELECT
본인만 UPDATE
본인만 DELETE

```

가능하게 한다.

Teacher와 Admin도 PRIVATE reflection의 본문을 일반적으로 읽을 수 없게 한다.

---

# 107. Submission RLS

활동지 제출물:

```text
작성자
선택된 teacher
admin

```

만 접근할 수 있다.

---

# 108. Teacher RLS

Teacher는 자신에게 배정된 Course 범위의:

```text
submission
discussion
question
worksheet

```

중 권한이 있는 콘텐츠만 관리한다.

---

# 109. Admin

Admin은 관리 기능을 사용할 수 있지만 개인정보 접근 자체도 필요한 경우에만 사용하도록 설계한다.

---

# 110. Authentication

Teacher와 Admin은 Supabase Auth를 사용한다.

추천:

```text
Email Magic Link
또는
Email + Password

```

Guest는 Auth 없이 Guest Token 기반으로 동작한다.

---

# 111. Guest 보안

단순 guest\_token만 URL에 노출하지 않는다.

Cookie 또는 secure local storage 전략을 사용한다.

민감한 Guest 데이터 조회에는 서버에서 Token을 검증한다.

---

# 112. 개인정보

종교적 학습 기록은 상당히 개인적인 정보일 수 있다.

따라서 최소수집 원칙을 적용한다.

기본 수집:

```text
Guest ID
Nickname
선택 교사
학습 기록

```

필요하지 않은 정보:

```text
주소
전화번호
생년월일
주민번호

```

는 수집하지 않는다.

---

# 113. 데이터 삭제

사용자가:

```text
내 기록 삭제

```

기능을 이용할 수 있도록 한다.

삭제 전 Confirmation을 표시한다.

---

# 114. AI Prompt Guardrails

AI에게 다음 System Rule을 적용한다.

```text
너는 복음교리 학습을 돕는 교육적 조력자다.

공식 교회 지도자나 교리적 권위를 대표한다고 주장하지 않는다.

존재하지 않는 경전 구절을 생성하지 않는다.

확실하지 않은 인용은 인용하지 않는다.

사용자의 신앙 수준을 평가하지 않는다.

사용자에게 죄책감이나 영적 우월감을 조장하지 않는다.

다양한 경험과 질문을 존중한다.

정답을 강요하기보다 성찰을 돕는다.

```

---

# 115. 활동지 AI 생성

교사가 특정 Week를 선택하면 AI가 활동지 초안을 생성한다.

하지만 즉시 공개하지 않는다.

Workflow:

```text
AI Generate
↓
Teacher Edit
↓
Preview
↓
Publish

```

---

# 116. Empty State

빈 화면도 디자인한다.

예:

```text
아직 나눈 생각이 없습니다.

이번 주 마음에 남은 한 문장을
첫 번째로 남겨보세요.

[생각 남기기]

```

---

# 117. Loading

Skeleton Loading을 사용한다.

Loading Spinner 남발 금지.

---

# 118. Error UI

오류 발생 시 기술적인 메시지를 사용자에게 그대로 보여주지 않는다.

예:

```text
잠시 문제가 발생했습니다.

작성한 내용은 이 기기에 임시 저장되어 있습니다.

[다시 시도]

```

---

# 119. Offline 보호

입력 중 인터넷이 끊긴 경우 Local Draft를 보존한다.

연결이 복구되면 Sync한다.

---

# 120. Analytics

관리자에게 기본적인 학습 현황을 제공한다.

예:

```text
이번 주 접속
일별 학습 완료
활동지 제출
토론 참여

```

---

# 121. 분석 시 개인정보 보호

분석 화면에는 개인의 종교적 생각을 점수화하지 않는다.

예:

사용 금지:

```text
신앙 점수 85점
영성 점수 73점

```

---

# 122. 분석의 목적

Analytics는:

```text
어느 자료가 많이 활용되는지
어느 질문에 반응이 많은지
어느 활동에서 참여가 떨어지는지

```

등 수업 개선용으로 사용한다.

---

# 123. 고급 추천 기능 — Reflection Ladder

사용자의 답변 수준에 따라 AI가 후속 질문을 제안한다.

예:

사용자:

```text
기도가 중요하다고 생각한다.

```

AI:

```text
기도가 중요하다고 느낀 경험 중
기억에 남는 순간이 있나요?

```

다음:

```text
그 경험이 지금의 기도 방식에
어떤 영향을 주었나요?

```

정답을 유도하지 않는다.

---

# 124. 고급 추천 기능 — Explore More

학습 완료 후:

```text
더 생각해 보고 싶다면

```

섹션을 제공한다.

내용:

```text
관련 경전
이전 주차
관련 토론
관련 질문

```

---

# 125. 고급 추천 기능 — Personal Question

사용자가 학습 마지막에:

```text
이번 주 내가 가지고 갈 질문

```

을 하나 직접 저장할 수 있게 한다.

---

# 126. 다음 주 연결

새로운 Week가 시작되면 이전 주 Personal Question을 보여준다.

예:

```text
지난주 당신이 남긴 질문

“응답이 없다고 느낄 때
기도는 어떤 의미일까?”

이번 주 말씀을 읽으며
이 질문도 함께 생각해 보세요.

```

이 기능을 중요하게 구현한다.

---

# 127. Weekly Opening

매주 새로운 Week 시작 화면을 제공한다.

큰 이미지 + 제목:

```text
WEEK 13

기다림 속의 믿음

이번 주에는
‘응답을 기다리는 시간’에 대해
생각해 봅니다.

[이번 주 시작]

```

---

# 128. Weekly Closing

일요일 또는 마지막 학습 완료 시:

```text
이번 주를 마칩니다.

이번 주의 말씀과 생각 중
한 가지를 가지고 다음 주로 가세요.

```

---

# 129. Teacher Weekly Prep

교사 Dashboard에:

```text
이번 주 수업 준비

```

메뉴를 만든다.

한 화면에서:

```text
핵심 말씀
학습목표
AI 질문 후보
참여자 공개 생각
많이 등장한 키워드
미해결 질문
추천 토론 질문

```

을 볼 수 있다.

---

# 130. Teacher Brief

AI가 교사에게 짧은 주간 Brief를 제공한다.

예:

```text
이번 주 공개 글에서는
‘기도의 응답을 기다리는 어려움’이
반복적으로 등장했습니다.

수업에서 다음 질문을 다뤄볼 수 있습니다.

“응답을 기다리는 시간도
기도의 일부라고 볼 수 있을까요?”

```

PRIVATE 기록을 사용하지 않는다.

---

# 131. QR 접속

교사가 수업시간에:

```text
참여 QR

```

을 생성할 수 있게 한다.

QR 접속 시 해당 Week 또는 Discussion에 바로 입장한다.

---

# 132. Class Code

QR을 사용할 수 없는 환경을 위해:

```text
Class Code

```

도 제공한다.

예:

```text
GOKBAN12

```

---

# 133. 관리자 콘텐츠 업로드

Admin 화면에서:

```text
새 교재 업로드

```

를 누르면:

```text
1. 파일 업로드
2. AI 분석
3. 주차 구조 Preview
4. 수정
5. 승인
6. Publish

```

Workflow를 제공한다.

---

# 134. AI 분석 결과 Preview

예:

```text
Detected Course Structure

Week 1
예수 그리스도를 따름

Week 2
기도

Week 3
회개

...

[수정]
[승인]

```

---

# 135. 관리자 승인

AI가 생성한 주차 및 학습 내용을 자동 Publish하지 않는다.

Admin approval이 필요하다.

---

# 136. SEO

이 사이트는 검색 노출이 핵심 목적은 아니지만 기본 Metadata는 구현한다.

Private/Teacher/Admin 페이지는 검색엔진에 노출하지 않는다.

---

# 137. Performance

Core Web Vitals를 고려한다.

이미지는 Next Image Optimization 등을 사용한다.

Initial JS bundle을 지나치게 키우지 않는다.

---

# 138. API Security

OpenAI API Key를 Client에 노출하지 않는다.

Server Route 또는 Server Action을 사용한다.

Supabase Service Role Key도 Client에 노출하지 않는다.

---

# 139. Rate Limit

AI 기능에 Rate Limit을 구현한다.

특히 Guest 사용자가 AI를 무제한 호출할 수 없게 한다.

---

# 140. 로깅

오류 로깅을 구현한다.

단, 개인의 PRIVATE reflection 본문을 Error Log에 기록하지 않는다.

---

# 141. 첫 번째 구현 Priority

우선순위를 다음처럼 둔다.

```text
P0

Guest Access
Week
Daily Lesson
Reflection
Autosave
Worksheet
Submission
Teacher Login
Teacher Approval
Teacher Dashboard
Discussion
Thought Wall

P1

AI Question
Daily Insight
Image Card
Weekly Reflection
Presentation Mode

P2

Scripture Map
Keyword Analysis
PWA
Realtime Classroom
Advanced Analytics

```

---

# 142. 개발 Phase

다음 순서로 실제 구현한다.

```text
Phase 1
첨부자료 분석

Phase 2
Information Architecture

Phase 3
Database Schema

Phase 4
Supabase Migration + RLS

Phase 5
Design System

Phase 6
Public Home

Phase 7
Week / Daily Lesson

Phase 8
Reflection + Autosave

Phase 9
Thought Wall

Phase 10
Discussion

Phase 11
Worksheet

Phase 12
Submission

Phase 13
Teacher Authentication

Phase 14
Teacher Dashboard

Phase 15
Admin Teacher Approval

Phase 16
AI Question Generator

Phase 17
Daily Insight

Phase 18
Insight Image

Phase 19
Weekly Reflection

Phase 20
Presentation Mode

Phase 21
Mobile Optimization

Phase 22
Security Test

Phase 23
Integration Test

Phase 24
Deployment

```

---

# 143. 중요한 개발 지시

각 Phase에서 단순히 설명만 하고 멈추지 않는다.

실제 코드를 작성하고 프로젝트에 반영한다.

예:

금지:

```text
“다음 단계에서 Supabase를 연결하면 됩니다.”

```

원하는 방식:

```text
Supabase client 생성
Migration 작성
RLS 설정
API 연결
UI 연결
실제 동작 테스트

```

---

# 144. Placeholder 금지

다음과 같은 가짜 기능을 남기지 않는다.

```text
Coming Soon
TODO
Mock Button
Fake Submit

```

P0 기능의 버튼은 실제 작동해야 한다.

---

# 145. Demo Data

첨부자료를 기반으로 실제 Seed Data를 넣는다.

첨부자료에서 명확하지 않은 경우:

```text
[관리자 검토 필요]

```

라고 표시한다.

AI가 임의의 교리 내용을 채워 넣지 않는다.

---

# 146. 테스트 Role

최소 네 개의 테스트 Persona를 사용한다.

```text
Guest A

Teacher Pending

Teacher Approved

Admin

```

---

# 147. Guest 테스트

다음을 실제 확인한다.

```text
링크 접속
Week 진입
Day 학습
Reflection 작성
자동 저장
새로고침
기록 유지
Post-it 작성
Discussion 참여
Worksheet 작성
Teacher 선택
제출

```

---

# 148. Teacher 테스트

```text
로그인
Submission 확인
Feedback 작성
Discussion 생성
Question 생성
Worksheet 수정
Presentation 실행

```

---

# 149. Admin 테스트

```text
교사 신청 확인
승인
거절
Course 관리
파일 업로드
AI 분석
Publish

```

---

# 150. Security 테스트

반드시 다음을 테스트한다.

```text
Guest A가 Guest B PRIVATE reflection을 읽을 수 있는가?

Teacher A가 Teacher B의 submission을 읽을 수 있는가?

Guest가 Teacher API를 호출할 수 있는가?

일반 사용자가 Admin 페이지에 접근할 수 있는가?

```

모두 차단되어야 한다.

---

# 151. Responsive Test

최소 다음 화면폭에서 확인한다.

```text
375px
430px
768px
1024px
1440px

```

---

# 152. Browser Test

```text
Chrome
Safari
Edge
Mobile Safari
Android Chrome

```

기본 동작을 확인한다.

---

# 153. 최종 관리자 초기화

README에 첫 Admin 계정 생성 방법을 명확히 적는다.

Admin 이메일을 환경변수로 하드코딩하지 않는 안전한 방법을 사용한다.

---

# 154. 환경변수

`.env.example`을 만든다.

예:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
NEXT_PUBLIC_SITE_URL=

```

실제 Secret은 Repository에 저장하지 않는다.

---

# 155. README

README에는 최소한 다음 내용을 포함한다.

```text
프로젝트 소개
기술스택
설치
환경변수
Supabase 설정
Migration
Admin 생성
Local 실행
Build
Deploy
OpenAI 설정
RLS 설명
폴더 구조

```

---

# 156. Vercel 배포

최종 프로젝트를 Vercel에 배포한다.

Build Error가 없는지 확인한다.

---

# 157. 배포 후 Smoke Test

실제 배포 URL에서 다시 테스트한다.

```text
Home
Week
Lesson
Reflection
Worksheet
Submission
Teacher Login
Admin

```

---

# 158. 코드 품질

TypeScript에서:

```text
any

```

사용을 최소화한다.

공통 Type을 명시적으로 정의한다.

---

# 159. Component 구조

적절한 Component 분리를 한다.

예:

```text
components/
  lesson/
  reflection/
  discussion/
  worksheet/
  teacher/
  admin/
  insight/

```

하나의 page.tsx에 전체 코드를 몰아넣지 않는다.

---

# 160. 최종 목표

이 프로젝트의 최종 느낌은:

> “복음교리 자료를 올려놓은 홈페이지”

가 아니다.

다음 경험이 되어야 한다.

> 평일에는 개인적으로 말씀을 읽고 생각한다.

> 떠오른 생각을 기록한다.

> 원하면 다른 사람들과 나눈다.

> 주중에는 토론 질문을 생각한다.

> 수업시간에는 서로의 생각을 함께 본다.

> 활동지를 작성하고 교사에게 제출한다.

> 한 주가 끝나면 내가 무엇을 배웠는지 돌아본다.

> 다음 주에는 지난주에 남긴 질문에서 다시 시작한다.

즉,

**일주일 전체가 하나의 학습 Journey가 되는 플랫폼**

을 만든다.

---

# 161. 디자인 최종 기준

첫 화면을 보는 사용자가 다음과 같이 느껴야 한다.

```text
차분하다.

따뜻하다.

사용하기 쉽다.

경전을 읽고 싶다.

생각을 적고 싶다.

다른 사람의 생각도 궁금하다.

```

---

# 162. 구현 완료 보고

마지막에 기능별로 다음 표를 작성한다.

```text
기능                   상태
--------------------------------
Guest Access            완료
Week Learning           완료
Daily Learning          완료
Reflection              완료
Thought Wall            완료
Discussion              완료
Worksheet               완료
Submission              완료
Teacher Login           완료
Teacher Approval        완료
Teacher Dashboard       완료
AI Question             완료
Daily Insight           완료
Insight Image           완료
Weekly Reflection       완료
Presentation Mode       완료
PWA                     부분완료
Scripture Map           미구현

```

상태를 숨기지 않는다.

구분:

```text
완료
부분완료
미구현

```

---

# 163. 최종 결과물

최종적으로 다음을 제공한다.

```text
1. 실제 프로젝트 코드
2. 전체 폴더 구조
3. Supabase SQL Migration
4. RLS Policy
5. Seed Data
6. TypeScript Type
7. AI Prompt
8. API Route
9. Teacher Dashboard
10. Admin Dashboard
11. README
12. .env.example
13. 테스트 결과
14. 배포 URL

```

---

# 164. 작업 방식에 관한 최종 명령

중간에 사소한 디자인 선택이나 일반적인 개발 판단을 이유로 작업을 멈추고 사용자에게 계속 확인을 요청하지 않는다.

요구사항에서 합리적으로 판단할 수 있는 것은 스스로 결정하고 계속 구현한다.

다만 다음처럼 실제 사용자만 결정할 수 있는 정보는 Placeholder/Settings로 분리한다.

```text
실제 관리자 이메일
실제 교사 계정
최종 Course 시작일
최종 첨부자료 공개범위

```

---

# 165. 최초 응답에서 해야 할 일

이 프롬프트를 받은 즉시 코드를 무작정 작성하지 말고 첨부자료를 먼저 분석한 뒤 다음을 짧게 보고한다.

```text
1. 첨부자료 분석 결과
2. 예상 Course 주차 구조
3. 화면 구조
4. DB 구조
5. 구현 우선순위

```

그 직후 별도의 승인 요청 없이 개발을 시작한다.

---

# 166. 특히 중요하게 구현할 사용자 Journey

최종적으로 아래 과정이 실제로 끊김 없이 동작하는지 검증한다.

```text
QR 또는 링크 접속

↓

오늘의 학습 확인

↓

경전 읽기

↓

질문 생각하기

↓

내 생각 작성

↓

자동 저장

↓

원하면 생각벽에 공유

↓

주간 토론 참여

↓

주간 활동지 작성

↓

담당 교사 선택

↓

활동지 제출

↓

교사 확인

↓

교사 피드백

↓

주간 회고

↓

Insight 이미지 저장

↓

다음 주 학습

```

이 흐름이 이 프로젝트의 핵심 Acceptance Test이다.

---

# 167. 프로젝트의 성공 기준

이 사이트는 기능이 많다고 성공한 것이 아니다.

다음 질문에 모두 YES가 나와야 성공이다.

```text
70대 사용자도 스마트폰으로 쉽게 사용할 수 있는가?

로그인하지 않은 참여자가 10초 안에 오늘 학습을 시작할 수 있는가?

자신의 생각이 기본적으로 다른 사람에게 공개되지 않는가?

교사가 수업 준비 시간을 줄일 수 있는가?

수업 전 학습과 실제 일요일 수업이 연결되는가?

수업 후에도 학습이 이어지는가?

교사가 AI 결과를 검토할 수 있는가?

AI가 교리적 권위를 주장하지 않는가?

첨부자료가 사이트의 실제 교육과정으로 구조화되는가?

모바일에서 충분히 아름답고 편리한가?

```

---

# 최종 지시

지금부터 첨부파일을 분석하고 이 요구사항을 기준으로 \*\*「곡반정와드 복음교리반 전용 학습 사이트」\*\*를 실제 서비스 수준으로 구현하라.

단순한 Demo나 UI Mockup을 만들지 말고,

**Database → Auth → RLS → Frontend → AI → File → Submission → Teacher → Admin → Testing → Deployment**

까지 연결된 완전한 서비스를 목표로 한다.

필요한 구조적 판단은 스스로 수행하되, 사용자의 원래 요구사항을 임의로 축소하지 않는다.