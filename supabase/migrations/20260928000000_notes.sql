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
