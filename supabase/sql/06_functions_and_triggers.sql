-- ====================================================================
-- 06) الدوال المساعدة (SECURITY DEFINER) + المُحفِّزات
-- ====================================================================

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role); $$;

create or replace function public.is_banned(_user_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select coalesce((select is_banned from public.profiles where id = _user_id), false); $$;

create or replace function public.is_room_banned(_room_id uuid, _user_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.room_bans
    where room_id = _room_id and user_id = _user_id
    and (expires_at is null or expires_at > now())
  );
$$;

create or replace function public.is_room_staff(_room_id uuid, _user_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.rooms where id = _room_id and owner_id = _user_id)
      or exists (select 1 from public.room_moderators where room_id = _room_id and user_id = _user_id);
$$;

-- ينشئ profile + user role عند التسجيل
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username',
             split_part(new.email, '@', 1) || '_' || substr(new.id::text, 1, 4)),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'user') on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists friendships_touch on public.friendships;
create trigger friendships_touch before update on public.friendships
  for each row execute function public.touch_updated_at();

-- 🆕 عند تفعيل قالب: اقفل البقية + حدّث app_settings تلقائياً
create or replace function public.apply_theme_preset()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.is_active = true then
    update public.theme_presets set is_active = false where id <> new.id;
    insert into public.app_settings(key, value, updated_at) values
      ('primary_hue',   new.primary_hue,   now()),
      ('primary_sat',   new.primary_sat,   now()),
      ('primary_light', new.primary_light, now())
    on conflict (key) do update set value = excluded.value, updated_at = now();
  end if;
  return new;
end; $$;

drop trigger if exists theme_preset_apply on public.theme_presets;
create trigger theme_preset_apply after insert or update of is_active on public.theme_presets
  for each row execute function public.apply_theme_preset();
