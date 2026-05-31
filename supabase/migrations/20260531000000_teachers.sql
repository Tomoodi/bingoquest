-- 先生プロフィール（teachers）と classes への作成者紐付け
-- Supabase SQL Editor で mvp_schema / point_events_consumed の後に実行する。

-- teachers: auth.users と 1:1 のプロフィール
create table if not exists public.teachers (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text not null check (char_length(trim(name)) > 0),
  school text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 既存 set_updated_at トリガー（mvp_schema）を流用する
drop trigger if exists teachers_set_updated_at on public.teachers;
create trigger teachers_set_updated_at
before update on public.teachers
for each row execute function public.set_updated_at();

-- classes に作成者を紐付ける（teacher_name(text) は表示用に残置）
alter table public.classes
  add column if not exists teacher_id uuid references public.teachers(id);
create index if not exists classes_teacher_id_idx on public.classes(teacher_id);

-- RLS: 全開放維持（既存MVPと同じ方針。ハッカソン用）
alter table public.teachers enable row level security;

drop policy if exists "MVP teachers are readable and writable" on public.teachers;
create policy "MVP teachers are readable and writable"
on public.teachers
for all
to anon, authenticated
using (true)
with check (true);

grant usage on schema public to anon, authenticated;
grant select, insert, update on public.teachers to anon, authenticated;
