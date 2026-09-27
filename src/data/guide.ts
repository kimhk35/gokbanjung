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
        "오른쪽 위 한국어/EN 버튼으로 언어를 바꿀 수 있습니다. 처음에는 기기 언어에 맞춰 자동으로 정해집니다.",
        "Use the 한국어/EN buttons at the top right to switch language. The first visit follows your device language automatically.",
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
