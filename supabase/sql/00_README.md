# 🗂️ EPQAD — Supabase SQL (مُجزّأ)

تم تقسيم `schema.sql` الضخم إلى ملفات صغيرة قابلة للتشغيل بالتسلسل.
كل ملف **idempotent** (آمن للتشغيل أكثر من مرة).

## ▶️ طريقة التشغيل
افتح **Supabase Dashboard → SQL Editor → New query**، ثم انسخ والصق محتوى كل ملف بالترتيب:

| # | الملف | الغرض |
|---|------|------|
| 01 | `01_extensions_and_enums.sql` | الامتدادات + الأنواع (Enums) |
| 02 | `02_tables_core.sql` | profiles · user_roles · rooms |
| 03 | `03_tables_chat.sql` | messages · message_deletions · room_reads |
| 04 | `04_tables_social.sql` | friendships · room_moderators · room_bans · notifications |
| 05 | `05_tables_settings.sql` | app_settings · **theme_presets** (جديد) |
| 06 | `06_functions_and_triggers.sql` | الدوال المساعدة + المُحفِّزات |
| 07 | `07_rls_policies.sql` | تفعيل RLS + كل السياسات |
| 08 | `08_realtime.sql` | تمكين Realtime على الجداول الحيّة |
| 09 | `09_storage_buckets.sql` | إنشاء Buckets + سياسات التخزين |
| 10 | `10_seed_defaults.sql` | البيانات الافتراضية + قوالب الثيمات |

## 👑 تعيين أوّل أدمن (يدوياً من قاعدة البيانات)
بعد تسجيل حسابك في التطبيق، شغّل في SQL Editor:
```sql
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users WHERE email = 'YOUR_EMAIL@example.com';
```

## 📦 اعتماد الغرف القديمة دفعة واحدة (اختياري)
```sql
UPDATE public.rooms SET status = 'approved' WHERE status = 'pending';
```

> **ملاحظة:** الملف القديم `supabase/schema.sql` تُرك كنسخة احتياطية شاملة، لكن استخدم الملفات المقسّمة من الآن.
