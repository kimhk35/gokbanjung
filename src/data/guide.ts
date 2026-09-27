// Bilingual user/operator manual. Rendered in the site at /guide and as the
// standalone 사용설명서.html (scripts/guide-html.ts). Edit text here only.
import type { Localized } from "@/lib/types";

export type GuideSection = {
  id: string;
  part: "member" | "operator" | "help";
  title: Localized;
  intro?: Localized;
  steps?: Localized[];
  table?: { head: Localized[]; rows: Localized[][] };
  note?: Localized;
};
const L = (ko: string, en: string): Localized => ({ ko, en });

export const GUIDE_PARTS: Record<GuideSection["part"], Localized> = {
  member: L("참여자용", "For members"),
  operator: L("운영자용", "For operators"),
  help: L("도움말", "Help"),
};

export const GUIDE: GuideSection[] = [
  {
    id: "about",
    part: "member",
    title: L("이 사이트는?", "About this site"),
    intro: L(
      "곡반정와드 복음교리반의 매일 말씀 학습, 와드 일정, 함께 생각하기를 한곳에 모은 학습 공간입니다. 교회의 공식 웹사이트가 아닙니다.",
      "A learning space for the Gokbanjeong Ward Gospel Doctrine class that brings together daily scripture study, the ward calendar and shared questions. It is not an official Church website.",
    ),
    steps: [
      L(
        "만든 사람: 김홍겸 형제 · 박녹형 형제",
        "Created by Brother Honggyeom Kim · Brother Nokhyeong Park",
      ),
      L(
        "피드백과 의견은 kimhk35@ajou.ac.kr 로 보내 주세요.",
        "Please send feedback and ideas to kimhk35@ajou.ac.kr.",
      ),
      L(
        "사이트 아래쪽에서 최근 업데이트 날짜를 확인할 수 있습니다.",
        "The last-updated date is shown at the bottom of the site.",
      ),
    ],
    note: L(
      "본 사이트의 모든 자료(경전·교재·그림 등)의 저작권은 예수 그리스도 후기 성도 교회(The Church of Jesus Christ of Latter-day Saints)에 있습니다.",
      "All materials on this site (scriptures, manuals, images and more) are © The Church of Jesus Christ of Latter-day Saints.",
    ),
  },
  {
    id: "start",
    part: "member",
    title: L("처음 들어가기", "Getting started"),
    steps: [
      L(
        "회원가입이나 로그인은 필요 없습니다. 주소를 열면 바로 시작합니다.",
        "No sign-up or sign-in is needed. Just open the address.",
      ),
      L(
        "말씀 학습을 처음 열면 이름(별명)을 물어봅니다. 두 글자 이상 적고 시작하세요.",
        "The first time you open study pages, choose a nickname (2+ characters).",
      ),
      L(
        "와드 일정과 함께 생각하기는 이름 없이도 바로 볼 수 있습니다.",
        "The ward calendar and shared questions open right away, even without a nickname.",
      ),
      L(
        "오른쪽 위 언어 버튼(한국어·EN·ES·FIL)으로 언어를 바꿀 수 있습니다. 처음에는 기기 언어에 맞춰 자동으로 정해집니다.",
        "Use the language buttons at the top right (한국어·EN·ES·FIL) to switch language. The first visit follows your device language automatically.",
      ),
    ],
  },
  {
    id: "menu",
    part: "member",
    title: L("아래쪽 메뉴", "Bottom menu"),
    intro: L(
      "휴대폰은 화면 아래, 태블릿은 왼쪽, 컴퓨터는 위쪽에 메뉴가 있습니다.",
      "The menu is at the bottom on phones, on the left on tablets and at the top on computers.",
    ),
    table: {
      head: [L("메뉴", "Menu"), L("하는 일", "What it does")],
      rows: [
        [
          L("홈", "Home"),
          L(
            "오늘의 학습, 다가오는 와드 일정, 최근 올라온 생각",
            "Today's study, upcoming ward events, recent thoughts",
          ),
        ],
        [
          L("말씀 학습", "Study the word"),
          L(
            "52주 구약 공과와 매일 읽을 말씀",
            "52 weeks of Old Testament lessons and daily readings",
          ),
        ],
        [
          L("나눔", "Sharing"),
          L(
            "함께 생각하기 · 생각벽 · 토론",
            "Think together · Thought wall · Discussion",
          ),
        ],
        [
          L("와드 일정", "Ward calendar"),
          L(
            "와드 모임과 조직별 활동",
            "Ward meetings and organization activities",
          ),
        ],
        [
          L("나의 여정", "My journey"),
          L("내 학습 기록과 리워드", "Your study record and rewards"),
        ],
      ],
    },
    note: L(
      "경전 읽기, 퀴즈, 활동지, 사용설명서는 오른쪽 위 ☰ 메뉴에 있습니다.",
      "Scriptures, quizzes, worksheets and this guide are in the ☰ menu at the top right.",
    ),
  },
  {
    id: "study",
    part: "member",
    title: L("매일 말씀 학습", "Daily study"),
    steps: [
      L(
        "말씀 학습 → 이번 주 공과 → 오늘 요일을 누릅니다.",
        "Open Study the word → this week's lesson → today.",
      ),
      L(
        "말씀을 읽고 마음에 남은 것과 오늘의 실천을 적습니다. 이 기록은 나만 봅니다.",
        "Read, then write what stayed with you and today's action. Only you can see it.",
      ),
      L(
        "학습을 마치면 새싹·책갈피 같은 리워드를 받습니다.",
        "Finishing earns rewards such as a sprout or bookmark.",
      ),
    ],
  },
  {
    id: "think",
    part: "member",
    title: L(
      "함께 생각하기 (다른 사람들의 의견 보기)",
      "Think together (see others' thoughts)",
    ),
    steps: [
      L(
        "나눔 → 함께 생각하기에서 선생님이 올린 질문을 고릅니다.",
        "Go to Sharing → Think together and pick a question from a teacher.",
      ),
      L(
        "이름 칸은 자동으로 채워집니다. 비워 두면 '익명'으로 올라갑니다.",
        "Your name is filled in for you. Leave it blank to post as 'Anonymous'.",
      ),
      L(
        "생각을 적고 '답글 등록'을 누릅니다. 다른 사람의 답글에 하트와 댓글을 남길 수 있습니다.",
        "Write your thought and press Post reply. You can heart and comment on others' replies.",
      ),
      L(
        "쓰다가 나가도 괜찮습니다. 입력을 멈추면 0.8초 뒤 이 기기에 임시 저장되고, 등록하기 전에는 공개되지 않습니다.",
        "It's fine to leave mid-way: 0.8 s after you stop typing the draft is saved on this device. It is not public until you post it.",
      ),
      L(
        "공유 버튼으로 질문 링크를 카카오톡 등으로 보낼 수 있습니다.",
        "Use Share to send the question link to others.",
      ),
    ],
    note: L(
      "임시 저장은 그 기기에만 있습니다. 다른 휴대폰에서는 이어 쓸 수 없습니다.",
      "Drafts stay on that device only; they do not follow you to another phone.",
    ),
  },
  {
    id: "ward",
    part: "member",
    title: L("와드 일정 보기", "Ward calendar"),
    steps: [
      L(
        "와드 일정에서 '달력' 또는 '목록'을 고릅니다. 휴대폰은 목록이 기본입니다.",
        "Choose Month or List. Phones start in list view.",
      ),
      L(
        "초등회·상호부조회·청소년 같은 조직 버튼으로 필요한 일정만 볼 수 있습니다.",
        "Tap an organization such as Primary or Youth to filter.",
      ),
      L(
        "일정을 누르면 포스터, 시간, 장소가 나오고 '공유'로 링크를 보낼 수 있습니다.",
        "Tap an event for its poster, time and place, and share its link.",
      ),
      L("모든 시간은 한국 시간입니다.", "All times are Korea time."),
    ],
  },
  {
    id: "home-screen",
    part: "member",
    title: L("휴대폰 홈 화면에 추가하기", "Add to your phone's home screen"),
    steps: [
      L(
        "아이폰: Safari로 열기 → 아래 공유 버튼 → '홈 화면에 추가'.",
        "iPhone: open in Safari → Share → Add to Home Screen.",
      ),
      L(
        "안드로이드: Chrome으로 열기 → 오른쪽 위 ⋮ → '홈 화면에 추가'.",
        "Android: open in Chrome → ⋮ → Add to Home screen.",
      ),
    ],
  },
  {
    id: "other-languages",
    part: "member",
    title: L("다른 언어로 보기", "Viewing in other languages"),
    intro: L(
      "한국어·영어·스페인어·필리핀어는 오른쪽 위 언어 버튼으로 바로 바뀝니다. 그 밖의 언어는 휴대폰이나 컴퓨터의 자동 번역을 켜면 이 사이트 전체가 바로 번역됩니다.",
      "Korean, English, Spanish and Filipino switch instantly with the language buttons at the top right. For any other language, turn on your phone's or computer's built-in translation and the whole site is translated right away.",
    ),
    steps: [
      L(
        "안드로이드 Chrome: 오른쪽 위 ⋮ → '번역…' → 원하는 언어.",
        "Android Chrome: ⋮ at the top right → Translate… → choose a language.",
      ),
      L(
        "삼성 인터넷: 아래 ≡ 메뉴 → '페이지 번역'(또는 번역 아이콘) → 원하는 언어.",
        "Samsung Internet: ≡ menu at the bottom → Translate page (or the translate icon) → choose a language.",
      ),
      L(
        "아이폰 Safari: 주소창 왼쪽 '가가'(또는 aA) → '번역' → 원하는 언어.",
        "iPhone Safari: tap aA at the left of the address bar → Translate → choose a language.",
      ),
      L(
        "컴퓨터 Chrome·Edge: 주소창 오른쪽 번역 아이콘 → 원하는 언어.",
        "Computer Chrome or Edge: the translate icon at the right of the address bar → choose a language.",
      ),
    ],
    note: L(
      "자동 번역은 기계 번역이라 어색할 수 있습니다. 경전은 교회 공식 사이트에서 해당 언어로 읽는 것이 가장 정확합니다.",
      "Automatic translation is machine translation and may read awkwardly. For scripture, the Church's official site in your language is most accurate.",
    ),
  },
  {
    id: "scripture-reader",
    part: "member",
    title: L("경전을 사이트에서 바로 읽기", "Reading scripture right in the site"),
    steps: [
      L("☰ → 경전 읽기에서 책과 장을 고르거나, 주차 페이지의 오늘 읽을 장 버튼을 누릅니다.", "Open ☰ → Read scriptures and choose a book and chapter, or tap a chapter button on a week page."),
      L("성경·몰몬경·교리와 성약·값진 진주를 모두 이 화면에서 읽을 수 있고, ◀ ▶로 앞뒤 장으로 넘깁니다.", "The Bible, Book of Mormon, Doctrine and Covenants and Pearl of Great Price all open here; use ◀ ▶ for the previous or next chapter."),
      L("절 번호를 누르면 그 절에 의견을 달 수 있습니다.", "Tap a verse number to add a note to that verse."),
    ],
    note: L(
      "본문은 교회 공식 사이트(churchofjesuschrist.org)에서 그대로 가져오며, 모든 경전 본문의 저작권은 The Church of Jesus Christ of Latter-day Saints에 있습니다. 선택한 언어로 없는 장은 영어로 보여 줍니다.",
      "The text comes unchanged from churchofjesuschrist.org and is © The Church of Jesus Christ of Latter-day Saints. Chapters not published in your language are shown in English.",
    ),
  },
  {
    id: "daily-insight",
    part: "member",
    title: L("오늘의 Insight 카드", "Today's insight card"),
    intro: L(
      "매일 처음 사이트를 열면 그날의 Insight 카드가 뜹니다. 몇째 날인지, 오늘의 질문, 핵심 주제(오늘 읽을 범위), 핵심 메시지가 담겨 있습니다. 닫으면 그날은 다시 뜨지 않고, 홈 화면 맨 위에서 언제든 다시 볼 수 있습니다.",
      "The first time you open the site each day, today's insight card appears: the day of the week's study, today's question, the key topic (today's reading) and the key message. Once closed it won't pop up again that day, and it is always at the top of Home.",
    ),
    steps: [
      L(
        "'오늘 학습 시작'을 누르면 그날의 말씀 학습으로 바로 갑니다.",
        "Tap Start today's study to go straight to today's lesson.",
      ),
      L(
        "'이미지로 저장·공유'를 누르면 카드를 사진으로 저장하거나 카카오톡 등으로 보낼 수 있습니다.",
        "Tap Save or share image to keep the card as a picture or send it by chat.",
      ),
    ],
  },
  {
    id: "cards",
    part: "member",
    title: L("답글을 카드 이미지로 저장하기", "Saving a reply as a card image"),
    steps: [
      L(
        "함께 생각하기의 답글 아래 '카드' 버튼을 누릅니다.",
        "Tap the Card button under a reply in Think together.",
      ),
      L(
        "정사각형·세로·가로 크기와 배경 그림을 고르고, 작성자 이름을 보일지 정합니다.",
        "Choose square, portrait or landscape, a background, and whether to show the author's name.",
      ),
      L(
        "'이미지 저장' 또는 '공유'를 누릅니다. 이미지는 휴대폰 안에서만 만들어지고 서버로 보내지지 않습니다.",
        "Tap Save image or Share. The image is made on your phone and never sent to the server.",
      ),
    ],
  },
  {
    id: "verse-notes",
    part: "member",
    title: L("절 번호로 의견 달기", "Notes on a verse"),
    steps: [
      L(
        "주차 페이지 아래 '절에 의견 달기'를 열거나, 경전 읽기 화면 맨 아래로 내려갑니다.",
        "Open Verse notes at the bottom of a week page, or scroll to the bottom of Read scriptures.",
      ),
      L(
        "장을 고르고 시작 절(끝 절은 선택)을 적은 뒤, 짧은 인용(200자까지)과 생각을 씁니다.",
        "Choose the chapter and the starting verse (end verse optional), then add a short quote (up to 200 characters) and your thought.",
      ),
      L(
        "같은 절에 달린 다른 사람들의 의견이 절 번호별로 모여 보이고, 하트와 댓글을 남길 수 있습니다.",
        "Other people's notes are grouped by verse; you can heart and comment on them.",
      ),
    ],
  },
  {
    id: "text-notes",
    part: "member",
    title: L(
      "공과 본문에 형광펜·의견 달기",
      "Highlights and notes on the lesson text",
    ),
    intro: L(
      "교사가 공과 본문을 올린 주에는 주차 페이지의 '공과 본문 읽고 문장에 의견 달기'에서 본문을 읽을 수 있습니다.",
      "In weeks when a teacher has posted the lesson text, open Read the lesson text and add notes on the week page.",
    ),
    steps: [
      L(
        "문장을 길게 누르거나 드래그해 선택하면 아래에 버튼이 나타납니다.",
        "Press and hold or drag to select a sentence; buttons appear at the bottom.",
      ),
      L(
        "'형광펜'은 나만 보는 표시로, 이 기기에 저장됩니다.",
        "Highlight marks it just for you and is saved on this device.",
      ),
      L(
        "'의견 달기'는 모두에게 공개됩니다. 의견이 달린 문장에는 점선 밑줄이 생기고, 누르면 그 문장의 의견만 모아 볼 수 있습니다.",
        "Add note is public. Sentences with notes get a dotted underline; tap one to see just its notes.",
      ),
    ],
  },
  {
    id: "app-install",
    part: "member",
    title: L("안드로이드 앱 설치·업데이트·삭제", "Installing, updating and removing the Android app"),
    intro: L(
      "앱은 사이트를 전체 화면으로 여는 공식 방식(TWA)으로 만들어져, 사이트가 바뀌면 앱도 자동으로 최신 내용이 됩니다. 연락처·사진·위치 같은 휴대폰 권한은 하나도 요청하지 않습니다.",
      "The app opens the site full screen using Google's official method (TWA), so it always shows the latest site. It asks for no phone permissions such as contacts, photos or location.",
    ),
    steps: [
      L("운영자가 카카오톡·메일·구글 드라이브로 보낸 gokbanjung.apk 파일을 휴대폰에서 누릅니다. (카카오톡은 파일을 저장한 뒤 '열기')", "On your phone, tap the gokbanjung.apk file an operator sent by chat, email or Google Drive. (In chat apps, save the file first, then open it.)"),
      L("'이 출처의 앱을 설치할 수 없습니다' 또는 '출처를 알 수 없는 앱' 창이 뜨면 '설정'을 누르고 '이 출처 허용'을 켠 뒤 뒤로 돌아옵니다.", "If you see 'For your security, your phone is not allowed to install unknown apps from this source', tap Settings, turn on Allow from this source, then go back."),
      L("'설치'를 누르고, 끝나면 '열기'를 누릅니다. 구글 Play 프로텍트가 '검사'를 권하면 '검사 없이 설치' 대신 '앱 검사'를 눌러도 됩니다.", "Tap Install, then Open. If Google Play Protect suggests scanning, you can tap Scan app."),
      L("홈 화면의 곡반정와드 아이콘(해 뜨는 책 그림)으로 언제든 엽니다.", "Open it any time from the Gokbanjeong Ward icon (a sunrise over a book) on your home screen."),
      L("업데이트: 내용은 저절로 최신이 됩니다. 운영자가 새 앱 파일을 보내 준 경우에만 같은 방법으로 설치하면 기존 앱 위에 덮어써집니다(기록은 그대로).", "Updating: content updates by itself. Only when an operator sends a new app file, install it the same way; it replaces the old app and keeps your data."),
      L("삭제: 아이콘을 길게 누른 뒤 '앱 정보' → '삭제'를 누릅니다.", "Removing: press and hold the icon, then App info → Uninstall."),
    ],
    note: L(
      "아이폰은 앱 파일 대신 Safari의 '홈 화면에 추가'를 쓰면 앱처럼 사용할 수 있습니다.",
      "On iPhone, use Safari's Add to Home Screen instead; it works like an app.",
    ),
  },
  {
    id: "deploy",
    part: "operator",
    title: L("처음 배포하기 (한 번만)", "First deployment (once)"),
    steps: [
      L(
        "github.com에 로그인해 비공개 저장소 gokbanjung이 있는지 확인합니다.",
        "Sign in to github.com and check the private repository gokbanjung exists.",
      ),
      L(
        "vercel.com에 로그인 → Add New → Project → gokbanjung 옆 Import.",
        "Sign in to vercel.com → Add New → Project → Import next to gokbanjung.",
      ),
      L(
        "Environment Variables에 필수 4개를 넣습니다. 값은 기존 gokbanjeong-gospel-class 프로젝트의 Settings → Environment Variables에서 복사합니다.",
        "Add the 4 required Environment Variables, copying the values from the existing gokbanjeong-gospel-class project's Settings → Environment Variables.",
      ),
      L(
        "Deploy를 누르고 1~2분 기다린 뒤 나온 주소로 접속해 봅니다.",
        "Press Deploy, wait 1–2 minutes and open the address it shows.",
      ),
    ],
    table: {
      head: [L("이름", "Name"), L("설명", "Meaning")],
      rows: [
        [
          L("DATABASE_URL", "DATABASE_URL"),
          L("데이터 창고 접속 주소", "Database connection address"),
        ],
        [
          L("NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"),
          L("Supabase 프로젝트 주소", "Supabase project address"),
        ],
        [
          L(
            "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
            "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
          ),
          L("공개 키", "Public key"),
        ],
        [
          L("SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SERVICE_ROLE_KEY"),
          L(
            "서버 전용 키 (다른 사람에게 보이면 안 됨)",
            "Server-only key (keep secret)",
          ),
        ],
      ],
    },
    note: L(
      "AI 기능은 OPENAI_API_KEY를 넣을 때만 켜지며 사용량만큼 비용이 듭니다. 비워 두면 비용이 없습니다.",
      "AI features turn on only when OPENAI_API_KEY is set, and cost money per use. Leave it empty for no cost.",
    ),
  },
  {
    id: "db-update",
    part: "operator",
    title: L("데이터 창고 업데이트 (한 번만)", "Database update (once)"),
    steps: [
      L(
        "supabase.com에 로그인 → 복음교리반 프로젝트를 엽니다.",
        "Sign in to supabase.com and open the Gospel Doctrine project.",
      ),
      L(
        "왼쪽 메뉴 SQL Editor → New query(새 쿼리).",
        "Left menu SQL Editor → New query.",
      ),
      L(
        "폴더의 DB업데이트_SQL편집기용.sql을 메모장으로 열어 전부 복사(Ctrl+A, Ctrl+C) → 편집기에 붙여 넣기.",
        "Open DB업데이트_SQL편집기용.sql in Notepad, copy everything (Ctrl+A, Ctrl+C) and paste it into the editor.",
      ),
      L(
        "Run을 누릅니다. 아래 결과에 '완료: …'가 나오면 끝입니다.",
        "Press Run. Done when the result shows '완료: …'.",
      ),
    ],
    note: L(
      "기존 글과 기록은 그대로 두고 새 표만 추가하며, 두 번 실행해도 안전합니다. DATABASE_URL 값을 알고 있다면 2_DB업데이트.cmd로 해도 됩니다.",
      "Existing posts and records stay; only new tables are added, and running it twice is safe. If you know the DATABASE_URL value you can use 2_DB업데이트.cmd instead.",
    ),
  },
  {
    id: "managers",
    part: "operator",
    title: L(
      "관리자 · 교사 · 일정 담당자",
      "Admins, teachers and calendar managers",
    ),
    steps: [
      L("☰ → 관리자에서 로그인합니다.", "Sign in from ☰ → Administrator."),
      L(
        "교사 승인 탭에서 교사 신청을 승인하거나 교사 계정을 직접 만듭니다.",
        "Approve teacher requests or create teacher accounts in Teacher approval.",
      ),
      L(
        "일정 담당자 탭에서 사람마다 맡을 조직을 체크합니다. '전 회원'은 모든 조직을 관리합니다.",
        "In Calendar managers, tick the organizations each person manages. 'All members' covers every organization.",
      ),
      L(
        "일정 담당자는 먼저 로그인 계정(교사 또는 기록관리 계정)이 있어야 목록에 나옵니다.",
        "A person appears in the list only after they have an approved account.",
      ),
    ],
  },
  {
    id: "events",
    part: "operator",
    title: L("일정 올리기", "Posting events"),
    steps: [
      L(
        "와드 일정 → 새 일정 → 제목·날짜·시간·장소·대상 조직을 적습니다.",
        "Ward calendar → New event → title, date, time, place and organizations.",
      ),
      L(
        "포스터(선택)는 5MB 이하 사진이면 자동으로 알맞게 줄여서 올라갑니다.",
        "An optional poster up to 5 MB is resized automatically.",
      ),
      L(
        "'게시 전 미리 보기'로 확인 → '임시 저장'(나만 보임) 또는 '게시하기'(모두 보임).",
        "Check with Preview → Save draft (only managers see it) or Publish (everyone sees it).",
      ),
      L(
        "일정을 열면 수정, 비공개로 되돌리기, 일정 취소, 삭제를 할 수 있습니다.",
        "Open an event to edit, unpublish, cancel or delete it.",
      ),
    ],
  },
  {
    id: "questions",
    part: "operator",
    title: L(
      "질문 올리기 (교사 · 관리자)",
      "Posting questions (teachers, admins)",
    ),
    steps: [
      L(
        "나눔 → 함께 생각하기 → 새 질문.",
        "Sharing → Think together → New question.",
      ),
      L(
        "함께 읽을 공과를 고르면 공식 원문 주소가 자동으로 채워집니다.",
        "Pick a lesson and the official source link is filled in.",
      ),
      L(
        "질문, 읽기 자료, 포스터(선택)를 넣고 게시합니다.",
        "Add the question, a reading and an optional poster, then publish.",
      ),
    ],
  },
  {
    id: "present",
    part: "operator",
    title: L(
      "수업에서 답글 발표하기 (교사·관리자)",
      "Presenting replies in class (teachers, admins)",
    ),
    steps: [
      L(
        "질문 화면에서 '발표 준비'를 누르면 답글마다 '☆ 담기' 버튼이 생깁니다.",
        "On a question, tap Prepare to present; each reply gets an Add ☆ button.",
      ),
      L(
        "발표할 답글을 담고, 오른쪽 목록에서 ↑↓로 순서를 정합니다. 목록은 이 기기에 저장됩니다.",
        "Add the replies to show and order them with ↑↓ in the list. The list is saved on this device.",
      ),
      L(
        "'발표 시작' → 전체 화면. ←/→ 키나 화면 터치로 넘기고, '이름 숨기기'로 작성자를 가리고, Esc로 끝냅니다.",
        "Tap Start for full screen. Use ←/→ or tap to move, Hide names to hide authors, and Esc to finish.",
      ),
    ],
  },
  {
    id: "upload-text",
    part: "operator",
    title: L(
      "공과 본문 올리기 (교사·관리자)",
      "Uploading lesson text (teachers, admins)",
    ),
    steps: [
      L(
        "주차 페이지 → '공과 본문 읽고 문장에 의견 달기' → '본문 올리기'.",
        "Week page → Read the lesson text and add notes → Upload text.",
      ),
      L(
        "웹 페이지에서 본문을 복사해 붙여 넣으면 제목·목록·굵게가 유지됩니다. 출처 주소와 권한 메모를 적습니다.",
        "Paste text copied from a web page (headings, lists and bold are kept), and enter the source link and a rights note.",
      ),
      L(
        "'게시할 권한이 있음을 확인합니다'에 체크해야 저장할 수 있습니다. 미리 보기 후 '임시 저장' 또는 '게시하기'.",
        "You must tick I confirm I have permission to post. Preview, then Save draft or Publish.",
      ),
      L(
        "게시한 본문을 고치면 새 판(버전)이 임시 저장되고, 다시 게시할 때까지 이전 판이 보입니다. 이전 판에 달린 의견은 같은 문장을 찾아 붙습니다.",
        "Editing a published text creates a new draft version; readers see the previous one until you publish. Notes move to the same sentence in the new version.",
      ),
    ],
    note: L(
      "교회 자료는 저작권이 있습니다. 게시 허락을 받은 본문만 올려 주세요.",
      "Church materials are copyrighted. Upload only text you have permission to post.",
    ),
  },
  {
    id: "insight-edit",
    part: "operator",
    title: L(
      "오늘의 Insight 수정하기 (교사·관리자)",
      "Editing today's insight (teachers, admins)",
    ),
    steps: [
      L(
        "홈 화면 맨 위 카드의 '오늘 카드 수정'을 누릅니다.",
        "Tap Edit today's card on the card at the top of Home.",
      ),
      L(
        "제목·질문·핵심 주제·핵심 메시지를 고치거나, 카드 그림을 올리면 그림이 카드 전체로 보입니다.",
        "Change the title, question, key topic or key message, or upload a picture to use it as the whole card.",
      ),
      L(
        "그날 하루만 바뀝니다. '자동 카드로 되돌리기'로 원래대로 돌아갑니다.",
        "It changes only that day. Use the automatic card to undo.",
      ),
    ],
  },
  {
    id: "worksheet-import",
    part: "operator",
    title: L("학습지 파일에서 문항 가져오기 (교사·관리자)", "Importing a worksheet file (teachers, admins)"),
    steps: [
      L("교사 학습관리 → 학습지 수정 → '학습지 파일에서 문항 가져오기'를 누릅니다.", "Teacher workspace → Edit worksheet → Import questions from a worksheet file."),
      L("PDF·워드(docx)·한글(hwp, hwpx)·텍스트 파일(4MB까지)을 고르면 1. 2) ① 문1 Q1 같은 번호가 붙은 질문을 찾아 문항으로 넣습니다. 여러 줄로 나뉜 질문은 한 문항으로 합치고, 답 쓰는 칸은 뺍니다.", "Choose a PDF, Word (docx), Hangul (hwp, hwpx) or text file (up to 4 MB). Numbered questions (1. 2) ① 문1 Q1) become items; wrapped lines are joined and answer blanks skipped."),
      L("가져온 문항은 한국어·영어 칸에 같은 글로 들어갑니다. 확인·수정하고, 필요하면 다른 언어로 번역한 뒤 '새 버전 저장·게시'를 누르면 반원들이 바로 답을 쓰고 제출할 수 있습니다.", "Imported text fills both the Korean and English fields. Review, translate if needed, then Save & publish version; members can answer and submit right away."),
    ],
    note: L(
      "스캔한 그림 PDF는 글자를 읽을 수 없어 가져올 수 없습니다. 파일은 서버에 저장되지 않습니다.",
      "Scanned image PDFs have no text and cannot be imported. The file is not stored on the server.",
    ),
  },
  {
    id: "apk-build",
    part: "operator",
    title: L("앱 파일 다시 만들기와 서명 열쇠 보관", "Rebuilding the app and keeping the signing key"),
    steps: [
      L("앱 내용은 사이트를 따라 자동으로 바뀌므로, 아이콘·앱 이름을 바꿀 때만 다시 만듭니다.", "The app follows the site automatically; rebuild only to change the icon or app name."),
      L("gokbanjung 폴더의 android/build.ps1을 실행하면 C:/ggc-android/project에 새 APK가 생깁니다. android/twa-manifest.json의 appVersionCode 숫자를 1씩 올려야 기존 앱 위에 설치됩니다.", "Run android/build.ps1 in the gokbanjung folder; the new APK appears in C:/ggc-android/project. Increase appVersionCode in android/twa-manifest.json by 1 so it installs over the old app."),
      L("서명 열쇠(%USERPROFILE%/.claude/secrets/gokbanjung-release.keystore)와 비밀번호(.env의 GOKBANJUNG_KEYSTORE_PASSWORD)를 USB 등 안전한 곳에 따로 백업해 두세요. 잃어버리면 앱을 업데이트할 수 없습니다.", "Back up the signing key (%USERPROFILE%/.claude/secrets/gokbanjung-release.keystore) and its password (GOKBANJUNG_KEYSTORE_PASSWORD in .env) somewhere safe, such as a USB drive. Without them the app cannot be updated."),
    ],
    note: L(
      "서명 열쇠와 비밀번호는 절대 GitHub·카카오톡·메일로 보내지 마세요.",
      "Never send the signing key or its password by GitHub, chat or email.",
    ),
  },
  {
    id: "update-site",
    part: "operator",
    title: L("사이트를 고친 뒤 다시 올리기", "Updating the site"),
    steps: [
      L(
        "1_설치확인.cmd로 검사합니다. '모두 통과했습니다'가 나와야 합니다.",
        "Run 1_설치확인.cmd; it must say everything passed.",
      ),
      L(
        "3_배포.cmd를 더블클릭하면 GitHub에 올라가고, 1~2분 뒤 사이트가 자동으로 바뀝니다.",
        "Double-click 3_배포.cmd; it uploads to GitHub and the site updates in 1–2 minutes.",
      ),
    ],
  },
  {
    id: "errors",
    part: "help",
    title: L("자주 나는 오류", "Common problems"),
    table: {
      head: [L("보이는 말", "Message"), L("해결 방법", "What to do")],
      rows: [
        [
          L("origin_rejected / 요청이 거부됨", "origin_rejected"),
          L(
            "사이트 주소가 바뀌었을 수 있습니다. Vercel의 NEXT_PUBLIC_SITE_URL을 비우거나 실제 주소로 고칩니다.",
            "The site address may have changed. Clear NEXT_PUBLIC_SITE_URL in Vercel or set it to the real address.",
          ),
        ],
        [
          L(
            "사진 저장소가 아직 연결되지 않았습니다",
            "Image storage is not connected",
          ),
          L(
            "2_DB업데이트.cmd를 실행하고, SUPABASE_SERVICE_ROLE_KEY가 들어 있는지 확인합니다.",
            "Run 2_DB업데이트.cmd and check SUPABASE_SERVICE_ROLE_KEY is set.",
          ),
        ],
        [
          L("Schema verification failed", "Schema verification failed"),
          L(
            "다른 프로젝트의 DATABASE_URL을 넣었을 수 있습니다. 복음교리반 DB 주소인지 확인합니다.",
            "The DATABASE_URL may belong to another project. Use the Gospel Doctrine database.",
          ),
        ],
        [
          L("Vercel: Build failed", "Vercel: Build failed"),
          L(
            "1_설치확인.cmd를 먼저 실행해 어디서 멈추는지 확인합니다.",
            "Run 1_설치확인.cmd first to see where it stops.",
          ),
        ],
        [
          L("로그인이 안 됩니다", "Can't sign in"),
          L(
            "관리자에게 비밀번호 초기화를 요청합니다.",
            "Ask an administrator to reset your password.",
          ),
        ],
      ],
    },
  },
  {
    id: "privacy",
    part: "help",
    title: L("개인정보와 기록", "Privacy and records"),
    steps: [
      L(
        "함께 생각하기 답글, 댓글, 게시된 일정은 방문자 모두가 볼 수 있습니다.",
        "Replies, comments and published events are visible to every visitor.",
      ),
      L(
        "매일 학습의 개인 기록은 본인만 봅니다. 선생님도 볼 수 없습니다.",
        "Private study notes are yours only; teachers cannot read them.",
      ),
      L(
        "브라우저 데이터를 지우면 이전에 쓴 글을 고치거나 지울 수 없게 됩니다.",
        "Clearing browser data means you can no longer edit or delete earlier posts.",
      ),
    ],
  },
];

export function guideText(section: GuideSection): Localized[] {
  return [
    section.title,
    ...(section.intro ? [section.intro] : []),
    ...(section.steps || []),
    ...(section.table
      ? [...section.table.head, ...section.table.rows.flat()]
      : []),
    ...(section.note ? [section.note] : []),
  ];
}
