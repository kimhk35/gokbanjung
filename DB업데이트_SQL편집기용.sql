-- ================================================================
-- 곡반정와드 통합 사이트(gokbanjung) 데이터 창고 업데이트
-- 사용법: Supabase → 복음교리반 프로젝트 → SQL Editor → New query
--         → 이 파일 내용을 전부 붙여 넣기 → Run
-- 기존 표와 기록은 건드리지 않고, 새 표만 추가합니다. 두 번 실행해도 안전합니다.
-- 마지막 결과 칸에 "완료: ..." 가 나오면 성공입니다.
-- ================================================================

-- 20260927000000_ward_community.sql
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

-- 20260928000000_notes.sql
-- gokbanjung phase 2: notes on scripture verses and on uploaded lesson text.
-- Additive only; the server reads and writes these tables through privileged
-- transactions with explicit permission checks.
create table if not exists ggc.verse_notes(
 id uuid primary key,
 owner_id uuid not null references ggc.actors(id) on delete cascade,
 book_id text not null check(book_id ~ '^[a-z-]+/[a-z0-9-]+$'),
 chapter integer not null check(chapter between 1 and 200),
 verse_start integer not null check(verse_start between 1 and 200),
 verse_end integer not null check(verse_end between 1 and 200),
 quote text not null default '' check(char_length(quote)<=200),
 body text not null check(char_length(btrim(body)) between 1 and 3000),
 author text not null check(char_length(btrim(author)) between 1 and 50),
 week integer check(week is null or week between 1 and 52),
 status text not null default 'published' check(status in ('published','hidden')),
 created_at timestamptz not null default now(),
 check(verse_end>=verse_start)
);
create index if not exists verse_notes_place on ggc.verse_notes(book_id,chapter,verse_start);
create table if not exists ggc.verse_note_reactions(
 note_id uuid not null references ggc.verse_notes(id) on delete cascade,
 owner_id uuid not null references ggc.actors(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(note_id,owner_id)
);
create table if not exists ggc.verse_note_comments(
 id uuid primary key,
 note_id uuid not null references ggc.verse_notes(id) on delete cascade,
 owner_id uuid not null references ggc.actors(id) on delete cascade,
 author text not null check(char_length(btrim(author)) between 1 and 50),
 body text not null check(char_length(btrim(body)) between 1 and 1500),
 created_at timestamptz not null default now()
);
create index if not exists verse_note_comments_note on ggc.verse_note_comments(note_id,created_at);

create table if not exists ggc.lesson_texts(
 id uuid primary key default gen_random_uuid(),
 week integer not null check(week between 1 and 52),
 lang text not null check(lang in ('ko','en')),
 title text not null check(char_length(btrim(title)) between 1 and 200),
 body_markdown text not null check(char_length(btrim(body_markdown)) between 1 and 204800),
 source_url text not null check(char_length(source_url)<=4096 and source_url ~ '^https://[^/@[:space:]]+([/?#][^[:space:]]*)?$'),
 rights_note text not null check(char_length(btrim(rights_note)) between 1 and 300),
 confirmed_by uuid not null references ggc.actors(id),
 status text not null default 'draft' check(status in ('draft','published')),
 version integer not null default 1 check(version>=1),
 created_by uuid references ggc.actors(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(week,lang,version)
);
create table if not exists ggc.text_notes(
 id uuid primary key,
 lesson_text_id uuid not null references ggc.lesson_texts(id) on delete cascade,
 version integer not null,
 owner_id uuid not null references ggc.actors(id) on delete cascade,
 anchor jsonb not null check(octet_length(anchor::text)<=8192),
 quote text not null check(char_length(btrim(quote)) between 1 and 300),
 body text not null check(char_length(btrim(body)) between 1 and 3000),
 author text not null check(char_length(btrim(author)) between 1 and 50),
 status text not null default 'published' check(status in ('published','hidden')),
 created_at timestamptz not null default now()
);
create index if not exists text_notes_text on ggc.text_notes(lesson_text_id,created_at);
create table if not exists ggc.text_note_reactions(
 note_id uuid not null references ggc.text_notes(id) on delete cascade,
 owner_id uuid not null references ggc.actors(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(note_id,owner_id)
);
create table if not exists ggc.text_note_comments(
 id uuid primary key,
 note_id uuid not null references ggc.text_notes(id) on delete cascade,
 owner_id uuid not null references ggc.actors(id) on delete cascade,
 author text not null check(char_length(btrim(author)) between 1 and 50),
 body text not null check(char_length(btrim(body)) between 1 and 1500),
 created_at timestamptz not null default now()
);
create index if not exists text_note_comments_note on ggc.text_note_comments(note_id,created_at);

alter table ggc.verse_notes enable row level security;
alter table ggc.verse_note_reactions enable row level security;
alter table ggc.verse_note_comments enable row level security;
alter table ggc.lesson_texts enable row level security;
alter table ggc.text_notes enable row level security;
alter table ggc.text_note_reactions enable row level security;
alter table ggc.text_note_comments enable row level security;
revoke all on ggc.verse_notes,ggc.verse_note_reactions,ggc.verse_note_comments,ggc.lesson_texts,ggc.text_notes,ggc.text_note_reactions,ggc.text_note_comments from anon,authenticated;

-- 20260929000000_daily_insights.sql
-- gokbanjung: teacher overrides for the automatic "오늘의 Insight" card.
-- Additive only.
create table if not exists ggc.daily_insights(
 day date primary key,
 title text not null default '' check(char_length(title)<=120),
 question text not null check(char_length(btrim(question)) between 1 and 500),
 topic text not null default '' check(char_length(topic)<=200),
 message text not null default '' check(char_length(message)<=600),
 image_path text check(image_path is null or image_path ~ '^insights/[a-f0-9-]{36}\.(webp|png|jpg)$'),
 updated_by uuid references ggc.actors(id) on delete set null,
 updated_at timestamptz not null default now()
);
alter table ggc.daily_insights enable row level security;
revoke all on ggc.daily_insights from anon,authenticated;

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
  then '완료: 와드 일정·함께 생각하기·의견 달기 표가 준비되었습니다 (기존 기록 유지)'
  else '실패: 표를 만들지 못했습니다'
end as result;
