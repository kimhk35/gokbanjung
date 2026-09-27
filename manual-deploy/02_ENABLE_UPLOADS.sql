-- Existing project only. Private uploads; safe to run again.
insert into storage.buckets(id,name,public,file_size_limit)
values('gospel-materials','gospel-materials',false,4194304)
on conflict(id) do nothing;
