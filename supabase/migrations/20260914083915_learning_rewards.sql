create table ggc.reward_events(id uuid primary key default gen_random_uuid(),owner_id uuid not null references ggc.actors(id) on delete cascade,kind text not null check(kind in ('daily','weekly','monthly21')),period text not null,earned_at timestamptz not null default now(),unique(owner_id,kind,period));
alter table ggc.reward_events enable row level security;
grant select on ggc.reward_events to authenticated;
create policy reward_self on ggc.reward_events for select to authenticated using(owner_id=ggc.uid());
revoke update on ggc.lesson_progress from authenticated;
create function ggc.guard_completion() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if ggc.uid() is null or new.owner_id<>ggc.uid() then raise exception 'owner required';end if;
 if not exists(select 1 from ggc.reflections r where r.owner_id=new.owner_id and r.week=new.week and r.day=new.day and length(trim(coalesce(r.content->>'0','')))>0 and length(trim(coalesce(r.content->>'2','')))>0) then raise exception 'reflection and practice required';end if;
 new.created_at=now();return new;
end $$;
create trigger validate_completion before insert on ggc.lesson_progress for each row execute function ggc.guard_completion();
create function ggc.award_learning() returns trigger language plpgsql security definer set search_path='' as $$
declare today text; month_key text; added integer;
begin
 if ggc.uid() is null or new.owner_id<>ggc.uid() then raise exception 'owner required';end if;
 today=to_char(now() at time zone 'Asia/Seoul','YYYY-MM-DD');month_key=substring(today,1,7);
 -- Serialize reward calculation per learner, including simultaneous completions.
 perform 1 from ggc.actors where id=new.owner_id for update;
 insert into ggc.reward_events(owner_id,kind,period) values(new.owner_id,'daily',today) on conflict do nothing;
 if (select count(distinct day) from ggc.lesson_progress where owner_id=new.owner_id and week=new.week)=7 then
  insert into ggc.reward_events(owner_id,kind,period) values(new.owner_id,'weekly',new.week::text) on conflict do nothing;
 end if;
 if (select count(*) from ggc.reward_events where owner_id=new.owner_id and kind='daily' and substring(period,1,7)=month_key)>=21 then
  insert into ggc.reward_events(owner_id,kind,period) values(new.owner_id,'monthly21',month_key) on conflict do nothing;
  get diagnostics added=row_count;
  if added>0 then insert into ggc.notifications(owner_id,message) values(new.owner_id,'{"ko":"21일의 배움이 모였습니다. 꾸준한 배움 배지를 받았어요!","en":"You learned on 21 days! Your Steady Learning badge is ready."}'::jsonb);end if;
 end if;return new;
end $$;
create trigger award_completion after insert on ggc.lesson_progress for each row execute function ggc.award_learning();
revoke all on function ggc.guard_completion(),ggc.award_learning() from public,authenticated,anon;
create index rewards_owner on ggc.reward_events(owner_id,kind,period);
