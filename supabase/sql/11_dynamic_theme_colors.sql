-- ====================================================================
-- 11_dynamic_theme_colors.sql
-- Phase 0+1: ألوان الواجهة الديناميكية (Dynamic UI Colors)
--
-- شغّل هذا الملف في Supabase SQL Editor مرة واحدة.
-- يُضيف 3 ألوان قابلة للتحكم من لوحة الأدمن:
--   • app_bg_color     — خلفية التطبيق
--   • app_icon_color   — لون الأيقونات والنصوص
--   • app_button_color — لون الأزرار الرئيسية
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.app_settings (
  key         text PRIMARY KEY,
  value       text,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- بذور الألوان الافتراضية (الأزرق الفاتح الحالي)
INSERT INTO public.app_settings (key, value) VALUES
  ('app_bg_color',     '#B6D6FF'),
  ('app_icon_color',   '#1A1821'),
  ('app_button_color', '#5F9EF4')
ON CONFLICT (key) DO NOTHING;

-- ====================================================================
-- ملاحظة: سياسات RLS (قراءة للجميع، كتابة للأدمن فقط) موجودة في
-- الملف 07_rls_policies.sql ضمن المراحل السابقة.
-- ====================================================================