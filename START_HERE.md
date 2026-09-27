# 곡반정와드 복음교리반 — 직접 배포 안내

> 아래는 최초 배포 참고 안내입니다. 이번 업데이트는 반드시 **DEPLOY_LATEST.md 또는 START_HERE.html의 01 → 05 → (필요 시 06) → 04 순서**를 따르세요. 기존 사이트는 https://gokbanjeong-gospel-class.vercel.app 입니다.

이 패키지는 **최신 학습지 수정 기능을 포함한 전체 코드**입니다. Windows에서 GitHub 없이 Vercel에 직접 업로드할 수 있습니다. 소요 시간은 설치·로그인·비밀값 입력·빌드 상태에 따라 달라집니다.

## 0. 이미 준비된 것

- Supabase 프로젝트: `gokbanjeong-gospel-class`
- 프로젝트 ID: `xxoxvehviwtkmpigltat` / 조직: Ajou University / 서울 리전
- DB: 52주, 364일, 활동지 52개 및 리워드·권한 규칙 적용 완료
- 학습지: 한/영 문항 추가·수정·삭제·순서 변경·미리보기·새 버전 게시
- 이전 제출물의 문항과 답안 보존, 오래된 버전으로 덮어쓰기 방지
- Vercel 배포 파일·Windows 실행 파일 준비. **배포 성공 주소는 아직 확인되지 않았습니다.**
- OpenAI 모델: `gpt-4.1-mini`. 실제 키는 포함하지 않았습니다.

**Supabase 프로젝트를 새로 만들지 마세요. 이미 만든 위 프로젝트를 사용합니다. 기존 mathmckay·mckayclinic 프로젝트는 선택하지 않습니다.**

## 1. 압축 풀기와 Node.js 설치

1. ZIP 파일을 다운로드하고 마우스 오른쪽 → 모두 압축 풀기.
2. `gospel-class` 폴더를 엽니다. `package.json`과 번호가 붙은 `.cmd` 파일이 보여야 합니다.
3. [Node.js](https://nodejs.org/en/download)에서 **Node.js 22 LTS Windows 설치 파일(.msi)**을 설치합니다. 기본 옵션으로 진행합니다.
4. 설치 후 열려 있던 터미널은 닫고 다시 엽니다. ZIP 내부에서 바로 실행하지 마세요.
5. `01_INSTALL_AND_CHECK.cmd`를 더블클릭합니다. 패키지 설치와 빌드 검사를 실행합니다. 처음에는 몇 분 걸릴 수 있습니다.
6. 마지막에 `DONE`이 나타나면 다음 단계로 갑니다. `FAILED`면 오류를 해결한 다음 다시 실행합니다.

## 2. Vercel 로그인과 프로젝트 연결

`02_LINK_VERCEL.cmd`를 더블클릭합니다. Vercel CLI 59.16.0을 사용하며 브라우저 로그인 안내가 나타납니다.

| 터미널 질문 | 선택 |
|---|---|
| 로그인·인증 | 사이트를 운영할 본인 Vercel 계정으로 로그인 |
| Set up this directory? | Y |
| Which scope? | 본인의 무료 Hobby 계정/작업공간 |
| Link to existing project? | 같은 사이트 프로젝트가 이미 보이면 그것을 선택. 없으면 N |
| Project name | `gokbanjeong-gospel-class` — 이미 사용 중이면 고유한 이름으로 변경 |
| Directory | `./` |
| Framework | Next.js 자동 감지값 유지 |
| 추가 설정 변경 | 기본값 유지 |

이 단계는 프로젝트 연결 단계입니다. 유료 Pro 업그레이드는 선택하지 않습니다. 기존 다른 사이트 프로젝트와 연결하면 덮어쓸 수 있으므로 프로젝트 이름을 확인하세요. 생성된 `.vercel/project.json`은 다음 실행을 위한 연결 정보이니 보관합니다.

## 3. 비밀값 3개 준비

[생성된 Supabase 프로젝트](https://supabase.com/dashboard/project/xxoxvehviwtkmpigltat)를 엽니다.

### A. DATABASE_URL — DB 접속 문자열

상단 **Connect → Connection string → Transaction pooler**를 선택합니다. 보통 6543 포트입니다. 화면에 제공되는 값을 그대로 사용하고 `[YOUR-PASSWORD]` 부분만 실제 DB 비밀번호로 대체합니다. DB 비밀번호는 로그인 비밀번호·API 키와 다릅니다.

비밀번호를 모르면 **이 새 프로젝트의 Database 설정에서 DB 비밀번호 재설정**을 사용합니다. 다른 프로젝트의 비밀번호는 바꾸지 마세요. 연결 문자열에는 특수문자 URL 인코딩이 필요할 수 있으므로 비밀번호는 길고 무작위인 영문·숫자 조합으로 만들면 입력이 간단합니다. 호스트 주소와 pooler의 숫자 부분은 추측하지 않고 Connect 화면에서 복사합니다.

### B. SUPABASE_SERVICE_ROLE_KEY — 업로드용 서버 키

프로젝트 **Settings → API Keys → Legacy API Keys**에서 `service_role` 키를 확인합니다. `anon` 또는 공개 publishable 키를 넣는 자리가 아닙니다. 이 값은 Vercel 서버 환경변수에만 입력합니다.

### C. OPENAI_API_KEY — AI 호출 키

[OpenAI API Keys](https://platform.openai.com/api-keys)에서 전용 프로젝트 키를 생성합니다. API 결제 설정·사용 가능한 잔액도 확인합니다. 키는 채팅이나 소스 파일에 적지 않고 다음 단계의 Vercel 설정에 직접 입력합니다.

## 4. Vercel에 환경변수 등록

[Vercel Dashboard](https://vercel.com/dashboard) → 방금 연결한 프로젝트 → **Settings → Environment Variables**.

아래 값을 각각 추가합니다. 환경은 **Production과 Preview**를 선택합니다. 비밀값은 Sensitive 옵션이 제공되면 켭니다. `manual-deploy/ENVIRONMENT.example.txt`에서 공개값과 항목 이름을 복사할 수 있습니다. 예시의 `PASTE_...` 문자열 자체를 등록하지 마세요.

| Name | Value | 구분 |
|---|---|---|
| `DATABASE_URL` | 3-A에서 복사한 실제 접속 문자열 | 비밀 |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxoxvehviwtkmpigltat.supabase.co` | 공개 |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 예시 파일에 입력된 `sb_publishable_...` 값 | 공개 |
| `SUPABASE_SERVICE_ROLE_KEY` | 3-B의 service_role 키 | 비밀 |
| `OPENAI_API_KEY` | 3-C의 OpenAI 키 | 비밀 |
| `OPENAI_MODEL` | `gpt-4.1-mini` | 일반 |

**처음에는 `NEXT_PUBLIC_SITE_URL`을 등록하지 마세요.** 코드가 실제 요청 주소를 기준으로 검사합니다. 특히 `http://localhost:3000`을 Vercel에 등록하면 실제 사이트의 저장 요청이 차단됩니다. 이후 대표 도메인이 확정됐을 때만 그 HTTPS 주소를 설정할 수 있습니다.

`LOCAL_DATABASE`, `LOCAL_DATABASE_PATH`도 Vercel에는 등록하지 않습니다. 로컬 환경파일은 자동으로 배포에서 제외됩니다. GitHub 연결이나 Vercel 토큰을 코드에 넣을 필요가 없습니다.

등록 후 `03_LIST_ENVIRONMENT.cmd`로 항목 목록을 확인할 수 있습니다. 이 목록 확인만으로 비밀값의 유효성까지 검증되지는 않습니다. 화면에서는 Settings → Build and Deployment의 Node.js가 22.x인지 확인합니다.

## 5. 운영 배포

`04_DEPLOY_PRODUCTION.cmd`를 더블클릭합니다. 터미널에 표시되는 연결 프로젝트를 확인합니다. 이 단계에서 코드가 Vercel에 전송되고 운영 사이트가 생성·갱신됩니다.

빌드가 성공하면 `https://....vercel.app` 주소가 표시됩니다. Vercel 프로젝트 Dashboard의 **Visit**으로 접속합니다. 환경변수를 수정했다면 이 파일을 다시 실행하거나 Dashboard에서 Redeploy해야 변경사항이 반영됩니다.

## 6. 로그인과 관리자 준비

1. 위 Supabase 프로젝트의 **Authentication → URL Configuration → Site URL**에 Vercel의 실제 대표 HTTPS 주소를 등록합니다. Redirect URLs에도 필요한 동일 사이트 경로를 등록합니다.
2. **Authentication → Users → Add user → Create new user**에서 본인의 관리자 이메일과 새 비밀번호로 계정을 만듭니다. Auto Confirm 옵션이 제공되면 본인 계정에 사용합니다. 일반 회원가입을 쓴다면 이메일 인증을 먼저 완료합니다.
3. 생성한 사용자의 UUID를 복사합니다.
4. `manual-deploy/03_SET_ADMIN.sql`을 메모장으로 열고 `YOUR_CONFIRMED_AUTH_USER_UUID` 한 곳을 복사한 UUID로 대체합니다.
5. Supabase **SQL Editor → New query**에 붙여 넣고 Run합니다. 이 SQL은 지정된 인증 사용자 한 명을 사이트 관리자로 설정합니다.
6. 실제 사이트의 `/teacher`에서 방금 만든 이메일과 비밀번호로 로그인하고 `/admin`에 접속합니다.

**이 사이트의 관리자 계정은 mathmckay.kr 관리자 계정과 별개입니다.** 승인된 관리자는 교사 신청을 승인할 수 있습니다. 일반 학습자는 게스트로 시작할 수 있습니다.

## 7. 업로드와 DB 확인

이미 DB를 구성했으므로 `supabase/seed.sql`이나 초기 마이그레이션을 다시 실행할 필요가 없습니다. 확인하려면 `manual-deploy/01_CHECK_DATABASE.sql`을 SQL Editor에서 실행합니다. 결과는 52 / 364 / 52여야 합니다.

교재 파일 업로드용 private bucket은 `manual-deploy/02_ENABLE_UPLOADS.sql`로 준비할 수 있습니다. 여러 번 실행해도 기존 bucket을 삭제하거나 공개로 바꾸지 않습니다. 업로드 최대 크기는 파일당 4MB입니다.

## 8. 실제 사용 확인

프로젝트 폴더의 빈 공간을 Shift+우클릭하여 터미널을 열고 아래를 실행합니다. YOUR-SITE 부분은 실제 주소로 바꿉니다.

```bash
npm run check:live -- https://YOUR-SITE.vercel.app
```

홈 응답, 게스트 생성, 52주 조회, 게스트의 교사·관리자 API 접근 차단을 검사합니다. 빈 게스트 세션 하나를 만들고 AI는 호출하지 않습니다.

그다음 브라우저에서 아래를 직접 확인합니다.

- 새 시크릿 창에서 접속 → 한국어 기본, EN/한국어 전환
- 일간 학습 작성 → 새로고침 후 유지 → 완료 → 새싹 중복 지급 안 됨
- 관리자 로그인 → 교사 관리 및 학습지 편집
- 학습지 문항 추가·이동·저장 → 학습자 화면에서 새 문항 확인
- 학습지 PDF 내려받기와 한글 표시
- 교사 선택·제출·피드백
- AI 생성 1회 성공 확인. 이 검사는 실제 API 사용료가 발생합니다.

## 문제 해결

| 증상 | 확인할 사항 |
|---|---|
| node 또는 npm을 찾을 수 없음 | Node.js 설치 후 터미널/실행 파일 다시 열기 |
| PowerShell에서 npm.ps1 차단 | 제공한 `.cmd` 파일을 사용하거나 `npm.cmd`로 실행. 전체 보안 정책을 해제할 필요 없음 |
| Vercel 로그인 화면만 보임 | Vercel Deployment Protection 설정 확인. 학습자가 접근할 운영 배포는 필요한 공개 접근 설정 적용 |
| 화면은 뜨지만 학습 기록 저장 실패 | DATABASE_URL 실제 비밀번호·6543 pooler 주소 확인, Vercel Runtime Logs 확인 |
| origin_rejected | NEXT_PUBLIC_SITE_URL이 localhost 또는 다른 배포 URL인지 확인. 삭제 후 재배포 가능 |
| 로그인 실패 | 이 Supabase 프로젝트의 Auth 계정인지, 이메일 확인됐는지, 공개 URL/키가 같은 프로젝트 것인지 확인 |
| API 키 연결 후 AI 실패 | Vercel 재배포 여부, OpenAI 프로젝트 권한·결제·잔액 확인 |
| 학습지 변경 알림 | 다른 교사가 새 버전을 게시함. 기존 입력을 보존한 뒤 새로고침해 확인 |
| 업로드 실패 | 4MB 이하, private bucket 생성, service_role 환경변수 확인 |
| 빌드 실패 | Vercel Build Logs의 첫 오류 확인. Node.js 22.x와 npm ci 설정 확인 |

오류를 문의할 때는 오류 문구와 화면을 보내되 API 키·비밀번호·DATABASE_URL 값은 가려 주세요.

## 구현 범위와 비용

이 패키지는 배포 준비된 코드이며, 실제 운영 배포·비밀값 연결·로그인/AI 검증 완료를 의미하지 않습니다. 전체 지시서의 미완료 항목은 `docs/implementation-status.md`에 있습니다. 교재 본문 전체 구조화, 일부 고급 기능, 실제 모바일 브라우저 QA는 남아 있습니다.

Vercel은 사용자가 선택한 무료 Hobby 범위로 운영합니다. 이미 생성한 Supabase 프로젝트의 승인된 추가 요금은 월 10달러 기준이며, OpenAI는 실제 호출량에 따라 별도 과금됩니다. 이 실행 파일들은 유료 플랜 업그레이드나 추가 DB 프로젝트 생성을 실행하지 않습니다.

## 공식 참고

- https://vercel.com/docs/cli/deploy
- https://vercel.com/docs/environment-variables
- https://supabase.com/docs/guides/database/connecting-to-postgres
- https://nodejs.org/en/download
