-- Additive upgrade; existing learning records are preserved.
alter table ggc.actors drop constraint actors_role_check;
alter table ggc.actors add constraint actors_role_check check(role in ('GUEST','MEMBER','TEACHER_PENDING','TEACHER','ADMIN'));
alter table ggc.reward_events drop constraint reward_events_kind_check;
alter table ggc.reward_events add constraint reward_events_kind_check check(kind in ('daily','weekly','monthly21','quiz_daily','quiz_weekly','quiz_monthly'));
create table ggc.account_requests(
 user_id uuid primary key, actor_id uuid not null unique references ggc.actors(id) on delete cascade,
 email text not null, status text not null default 'pending' check(status in ('pending','approved','rejected','suspended')),
 reviewed_by uuid references ggc.actors(id), created_at timestamptz not null default now()
);
alter table ggc.account_requests enable row level security;
revoke all on ggc.account_requests from public,anon,authenticated;
create table ggc.quiz_sets(
 id uuid primary key default gen_random_uuid(),course_id text not null references ggc.courses(id),
 kind text not null check(kind in ('daily','weekly','monthly')),period text not null,language text not null check(language in ('ko','en')),
 scope jsonb not null,questions jsonb,status text not null default 'generating' check(status in ('generating','ready','failed')),
 updated_at timestamptz not null default now(),unique(course_id,kind,period,language)
);
create table ggc.quiz_attempts(
 id uuid primary key default gen_random_uuid(),owner_id uuid not null references ggc.actors(id) on delete cascade,
 quiz_id uuid not null references ggc.quiz_sets(id),answers jsonb not null,correct integer not null,total integer not null,
 created_at timestamptz not null default now(),check(total in (3,10,20)),check(correct between 0 and total)
);
create index quiz_attempts_owner on ggc.quiz_attempts(owner_id,created_at desc);
alter table ggc.quiz_sets enable row level security;
alter table ggc.quiz_attempts enable row level security;
revoke all on ggc.quiz_sets,ggc.quiz_attempts from public,anon,authenticated;
grant select on ggc.quiz_attempts to authenticated;
create policy quiz_attempts_self on ggc.quiz_attempts for select to authenticated using(owner_id=(select ggc.uid()));
