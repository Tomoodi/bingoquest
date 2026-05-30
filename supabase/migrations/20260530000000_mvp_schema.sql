-- BINGO QUEST MVP schema
-- Paste this file into the Supabase SQL Editor, or run it with the Supabase CLI.

create extension if not exists pgcrypto;

create or replace function public.generate_class_code()
returns text
language plpgsql
as $$
declare
  generated_code text;
begin
  loop
    generated_code := lpad(floor(random() * 1000000)::int::text, 6, '0');

    exit when not exists (
      select 1
      from public.classes
      where code = generated_code
    );
  end loop;

  return generated_code;
end;
$$;

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  code text not null default public.generate_class_code() unique check (code ~ '^[0-9]{6}$'),
  name text not null,
  teacher_name text,
  grade text,
  class_section text,
  lesson_theme text,
  lesson_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.classes
  add column if not exists teacher_name text,
  add column if not exists grade text,
  add column if not exists class_section text,
  add column if not exists lesson_theme text,
  add column if not exists lesson_description text;

alter table public.classes
  drop column if exists grade_section;

alter table public.classes
  alter column code set default public.generate_class_code();

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.boss_states (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null unique references public.classes(id) on delete cascade,
  name text not null default 'スライムキング',
  max_hp integer not null default 1000 check (max_hp > 0),
  current_hp integer not null default 1000 check (current_hp >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (current_hp <= max_hp)
);

create table if not exists public.bingo_cards (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  student_words text[],
  unique (student_id, class_id)
);

create table if not exists public.bingo_cells (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.bingo_cards(id) on delete cascade,
  position integer not null check (position between 0 and 24),
  text text not null,
  is_free boolean not null default false,
  is_opened boolean not null default false,
  opened_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (card_id, position)
);

create table if not exists public.point_events (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  card_id uuid references public.bingo_cards(id) on delete set null,
  event_type text not null check (
    event_type in ('cell_opened', 'reach', 'bingo', 'bonus')
  ),
  points integer not null check (points > 0),
  created_at timestamptz not null default now()
);

create index if not exists students_class_id_idx on public.students(class_id);
create index if not exists bingo_cards_class_id_idx on public.bingo_cards(class_id);
create index if not exists bingo_cards_student_id_idx on public.bingo_cards(student_id);
create index if not exists bingo_cells_card_id_idx on public.bingo_cells(card_id);
create index if not exists point_events_class_id_idx on public.point_events(class_id);
create index if not exists point_events_student_id_idx on public.point_events(student_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists classes_set_updated_at on public.classes;
create trigger classes_set_updated_at
before update on public.classes
for each row execute function public.set_updated_at();

drop trigger if exists students_set_updated_at on public.students;
create trigger students_set_updated_at
before update on public.students
for each row execute function public.set_updated_at();

drop trigger if exists boss_states_set_updated_at on public.boss_states;
create trigger boss_states_set_updated_at
before update on public.boss_states
for each row execute function public.set_updated_at();

drop trigger if exists bingo_cards_set_updated_at on public.bingo_cards;
create trigger bingo_cards_set_updated_at
before update on public.bingo_cards
for each row execute function public.set_updated_at();

drop trigger if exists bingo_cells_set_updated_at on public.bingo_cells;
create trigger bingo_cells_set_updated_at
before update on public.bingo_cells
for each row execute function public.set_updated_at();

create or replace function public.apply_point_event(
  p_class_id uuid,
  p_student_id uuid,
  p_card_id uuid,
  p_event_type text,
  p_points integer
)
returns public.boss_states
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_boss public.boss_states;
begin
  if p_points <= 0 then
    raise exception 'points must be positive';
  end if;

  if p_event_type not in ('cell_opened', 'reach', 'bingo', 'bonus') then
    raise exception 'invalid event_type: %', p_event_type;
  end if;

  if not exists (
    select 1
    from public.students
    where id = p_student_id
      and class_id = p_class_id
  ) then
    raise exception 'student does not belong to class';
  end if;

  if p_card_id is not null and not exists (
    select 1
    from public.bingo_cards
    where id = p_card_id
      and class_id = p_class_id
      and student_id = p_student_id
  ) then
    raise exception 'card does not belong to student';
  end if;

  insert into public.point_events (
    class_id,
    student_id,
    card_id,
    event_type,
    points
  )
  values (
    p_class_id,
    p_student_id,
    p_card_id,
    p_event_type,
    p_points
  );

  update public.boss_states
  set current_hp = greatest(0, current_hp - p_points)
  where class_id = p_class_id
  returning * into updated_boss;

  if not found then
    raise exception 'boss_state not found for class';
  end if;

  return updated_boss;
end;
$$;

alter table public.classes enable row level security;
alter table public.students enable row level security;
alter table public.boss_states enable row level security;
alter table public.bingo_cards enable row level security;
alter table public.bingo_cells enable row level security;
alter table public.point_events enable row level security;

drop policy if exists "MVP classes are readable" on public.classes;
create policy "MVP classes are readable"
on public.classes
for select
to anon, authenticated
using (true);

drop policy if exists "MVP students are readable and writable" on public.students;
create policy "MVP students are readable and writable"
on public.students
for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "MVP boss states are readable and writable" on public.boss_states;
create policy "MVP boss states are readable and writable"
on public.boss_states
for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "MVP bingo cards are readable and writable" on public.bingo_cards;
create policy "MVP bingo cards are readable and writable"
on public.bingo_cards
for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "MVP bingo cells are readable and writable" on public.bingo_cells;
create policy "MVP bingo cells are readable and writable"
on public.bingo_cells
for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "MVP point events are readable and writable" on public.point_events;
create policy "MVP point events are readable and writable"
on public.point_events
for all
to anon, authenticated
using (true)
with check (true);

grant usage on schema public to anon, authenticated;
grant select on public.classes to anon, authenticated;
grant select, insert, update on public.students to anon, authenticated;
grant select, insert, update on public.boss_states to anon, authenticated;
grant select, insert, update on public.bingo_cards to anon, authenticated;
grant select, insert, update on public.bingo_cells to anon, authenticated;
grant select, insert on public.point_events to anon, authenticated;
grant execute on function public.apply_point_event(uuid, uuid, uuid, text, integer) to anon, authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'boss_states'
    ) then
      alter publication supabase_realtime add table public.boss_states;
    end if;

    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'point_events'
    ) then
      alter publication supabase_realtime add table public.point_events;
    end if;
  end if;
end;
$$;

insert into public.classes (
  code,
  name,
  teacher_name,
  grade,
  class_section,
  lesson_theme,
  lesson_description,
  teacherWords[]
)
values (
  '123456',
  '英語',
  '田中先生',
  '2年',
  'A組',
  '英語: 不定詞と動名詞',
  'to不定詞と動名詞の基本的な使い方を確認し、本文中の新出単語や重要熟語を扱います。'
)
on conflict (code) do update
set
  name = excluded.name,
  teacher_name = excluded.teacher_name,
  grade = excluded.grade,
  class_section = excluded.class_section,
  lesson_theme = excluded.lesson_theme,
  lesson_description = excluded.lesson_description;

insert into public.boss_states (class_id, name, max_hp, current_hp)
select id, 'スライムキング', 1000, 1000
from public.classes
where code = '123456'
on conflict (class_id) do nothing;
