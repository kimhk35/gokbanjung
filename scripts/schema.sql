create schema if not exists ggc;
revoke all on schema ggc from public;
grant usage on schema ggc to authenticated;
create table ggc.courses(id text primary key,title jsonb not null,start_date date,active boolean not null default true);
create table ggc.actors(id uuid primary key default gen_random_uuid(),kind text not null check(kind in ('guest','user')),role text not null default 'GUEST' check(role in ('GUEST','TEACHER_PENDING','TEACHER','ADMIN')),nickname text not null default '',course_id text not null default 'old-testament-2026',teacher_id uuid references ggc.actors(id),created_at timestamptz not null default now());
create table ggc.guest_sessions(token_hash text primary key,actor_id uuid not null references ggc.actors(id) on delete cascade,expires_at timestamptz not null);
create table ggc.course_teachers(course_id text references ggc.courses(id),teacher_id uuid references ggc.actors(id) on delete cascade,primary key(course_id,teacher_id));
create table ggc.teacher_applications(id uuid primary key default gen_random_uuid(),user_id uuid not null unique references ggc.actors(id) on delete cascade,name text not null,email text not null,ward text not null,message text not null,status text not null default 'pending' check(status in ('pending','approved','rejected','suspended')),reviewed_by uuid references ggc.actors(id),created_at timestamptz not null default now());
create table ggc.weeks(id integer primary key,course_id text not null references ggc.courses(id),data jsonb not null,status text not null check(status in ('draft','published')),version integer not null default 1);
create table ggc.daily_lessons(id text primary key,week integer references ggc.weeks(id),day integer check(day between 1 and 7),data jsonb not null,unique(week,day));
create table ggc.reflections(id uuid primary key default gen_random_uuid(),owner_id uuid not null references ggc.actors(id) on delete cascade,week integer not null references ggc.weeks(id),day integer not null check(day between 1 and 7),content jsonb not null,visibility text not null default 'PRIVATE' check(visibility='PRIVATE'),updated_at timestamptz not null default now(),unique(owner_id,week,day));
create table ggc.lesson_progress(id uuid primary key default gen_random_uuid(),owner_id uuid not null references ggc.actors(id) on delete cascade,week integer not null references ggc.weeks(id),day integer not null check(day between 1 and 7),created_at timestamptz not null default now(),unique(owner_id,week,day));
create table ggc.bookmarks(id uuid primary key default gen_random_uuid(),owner_id uuid not null references ggc.actors(id) on delete cascade,week integer not null references ggc.weeks(id),created_at timestamptz not null default now(),unique(owner_id,week));
create table ggc.personal_questions(id uuid primary key default gen_random_uuid(),owner_id uuid not null references ggc.actors(id) on delete cascade,week integer not null references ggc.weeks(id),content text not null,unique(owner_id,week));
create table ggc.sticky_notes(id uuid primary key default gen_random_uuid(),owner_id uuid not null references ggc.actors(id) on delete cascade,course_id text not null references ggc.courses(id),week integer not null references ggc.weeks(id),content text not null check(length(content) between 1 and 1200),display_name text not null,is_anonymous boolean not null default false,is_pinned boolean not null default false,status text not null default 'published' check(status in ('pending','published','hidden')),created_at timestamptz not null default now());
create table ggc.sticky_reactions(id uuid primary key default gen_random_uuid(),owner_id uuid not null references ggc.actors(id) on delete cascade,note_id uuid not null references ggc.sticky_notes(id) on delete cascade,unique(owner_id,note_id));
create table ggc.sticky_comments(id uuid primary key default gen_random_uuid(),owner_id uuid not null references ggc.actors(id) on delete cascade,note_id uuid not null references ggc.sticky_notes(id) on delete cascade,content text not null,display_name text not null,created_at timestamptz not null default now());
create table ggc.discussion_rooms(id uuid primary key default gen_random_uuid(),course_id text not null references ggc.courses(id),teacher_id uuid not null references ggc.actors(id),week integer not null references ggc.weeks(id),title text not null,mode text not null check(mode in ('OPEN','POST_BEFORE_VIEW','ANONYMOUS','TEACHER_MODERATED','READ_ONLY_AFTER_CLOSE')),status text not null default 'open' check(status in ('open','closed')),closes_at timestamptz,created_at timestamptz not null default now());
create table ggc.discussion_posts(id uuid primary key default gen_random_uuid(),owner_id uuid not null references ggc.actors(id) on delete cascade,room_id uuid not null references ggc.discussion_rooms(id) on delete cascade,content text not null check(length(content) between 1 and 6000),display_name text not null,status text not null default 'published' check(status in ('published','pending','hidden')),created_at timestamptz not null default now());
create table ggc.discussion_comments(id uuid primary key default gen_random_uuid(),owner_id uuid not null references ggc.actors(id) on delete cascade,post_id uuid not null references ggc.discussion_posts(id) on delete cascade,parent_id uuid references ggc.discussion_comments(id) on delete cascade,content text not null,display_name text not null,created_at timestamptz not null default now());
create table ggc.questions(id uuid primary key default gen_random_uuid(),owner_id uuid not null references ggc.actors(id) on delete cascade,course_id text not null references ggc.courses(id),teacher_id uuid not null references ggc.actors(id),week integer not null references ggc.weeks(id),content text not null,visibility text not null check(visibility in ('TEACHER','CLASS','ANONYMOUS')),response text,created_at timestamptz not null default now());
create table ggc.worksheets(id uuid primary key default gen_random_uuid(),course_id text not null references ggc.courses(id),week integer not null unique references ggc.weeks(id),items jsonb not null,version integer not null default 1,status text not null default 'published' check(status in ('draft','published')),created_by uuid references ggc.actors(id));
create table ggc.worksheet_submissions(id uuid primary key default gen_random_uuid(),owner_id uuid not null references ggc.actors(id) on delete cascade,course_id text not null references ggc.courses(id),week integer not null references ggc.weeks(id),teacher_id uuid references ggc.actors(id),answers jsonb not null default '{}',worksheet_snapshot jsonb not null default '{}',status text not null default 'DRAFT' check(status in ('DRAFT','SUBMITTED','VIEWED','FEEDBACK','RETURNED')),created_at timestamptz not null default now(),submitted_at timestamptz);
create unique index one_draft on ggc.worksheet_submissions(owner_id,week) where status='DRAFT';
create table ggc.teacher_feedback(id uuid primary key default gen_random_uuid(),submission_id uuid not null references ggc.worksheet_submissions(id) on delete cascade,teacher_id uuid not null references ggc.actors(id),content text not null,created_at timestamptz not null default now());
create table ggc.ai_content(id uuid primary key default gen_random_uuid(),owner_id uuid not null references ggc.actors(id) on delete cascade,course_id text not null references ggc.courses(id),week integer references ggc.weeks(id),feature text not null,language text not null check(language in ('ko','en')),content jsonb not null,status text not null default 'generated' check(status in ('generated','edited','approved','published')),input_hash text not null,created_at timestamptz not null default now());
create table ggc.ai_generations(id uuid primary key default gen_random_uuid(),owner_id uuid references ggc.actors(id) on delete set null,feature text not null,input_hash text not null,model text not null,status text not null,tokens_input integer,tokens_output integer,created_at timestamptz not null default now());
create table ggc.rate_limits(key text primary key,hits integer not null,reset_at timestamptz not null);
create table ggc.moderation_reports(id uuid primary key default gen_random_uuid(),owner_id uuid not null references ggc.actors(id) on delete cascade,course_id text not null references ggc.courses(id),content_type text not null,content_id uuid not null,reason text not null,status text not null default 'pending',created_at timestamptz not null default now());
create table ggc.resources(id uuid primary key default gen_random_uuid(),course_id text not null references ggc.courses(id),created_by uuid not null references ggc.actors(id),name text not null,storage_path text not null,extracted_text text not null,status text not null default 'review',created_at timestamptz not null default now());
create table ggc.content_versions(id uuid primary key default gen_random_uuid(),course_id text not null references ggc.courses(id),kind text not null,record_id text not null,snapshot jsonb not null,created_by uuid not null references ggc.actors(id),created_at timestamptz not null default now());
create table ggc.notifications(id uuid primary key default gen_random_uuid(),owner_id uuid not null references ggc.actors(id) on delete cascade,message jsonb not null,read_at timestamptz,created_at timestamptz not null default now());
create table ggc.announcements(id uuid primary key default gen_random_uuid(),course_id text not null references ggc.courses(id),content jsonb not null,created_at timestamptz not null default now());
create table ggc.site_settings(key text primary key,value jsonb not null);

create function ggc.uid() returns uuid language sql stable set search_path='' as $$ select nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub' $$;
-- Replace with explicit cast to UUID to support both PostgreSQL and PGlite.
create or replace function ggc.uid() returns uuid language sql stable set search_path='' as $$ select (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid $$;
create function ggc.is_admin() returns boolean language sql stable security definer set search_path='' as $$ select ggc.uid() is not null and exists(select 1 from ggc.actors where id=ggc.uid() and role='ADMIN' and kind='user') $$;
create function ggc.teaches(c text) returns boolean language sql stable security definer set search_path='' as $$ select ggc.uid() is not null and (ggc.is_admin() or exists(select 1 from ggc.course_teachers t join ggc.actors a on a.id=t.teacher_id where t.course_id=c and a.id=ggc.uid() and a.role='TEACHER' and a.kind='user')) $$;
create function ggc.member(c text) returns boolean language sql stable security definer set search_path='' as $$ select ggc.uid() is not null and (ggc.teaches(c) or exists(select 1 from ggc.actors where id=ggc.uid() and course_id=c)) $$;
create function ggc.has_post(r uuid) returns boolean language sql stable security definer set search_path='' as $$ select ggc.uid() is not null and exists(select 1 from ggc.discussion_posts where room_id=r and owner_id=ggc.uid() and status='published') $$;
create function ggc.can_read_room(r uuid) returns boolean language sql stable security definer set search_path='' as $$ select ggc.uid() is not null and exists(select 1 from ggc.discussion_rooms where id=r and ggc.member(course_id) and (mode<>'POST_BEFORE_VIEW' or ggc.has_post(r) or ggc.teaches(course_id))) $$;
create function ggc.can_write_room(r uuid) returns boolean language sql stable security definer set search_path='' as $$ select ggc.uid() is not null and exists(select 1 from ggc.discussion_rooms where id=r and ggc.member(course_id) and status='open' and (closes_at is null or closes_at>now())) $$;
create function ggc.valid_teacher(t uuid,c text) returns boolean language sql stable security definer set search_path='' as $$ select ggc.uid() is not null and exists(select 1 from ggc.course_teachers ct join ggc.actors a on a.id=ct.teacher_id where ct.course_id=c and a.id=t and a.role='TEACHER') $$;
revoke all on all functions in schema ggc from public;
grant execute on all functions in schema ggc to authenticated;

do $$ declare t text; begin
 for t in select tablename from pg_tables where schemaname='ggc' loop execute format('alter table ggc.%I enable row level security',t); end loop;
end $$;
grant select,insert,update,delete on all tables in schema ggc to authenticated;
revoke all on ggc.guest_sessions,ggc.rate_limits from authenticated;
revoke insert,update,delete on ggc.actors,ggc.course_teachers,ggc.teacher_applications,ggc.ai_generations,ggc.notifications from authenticated;
create policy actor_self on ggc.actors for select to authenticated using(id=ggc.uid() or ggc.is_admin());
create policy teacher_assignment on ggc.course_teachers for select to authenticated using(teacher_id=ggc.uid() or ggc.is_admin());
create policy application_read on ggc.teacher_applications for select to authenticated using(user_id=ggc.uid() or ggc.is_admin());
create policy course_read on ggc.courses for select to authenticated using(ggc.member(id));
create policy course_admin on ggc.courses for all to authenticated using(ggc.is_admin()) with check(ggc.is_admin());
create policy week_read on ggc.weeks for select to authenticated using((status='published' and ggc.member(course_id)) or ggc.teaches(course_id));
create policy week_write on ggc.weeks for all to authenticated using(ggc.teaches(course_id)) with check(ggc.teaches(course_id));
create policy daily_read on ggc.daily_lessons for select to authenticated using(exists(select 1 from ggc.weeks w where w.id=week));
create policy daily_write on ggc.daily_lessons for all to authenticated using(exists(select 1 from ggc.weeks w where w.id=week and ggc.teaches(w.course_id))) with check(exists(select 1 from ggc.weeks w where w.id=week and ggc.teaches(w.course_id)));

do $$ declare t text; begin
 foreach t in array array['reflections','lesson_progress','bookmarks','personal_questions'] loop
 execute format('create policy own_only on ggc.%I for all to authenticated using(owner_id=ggc.uid()) with check(owner_id=ggc.uid())',t);
 end loop;
end $$;
create policy note_read on ggc.sticky_notes for select to authenticated using(ggc.member(course_id) and (status='published' or owner_id=ggc.uid() or ggc.teaches(course_id)));
create policy note_insert on ggc.sticky_notes for insert to authenticated with check(owner_id=ggc.uid() and ggc.member(course_id) and not is_pinned and status in ('pending','published'));
create policy note_update on ggc.sticky_notes for update to authenticated using(owner_id=ggc.uid() or ggc.teaches(course_id)) with check(owner_id=ggc.uid() or ggc.teaches(course_id));
create policy note_delete on ggc.sticky_notes for delete to authenticated using(owner_id=ggc.uid() or ggc.teaches(course_id));
create policy reaction_read on ggc.sticky_reactions for select to authenticated using(exists(select 1 from ggc.sticky_notes where id=note_id));
create policy reaction_write on ggc.sticky_reactions for all to authenticated using(owner_id=ggc.uid()) with check(owner_id=ggc.uid() and exists(select 1 from ggc.sticky_notes where id=note_id and status='published'));
create policy sticky_comment_read on ggc.sticky_comments for select to authenticated using(exists(select 1 from ggc.sticky_notes where id=note_id));
create policy sticky_comment_write on ggc.sticky_comments for all to authenticated using(owner_id=ggc.uid()) with check(owner_id=ggc.uid() and exists(select 1 from ggc.sticky_notes where id=note_id and status='published'));
create policy room_read on ggc.discussion_rooms for select to authenticated using(ggc.member(course_id));
create policy room_write on ggc.discussion_rooms for all to authenticated using(ggc.teaches(course_id)) with check(ggc.teaches(course_id) and (teacher_id=ggc.uid() or ggc.is_admin()));
create policy post_read on ggc.discussion_posts for select to authenticated using(owner_id=ggc.uid() or exists(select 1 from ggc.discussion_rooms r where r.id=room_id and ggc.teaches(r.course_id)) or (status='published' and ggc.can_read_room(room_id)));
create policy post_insert on ggc.discussion_posts for insert to authenticated with check(owner_id=ggc.uid() and ggc.can_write_room(room_id) and status in ('pending','published'));
create policy post_moderate on ggc.discussion_posts for update to authenticated using(exists(select 1 from ggc.discussion_rooms r where r.id=room_id and ggc.teaches(r.course_id))) with check(exists(select 1 from ggc.discussion_rooms r where r.id=room_id and ggc.teaches(r.course_id)));
create policy post_delete on ggc.discussion_posts for delete to authenticated using(owner_id=ggc.uid() or exists(select 1 from ggc.discussion_rooms r where r.id=room_id and ggc.teaches(r.course_id)));
create policy discussion_comment_read on ggc.discussion_comments for select to authenticated using(exists(select 1 from ggc.discussion_posts p where p.id=post_id and ggc.can_read_room(p.room_id)));
create policy discussion_comment_write on ggc.discussion_comments for insert to authenticated with check(owner_id=ggc.uid() and exists(select 1 from ggc.discussion_posts p where p.id=post_id and ggc.can_read_room(p.room_id) and ggc.can_write_room(p.room_id)));
create policy question_read on ggc.questions for select to authenticated using(owner_id=ggc.uid() or (teacher_id=ggc.uid() and ggc.teaches(course_id)) or (visibility<>'TEACHER' and ggc.member(course_id)));
create policy question_insert on ggc.questions for insert to authenticated with check(owner_id=ggc.uid() and ggc.member(course_id) and ggc.valid_teacher(teacher_id,course_id));
create policy question_response on ggc.questions for update to authenticated using(teacher_id=ggc.uid() and ggc.teaches(course_id)) with check(teacher_id=ggc.uid() and ggc.teaches(course_id));
create policy worksheet_read on ggc.worksheets for select to authenticated using((status='published' and ggc.member(course_id)) or ggc.teaches(course_id));
create policy worksheet_write on ggc.worksheets for all to authenticated using(ggc.teaches(course_id)) with check(ggc.teaches(course_id));
create policy submission_read on ggc.worksheet_submissions for select to authenticated using(owner_id=ggc.uid() or (status<>'DRAFT' and ((teacher_id=ggc.uid() and ggc.teaches(course_id)) or ggc.is_admin())));
create policy submission_insert on ggc.worksheet_submissions for insert to authenticated with check(owner_id=ggc.uid() and ggc.member(course_id) and (status='DRAFT' or (status='SUBMITTED' and ggc.valid_teacher(teacher_id,course_id))));
create policy submission_update on ggc.worksheet_submissions for update to authenticated using((owner_id=ggc.uid() and status='DRAFT') or (teacher_id=ggc.uid() and status<>'DRAFT' and ggc.teaches(course_id))) with check((owner_id=ggc.uid() and status='DRAFT') or (teacher_id=ggc.uid() and status<>'DRAFT' and ggc.teaches(course_id)));
create policy feedback_read on ggc.teacher_feedback for select to authenticated using(exists(select 1 from ggc.worksheet_submissions s where s.id=submission_id));
create policy feedback_insert on ggc.teacher_feedback for insert to authenticated with check(teacher_id=ggc.uid() and exists(select 1 from ggc.worksheet_submissions s where s.id=submission_id and s.teacher_id=ggc.uid() and s.status<>'DRAFT' and ggc.teaches(s.course_id)));
create policy ai_read on ggc.ai_content for select to authenticated using(owner_id=ggc.uid() or (status='published' and feature in ('questions','worksheet','class_brief') and ggc.member(course_id)));
create policy ai_own on ggc.ai_content for insert to authenticated with check(owner_id=ggc.uid() and status='generated');
create policy ai_review on ggc.ai_content for update to authenticated using(owner_id=ggc.uid() and ggc.teaches(course_id) and feature in ('questions','worksheet','class_brief','curriculum')) with check(owner_id=ggc.uid() and ggc.teaches(course_id) and feature in ('questions','worksheet','class_brief','curriculum'));
create policy ai_delete on ggc.ai_content for delete to authenticated using(owner_id=ggc.uid());
create policy usage_admin on ggc.ai_generations for select to authenticated using(ggc.is_admin());
create policy report_read on ggc.moderation_reports for select to authenticated using(owner_id=ggc.uid() or ggc.teaches(course_id));
create policy report_create on ggc.moderation_reports for insert to authenticated with check(owner_id=ggc.uid() and ggc.member(course_id));
create policy report_review on ggc.moderation_reports for update to authenticated using(ggc.teaches(course_id)) with check(ggc.teaches(course_id));
create policy resource_admin on ggc.resources for all to authenticated using(ggc.is_admin()) with check(ggc.is_admin());
create policy versions_teacher on ggc.content_versions for all to authenticated using(ggc.teaches(course_id)) with check(ggc.teaches(course_id) and created_by=ggc.uid());
create policy notification_self on ggc.notifications for select to authenticated using(owner_id=ggc.uid());
create policy announcement_read on ggc.announcements for select to authenticated using(ggc.member(course_id));
create policy announcement_write on ggc.announcements for all to authenticated using(ggc.is_admin()) with check(ggc.is_admin());
create policy settings_read on ggc.site_settings for select to authenticated using(true);
create policy settings_write on ggc.site_settings for all to authenticated using(ggc.is_admin()) with check(ggc.is_admin());

-- Fields governing ownership/moderation cannot be escalated by direct SQL clients.
create function ggc.guard_updates() returns trigger language plpgsql set search_path='' as $$
begin
 if old.owner_id<>new.owner_id then raise exception 'immutable owner'; end if;
 if tg_table_name='sticky_notes' and not ggc.teaches(old.course_id) then
  if old.is_pinned<>new.is_pinned or old.status<>new.status or old.course_id<>new.course_id or old.week<>new.week then raise exception 'moderator required';end if;
 end if;
 if tg_table_name='worksheet_submissions' and old.status<>'DRAFT' then
  if old.answers<>new.answers or old.teacher_id is distinct from new.teacher_id or old.week<>new.week or old.course_id<>new.course_id or old.worksheet_snapshot<>new.worksheet_snapshot then raise exception 'immutable submission';end if;
 end if;return new;
end $$;
revoke all on function ggc.guard_updates() from public;
create trigger note_guard before update on ggc.sticky_notes for each row execute function ggc.guard_updates();
create trigger submission_guard before update on ggc.worksheet_submissions for each row execute function ggc.guard_updates();
create index reflections_owner_week on ggc.reflections(owner_id,week);
create index notes_course_week on ggc.sticky_notes(course_id,week,status);
create index posts_room_owner on ggc.discussion_posts(room_id,owner_id,status);
create index submissions_teacher on ggc.worksheet_submissions(teacher_id,status);
create index questions_teacher on ggc.questions(teacher_id);
create index ai_owner_hash on ggc.ai_content(owner_id,input_hash,feature,language);
create index sessions_actor on ggc.guest_sessions(actor_id);
