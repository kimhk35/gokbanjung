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
| `DATABASE_URL` | ✔ | Supabase 트랜잭션 풀러 주소 (서버 전용) |
| `NEXT_PUBLIC_SUPABASE_URL` | ✔ | Supabase 프로젝트 주소 |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | ✔ | 공개 키 (구형 `NEXT_PUBLIC_SUPABASE_ANON_KEY`도 허용) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✔ | 서버 키: 교사 계정 생성, 비밀번호 초기화, 포스터 업로드 |
| `NEXT_PUBLIC_SITE_URL` | | 비우면 접속 주소를 자동 사용 |
| `OPENAI_API_KEY`, `OPENAI_MODEL` | | 비우면 AI 기능 꺼짐 (비용 0) |

## 원문 기반 7일 학습

43주차(2026-10-19~25) `/week/43/day/1`부터 새 원문 읽기 화면을 사용합니다.
기존 학습·개인 기록은 같은 주소의 `?view=notes`에서 유지합니다.
원문은 공식 사이트 iframe과 원본 링크로 제공하며, 일차별 위치 정보만 앱에 보관합니다.

- [매일 분량 배분 방법과 누락 검사 기준](docs/study/cfm-distribution-method.md)
- [43주차 전체 원문 단위 조사표](docs/study/2026-week-43-source-inventory.csv)

오늘의 질문 배정, 원문 범위별 생각, 자료별 완료 기록에는 추가 마이그레이션
`20261018010000_study_community.sql`, `20261018020000_study_material_progress.sql`이 필요합니다.
이 마이그레이션은 새 표만 추가하며 기존 본문·댓글·개인 기록은 수정하지 않습니다.
운영 적용 전에 아래 DB 업데이트 절차를 따르세요. 다른 주차의 배분은 아직 등록하지 않았습니다.

## 데이터베이스 업데이트

기존 gospel-class Supabase(`ggc` 스키마)를 함께 씁니다. 새 마이그레이션 `supabase/migrations/20260927000000_ward_community.sql`은 표 추가만 합니다.
운영 DB 적용: `npm run db:update` (포스터 버킷 `ggc-posters`도 함께 만듭니다).

## 추가된 주소

| 주소 | 내용 |
|---|---|
| `/ward`, `/e/<slug>` | 와드 일정 (달력/목록, 조직 필터, 담당자 게시) |
| `/think`, `/p/<slug>` | 함께 생각하기 (질문·답글·하트·댓글) |
| `/guide` | 사용설명서 (한국어/영어) |

설계서와 작업 계획: `docs/superpowers/`. 예전 gospel-class 문서: `docs/history/`.
