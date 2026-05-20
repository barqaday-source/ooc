-- ====================================================================
-- 01) الامتدادات + الأنواع (Enums)
-- ====================================================================
create extension if not exists pgcrypto;

do $$ begin create type public.app_role as enum ('admin', 'moderator', 'user');
exception when duplicate_object then null; end $$;

do $$ begin create type public.room_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin create type public.friendship_status as enum ('pending', 'accepted', 'blocked');
exception when duplicate_object then null; end $$;

do $$ begin create type public.message_type as enum ('text', 'image', 'voice');
exception when duplicate_object then null; end $$;

do $$ begin create type public.notif_type as enum (
  'message','friend_request','friend_accept','room_approved','room_rejected','system'
); exception when duplicate_object then null; end $$;
