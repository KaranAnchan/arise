-- Arise backend (TDD §3.1): the append-only event log + minimal profile row.
-- No server-side game state — clients replay events through the pure reducer.
-- RLS is the security boundary; the anon key in the client is standard posture.

create table public.events (
  id          uuid primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  device_id   text not null,
  type        text not null,
  payload     jsonb not null,
  occurred_at timestamptz not null,
  server_seq  bigint generated always as identity,
  created_at  timestamptz not null default now()
);

create index events_user_seq on public.events (user_id, server_seq);

create table public.profiles (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  username   text,
  settings   jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- RLS: a user touches only their own rows. No update/delete on events —
-- the log is append-only everywhere, server included.
-- ---------------------------------------------------------------------------
alter table public.events enable row level security;
alter table public.profiles enable row level security;

create policy "events: own select" on public.events
  for select using (auth.uid() = user_id);

create policy "events: own insert" on public.events
  for insert with check (auth.uid() = user_id);

create policy "profiles: own select" on public.profiles
  for select using (auth.uid() = user_id);

create policy "profiles: own insert" on public.profiles
  for insert with check (auth.uid() = user_id);

create policy "profiles: own update" on public.profiles
  for update using (auth.uid() = user_id);
