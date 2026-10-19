-- Additive, server-only self-reported progress. Question replies are independent.
create table if not exists ggc.study_material_progress (
 owner_id uuid not null references ggc.actors(id) on delete cascade,
 week int not null check (week between 1 and 52),
 day int not null check (day between 1 and 7),
 track text not null check (track in ('adult','family')),
 task_id text not null,
 updated_at timestamptz not null default now(),
 primary key(owner_id,week,day,track,task_id)
);
alter table ggc.study_material_progress enable row level security;
revoke all on ggc.study_material_progress from anon,authenticated;
-- Material-based completion is independent of legacy reflections and rewards.
create table if not exists ggc.study_day_completion (
 owner_id uuid not null references ggc.actors(id) on delete cascade,
 week int not null,
 day int not null,
 primary key(owner_id,week,day)
);
alter table ggc.study_day_completion enable row level security;
revoke all on ggc.study_day_completion from anon,authenticated;
