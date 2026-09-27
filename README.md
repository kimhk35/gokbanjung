> 최신 적용 방법과 최종 아이디 가입 정책은 [DEPLOY_LATEST.md](DEPLOY_LATEST.md)를 따릅니다. 이메일 인증 및 재설정 메일은 현재 가입 절차에서 사용하지 않습니다.

> **직접 배포는 START_HERE.html을 먼저 여세요.** 최신 학습지 수정 기능 포함. 이미 만든 Supabase 프로젝트를 사용하며 초기 DB 생성 단계를 반복하지 않습니다.

# 곡반정와드 복음교리반 전용 학습 사이트

한국어 기본 / EN 전환을 지원하는 2026 구약전서 학습 애플리케이션입니다. 제공된 386쪽 PDF의 52주 날짜·경전 범위·제목을 구조화했습니다.

**현재 상태:** 코드 구현 및 로컬 DB/API 검증까지 진행했습니다. 운영 Supabase 프로젝트와 Vercel은 연결하지 않았습니다. 실제 서비스가 배포된 상태가 아닙니다. 상세 구현 범위와 미완료 항목은 `docs/implementation-status.md`를 확인하세요.

## 빠른 로컬 실행

Node.js 22 이상을 권장합니다. 현재 검증 환경은 Node.js 24입니다.

```bash
npm ci
npm run dev
```

브라우저에서 http://localhost:3000 을 엽니다. 처음 API 요청 시 개발용 PostgreSQL 엔진(PGlite)이 `.local-db/`에 생성되고 SQL 마이그레이션과 교재 데이터가 적용됩니다. 가짜 성공 응답을 사용하지 않고 실제 SQL 저장과 RLS를 실행합니다. 로그인·AI·원격 파일 업로드는 아래의 외부 연결이 필요합니다.

개발 DB는 테스트와 개발에만 사용합니다. `NODE_ENV=production`에서는 `DATABASE_URL`이 없으면 서버 저장을 거부합니다. 서버리스 임시 파일시스템을 운영 저장소로 사용하지 않습니다.

## 기술 스택

- Next.js 16.3.5, React 19, TypeScript
- Tailwind CSS, 접근성 있는 Radix dialog/alert-dialog/tabs
- Supabase PostgreSQL / Auth / private Storage
- `postgres` 트랜잭션 + PostgreSQL RLS. 개발에서는 동일 SQL을 PGlite로 실행
- OpenAI 서버 API, 입력 해시 캐시, 호출 제한, 사용량 메타데이터
- jsPDF + Noto Sans KR 임베딩: 한글 A4 PDF
- Canvas: Insight PNG 및 월간 리워드 기념 카드

## 환경변수

`.env.example`을 `.env.local`로 복사합니다. 비밀키는 저장소에 커밋하지 않습니다.

| 변수                                   | 용도                                                          |
| -------------------------------------- | ------------------------------------------------------------- |
| `DATABASE_URL`                         | Supabase 트랜잭션 풀러 접속 문자열. 서버 전용                 |
| `NEXT_PUBLIC_SUPABASE_URL`             | Supabase 프로젝트 URL                                         |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 공개 API 키. 구형 anon 키 변수도 허용                         |
| `SUPABASE_SERVICE_ROLE_KEY`            | 관리자 파일 업로드 전용 서버 키                               |
| `OPENAI_API_KEY`                       | AI 호출 서버 키                                               |
| `OPENAI_MODEL`                         | 사용할 API 모델. 기본 gpt-4.1-mini, 계정의 모델 접근권한 확인 |
| `NEXT_PUBLIC_SITE_URL`                 | 실제 사이트의 정확한 origin. CSRF 검사에 사용                 |

## Supabase 설정과 마이그레이션

전용 프로젝트 사용을 권장합니다. 현재 연결된 다른 사이트 DB를 자동으로 수정하지 않았습니다.

1. Supabase 프로젝트를 생성하거나 사용할 프로젝트를 명시합니다.
2. Connect에서 PostgreSQL 트랜잭션 풀러 접속 문자열을 가져옵니다.
3. 환경변수를 지정합니다. 아래 스크립트는 마이그레이션·시드 및 비공개 Storage 버킷을 적용합니다.

```bash
node --env-file=.env.local --import tsx scripts/migrate.mts
```

`supabase/migrations/`는 CLI로 생성한 마이그레이션 파일을 포함합니다. 순서대로 적용됩니다. 테이블은 `ggc` 스키마로 분리했습니다. 새 프로젝트에서 위 스크립트를 사용하거나, Supabase CLI의 마이그레이션 관리 방식 중 하나를 정해서 운용하세요. 두 방식을 섞지 마세요.

Supabase Auth에서 이메일/비밀번호 로그인과 이메일 인증을 설정합니다. 실제 사이트 URL을 허용 목록에 등록합니다. Guest에는 Supabase Auth 계정을 생성하지 않습니다.

Storage 버킷 `gospel-materials`는 비공개이며 서버 관리자 API만 사용합니다. 현재 업로드는 Vercel 요청 크기에 맞추어 4MB까지 제한했습니다. 스캔 PDF OCR 및 대용량 직접 업로드는 아직 구현하지 않았습니다.

## 첫 관리자 만들기

첫 관리자는 이메일 하드코딩이나 공개 승격 URL로 생성하지 않습니다.

1. 사이트의 교사 계정 만들기에서 계정을 생성하고 이메일 인증을 완료합니다.
2. 관리 권한이 있는 운영자가 Supabase Auth의 **검증된 사용자 UUID**를 확인합니다.
3. 운영자가 다음 명령을 실행합니다.

```bash
node --env-file=.env.local --import tsx scripts/bootstrap-admin.mts <Supabase-Auth-user-UUID>
```

스크립트는 `auth.users`의 이메일 인증 여부를 확인한 뒤 해당 계정만 ADMIN으로 설정합니다. 실제 관리자 이메일·비밀번호는 코드에 넣지 않았습니다.

교사 계정 생성 → `/teacher/apply` 신청 → `/admin` 승인 → 담당 교사로 선택할 수 있습니다. 승인·거절·정지 변경은 DB의 현재 권한에 바로 반영됩니다.

## 학습 리워드

학습 기록의 질이나 신앙 수준을 점수화하지 않습니다. 리워드는 개인용 디지털 기념물이며 다른 사람의 리워드는 볼 수 없습니다.

| 리워드         | 지급 조건                                      | 중복 방지          |
| -------------- | ---------------------------------------------- | ------------------ |
| 오늘의 새싹    | 마음에 남은 것 + 오늘의 실천 입력 후 일간 완료 | 한국 시간 하루 1개 |
| 한 주의 책갈피 | 해당 주의 7개 일간 학습 완료                   | 주차당 1개         |
| 꾸준한 배움    | 해당 월 서로 다른 21일 이상 일간 완료          | 달마다 1개         |

실제 완료 시각을 DB 서버에서 `Asia/Seoul`로 변환합니다. 과거 공과를 오늘 마쳐도 과거 출석을 소급하지 않습니다. 같은 날 여러 공과를 마치면 그 공과 진도는 각각 완료되지만 출석은 하루만 인정합니다. 연속 출석은 요구하지 않습니다. 지난 리워드는 유지합니다. 21일 달성 시 PNG 기념 카드를 내려받을 수 있습니다.

## 권한과 개인정보

- 익명 접속: 256비트 토큰을 HttpOnly / SameSite=Lax 쿠키로 저장하며, 서버 DB에는 토큰 해시만 저장합니다. 운영에서는 Secure 플래그를 사용합니다.
- 교사/관리자: Supabase `getUser()`로 인증하고 권한은 서버 DB에서 다시 확인합니다.
- 사용자 데이터 트랜잭션은 `SET LOCAL ROLE authenticated` 및 검증한 사용자 claims 아래 RLS를 적용합니다.
- PRIVATE 묵상은 본인만 읽고 수정/삭제할 수 있습니다. 교사·관리자도 읽을 수 없습니다.
- 초안은 본인만, 제출물은 작성자·선택 교사·관리자만 볼 수 있습니다. 교사는 자신에게 온 제출물만 조회합니다.
- 제출물은 당시 활동지 항목과 답변을 snapshot으로 보존합니다.
- Post-before-view는 UI만 숨기지 않고 DB 조회 정책으로 차단합니다.
- 권한이 없는 클라이언트는 보상 기록·역할·세션 토큰을 직접 쓰지 못합니다.
- AI 요약은 동의한 본인의 기록만 사용합니다. 교사용 요약은 공개 생각만 사용합니다.
- CSRF origin 검사, 입력 길이/스키마 검사, 저장·AI 호출 제한을 적용했습니다.
- Guest 데이터 삭제는 연관된 기록/제출물/피드백/리워드를 함께 삭제합니다.
- 이름 없이 접속한 기록은 쿠키를 잃으면 복구할 수 없습니다. 중요한 활동지는 PDF로 보관하세요.

## 한국어 / EN

사이트 메뉴·학습 질문·활동지·기록 안내·리워드에 한국어와 영어 문자열을 제공합니다. 기본 한국어이며 선택한 언어를 기기에 기억합니다. 원문 경전은 번역 생성하지 않고 공식 교재의 해당 언어 페이지로 연결합니다. 영어 주차 제목은 학습용 번역입니다.

사용자 작성 글은 원문을 보존합니다. EN 모드에서는 AI가 연결된 경우 번역을 별도로 표시합니다. 연결 전에는 번역되었다고 가장하지 않고 원문과 안내를 표시합니다. 참여자의 닉네임은 번역하지 않습니다.

## AI

실제 API 키가 있을 때만 호출합니다. 비연결 상태에서 샘플 AI 결과를 반환하지 않습니다. 질문·활동지 초안은 **generated → edited → approved → published**의 상태 전이를 거칩니다. 공개 질문은 주차 화면에 표시됩니다. 생성 결과는 입력 해시로 재사용됩니다.

`src/lib/ai.ts`에 프롬프트와 출력 스키마가 있습니다. 사용 모델은 환경변수로 선택합니다. 비용 로그에는 입력 해시/토큰 수/성공 여부만 저장하며 개인 묵상 원문은 넣지 않습니다. 실제 OpenAI 계정 호출 검증은 아직 하지 않았습니다.

## 테스트와 빌드

```bash
npm test
node --import tsx scripts/service-smoke.mts
node scripts/http-smoke.mjs
npm run build
```

- RLS: Guest 간 묵상 격리, 관리자 묵상 차단, 다른 교사 제출물 차단, 토론 선작성, 역할 승격 차단
- Service: 교사 신청/승인, 교과정 배정, 토론, 활동지 버전, 제출/피드백, 즉시 권한 정지
- Rewards: 중복 완료, 주간 1회, 월간 임계값, 타인 접근, 직접 지급 시도 차단
- HTTP: 익명 세션·실제 저장·리워드·초안·생각벽·권한·CSRF·주요 14개 페이지 응답
- PDF: 실제 exporter로 한국어 A4 2페이지 생성 후 두 페이지 렌더링 확인

HTTP 테스트는 별도 Next 빌드 디렉터리를 사용합니다. 로컬 생성 파일은 `.gitignore`로 제외합니다. Service 테스트의 계정은 **개발 DB 테스트 fixture**이며 실제 로그인 계정이 아닙니다.

## 배포

배포 대상은 요청한 **Vercel**입니다. Vercel 프로젝트에 Next.js 프로젝트를 import하고 환경변수를 등록합니다. Git 저장소에 비밀키를 포함하지 않습니다. 마이그레이션을 먼저 적용한 뒤 배포합니다.

현재 Vercel 연결 및 전용 Supabase 프로젝트 지정이 없어 배포 URL은 없습니다. 미리보기 환경 문제로 Chrome/Safari/Edge 및 모바일의 실제 브라우저 테스트도 완료하지 못했습니다. 운영 계정 연결 후 교사 승인부터 피드백·AI·업로드까지 실제 브라우저에서 다시 확인해야 합니다.

## 주요 폴더

```text
src/app/                 실제 페이지와 API 라우트
src/components/learning/ 주간·일간·활동지·여정·Insight·리워드
src/components/community/생각벽·토론·번역 표시
src/components/teacher/  교사 신청·관리·수업 화면
src/components/admin/    관리자 화면
src/components/ui/       접근성 모달/확인
src/lib/                 인증·DB·권한 서비스·AI·PDF·타입
src/data/curriculum.json  52주 원자료 매핑 및 한/영 데이터
supabase/migrations/     DB·RLS·리워드·공개 정책
supabase/seed.sql         52주·364일·52개 활동지
scripts/                 초기 관리자·마이그레이션·검증
public/fonts/            PDF용 Noto Sans KR 및 OFL 라이선스
public/                  매니페스트·아이콘
 tests/                  DB/RLS/리워드 테스트
 docs/                   지시서·분석·상태·검증 결과
```

공식 자료: https://www.churchofjesuschrist.org/study/manual/come-follow-me-for-home-and-church-old-testament-2026?lang=kor
