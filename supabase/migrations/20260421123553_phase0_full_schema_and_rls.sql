-- ====================================================================
-- Phase 0 — Full schema, RLS, functions, storage, admin role
-- Idempotent: safe to re-run
-- ====================================================================

-- Extensions + Enums
create extension if not exists pgcrypto;
do $$ begin create type public.app_role as enum ('admin','moderator','user'); exception when duplicate_object then null; end $$;
do $$ begin create type public.room_status as enum ('pending','approved','rejected'); exception when duplicate_object then null; end $$;
do $$ begin create type public.friendship_status as enum ('pending','accepted','blocked'); exception when duplicate_object then null; end $$;
do $$ begin create type public.message_type as enum ('text','image','voice'); exception when duplicate_object then null; end $$;
do $$ begin create type public.notif_type as enum ('message','friend_request','friend_accept','room_approved','room_rejected','system'); exception when duplicate_object then null; end $$;

-- Tables
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
do $$ begin alter table public.messages alter column content drop not null; exception when others then null; end $$;
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

create table if not exists public.room_moderators (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (room_id, user_id)
);

create table if not exists public.room_bans (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  banned_by uuid not null references auth.users(id) on delete cascade,
  reason text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  unique (room_id, user_id)
);

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status public.friendship_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type public.notif_type not null,
  title text not null,
  body text,
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications(user_id, created_at desc);

create table if not exists public.app_settings (
  key text primary key,
  value text,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.theme_presets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  primary_hue text not null,
  primary_sat text not null,
  primary_light text not null,
  is_active boolean not null default false,
  is_builtin boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists theme_presets_active_idx on public.theme_presets(is_active);

-- Functions
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role); $$;

create or replace function public.is_banned(_user_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select coalesce((select is_banned from public.profiles where id = _user_id), false); $$;

create or replace function public.is_room_banned(_room_id uuid, _user_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.room_bans where room_id = _room_id and user_id = _user_id and (expires_at is null or expires_at > now())); $$;

create or replace function public.is_room_staff(_room_id uuid, _user_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.rooms where id = _room_id and owner_id = _user_id) or exists (select 1 from public.room_moderators where room_id = _room_id and user_id = _user_id); $$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name, avatar_url)
  values (new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email,'@',1) || '_' || substr(new.id::text,1,4)),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)),
    new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'user') on conflict do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();

drop trigger if exists friendships_touch on public.friendships;
create trigger friendships_touch before update on public.friendships for each row execute function public.touch_updated_at();

create or replace function public.apply_theme_preset()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.is_active = true then
    update public.theme_presets set is_active = false where id <> new.id;
    insert into public.app_settings(key, value, updated_at) values
      ('primary_hue', new.primary_hue, now()),
      ('primary_sat', new.primary_sat, now()),
      ('primary_light', new.primary_light, now())
    on conflict (key) do update set value = excluded.value, updated_at = now();
  end if;
  return new;
end; $$;

drop trigger if exists theme_preset_apply on public.theme_presets;
create trigger theme_preset_apply after insert or update of is_active on public.theme_presets for each row execute function public.apply_theme_preset();

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.rooms enable row level security;
alter table public.messages enable row level security;
alter table public.room_moderators enable row level security;
alter table public.room_bans enable row level security;
alter table public.friendships enable row level security;
alter table public.message_deletions enable row level security;
alter table public.room_reads enable row level security;
alter table public.notifications enable row level security;
alter table public.app_settings enable row level security;
alter table public.theme_presets enable row level security;

-- Policies
drop policy if exists "profiles_select_all" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_admin_update" on public.profiles;
create policy "profiles_select_all" on public.profiles for select to authenticated using (true);
create policy "profiles_update_own" on public.profiles for update to authenticated using (auth.uid() = id);
create policy "profiles_admin_update" on public.profiles for update to authenticated using (public.has_role(auth.uid(),'admin'));

drop policy if exists "roles_select_own" on public.user_roles;
drop policy if exists "roles_admin_all" on public.user_roles;
create policy "roles_select_own" on public.user_roles for select to authenticated using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));
create policy "roles_admin_all" on public.user_roles for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

drop policy if exists "rooms_select_visible" on public.rooms;
drop policy if exists "rooms_insert_auth" on public.rooms;
drop policy if exists "rooms_update_owner" on public.rooms;
drop policy if exists "rooms_admin_all" on public.rooms;
create policy "rooms_select_visible" on public.rooms for select to authenticated using (status='approved' or owner_id=auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "rooms_insert_auth" on public.rooms for insert to authenticated with check (auth.uid()=owner_id and not public.is_banned(auth.uid()));
create policy "rooms_update_owner" on public.rooms for update to authenticated using (auth.uid()=owner_id);
create policy "rooms_admin_all" on public.rooms for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

drop policy if exists "mods_select_all" on public.room_moderators;
drop policy if exists "mods_owner_manage" on public.room_moderators;
create policy "mods_select_all" on public.room_moderators for select to authenticated using (true);
create policy "mods_owner_manage" on public.room_moderators for all to authenticated using (exists (select 1 from public.rooms r where r.id=room_id and r.owner_id=auth.uid()) or public.has_role(auth.uid(),'admin')) with check (exists (select 1 from public.rooms r where r.id=room_id and r.owner_id=auth.uid()) or public.has_role(auth.uid(),'admin'));

drop policy if exists "bans_select_all" on public.room_bans;
drop policy if exists "bans_staff_manage" on public.room_bans;
create policy "bans_select_all" on public.room_bans for select to authenticated using (true);
create policy "bans_staff_manage" on public.room_bans for all to authenticated using (public.is_room_staff(room_id,auth.uid()) or public.has_role(auth.uid(),'admin')) with check (public.is_room_staff(room_id,auth.uid()) or public.has_role(auth.uid(),'admin'));

drop policy if exists "friends_select_own" on public.friendships;
drop policy if exists "friends_insert_own" on public.friendships;
drop policy if exists "friends_update_party" on public.friendships;
drop policy if exists "friends_delete_party" on public.friendships;
create policy "friends_select_own" on public.friendships for select to authenticated using (auth.uid()=requester_id or auth.uid()=addressee_id);
create policy "friends_insert_own" on public.friendships for insert to authenticated with check (auth.uid()=requester_id);
create policy "friends_update_party" on public.friendships for update to authenticated using (auth.uid()=requester_id or auth.uid()=addressee_id);
create policy "friends_delete_party" on public.friendships for delete to authenticated using (auth.uid()=requester_id or auth.uid()=addressee_id);

drop policy if exists "messages_select_all" on public.messages;
drop policy if exists "messages_insert_auth" on public.messages;
drop policy if exists "messages_delete_own_or_admin" on public.messages;
create policy "messages_select_all" on public.messages for select to authenticated using (true);
create policy "messages_insert_auth" on public.messages for insert to authenticated with check (auth.uid()=user_id and not public.is_banned(auth.uid()) and not public.is_room_banned(room_id,auth.uid()) and exists (select 1 from public.rooms r where r.id=room_id and r.is_active and not r.is_closed and (r.status='approved' or r.owner_id=auth.uid())));
create policy "messages_delete_own_or_admin" on public.messages for delete to authenticated using (auth.uid()=user_id or public.has_role(auth.uid(),'admin') or public.is_room_staff(room_id,auth.uid()));

drop policy if exists "msgdel_select_own" on public.message_deletions;
drop policy if exists "msgdel_insert_own" on public.message_deletions;
drop policy if exists "msgdel_delete_own" on public.message_deletions;
create policy "msgdel_select_own" on public.message_deletions for select to authenticated using (auth.uid()=user_id);
create policy "msgdel_insert_own" on public.message_deletions for insert to authenticated with check (auth.uid()=user_id);
create policy "msgdel_delete_own" on public.message_deletions for delete to authenticated using (auth.uid()=user_id);

drop policy if exists "reads_select_own" on public.room_reads;
drop policy if exists "reads_upsert_own" on public.room_reads;
drop policy if exists "reads_update_own" on public.room_reads;
create policy "reads_select_own" on public.room_reads for select to authenticated using (auth.uid()=user_id);
create policy "reads_upsert_own" on public.room_reads for insert to authenticated with check (auth.uid()=user_id);
create policy "reads_update_own" on public.room_reads for update to authenticated using (auth.uid()=user_id);

drop policy if exists "notif_select_own" on public.notifications;
drop policy if exists "notif_update_own" on public.notifications;
drop policy if exists "notif_delete_own" on public.notifications;
drop policy if exists "notif_insert_any_auth" on public.notifications;
create policy "notif_select_own" on public.notifications for select to authenticated using (auth.uid()=user_id);
create policy "notif_update_own" on public.notifications for update to authenticated using (auth.uid()=user_id);
create policy "notif_delete_own" on public.notifications for delete to authenticated using (auth.uid()=user_id);
create policy "notif_insert_any_auth" on public.notifications for insert to authenticated with check (true);

drop policy if exists "settings_select_public" on public.app_settings;
drop policy if exists "settings_admin_write" on public.app_settings;
create policy "settings_select_public" on public.app_settings for select to anon, authenticated using (true);
create policy "settings_admin_write" on public.app_settings for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

drop policy if exists "themes_select_public" on public.theme_presets;
drop policy if exists "themes_admin_write" on public.theme_presets;
create policy "themes_select_public" on public.theme_presets for select to anon, authenticated using (true);
create policy "themes_admin_write" on public.theme_presets for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- Realtime
alter table public.messages replica identity full;
alter table public.rooms replica identity full;
alter table public.notifications replica identity full;
alter table public.app_settings replica identity full;
alter table public.theme_presets replica identity full;
do $$ begin alter publication supabase_realtime add table public.messages; exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.rooms; exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.message_deletions; exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.notifications; exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.app_settings; exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.theme_presets; exception when others then null; end $$;

-- Storage buckets
insert into storage.buckets (id, name, public) values ('chat-media','chat-media',true) on conflict (id) do update set public=true;
insert into storage.buckets (id, name, public) values ('voice-notes','voice-notes',true) on conflict (id) do update set public=true;
insert into storage.buckets (id, name, public) values ('room-covers','room-covers',true) on conflict (id) do update set public=true;
insert into storage.buckets (id, name, public) values ('avatars','avatars',true) on conflict (id) do update set public=true;
insert into storage.buckets (id, name, public) values ('app-assets','app-assets',true) on conflict (id) do update set public=true;

drop policy if exists "storage_public_read" on storage.objects;
create policy "storage_public_read" on storage.objects for select to public using (bucket_id in ('chat-media','voice-notes','room-covers','avatars','app-assets'));

drop policy if exists "storage_user_write_own" on storage.objects;
create policy "storage_user_write_own" on storage.objects for insert to authenticated with check (bucket_id in ('chat-media','voice-notes','room-covers','avatars') and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "storage_user_update_own" on storage.objects;
create policy "storage_user_update_own" on storage.objects for update to authenticated using (bucket_id in ('chat-media','voice-notes','room-covers','avatars') and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "storage_user_delete_own" on storage.objects;
create policy "storage_user_delete_own" on storage.objects for delete to authenticated using (bucket_id in ('chat-media','voice-notes','room-covers','avatars') and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "storage_admin_app_assets_write" on storage.objects;
create policy "storage_admin_app_assets_write" on storage.objects for insert to authenticated with check (bucket_id='app-assets' and public.has_role(auth.uid(),'admin'));

drop policy if exists "storage_admin_app_assets_delete" on storage.objects;
create policy "storage_admin_app_assets_delete" on storage.objects for delete to authenticated using (bucket_id='app-assets' and public.has_role(auth.uid(),'admin'));

-- Seed admin role
insert into public.user_roles (user_id, role) values ('783ff4e9-a484-4a71-ad02-d876bd35f75d','admin') on conflict (user_id, role) do nothing;

-- Default app settings
insert into public.app_settings(key, value) values
  ('app_name','SkyTalk'),
  ('primary_hue','215'),
  ('primary_sat','85%'),
  ('primary_light','65%')
on conflict (key) do nothing;
