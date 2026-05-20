-- ====================================================================
-- 02) جداول جوهرية: profiles · user_roles · rooms
-- ====================================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text,
  avatar_url text,
  bio text,
  is_banned boolean not null default false,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles add column if not exists last_seen_at timestamptz not null default now();

-- مهم للأمان: لا تُخزَّن الأدوار في profiles (تجنّب رفع الصلاحيات)
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  cover_url text,
  link text,
  owner_id uuid not null references auth.users(id) on delete cascade,
  is_active boolean not null default true,
  is_closed boolean not null default false,
  status public.room_status not null default 'pending',
  created_at timestamptz not null default now()
);
alter table public.rooms add column if not exists status public.room_status not null default 'pending';
