-- ====================================================================
-- 07) تفعيل RLS + كل السياسات
-- ====================================================================
alter table public.profiles          enable row level security;
alter table public.user_roles        enable row level security;
alter table public.rooms             enable row level security;
alter table public.messages          enable row level security;
alter table public.room_moderators   enable row level security;
alter table public.room_bans         enable row level security;
alter table public.friendships       enable row level security;
alter table public.message_deletions enable row level security;
alter table public.room_reads        enable row level security;
alter table public.notifications     enable row level security;
alter table public.app_settings      enable row level security;
alter table public.theme_presets     enable row level security;

-- profiles
drop policy if exists "profiles_select_all"   on public.profiles;
drop policy if exists "profiles_update_own"   on public.profiles;
drop policy if exists "profiles_admin_update" on public.profiles;
create policy "profiles_select_all"   on public.profiles for select to authenticated using (true);
create policy "profiles_update_own"   on public.profiles for update to authenticated using (auth.uid() = id);
create policy "profiles_admin_update" on public.profiles for update to authenticated using (public.has_role(auth.uid(), 'admin'));

-- user_roles
drop policy if exists "roles_select_own" on public.user_roles;
drop policy if exists "roles_admin_all"  on public.user_roles;
create policy "roles_select_own" on public.user_roles for select to authenticated
  using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));
create policy "roles_admin_all"  on public.user_roles for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- rooms
drop policy if exists "rooms_select_visible" on public.rooms;
drop policy if exists "rooms_insert_auth"    on public.rooms;
drop policy if exists "rooms_update_owner"   on public.rooms;
drop policy if exists "rooms_admin_all"      on public.rooms;
create policy "rooms_select_visible" on public.rooms for select to authenticated
  using (status = 'approved' or owner_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "rooms_insert_auth"    on public.rooms for insert to authenticated
  with check (auth.uid() = owner_id and not public.is_banned(auth.uid()));
create policy "rooms_update_owner"   on public.rooms for update to authenticated using (auth.uid() = owner_id);
create policy "rooms_admin_all"      on public.rooms for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- room_moderators
drop policy if exists "mods_select_all"   on public.room_moderators;
drop policy if exists "mods_owner_manage" on public.room_moderators;
create policy "mods_select_all"   on public.room_moderators for select to authenticated using (true);
create policy "mods_owner_manage" on public.room_moderators for all to authenticated
  using (exists (select 1 from public.rooms r where r.id = room_id and r.owner_id = auth.uid())
         or public.has_role(auth.uid(), 'admin'))
  with check (exists (select 1 from public.rooms r where r.id = room_id and r.owner_id = auth.uid())
              or public.has_role(auth.uid(), 'admin'));

-- room_bans
drop policy if exists "bans_select_all"   on public.room_bans;
drop policy if exists "bans_staff_manage" on public.room_bans;
create policy "bans_select_all"   on public.room_bans for select to authenticated using (true);
create policy "bans_staff_manage" on public.room_bans for all to authenticated
  using (public.is_room_staff(room_id, auth.uid()) or public.has_role(auth.uid(), 'admin'))
  with check (public.is_room_staff(room_id, auth.uid()) or public.has_role(auth.uid(), 'admin'));

-- friendships
drop policy if exists "friends_select_own"   on public.friendships;
drop policy if exists "friends_insert_own"   on public.friendships;
drop policy if exists "friends_update_party" on public.friendships;
drop policy if exists "friends_delete_party" on public.friendships;
create policy "friends_select_own"   on public.friendships for select to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id);
create policy "friends_insert_own"   on public.friendships for insert to authenticated with check (auth.uid() = requester_id);
create policy "friends_update_party" on public.friendships for update to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id);
create policy "friends_delete_party" on public.friendships for delete to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- messages
drop policy if exists "messages_select_all"          on public.messages;
drop policy if exists "messages_insert_auth"         on public.messages;
drop policy if exists "messages_delete_own_or_admin" on public.messages;
create policy "messages_select_all"  on public.messages for select to authenticated using (true);
create policy "messages_insert_auth" on public.messages for insert to authenticated
  with check (
    auth.uid() = user_id
    and not public.is_banned(auth.uid())
    and not public.is_room_banned(room_id, auth.uid())
    and exists (select 1 from public.rooms r
                where r.id = room_id and r.is_active and not r.is_closed
                  and (r.status = 'approved' or r.owner_id = auth.uid()))
  );
create policy "messages_delete_own_or_admin" on public.messages for delete to authenticated
  using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin') or public.is_room_staff(room_id, auth.uid()));

-- message_deletions
drop policy if exists "msgdel_select_own" on public.message_deletions;
drop policy if exists "msgdel_insert_own" on public.message_deletions;
drop policy if exists "msgdel_delete_own" on public.message_deletions;
create policy "msgdel_select_own" on public.message_deletions for select to authenticated using (auth.uid() = user_id);
create policy "msgdel_insert_own" on public.message_deletions for insert to authenticated with check (auth.uid() = user_id);
create policy "msgdel_delete_own" on public.message_deletions for delete to authenticated using (auth.uid() = user_id);

-- room_reads
drop policy if exists "reads_select_own" on public.room_reads;
drop policy if exists "reads_upsert_own" on public.room_reads;
drop policy if exists "reads_update_own" on public.room_reads;
create policy "reads_select_own" on public.room_reads for select to authenticated using (auth.uid() = user_id);
create policy "reads_upsert_own" on public.room_reads for insert to authenticated with check (auth.uid() = user_id);
create policy "reads_update_own" on public.room_reads for update to authenticated using (auth.uid() = user_id);

-- notifications
drop policy if exists "notif_select_own"      on public.notifications;
drop policy if exists "notif_update_own"      on public.notifications;
drop policy if exists "notif_delete_own"      on public.notifications;
drop policy if exists "notif_insert_any_auth" on public.notifications;
create policy "notif_select_own"      on public.notifications for select to authenticated using (auth.uid() = user_id);
create policy "notif_update_own"      on public.notifications for update to authenticated using (auth.uid() = user_id);
create policy "notif_delete_own"      on public.notifications for delete to authenticated using (auth.uid() = user_id);
create policy "notif_insert_any_auth" on public.notifications for insert to authenticated with check (true);

-- app_settings
drop policy if exists "settings_select_public" on public.app_settings;
drop policy if exists "settings_admin_write"   on public.app_settings;
create policy "settings_select_public" on public.app_settings for select to anon, authenticated using (true);
create policy "settings_admin_write"   on public.app_settings for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- 🆕 theme_presets
drop policy if exists "themes_select_public" on public.theme_presets;
drop policy if exists "themes_admin_write"   on public.theme_presets;
create policy "themes_select_public" on public.theme_presets for select to anon, authenticated using (true);
create policy "themes_admin_write"   on public.theme_presets for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
