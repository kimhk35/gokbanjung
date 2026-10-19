-- Add metadata and reader thoughts without altering existing prompt tables.
create table if not exists ggc.study_prompt_assignments (
 prompt_id uuid primary key references ggc.prompts(id) on delete cascade,
 week integer not null check (week between 1 and 52),
 day integer not null check (day between 1 and 7),
 updated_at timestamptz not null default now(),
 unique(week,day)
);
create table if not exists ggc.study_range_thoughts (
 id uuid primary key,
 owner_id uuid not null references ggc.actors(id) on delete cascade,
 week integer not null check (week between 1 and 52),
 day integer not null check (day between 1 and 7),
 track text not null check (track in ('adult','family')),
 source_path text not null check (source_path ~ '^/study/[a-zA-Z0-9/_-]+$' and source_path not like '%//%'),
 anchor text not null check (char_length(anchor) between 1 and 200 and anchor ~ '^[a-zA-Z0-9][a-zA-Z0-9_,.-]*$'),
 label text not null check (char_length(btrim(label)) between 1 and 200),
 body text not null check (char_length(btrim(body)) between 1 and 3000),
 author text not null check (char_length(btrim(author)) between 1 and 50),
 visibility text not null check (visibility in ('public','private')),
 created_at timestamptz not null default now()
);
create index if not exists study_range_place on ggc.study_range_thoughts(week,source_path,anchor,created_at);
alter table ggc.study_prompt_assignments enable row level security;
alter table ggc.study_range_thoughts enable row level security;
-- Access only through the authenticated server API, which filters private rows.
revoke all on ggc.study_prompt_assignments,ggc.study_range_thoughts from anon,authenticated;
