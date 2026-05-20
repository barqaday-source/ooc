-- ====================================================================
-- 09) Storage Buckets + سياسات
-- ====================================================================
insert into storage.buckets (id, name, public) values ('chat-media', 'chat-media', true)  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('voice-notes','voice-notes',true)  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('room-covers','room-covers',true)  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('avatars',    'avatars',    true)  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('app-assets', 'app-assets', true)  on conflict (id) do nothing;

do $$ begin
  drop policy if exists "storage_public_read" on storage.objects;
  create policy "storage_public_read" on storage.objects for select to public
    using (bucket_id in ('chat-media','voice-notes','room-covers','avatars','app-assets'));
exception when others then null; end $$;

do $$ begin
  drop policy if exists "storage_user_write_own" on storage.objects;
  create policy "storage_user_write_own" on storage.objects for insert to authenticated
    with check (bucket_id in ('chat-media','voice-notes','room-covers','avatars')
                and (storage.foldername(name))[1] = auth.uid()::text);
exception when others then null; end $$;

do $$ begin
  drop policy if exists "storage_user_delete_own" on storage.objects;
  create policy "storage_user_delete_own" on storage.objects for delete to authenticated
    using (bucket_id in ('chat-media','voice-notes','room-covers','avatars')
           and (storage.foldername(name))[1] = auth.uid()::text);
exception when others then null; end $$;

-- bucket app-assets محصور بالأدمن
do $$ begin
  drop policy if exists "storage_admin_app_assets_write" on storage.objects;
  create policy "storage_admin_app_assets_write" on storage.objects for insert to authenticated
    with check (bucket_id = 'app-assets' and public.has_role(auth.uid(), 'admin'));
exception when others then null; end $$;

do $$ begin
  drop policy if exists "storage_admin_app_assets_delete" on storage.objects;
  create policy "storage_admin_app_assets_delete" on storage.objects for delete to authenticated
    using (bucket_id = 'app-assets' and public.has_role(auth.uid(), 'admin'));
exception when others then null; end $$;
