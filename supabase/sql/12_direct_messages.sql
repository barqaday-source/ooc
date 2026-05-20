-- ====================================================================
-- 12_direct_messages.sql
-- المرحلة 4: المحادثات الخاصة 1vs1 (Direct Messages)
--
-- نعيد استخدام جدول rooms مع علم is_dm و dm_key (مفتاح موحّد بين الشخصين).
-- شغّل هذا الملف مرة واحدة في Supabase SQL Editor.
-- ====================================================================

ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS is_dm   boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS dm_key  text UNIQUE;

CREATE INDEX IF NOT EXISTS rooms_dm_key_idx ON public.rooms(dm_key) WHERE is_dm = true;

-- ====================================================================
-- دالة: get_or_create_dm(other_user_id)
--   • تُرجع id الغرفة الخاصة بين المستخدم الحالي و other_user_id.
--   • تُنشئها تلقائياً إن لم تكن موجودة.
-- ====================================================================
CREATE OR REPLACE FUNCTION public.get_or_create_dm(other_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  k  text;
  r  uuid;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF other_user_id = me THEN
    RAISE EXCEPTION 'cannot_dm_self';
  END IF;

  -- مفتاح موحّد بترتيب IDs لضمان التفرّد
  k := 'dm:' || LEAST(me::text, other_user_id::text)
            || ':' || GREATEST(me::text, other_user_id::text);

  SELECT id INTO r FROM public.rooms WHERE dm_key = k LIMIT 1;
  IF r IS NOT NULL THEN
    RETURN r;
  END IF;

  INSERT INTO public.rooms (name, description, owner_id, is_active, status, is_dm, dm_key)
  VALUES ('محادثة خاصة', NULL, me, true, 'approved', true, k)
  RETURNING id INTO r;

  RETURN r;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_or_create_dm(uuid) TO authenticated;
