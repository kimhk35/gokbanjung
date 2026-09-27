-- ================================================================
-- 곡반정와드 통합 사이트(gokbanjung) 데이터 창고 업데이트
-- 사용법: Supabase → 복음교리반 프로젝트 → SQL Editor → New query
--         → 이 파일 내용을 전부 붙여 넣기 → Run
-- 기존 표와 기록은 건드리지 않고, 새 표만 추가합니다. 두 번 실행해도 안전합니다.
-- 마지막 결과 칸에 "완료: ..." 가 나오면 성공입니다.
-- ================================================================

-- gokbanjung: ward calendar + shared study prompts. Additive only; the
-- server reads and writes these tables through privileged transactions.
create table if not exists ggc.event_managers(
 actor_id uuid not null references ggc.actors(id) on delete cascade,
 organization text not null check(organization in ('all','primary','relief','elders','youth','sunday-school')),
 created_by uuid references ggc.actors(id) on delete set null,
 created_at timestamptz not null default now(),
 primary key(actor_id,organization)
);
create table if not exists ggc.events(
 id uuid primary key default gen_random_uuid(),
 slug text not null unique default substr(replace(gen_random_uuid()::text,'-',''),1,12) check(slug ~ '^[a-f0-9]{12}$'),
 title text not null check(char_length(btrim(title)) between 1 and 160),
 description text not null default '' check(char_length(description)<=5000),
 starts_at timestamptz not null,
 ends_at timestamptz not null,
 location text check(location is null or char_length(btrim(location)) between 1 and 300),
 organizations text[] not null check(cardinality(organizations) between 1 and 6 and organizations <@ array['all','primary','relief','elders','youth','sunday-school']::text[]),
 status text not null default 'draft' check(status in ('draft','published','cancelled')),
 poster_path text check(poster_path is null or poster_path ~ '^events/[a-f0-9-]{36}\.(webp|png|jpg)$'),
 created_by uuid references ggc.actors(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check(ends_at>starts_at)
);
create index if not exists events_time on ggc.events(starts_at,ends_at);
create table if not exists ggc.prompts(
 id uuid primary key default gen_random_uuid(),
 slug text not null unique default substr(replace(gen_random_uuid()::text,'-',''),1,12) check(slug ~ '^[a-f0-9]{12}$'),
 title text not null check(char_length(btrim(title)) between 1 and 160),
 question text not null check(char_length(btrim(question)) between 1 and 3000),
 reading_text text not null default '' check(char_length(reading_text)<=10000),
 source_url text check(source_url is null or (char_length(source_url)<=4096 and source_url ~ '^https://[^/@[:space:]]+([/?#][^[:space:]]*)?$')),
 reference_label text check(reference_label is null or char_length(btrim(reference_label)) between 1 and 200),
 week integer check(week is null or week between 1 and 52),
 author text not null check(char_length(btrim(author)) between 1 and 50),
 poster_path text check(poster_path is null or poster_path ~ '^prompts/[a-f0-9-]{36}\.(webp|png|jpg)$'),
 created_by uuid not null references ggc.actors(id) on delete cascade,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists prompts_created on ggc.prompts(created_at desc);
create index if not exists prompts_week on ggc.prompts(week);
create table if not exists ggc.prompt_replies(
 id uuid primary key,
 prompt_id uuid not null references ggc.prompts(id) on delete cascade,
 owner_id uuid not null references ggc.actors(id) on delete cascade,
 author text not null check(char_length(btrim(author)) between 1 and 50),
 body text not null check(char_length(btrim(body)) between 1 and 3000),
 status text not null default 'published' check(status in ('published','hidden')),
 created_at timestamptz not null default now()
);
create index if not exists prompt_replies_prompt on ggc.prompt_replies(prompt_id,created_at);
create table if not exists ggc.prompt_reply_comments(
 id uuid primary key,
 reply_id uuid not null references ggc.prompt_replies(id) on delete cascade,
 owner_id uuid not null references ggc.actors(id) on delete cascade,
 author text not null check(char_length(btrim(author)) between 1 and 50),
 body text not null check(char_length(btrim(body)) between 1 and 1500),
 created_at timestamptz not null default now()
);
create index if not exists prompt_reply_comments_reply on ggc.prompt_reply_comments(reply_id,created_at);
create table if not exists ggc.prompt_reply_reactions(
 reply_id uuid not null references ggc.prompt_replies(id) on delete cascade,
 owner_id uuid not null references ggc.actors(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(reply_id,owner_id)
);
alter table ggc.event_managers enable row level security;
alter table ggc.events enable row level security;
alter table ggc.prompts enable row level security;
alter table ggc.prompt_replies enable row level security;
alter table ggc.prompt_reply_comments enable row level security;
alter table ggc.prompt_reply_reactions enable row level security;
revoke all on ggc.event_managers,ggc.events,ggc.prompts,ggc.prompt_replies,ggc.prompt_reply_comments,ggc.prompt_reply_reactions from anon,authenticated;

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
  then '완료: 와드 일정·함께 생각하기 표가 준비되었습니다 (기존 기록 유지)'
  else '실패: 표를 만들지 못했습니다'
end as result;
