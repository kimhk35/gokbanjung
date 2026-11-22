create table if not exists ggc.study_point_events (
  owner_id uuid not null references ggc.actors(id) on delete cascade,
  course_id text not null references ggc.courses(id),
  week integer not null references ggc.weeks(id),
  day integer not null check (day between 1 and 7),
  kind text not null check (kind in ('reading', 'thought')),
  earned_at timestamptz not null default now(),
  primary key (owner_id, week, day, kind)
);

alter table ggc.study_point_events enable row level security;
revoke all on ggc.study_point_events from public, anon, authenticated;

create index if not exists study_point_events_course_reading
  on ggc.study_point_events (course_id, earned_at)
  where kind = 'reading';
