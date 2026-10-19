-- First create your own teacher account on /account.
-- Replace YOUR_LOGIN_ID below with that login ID. Never paste a password here.
-- Run this entire single statement in the Neon SQL Editor as the database owner.
DO $first_admin$
DECLARE
  login_id text := 'YOUR_LOGIN_ID';
  setup_auth_id uuid;
  setup_actor_id uuid;
BEGIN
  IF login_id !~ '^[a-z0-9_]{4,24}$' THEN
    RAISE EXCEPTION 'Replace YOUR_LOGIN_ID with the ID used for your teacher application';
  END IF;
  PERFORM pg_advisory_xact_lock(20261019,4);
  SELECT u.id::uuid,coalesce(r.actor_id,a.id) INTO setup_auth_id,setup_actor_id
    FROM public.ggc_auth_user u
    LEFT JOIN ggc.account_requests r ON r.user_id=u.id::uuid
    LEFT JOIN ggc.actors a ON a.id=u.id::uuid
    WHERE lower(u.email)=lower(login_id)||'@accounts.gokbanjeong.invalid';
  IF setup_actor_id IS NULL THEN
    RAISE EXCEPTION 'Create the teacher account on /account first';
  END IF;
  IF EXISTS(SELECT 1 FROM ggc.actors WHERE role='ADMIN' AND id<>setup_actor_id) THEN
    RAISE EXCEPTION 'An administrator already exists. Use its account management screen';
  END IF;
  UPDATE ggc.actors SET kind='user',role='ADMIN' WHERE id=setup_actor_id;
  UPDATE ggc.account_requests SET status='approved',reviewed_by=setup_actor_id WHERE user_id=setup_auth_id;
  UPDATE ggc.teacher_applications SET status='approved',reviewed_by=setup_actor_id WHERE user_id=setup_actor_id;
  UPDATE public.ggc_auth_user SET "emailVerified"=true,"updatedAt"=now() WHERE id=setup_auth_id::text;
  DELETE FROM ggc.guest_sessions WHERE ggc.guest_sessions.actor_id=setup_actor_id;
  DELETE FROM public.ggc_auth_session WHERE "userId"=setup_auth_id::text;
END;
$first_admin$;
