-- تحديث هوية التطبيق الافتراضية إلى دردشاتي
insert into public.app_settings(key, value) values
  ('app_name', 'دردشاتي'),
  ('app_tagline', 'دردشة • تواصل • غرف'),
  ('primary_hue', '212'),
  ('primary_sat', '100%'),
  ('primary_light', '86%')
on conflict (key) do update set value = excluded.value, updated_at = now();
