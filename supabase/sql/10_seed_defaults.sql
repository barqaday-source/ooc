-- ====================================================================
-- 10) البيانات الافتراضية + قوالب الثيمات الجاهزة
-- ====================================================================

insert into public.app_settings (key, value) values
  ('app_name',         'EPQAD'),
  ('app_tagline',      'Chat • Connect • Lead'),
  ('primary_hue',      '226'),
  ('primary_sat',      '56%'),
  ('primary_light',    '84%'),
  ('logo_url',         ''),
  ('support_phone',    ''),
  ('support_email',    ''),
  ('support_whatsapp', ''),
  ('announcement',     '')
on conflict (key) do nothing;

-- قوالب جاهزة (built-in) — لا تُحذف
insert into public.theme_presets (name, primary_hue, primary_sat, primary_light, is_builtin, is_active)
select * from (values
  ('كحلي ناعم',    '226', '56%', '84%', true, true),
  ('أزرق ملكي',    '220', '70%', '55%', true, false),
  ('بنفسجي',       '270', '60%', '65%', true, false),
  ('أخضر زمردي',   '160', '55%', '55%', true, false),
  ('وردي',         '340', '75%', '70%', true, false),
  ('ذهبي',         '40',  '85%', '60%', true, false),
  ('أحمر دافئ',     '10',  '75%', '60%', true, false),
  ('تركواز',       '180', '60%', '55%', true, false)
) as v(name, primary_hue, primary_sat, primary_light, is_builtin, is_active)
where not exists (select 1 from public.theme_presets where is_builtin = true);
