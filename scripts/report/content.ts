// Co-developer report: what was merged, how it is built, how to run and extend it.
// Rendered to DOCX / HWPX / HTML (and PDF via Word) by scripts/report/build.mts.
export type Block =
  | { h1: string }
  | { h2: string }
  | { p: string }
  | { ul: string[] }
  | { ol: string[] }
  | { table: { head: string[]; rows: string[][]; widths?: number[] } }
  | { code: string }
  | { note: string };

export const REPORT = {
  title: "곡반정와드 통합 사이트 공동개발자 보고서",
  subtitle: "gospel-class와 comefollowme를 하나로 합친 gokbanjung의 구조·운영·확장 안내",
  site: "https://gokbanjeong-gospel-class.vercel.app",
  repo: "GitHub 비공개 저장소 gokbanjung (브랜치 main = 운영, phase2 = 2단계 작업)",
};

export const BLOCKS: Block[] = [
  { h1: "1. 한눈에 보기" },
  {
    p: "곡반정와드 복음교리반이 쓰던 두 사이트의 장점을 합쳐 새 사이트 gokbanjung 하나로 만들었습니다. 뼈대는 gospel-class(Next.js + Supabase)이고, comefollowme의 와드 일정·함께 생각하기 등 공동체 기능을 그 뼈대의 방식으로 다시 구현했습니다. 기존 두 사이트의 코드와 데이터는 건드리지 않았습니다.",
  },
  {
    table: {
      head: ["항목", "결과"],
      widths: [2800, 6838],
      rows: [
        ["운영 주소", "https://gokbanjeong-gospel-class.vercel.app (기존 주소를 새 사이트로 교체)"],
        ["소스 규모", "앱 코드 약 25,900줄(파일 169개) · 테스트 약 2,700줄(33개) · 도구 스크립트 약 2,000줄 · DB 마이그레이션 약 900줄"],
        ["화면·API", "화면 31개, API 입구 6개 (대부분 /api/[...path] 한 곳으로 모임)"],
        ["DB", "기존 Supabase 프로젝트 공유, ggc 스키마에 새 표 14개만 추가 (기존 표 변경 없음)"],
        ["언어", "한국어·영어·스페인어·필리핀어 4개 (화면 문구 1,287개 전부 번역)"],
        ["앱", "안드로이드 APK(kr.gokbanjung.app) + 아이폰은 '홈 화면에 추가'"],
        ["문서", "사용설명서 5종(PDF·HWPX·DOCX·HTML·전자책), 사이트 안 설명서(/guide), 이 보고서"],
        ["테스트", "자동 테스트 74개 중 73개 통과 (1개는 원래 있던 일요일 전용 실패, 7장 참고)"],
      ],
    },
  },

  { h1: "2. 두 사이트를 어떻게 합쳤나" },
  {
    table: {
      head: ["항목", "① gospel-class", "② comefollowme", "통합 결과"],
      widths: [1700, 2600, 2600, 2738],
      rows: [
        ["기술", "Next.js 16, React 19, TypeScript", "정적 HTML/JS", "①을 그대로 사용"],
        ["데이터 쓰기", "모든 쓰기를 서버 API가 받아 권한 확인", "브라우저가 Supabase에 직접 쓰고 RLS로 제한", "①의 방식으로 통일 (②의 기능을 서버 API로 재구현)"],
        ["신원", "손님 쿠키 ggc_guest → ggc.actors", "익명 + 이름 입력", "①의 손님 방식 + ②처럼 닉네임만으로 참여"],
        ["강점", "52주 학습, 퀴즈, 학습지, 교사·관리자 도구, AI 보조", "와드 일정, 다른 사람 의견 보기, 발표 모드, 인용 카드, 절·원문 메모", "양쪽 기능을 모두 살림"],
        ["데이터", "Supabase(ggc 스키마)", "다른 소유자의 Supabase", "①의 DB에 표만 추가. ②의 기존 데이터는 옮기지 않음"],
      ],
    },
  },
  { h2: "통합 원칙" },
  {
    ul: [
      "뼈대는 ①, 기능은 ②에서: ②의 화면 동작과 글자 수 제한 등은 따르되, 저장은 모두 서버 API를 거친다.",
      "DB는 더하기만(additive): create ... if not exists 로 새 표만 만들고 기존 표·정책은 바꾸지 않는다. 그래서 운영 중인 기록이 안전하다.",
      "권한은 매 요청마다 서버가 DB로 다시 확인한다(브라우저를 믿지 않는다).",
      "AI 기능은 OPENAI_API_KEY가 있을 때만 켜진다. 키가 없으면 자동으로 꺼져 비용이 0원이다.",
      "휴대폰(390px)과 태블릿을 먼저 생각한 화면: 하단 메뉴, 큰 누름 영역(44px 이상), 글자 크기 조절, 다크 모드.",
    ],
  },

  { h1: "3. 기능 목록과 출처" },
  {
    table: {
      head: ["기능", "출처", "주요 위치"],
      widths: [3600, 1400, 4638],
      rows: [
        ["52주 말씀 학습·요일별 학습·퀴즈·학습지·보상", "①", "src/app/week, learn, quiz, worksheet · src/lib/service.ts"],
        ["교사 도구(공과 만들기·자료·학습지 편집)·관리자", "①", "src/app/teacher, lesson-builder, admin"],
        ["와드 일정(달력·목록·조직별·포스터·공유 링크)", "②", "src/app/ward, e/[slug] · src/lib/ward-events.ts, ward-model.ts"],
        ["함께 생각하기(질문·답글·댓글·하트)", "②", "src/app/think, p/[slug] · src/lib/prompts.ts"],
        ["발표 모드 + 발표 대기열", "②", "src/components/think/present-mode.tsx · src/lib/present-queue.ts"],
        ["인용 카드 이미지 만들기", "②", "src/components/think/quote-card.tsx · src/lib/card-text.ts"],
        ["경전 절에 의견 달기", "②", "src/components/notes/verse-notes.tsx · src/lib/verse-notes.ts"],
        ["공과 원문 올리기 + 문장 하이라이트·메모", "②", "src/app/week/[number]/text · src/lib/lesson-texts.ts, text-anchor.ts"],
        ["오늘의 Insight(하루 첫 방문 팝업 + 홈 카드, 교사 수정)", "신규", "src/components/learning/daily-insight.tsx · src/lib/daily-insight*.ts"],
        ["경전을 사이트 안에서 읽기(4대 경전)", "신규", "src/components/learning/chapter-view.tsx · src/lib/scripture-text.ts"],
        ["학습지 파일(PDF·Word·한글)에서 문항 가져오기", "신규", "src/app/api/worksheet-import · src/lib/worksheet-import.ts, file-text.ts"],
        ["4개 언어 + 브라우저 번역 도움말", "신규", "src/i18n · src/lib/i18n.ts · src/components/translate-help.tsx"],
        ["새 색 테마 '따뜻한 햇살'(청록 + 호박색)", "신규", "src/app/theme.css (명암비 자동 검사)"],
        ["안드로이드 앱(TWA)", "신규", "android/ · public/.well-known/assetlinks.json"],
        ["만든 사람·피드백 주소·업데이트 날짜·저작권 표시", "신규", "src/lib/site-info.ts · src/components/shell.tsx"],
      ],
    },
  },

  { h1: "4. 구조" },
  { h2: "기술 구성" },
  {
    table: {
      head: ["영역", "사용 기술"],
      widths: [2400, 7238],
      rows: [
        ["화면", "Next.js 16 App Router, React 19, TypeScript, lucide 아이콘, Radix 대화상자"],
        ["서버", "Next.js 라우트 핸들러, zod 4(입력 검사), postgres(DB 접속)"],
        ["DB·파일", "Supabase Postgres(ggc 스키마), Supabase Storage(ggc-posters 버킷, 공개 읽기)"],
        ["문서 읽기", "kordoc(한글 hwp/hwpx), pdf-parse, mammoth(Word)"],
        ["테스트", "node:test + tsx, PGlite(내 컴퓨터 안의 임시 Postgres), 헤드리스 Edge 화면 검사"],
        ["배포", "Vercel(main 브랜치에 올리면 자동 배포), GitHub 비공개 저장소"],
      ],
    },
  },
  { h2: "요청이 처리되는 길" },
  {
    ol: [
      "브라우저가 /api/경로 로 요청한다 (src/lib/client.ts의 api 함수).",
      "src/app/api/[...path]/route.ts 가 받아 손님 쿠키·로그인으로 누구인지(actor) 확인한다.",
      "와드·생각하기·메모·Insight 경로(ward/, think/, notes/, insight/, home/activity)는 src/lib/community-api.ts 로, 나머지는 src/lib/service.ts 로 간다.",
      "각 기능 함수는 privileged() 트랜잭션 안에서 권한을 DB로 다시 확인한 뒤 읽고 쓴다.",
      "응답은 JSON. 오류는 코드(예: session_required)로 돌려주고 화면이 한국어/영어 문장으로 바꿔 보여 준다.",
    ],
  },
  { h2: "폴더 지도" },
  {
    table: {
      head: ["폴더", "내용"],
      widths: [3000, 6638],
      rows: [
        ["src/app", "화면(page.tsx)과 API(route.ts). theme.css가 색 테마의 단일 원본"],
        ["src/components", "화면 부품. ward/, think/, notes/, learning/, teacher/, ui/ 로 나뉨"],
        ["src/lib", "서버·공용 로직. 기능마다 한 파일(ward-events.ts, prompts.ts, verse-notes.ts …)"],
        ["src/data", "52주 교재 데이터, 사이트 안 설명서(guide.ts)"],
        ["src/i18n", "catalog.json(원문 목록), es.json, fil.json(번역)"],
        ["supabase/migrations", "DB 변경 파일. 2026092x 세 개가 이번 통합에서 추가된 것"],
        ["scripts", "DB 업데이트, 번역 추출·병합, 설명서·보고서 만들기, 화면 캡처 도구"],
        ["tests", "자동 테스트"],
        ["android", "앱 설정(twa-manifest.json)과 빌드 스크립트(build.ps1)"],
        ["사용설명서(사용자용), 앱설치파일(APK), 개발보고서(공동개발자용)", "배포용 결과물"],
      ],
    },
  },

  { h1: "5. 데이터베이스" },
  {
    p: "새 표는 모두 ggc 스키마에 있고 RLS(행 단위 보안)를 켠 뒤 서버만 접근합니다. 브라우저는 표에 직접 닿지 않습니다.",
  },
  {
    table: {
      head: ["마이그레이션", "새 표", "용도"],
      widths: [3000, 3600, 3038],
      rows: [
        ["20260927000000_ward_community", "event_managers, events", "와드 일정과 조직별 일정 담당자"],
        ["", "prompts, prompt_replies, prompt_reply_comments, prompt_reply_reactions", "함께 생각하기 질문·답글·댓글·하트"],
        ["20260928000000_notes", "verse_notes, verse_note_reactions, verse_note_comments", "경전 절 의견"],
        ["", "lesson_texts, text_notes, text_note_reactions, text_note_comments", "공과 원문과 문장 메모"],
        ["20260929000000_daily_insights", "daily_insights", "교사가 고친 오늘의 Insight"],
      ],
    },
  },
  { h2: "운영 DB에 반영하는 법" },
  {
    ol: [
      "npm run db:editor-sql 로 DB업데이트_SQL편집기용.sql 을 만든다 (세 마이그레이션 + 포스터 버킷).",
      "Supabase 웹 → SQL Editor 에 파일 내용을 붙여 넣고 Run. 마지막 결과가 '완료: …(기존 기록 유지)'이면 성공.",
      "또는 DATABASE_URL 을 알고 있으면 npm run db:update (잘못 붙여 넣으면 한국어로 이유를 알려 줌).",
      "여러 번 실행해도 안전하다(if not exists).",
    ],
  },
  { note: "순서가 중요합니다: DB 반영 → 그다음 main 브랜치에 올리기(자동 배포). 새 표가 없는데 새 코드가 먼저 배포되면 해당 기능만 오류가 납니다." },

  { h1: "6. 배포와 운영" },
  { h2: "환경변수 (Vercel에 설정, 값은 여기 적지 않음)" },
  {
    table: {
      head: ["이름", "용도"],
      widths: [4200, 5438],
      rows: [
        ["NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY(또는 ANON_KEY)", "Supabase 주소와 공개 키"],
        ["SUPABASE_SECRET_KEY(또는 SERVICE_ROLE_KEY)", "서버 전용 키(포스터 업로드 등). 절대 공개 금지"],
        ["DATABASE_URL", "서버가 DB에 접속하는 주소(비밀번호 포함, 공개 금지)"],
        ["NEXT_PUBLIC_SITE_URL", "공유 링크·QR에 쓰는 사이트 주소"],
        ["OPENAI_API_KEY, OPENAI_MODEL", "선택. 없으면 AI 기능 자동 꺼짐(비용 0)"],
        ["NEXT_PUBLIC_BUILD_DATE", "자동 설정(빌드한 날짜 → 화면 아래 '최근 업데이트')"],
      ],
    },
  },
  { h2: "배포 흐름" },
  {
    ol: [
      "작업은 별도 브랜치(예: phase2)에서 하고 GitHub에 올린다.",
      "DB 변경이 있으면 5장의 방법으로 먼저 반영한다.",
      "main 에 합쳐 올리면 Vercel이 자동으로 빌드·배포한다(바탕화면 폴더의 3_배포.cmd 로도 가능).",
      "배포 뒤 4개 언어로 홈·와드·생각하기·경전 읽기를 한 번씩 열어 확인한다.",
    ],
  },
  { h2: "안드로이드 앱" },
  {
    ul: [
      "방식: TWA(Trusted Web Activity). 앱이 크롬으로 사이트를 전체 화면으로 여는 구조라, 사이트를 고치면 앱도 바로 바뀐다. 앱 다시 만들기는 아이콘·이름을 바꿀 때만 필요.",
      "패키지 이름 kr.gokbanjung.app, 서명 인증서 SHA-256은 public/.well-known/assetlinks.json 과 일치해야 주소창 없이 열린다.",
      "빌드: android/build.ps1 (JDK 17·Android SDK·Bubblewrap이 C:/ggc-android 에 설치됨). 버전을 올릴 때 twa-manifest.json 의 appVersionCode 를 1 올린다.",
      "서명 열쇠는 %USERPROFILE%/.claude/secrets/gokbanjung-release.keystore, 비밀번호는 같은 폴더 .env 의 GOKBANJUNG_KEYSTORE_PASSWORD. 저장소에는 절대 넣지 않으며(.gitignore 처리) 따로 백업해야 한다. 잃어버리면 같은 앱으로 업데이트할 수 없다.",
    ],
  },

  { h1: "7. 보안 점검과 테스트" },
  { h2: "APK 배포 전 점검 결과 (2026-09-28)" },
  {
    table: {
      head: ["점검", "결과"],
      widths: [3200, 6438],
      rows: [
        ["서명", "v1·v2·v3 서명 검증 통과, 서명자 1명(CN=Gokbanjeong Ward), 인증서 지문이 assetlinks.json 과 일치"],
        ["권한", "위험 권한 없음(연락처·사진·위치·인터넷 권한도 요청 안 함). AndroidX 내부 전용 권한 1개뿐"],
        ["열리는 주소", "https://gokbanjeong-gospel-class.vercel.app/ 하나. 다른 주소 없음"],
        ["외부 노출 부품", "실행 화면 1개 + AndroidX 표준 수신기 1개(시스템 전용 DUMP 권한으로 잠김)"],
        ["비밀 정보", "APK 안 파일 463개를 모두 검사: API 키·비밀번호·DB 주소 패턴 없음, .env 값과 일치하는 문자열 0건"],
      ],
    },
  },
  { h2: "사이트 보안 요점" },
  {
    ul: [
      "비밀 키는 코드·저장소에 없음. 서버 환경변수와 개인 비밀 폴더에만 보관.",
      "업로드 파일은 확장자와 파일 첫 바이트를 함께 확인(이름만 바꾼 파일 거부), 크기 제한, 학습지 파일은 서버에 저장하지 않음.",
      "보안 헤더(CSP)로 허용된 곳에서만 이미지·스크립트를 불러옴.",
      "손님은 쿠키로 구분되며 자기 글만 지울 수 있고, 관리자는 숨김·삭제 가능.",
    ],
  },
  { h2: "테스트" },
  {
    ul: [
      "npm test: 74개 중 73개 통과. 실패 1개는 원래 gospel-class에 있던 AI 퀴즈 테스트로, 일요일에는 그날 학습이 없어 실패한다(이번 작업과 무관, 그대로 둠).",
      "새 기능마다 자동 테스트: 와드 일정 시간 계산(한국 시간), 권한, 발표 대기열, 텍스트 위치 찾기, 학습지 문항 추출, 번역 병합, 색 명암비 등.",
      "화면 검사: 헤드리스 Edge로 휴대폰 크기(390px)에서 4개 언어 × 9개 화면의 가로 넘침 0건 확인.",
    ],
  },
  { h2: "알려진 문제·제약" },
  {
    ul: [
      "src/components/shell.tsx 37행의 린트 경고(효과 안에서 상태 변경)는 원래 코드에 있던 것. 동작에는 문제 없음.",
      "스페인어·필리핀어에서 숫자 등이 끼어 있는 일부 문장(템플릿 문장)은 영어로 보임.",
      "경전 본문은 교회 공식 사이트에서 가져오므로 그쪽이 느리거나 막히면 '공식 사이트에서 열기' 링크로 대신한다.",
      "이 PC에서는 한글 프로그램 자동화가 파일을 열지 못해, HWPX는 kordoc으로 직접 만든다.",
      "안드로이드 앱은 휴대폰에 크롬이 있어야 가장 잘 동작한다.",
    ],
  },

  { h1: "8. 함께 개발하는 법" },
  { h2: "처음 준비" },
  {
    ol: [
      "GitHub 저장소 gokbanjung 에 초대를 받아 내려받는다(git clone).",
      "npm ci 로 부품 설치, .env.example 을 .env.local 로 복사해 값 채우기(값은 관리자에게 따로 받기).",
      "npm run dev -- --port 3100 → http://localhost:3100. DATABASE_URL 이 없으면 PGlite 로 내 컴퓨터 안에서 동작.",
    ],
  },
  { h2: "새 기능을 넣는 순서" },
  {
    ol: [
      "DB가 필요하면 supabase/migrations 에 새 파일(날짜_이름.sql)을 만들고 create ... if not exists 로만 작성.",
      "src/lib/기능.ts 에 서버 로직(zod로 입력 검사, privileged() 안에서 권한 확인).",
      "읽기·쓰기 경로를 src/lib/community-api.ts(또는 service.ts)에 연결.",
      "화면은 src/components/…, 모든 문구는 t(\"한국어\", \"English\")로 작성.",
      "npm run i18n:extract → 새 문장을 스페인어·필리핀어로 번역(TSV) → npm run i18n:merge es 폴더 / fil 폴더 → missing 0 확인.",
      "tests/ 에 테스트 추가 → npm test, npm run lint, npm run build.",
      "설명서가 바뀌면 src/data/guide.ts 수정 → npm run guide:build, 필요하면 사용설명서 다시 만들기(부록).",
    ],
  },
  { h2: "지켜 주세요" },
  {
    ul: [
      "기존 표·정책을 바꾸는 마이그레이션 금지(운영 기록 보호).",
      "키·비밀번호를 코드·커밋·메신저에 넣지 않기.",
      "색은 theme.css 의 이름(--navy, --gold …)만 사용 → 다크 모드와 명암비가 자동으로 맞음.",
      "새 화면은 휴대폰 390px에서 가로로 넘치지 않는지 확인.",
    ],
  },
  { h2: "다음에 해 볼 만한 것" },
  {
    ul: [
      "스페인어·필리핀어 템플릿 문장까지 번역되도록 번역 함수 확장.",
      "와드 일정 알림(구독형 달력 주소, ICS).",
      "Insight·질문 모음 인쇄용 PDF.",
      "앱을 구글 플레이에 비공개 테스트로 올려 업데이트 자동화.",
    ],
  },

  { h1: "부록. 자주 쓰는 명령" },
  {
    table: {
      head: ["명령", "하는 일"],
      widths: [4400, 5238],
      rows: [
        ["npm run dev -- --port 3100", "내 컴퓨터에서 사이트 실행"],
        ["npm test / npm run lint / npm run build", "테스트 / 코드 규칙 검사 / 배포용 빌드"],
        ["npm run i18n:extract, npm run i18n:merge <언어> <폴더>", "번역할 문장 추출 / 번역 합치기"],
        ["npm run guide:build", "사이트 안 설명서(사용설명서.html) 다시 만들기"],
        ["npm run db:editor-sql / npm run db:update", "SQL 편집기용 파일 만들기 / DB에 직접 반영"],
        ["node scripts/manual/shots.mjs → node --import tsx scripts/manual/build.mts → powershell -File scripts/manual/convert.ps1", "사용설명서 화면 캡처 → DOCX·HWPX·HTML → PDF"],
        ["node --import tsx scripts/report/build.mts → powershell -File scripts/manual/convert.ps1 -Folder 개발보고서(공동개발자용)", "이 보고서 다시 만들기"],
        ["powershell -File android/build.ps1", "안드로이드 앱 다시 만들기"],
      ],
    },
  },
];
