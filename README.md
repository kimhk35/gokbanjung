# 곡반정와드 통합 학습 사이트 (gokbanjung)

곡반정와드 복음교리반 학습 사이트(gospel-class)에 comefollowme의 **와드 일정**과 **함께 생각하기**를 합친 사이트입니다.
사용 방법은 사이트의 `/guide` 페이지 또는 이 폴더의 `사용설명서.html`을 보세요. 아래는 개발자용 요약입니다.

## 실행

Node.js 22 이상.

```bash
npm ci
npm run dev      # http://localhost:3000 (DATABASE_URL이 없으면 .local-db 에 개발용 DB 자동 생성)
npm test
npm run build
```

Windows에서는 `1_설치확인.cmd`(설치·검사·조립), `2_DB업데이트.cmd`(새 표 추가), `3_배포.cmd`(GitHub에 올리기 → Vercel 자동 배포)를 더블클릭해도 됩니다.

## 환경변수

| 이름 | 필수 | 용도 |
|---|---|---|
| `DATABASE_URL` | ✔ | Neon 등 PostgreSQL 접속 주소 (서버 전용). 로그인과 파일도 같은 DB에 저장 |
| `NEXT_PUBLIC_SITE_URL` | | 비우면 접속 주소를 자동 사용 |
| `BETTER_AUTH_SECRET` | | 선택. 비우면 서버 전용 표에 서명 키를 한 번 생성해 공유 |
| `BETTER_AUTH_URL` | | 선택. 로그인 기준 주소를 따로 지정할 때 설정 |
| `OPENAI_API_KEY`, `OPENAI_MODEL` | | 비우면 AI 기능 꺼짐 (비용 0) |

Supabase API·Storage·Auth 키는 더 이상 사용하지 않습니다. `supabase/migrations` 폴더 이름은 기존 SQL 이력을 유지하기 위한 것입니다.

## 원문 기반 7일 학습

43주차(2026-10-19~25) `/week/43/day/1`, 44주차(2026-10-26~11-01) `/week/44/day/1`, 46주차(2026-11-09~15) `/week/46/day/1`부터 새 원문 읽기 화면을 사용합니다.
기존 학습·개인 기록은 같은 주소의 `?view=notes`에서 유지합니다.
원문은 공식 사이트 iframe과 원본 링크로 제공하며, 일차별 위치 정보만 앱에 보관합니다.

- [매일 분량 배분 방법과 누락 검사 기준](docs/study/cfm-distribution-method.md)
- [43주차 전체 원문 단위 조사표](docs/study/2026-week-43-source-inventory.csv)
- [44주차 7일 배분·분량 비교·검증 기록](docs/study/2026-week-44-plan.md)
- [44주차 전체 원문 단위 조사표](docs/study/2026-week-44-source-inventory.csv)
- [46주차 다니엘 1~7장 배분·분량·검증 기록](docs/study/2026-week-46-plan.md)

오늘의 질문 배정, 원문 범위별 생각, 자료별 완료 기록에는 추가 마이그레이션
`20261018010000_study_community.sql`, `20261018020000_study_material_progress.sql`이 필요합니다.
이 마이그레이션은 새 표만 추가하며 기존 본문·댓글·개인 기록은 수정하지 않습니다.
운영 적용 전에 아래 DB 업데이트 절차를 따르세요. 43·44·46주차 외의 원문 배분은 아직 등록하지 않았습니다. 46주차 추가에는 새 DB 마이그레이션이 없습니다.

## 데이터베이스 업데이트

기존 `ggc` 스키마의 기록은 유지하며 `npm run db:update`(또는 Neon SQL Editor에 `DB업데이트_SQL편집기용.sql` 붙여 넣기)로 추가 SQL만 적용합니다. 두 번 실행해도 안전합니다.
로그인·파일 저장에는 다음 두 마이그레이션이 필요합니다.

- `20261019030000_database_file_storage.sql`: 서버 전용 파일 저장소(`ggc.stored_files`)
- `20261019040000_database_auth.sql`: Better Auth 계정·세션·서명 키(`public.ggc_auth_*`)

계정 준비:

- 관리자가 아직 없는 DB: `node scripts/bootstrap-admin.mjs`(DB 주소·비밀번호 숨김 입력)로 최초 관리자를 만듭니다. 다른 관리자가 이미 있으면 중단합니다.
- 삭제된 Supabase 시절 계정(관리자·교사·회원): 비밀번호는 복원되지 않습니다. 계정 주인을 확인한 뒤 `npm run account:reconnect`로 새 아이디·비밀번호를 기존 기록에 다시 연결합니다. 역할·승인 상태·개인 기록은 그대로입니다.
- 이후 교사 신청 승인, 교사 계정 생성, 비밀번호 초기화는 관리자 화면에서 합니다.

자료 문서(최대 4MB)는 같은 과정 관리자만 읽을 수 있고, 포스터(최대 2MB)는 `/api/files/posters/...`로 공개됩니다. 삭제된 Supabase에 있던 포스터 원본은 복원되지 않으므로 다시 올려야 합니다.

## 추가된 주소

| 주소 | 내용 |
|---|---|
| `/ward`, `/e/<slug>` | 와드 일정 (달력/목록, 조직 필터, 담당자 게시) |
| `/think`, `/p/<slug>` | 함께 생각하기 (질문·답글·하트·댓글) |
| `/guide` | 사용설명서 (한국어/영어) |

설계서와 작업 계획: `docs/superpowers/`. 예전 gospel-class 문서: `docs/history/`.
