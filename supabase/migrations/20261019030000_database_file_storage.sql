-- Small files stay in the existing Postgres database. Only the server role can
-- access bytes. The download route permits public posters and admin documents.
create table if not exists ggc.stored_files (
  bucket text not null check (bucket in ('posters','materials')),
  path text not null check (length(path) between 1 and 300),
  created_by uuid not null references ggc.actors(id),
  filename text not null check (length(filename) between 1 and 255),
  content_type text not null,
  bytes bytea not null,
  created_at timestamptz not null default now(),
  primary key (bucket,path),
  check (octet_length(bytes) between 1 and 4194304),
  check (bucket <> 'posters' or (
    octet_length(bytes) <= 2097152
    and content_type in ('image/png','image/jpeg','image/webp')
  ))
);
alter table ggc.stored_files enable row level security;
revoke all on ggc.stored_files from public, anon, authenticated;
