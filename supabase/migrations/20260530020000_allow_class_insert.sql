-- BINGO QUEST: 先生によるクラス作成（POST /api/classes）を許可する。
-- 初期スキーマでは classes は SELECT 専用だったため、匿名キー経由では INSERT できなかった。
-- クラス作成機能のために INSERT 権限とポリシーを追加する。
-- 既存の 20260530000000 / 20260530010000 の後に適用すること（追記式・冪等）。
--
-- NOTE: MVP のため誰でも作成可能な緩いポリシー。本番公開前に先生認証などで絞ること。

drop policy if exists "MVP classes are insertable" on public.classes;
create policy "MVP classes are insertable"
on public.classes
for insert
to anon, authenticated
with check (true);

grant insert on public.classes to anon, authenticated;
