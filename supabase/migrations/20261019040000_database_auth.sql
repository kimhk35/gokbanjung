-- Better Auth tables are server-only. Existing application identities stay in ggc.
create table if not exists public.ggc_auth_user (
  id text primary key,
  name text not null,
  email text not null unique,
  "emailVerified" boolean not null default false,
  image text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);
create unique index if not exists ggc_auth_user_email_lower on public.ggc_auth_user(lower(email));
create table if not exists public.ggc_auth_session (
  id text primary key,
  "expiresAt" timestamptz not null,
  token text not null unique,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  "ipAddress" text,
  "userAgent" text,
  "userId" text not null references public.ggc_auth_user(id) on delete cascade
);
create index if not exists ggc_auth_session_user on public.ggc_auth_session("userId");
create table if not exists public.ggc_auth_account (
  id text primary key,
  "accountId" text not null,
  "providerId" text not null,
  "userId" text not null references public.ggc_auth_user(id) on delete cascade,
  "accessToken" text,
  "refreshToken" text,
  "idToken" text,
  "accessTokenExpiresAt" timestamptz,
  "refreshTokenExpiresAt" timestamptz,
  scope text,
  password text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  unique("providerId", "accountId")
);
create index if not exists ggc_auth_account_user on public.ggc_auth_account("userId");
create table if not exists public.ggc_auth_verification (
  id text primary key,
  identifier text not null,
  value text not null,
  "expiresAt" timestamptz not null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);
create index if not exists ggc_auth_verification_identifier on public.ggc_auth_verification(identifier);
alter table public.ggc_auth_user enable row level security;
alter table public.ggc_auth_session enable row level security;
alter table public.ggc_auth_account enable row level security;
alter table public.ggc_auth_verification enable row level security;
revoke all on public.ggc_auth_user, public.ggc_auth_session, public.ggc_auth_account, public.ggc_auth_verification from public, anon, authenticated;
-- A stable server-only signing key avoids per-instance secrets on serverless hosts.
-- BETTER_AUTH_SECRET may override it. Never grant this table to browser roles.
create table if not exists public.ggc_auth_config (
  id text primary key check (id='session_secret'),
  value text not null check (length(value)>=32)
);
alter table public.ggc_auth_config enable row level security;
revoke all on public.ggc_auth_config from public, anon, authenticated;
