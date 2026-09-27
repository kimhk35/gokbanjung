-- Read-only. Run in the existing project's Supabase SQL Editor.
select (select count(*) from ggc.weeks) as weeks,
       (select count(*) from ggc.daily_lessons) as days,
       (select count(*) from ggc.worksheets) as worksheets;
-- Expected: 52 / 364 / 52
select relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='ggc' and c.relkind='r' and not c.relrowsecurity;
-- Expected: no rows.
