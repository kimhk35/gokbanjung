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
