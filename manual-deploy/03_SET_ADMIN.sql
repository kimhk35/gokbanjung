-- First create and confirm your own Auth user in this NEW project's Authentication > Users.
-- Replace YOUR_CONFIRMED_AUTH_USER_UUID below. Do not paste an email or another project's UUID.
begin;
do $$
declare
 target uuid := 'YOUR_CONFIRMED_AUTH_USER_UUID'::uuid;
begin
 if not exists(select 1 from auth.users where id=target and email_confirmed_at is not null) then
   raise exception 'A confirmed Auth user in this project is required';
 end if;
 insert into ggc.actors(id,kind,role,nickname)
 values(target,'user','ADMIN','관리자')
 on conflict(id) do update set role='ADMIN',kind='user';
end $$;
commit;
