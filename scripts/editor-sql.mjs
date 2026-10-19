// Builds DB업데이트_SQL편집기용.sql: every gokbanjung migration (2026092x…)
// plus the poster bucket, for pasting into the Supabase SQL Editor (no
// DATABASE_URL needed). All statements are "if not exists", so re-running is safe.
// Run: npm run db:editor-sql
import { readFileSync, readdirSync, writeFileSync } from "node:fs";

const migration = readdirSync("supabase/migrations")
  .filter((f) => /^2026092[7-9]|^202609[3-9]|^20261/.test(f))
  .sort()
  .map(
    (f) =>
      `-- ${f}\n` + readFileSync(`supabase/migrations/${f}`, "utf8").trim(),
  )
  .join("\n\n");
const out = `-- ================================================================
-- 곡반정와드 통합 사이트(gokbanjung) 데이터 창고 업데이트
-- 사용법: Supabase → 복음교리반 프로젝트 → SQL Editor → New query
--         → 이 파일 내용을 전부 붙여 넣기 → Run
-- 기존 표와 기록은 건드리지 않고, 새 표만 추가합니다. 두 번 실행해도 안전합니다.
-- 마지막 결과 칸에 "완료: ..." 가 나오면 성공입니다.
-- ================================================================

${migration}

-- 일정·질문 포스터 사진 보관함 (공개 읽기, 2MB, 사진만)
do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
    values('ggc-posters','ggc-posters',true,2097152,array['image/webp','image/png','image/jpeg'])
    on conflict(id) do nothing;
  end if;
end $$;

select case
  when to_regclass('ggc.events') is not null
   and to_regclass('ggc.prompt_reply_reactions') is not null
   and to_regclass('ggc.verse_notes') is not null
   and to_regclass('ggc.text_note_comments') is not null
   and to_regclass('ggc.daily_insights') is not null
   and to_regclass('ggc.study_prompt_assignments') is not null
   and to_regclass('ggc.study_range_thoughts') is not null
   and to_regclass('ggc.study_material_progress') is not null
   and to_regclass('ggc.study_day_completion') is not null
  then '완료: 와드 일정·함께 생각하기·의견 달기 표가 준비되었습니다 (기존 기록 유지)'
  else '실패: 표를 만들지 못했습니다'
end as result;
`;
writeFileSync("DB업데이트_SQL편집기용.sql", out);
console.log("DB업데이트_SQL편집기용.sql written");
