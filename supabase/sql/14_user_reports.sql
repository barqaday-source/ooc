-- ====================================================================
-- 14_user_reports.sql
-- جدول الإبلاغ عن المستخدمين (للأدمن لمراجعتها)
-- ====================================================================

create table if not exists public.user_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reported_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (length(reason) between 3 and 500),
  resolved boolean not null default false,
  created_at timestamptz not null default now(),
  check (reporter_id <> reported_id)
);
create index if not exists user_reports_reported_idx on public.user_reports(reported_id);
create index if not exists user_reports_unresolved_idx on public.user_reports(created_at desc) where resolved = false;

alter table public.user_reports enable row level security;

drop policy if exists "report: insert own" on public.user_reports;
create policy "report: insert own"
  on public.user_reports for insert to authenticated
  with check (auth.uid() = reporter_id);

drop policy if exists "report: admin read" on public.user_reports;
create policy "report: admin read"
  on public.user_reports for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "report: admin update" on public.user_reports;
create policy "report: admin update"
  on public.user_reports for update to authenticated
  using (public.has_role(auth.uid(), 'admin'));