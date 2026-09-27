create function ggc.guard_publication() returns trigger language plpgsql security definer set search_path='' as $$
declare moderated boolean; anonymous_room boolean;
begin
 if ggc.uid() is null or new.owner_id<>ggc.uid() then raise exception 'owner required';end if;
 if tg_table_name='sticky_notes' then
  select value='"review"'::jsonb into moderated from ggc.site_settings where key='moderation';
  new.status=case when moderated then 'pending' else 'published' end;new.is_pinned=false;
  if not exists(select 1 from ggc.weeks w where w.id=new.week and w.course_id=new.course_id and w.status='published') then raise exception 'invalid week';end if;
 else
  select mode='TEACHER_MODERATED',mode='ANONYMOUS' into moderated,anonymous_room from ggc.discussion_rooms where id=new.room_id;
  new.status=case when moderated then 'pending' else 'published' end;
  if anonymous_room then new.display_name='';end if;
 end if;return new;
end $$;
revoke all on function ggc.guard_publication() from public,authenticated,anon;
create trigger note_publication before insert on ggc.sticky_notes for each row execute function ggc.guard_publication();
create trigger post_publication before insert on ggc.discussion_posts for each row execute function ggc.guard_publication();
-- Restrict profile updates to the server; it validates teacher selection.
-- Public views never expose owner UUIDs; the API only returns a boolean 'mine'.
