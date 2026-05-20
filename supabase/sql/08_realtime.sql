-- ====================================================================
-- 08) Realtime
-- ====================================================================
alter table public.messages       replica identity full;
alter table public.rooms          replica identity full;
alter table public.notifications  replica identity full;
alter table public.app_settings   replica identity full;
alter table public.theme_presets  replica identity full;

do $$ begin alter publication supabase_realtime add table public.messages;          exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.rooms;             exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.message_deletions; exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.notifications;     exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.app_settings;      exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.theme_presets;     exception when others then null; end $$;
