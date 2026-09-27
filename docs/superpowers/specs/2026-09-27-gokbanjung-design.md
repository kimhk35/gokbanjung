# gokbanjung — 곡반정와드 통합 사이트 설계서

작성일: 2026-09-27 · 상태: 사용자 검토 대기

## 1. 목표

곡반정와드 복음교리반 사이트 두 개의 장점을 합쳐, 배포할 수 있는 **새 사이트 1개**를 만든다.

- 뼈대: ① `Desktop\gospel-class` (Next.js 16 + Supabase, `ggc` 스키마)
- 옮겨 올 기능: ② `Downloads\comefollowme-main.zip` (정적 HTML/JS + Supabase 직접 연결)
- ②의 요소(와드 일정, 다른 사람 의견 보기)를 최대한 살린다.
- 설정 최적화, 태블릿·모바일 최적화.
- 결과물: `Desktop\gokbanjung` 폴더(소스 + 사용설명서) + GitHub 비공개 저장소 `gokbanjung`.
- 기존 두 사이트(① 폴더, ② 운영 사이트)는 수정하지 않는다.

### 확정된 결정

| 항목 | 결정 |
|---|---|
| 뼈대 | ① gospel-class |
| 데이터 저장소 | ①의 기존 Supabase 프로젝트를 함께 사용. **새 표만 추가(additive)**, 기존 표·정책 변경 금지 |
| ②의 기존 데이터 | 옮기지 않음 (②의 저장소는 다른 소유자) |
| ②의 공과 원문 분석·게시, 참조자료 패널 | 이번 범위 제외 (①의 52주 교재 구조와 중복) |
| AI | 유지. `OPENAI_API_KEY`가 없으면 자동 비활성(비용 0) |
| 저장소 | GitHub 비공개 `gokbanjung`, 업로드 도구 `gh` 설치 |

## 2. 구조

②의 코드는 브라우저가 Supabase에 직접 쓰고 RLS로 막는 방식이다. ①은 모든 쓰기를 Next.js API(`src/app/api/[...path]/route.ts` → `src/lib/service.ts`)로 받고, 손님은 `ggc_guest` 쿠키 → `ggc.actors`로 식별한다. **②의 기능은 ①의 방식으로 다시 구현한다.** 화면 동작과 입력 제한값(글자 수 등)은 ②를 따른다.

- 신원: 모든 참여자는 `ggc.actors`의 `actor_id`. 손님은 첫 쓰기 때 생성(①의 기존 흐름).
- 권한: 서버에서 매 요청마다 DB로 재확인(①의 규칙 유지).
- 신규 기능 서비스 코드는 `src/lib/ward-events.ts`, `src/lib/prompts.ts`로 분리해 `service.ts`가 더 커지지 않게 한다.

## 3. 데이터베이스 (신규 마이그레이션 1개)

파일: `supabase/migrations/20260927000000_ward_community.sql` — 모두 `create ... if not exists`, 기존 객체 변경 없음.

| 표 | 주요 열 | 출처 |
|---|---|---|
| `ggc.event_managers` | actor_id, organization(all/primary/relief/elders/youth/sunday-school) | ② events |
| `ggc.events` | slug(12자), title≤160, description≤5000, starts_at, ends_at>starts_at, location≤300, organizations[1~6], status(draft/published/cancelled), poster_path, created_by, updated_at | ② events |
| `ggc.prompts` | slug, title≤160, question≤3000, reading_text≤10000, source_url(https), reference_label, week(선택, 1~52), author≤50, poster_path, created_by | ② study_prompts |
| `ggc.prompt_replies` | prompt_id, owner_id, author≤50, body≤3000 | ② |
| `ggc.prompt_reply_comments` | reply_id, owner_id, author≤50, body≤1500 | ② 009 |
| `ggc.prompt_reply_reactions` | (reply_id, owner_id) PK | ② 009 |

- RLS 활성화, 서버 전용 접근(①의 기존 표와 같은 방식).
- 포스터: Supabase Storage 공개 읽기 버킷 `ggc-posters`. 업로드는 서버 API만(역할 확인 후 서비스 키 사용). 브라우저에서 긴 변 1600px WebP로 줄인 뒤 업로드(≤1 MB 목표, 원본 5 MB 제한).
- 시간은 UTC 저장, 화면은 `Asia/Seoul`(②의 `calendar-model.js` 규칙 이식).

### 권한

| 동작 | 허용 |
|---|---|
| 게시된 일정·질문·답글·댓글 보기 | 모두 |
| 일정 작성·임시 저장·게시·수정·취소·삭제 | ADMIN, 또는 해당 조직의 `event_managers` (organization='all'이면 전체) |
| 일정 담당자 지정 | ADMIN (관리자 화면에 "일정 담당자" 탭 추가) |
| 질문 게시·수정·삭제 | TEACHER, ADMIN (본인 글, ADMIN은 전체) |
| 답글·댓글·하트 | 모두(손님 포함). 삭제는 본인만, ADMIN은 숨김/삭제 |
| 임시 저장 일정 보기 | 작성 권한자만 |

쓰기에는 ①의 기존 호출 제한(`rateLimit`)과 CSRF origin 검사를 적용한다.

## 4. 화면

### 메뉴

- 휴대폰 아래쪽 5개: **홈 · 말씀 학습 · 나눔 · 와드 일정 · 나의 여정**
- **나눔** = 위쪽 탭 3개: `함께 생각하기(/think)` · `생각벽(/community)` · `토론(/discussion)`. 셋 중 어디에 있어도 "나눔"이 선택 표시됨. 기본은 `/think`.
- 더보기(☰): 경전 읽기, 퀴즈, 활동지, 리워드, 학습 달력, 질문함, 내가 쓴 글, 교사/관리자 (기존 유지)

### 새 페이지

| 주소 | 내용 |
|---|---|
| `/ward` | 와드 일정: 달력/목록 전환, 조직 필터, 검색, 담당자용 "새 일정" |
| `/e/[slug]` | 일정 공유 페이지(포스터, 시간, 장소, 공유 버튼) |
| `/think` | 함께 생각하기: 질문 목록, 교사용 "새 질문"(주차 선택 시 공식 원문 주소 자동 입력) |
| `/p/[slug]` | 질문 공유 페이지: 포스터·읽기 자료·답글 작성·답글별 하트/댓글 |

### 기존 페이지 보강

- 홈: "이번 주 와드 일정"(다가오는 3개), "최근 올라온 생각"(새 질문·답글) 카드.
- 주차 페이지(`/week/[number]`): "이번 주 다른 사람들의 생각" — 해당 주 생각벽 공개 글 + 해당 주에 연결된 질문을 ②의 인사이트 카드 모양(공감·댓글 수)으로 표시.
- 자동 임시 저장: 답글·댓글 입력 0.8초 멈춤 시 기기에 저장, 등록 성공 시 삭제(①의 `use-draft.ts` 방식 재사용, 로컬 전용 버전 추가).
- 이름 자동 입력: 계정 표시 이름 또는 손님 별명. 직접 고친 이름은 그 초안에 보존. 비우면 "익명".
- 새로고침: 질문·일정은 30초 간격 또는 창으로 돌아올 때, 입력 중에는 미룸(② 규칙).

### 화면 크기

| 폭 | 배치 |
|---|---|
| < 768px (휴대폰) | 1단, 아래쪽 메뉴, 와드 일정 기본 목록 보기, 터치 영역 ≥ 44px |
| 768–1199px (태블릿) | 왼쪽 아이콘 메뉴 막대 + 내용. 일정 = 달력 + 선택일 목록 나란히, 질문 = 목록 + 답글 나란히 |
| ≥ 1200px (컴퓨터) | 기존 위쪽 메뉴, 2~3단 |

공통: `100dvh`/`visualViewport`로 화면 키보드 대응, `env(safe-area-inset-*)` 안전 영역, 기존 글자 크기·밝기 전환 유지, ①의 남색·금색 디자인 토큰으로 새 화면 통일. 한국어/EN 문자열 모두 제공.

## 5. 설정 최적화

- 필수 환경변수 4개: `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- `NEXT_PUBLIC_SITE_URL`은 선택: 없으면 `VERCEL_PROJECT_PRODUCTION_URL` → 요청 주소 순으로 자동 결정(CSRF 검사 포함).
- 선택: `OPENAI_API_KEY`, `OPENAI_MODEL`.
- Vercel 서울 리전(`icn1`) 유지. 교재·경전 등 정적 데이터 페이지는 캐시 가능하게.
- CSP `img-src`에 `https://*.supabase.co` 추가(포스터). 나머지 보안 헤더 유지.
- 정리: `.next`, `.local-db`, `tsconfig.tsbuildinfo`, `.env.local`, `.vercel`, 캡처 이미지(`docs/*.png`, 테스트 PDF), Next 기본 svg 제외.
- 실행 파일 7개 → 3개: `1_설치확인.cmd`, `2_DB업데이트.cmd`, `3_배포.cmd`.

## 6. 산출물

`Desktop\gokbanjung\`
- 사이트 전체 소스 (위 정리 적용)
- `사용설명서.html` — 더블클릭으로 열림. 참여자용(이름, 매일 학습, 함께 생각하기, 와드 일정, 홈 화면에 추가) / 운영자용(처음 배포, Vercel–GitHub 연결, 환경변수 4개 복사, DB 업데이트, 관리자·교사 승인, 일정 담당자 지정, 질문 게시, 수정 후 다시 올리기, 자주 나는 오류)
- `README.md` — 개발자용 요약

GitHub: `gh` 설치(winget) → 사용자가 브라우저로 1회 로그인 → 비공개 저장소 `gokbanjung` 생성 → 푸시. `.gitignore`로 비밀값 제외 확인 후 푸시. 설치 내역은 `C:\Codework\Codework-도구조사.md`에 기록.

## 7. 검증

- 기존 테스트(`npm test`) 통과 유지.
- 신규 테스트: 일정 권한(조직 범위·임시 저장 비공개·시간대 변환), 질문 게시 권한, 답글·댓글·하트(중복 하트 방지·본인만 삭제). 로컬 PGlite DB로 실행.
- `npm run build` 통과.
- 로컬 실행 후 브라우저로 390px(휴대폰)·820px(태블릿)·1280px(컴퓨터)에서 주요 화면 확인.
- 운영 DB에는 사용자가 확인한 뒤 `2_DB업데이트.cmd`로 신규 마이그레이션만 적용(추가 전용).

## 8. 이번 범위 밖

②의 공과 원문 붙여넣기 분석·게시, 참조자료 패널·형광펜, ② 기존 데이터 이전, 실시간(Realtime) 갱신, 푸시 알림.

## 9. 위험과 대응

| 위험 | 대응 |
|---|---|
| 공유 DB로 기존 사이트 영향 | 신규 표만 추가, 기존 객체 변경 금지, 마이그레이션 적용 전 사용자 확인 |
| 운영 DB 접속 문자열이 로컬에 없음 | 사용자가 Vercel/Supabase 화면에서 복사해 `2_DB업데이트.cmd`에 입력(설명서에 순서 안내) |
| Vercel 무료 요청 크기 4.5 MB | 포스터를 브라우저에서 압축 후 업로드 |
| 비밀값 유출 | `.gitignore` 확인, 푸시 전 파일 목록 검사 |
