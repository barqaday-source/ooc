-- ====================================================================
-- 13_message_edit.sql
-- يضيف ميزة تعديل الرسائل + يفعّل realtime للتحديثات.
-- شغّل هذا الملف مرّة واحدة في Supabase SQL Editor.
-- ====================================================================

-- 1) عمود زمن آخر تعديل
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS edited_at timestamptz;

-- 2) سياسة UPDATE: المستخدم يعدّل رسائله النصية فقط (لا الوسائط)،
--    والأدمن/طاقم الغرفة يقدرون يعدّلون أي رسالة.
DROP POLICY IF EXISTS "messages_update_own_or_staff" ON public.messages;
CREATE POLICY "messages_update_own_or_staff" ON public.messages
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin')
    OR public.is_room_staff(room_id, auth.uid())
  )
  WITH CHECK (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin')
    OR public.is_room_staff(room_id, auth.uid())
  );

-- 3) دالة آمنة للتعديل: تضبط edited_at تلقائياً ولا تسمح بتغيير الحقول الحساسة.
CREATE OR REPLACE FUNCTION public.edit_message(_message_id uuid, _new_content text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  m  public.messages%ROWTYPE;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT * INTO m FROM public.messages WHERE id = _message_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'message_not_found'; END IF;

  IF m.user_id <> me
     AND NOT public.has_role(me, 'admin')
     AND NOT public.is_room_staff(m.room_id, me) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF m.message_type <> 'text' THEN
    RAISE EXCEPTION 'only_text_editable';
  END IF;

  UPDATE public.messages
     SET content   = LEFT(COALESCE(_new_content, ''), 2000),
         edited_at = now()
   WHERE id = _message_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.edit_message(uuid, text) TO authenticated;

-- 4) إضافة جدول messages لقناة realtime لاستقبال UPDATE/DELETE (آمنة لو موجود مسبقاً)
DO $$
BEGIN
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.messages';
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END$$;
