-- ====================================================================
-- 05) إعدادات التطبيق + قوالب الثيمات
-- ====================================================================

-- مفتاح/قيمة عام
create table if not exists public.app_settings (
  key text primary key,
  value text,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

-- 🆕 جدول قوالب الثيمات: الأدمن يضيف/يفعّل قوالب جاهزة بضغطة
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
