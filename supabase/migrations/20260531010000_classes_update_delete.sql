-- 先生ダッシュボードのクラス編集・削除（PATCH/DELETE /api/classes/[id]）を許可する。
-- 初期スキーマでは classes は SELECT + INSERT のみだったため、UPDATE/DELETE を追加する。
-- 既存の 20260530020000 / 20260531000000 の後に適用すること（追記式・冪等）。
--
-- NOTE: RLS は MVP/ハッカソンにつき全開放を維持。所有者チェックはAPI側で teacher_id により行う。

drop policy if exists "MVP classes are updatable" on public.classes;
create policy "MVP classes are updatable"
on public.classes
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "MVP classes are deletable" on public.classes;
create policy "MVP classes are deletable"
on public.classes
for delete
to anon, authenticated
using (true);

grant update, delete on public.classes to anon, authenticated;
