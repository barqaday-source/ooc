-- ====================================================================
-- 03) جداول الدردشة: messages · message_deletions · room_reads
-- ====================================================================

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null default '' check (length(content) <= 2000),
  message_type public.message_type not null default 'text',
  media_url text,
  media_duration integer,
  created_at timestamptz not null default now()
);
alter table public.messages add column if not exists message_type public.message_type not null default 'text';
alter table public.messages add column if not exists media_url text;
alter table public.messages add column if not exists media_duration integer;
alter table public.messages alter column content drop not null;
alter table public.messages alter column content set default '';
create index if not exists messages_room_idx on public.messages(room_id, created_at desc);

create table if not exists public.message_deletions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (message_id, user_id)
);

create table if not exists public.room_reads (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  unique (room_id, user_id)
);
create index if not exists room_reads_user_idx on public.room_reads(user_id);
