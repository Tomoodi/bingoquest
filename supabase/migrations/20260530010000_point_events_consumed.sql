-- BINGO QUEST: point_events に「攻撃に使ったか」を判定する consumed_at を追加し、
-- 未使用ポイントを消費してボスを攻撃する RPC を追加する。
-- 既存の 20260530000000_mvp_schema.sql の後に適用すること（追記式・冪等）。
-- Supabase SQL Editor に貼り付けるか、Supabase CLI で実行する。

-- マス開放で挿入された point_event は consumed_at = null（未使用 = 貯蓄中）。
-- 攻撃時に consumed_at = now() を付与して「使用済み」にする。
alter table public.point_events
  add column if not exists consumed_at timestamptz;

-- 生徒ごとの未使用ポイント合計を高速に集計するための部分インデックス。
create index if not exists point_events_unconsumed_idx
  on public.point_events (student_id)
  where consumed_at is null;

-- 消費型攻撃: 当該生徒の未使用 point_events を集計し、それらを使用済みにして
-- 合計分だけボス HP を減らす。挿入と消費・HP 更新を 1 トランザクションで原子的に行う。
-- NOTE: 攻撃が消費型になったため、ポイント獲得とボス攻撃を同時に行う
--       public.apply_point_event は本機能では使用しない（互換のため残置）。
create or replace function public.attack_with_points(
  p_class_id uuid,
  p_student_id uuid
)
returns public.boss_states
language plpgsql
security definer
set search_path = public
as $$
declare
  total_points integer;
  updated_boss public.boss_states;
begin
  if not exists (
    select 1
    from public.students
    where id = p_student_id
      and class_id = p_class_id
  ) then
    raise exception 'student does not belong to class';
  end if;

  -- 未使用イベントをロックしつつ合計を算出（同時攻撃による二重消費を防ぐ）。
  select coalesce(sum(points), 0)
  into total_points
  from public.point_events
  where student_id = p_student_id
    and class_id = p_class_id
    and consumed_at is null
  for update;

  -- 貯蓄ポイントが無ければ現在のボス状態をそのまま返す。
  if total_points <= 0 then
    select *
    into updated_boss
    from public.boss_states
    where class_id = p_class_id;

    if not found then
      raise exception 'boss_state not found for class';
    end if;

    return updated_boss;
  end if;

  -- 未使用イベントを使用済みにする。
  update public.point_events
  set consumed_at = now()
  where student_id = p_student_id
    and class_id = p_class_id
    and consumed_at is null;

  -- 合計分だけボス HP を減らし、総ダメージ（total_damage）も加算する
  update public.boss_states
  set current_hp = greatest(0, current_hp - total_points),
      total_damage = coalesce(total_damage, 0) + total_points
  where class_id = p_class_id
  returning * into updated_boss;

  if not found then
    raise exception 'boss_state not found for class';
  end if;

  return updated_boss;
end;
$$;

grant execute on function public.attack_with_points(uuid, uuid) to anon, authenticated;
