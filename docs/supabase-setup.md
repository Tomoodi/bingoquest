# Supabase セットアップ

## 環境変数

プロジェクトルートに `.env.local` を作成し、Supabase プロジェクトの値を設定します。

```bash
cp .env.sample .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

## 値の取得方法

1. Supabase Dashboard で対象プロジェクトを開く。
2. プロジェクトの Connectを開く。
3. Project URL を `NEXT_PUBLIC_SUPABASE_URL` に設定する。
4. Publishable key を `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` に設定する。

Secret key や service role key は入れないでください。

`.env.local` は Git にコミットしません。共有用の項目名だけを `.env.sample` に置きます。

## 動作確認

Supabase 用の環境変数が設定されているか確認します。

```bash
npm run check:supabase-env
```

## MVP DB スキーマ作成

Supabase Dashboard の SQL Editor を開き、以下のSQLを**ファイル名の順**に実行します。

1. [`supabase/migrations/20260530000000_mvp_schema.sql`](../supabase/migrations/20260530000000_mvp_schema.sql)
2. [`supabase/migrations/20260530010000_point_events_consumed.sql`](../supabase/migrations/20260530010000_point_events_consumed.sql) — `point_events.consumed_at` カラムと消費型攻撃 RPC `attack_with_points` を追加する
3. [`supabase/migrations/20260531000000_teachers.sql`](../supabase/migrations/20260531000000_teachers.sql) — 先生プロフィール `teachers` テーブルと `classes.teacher_id` を追加する

このSQLで作成される主なテーブルは以下です。

| テーブル | 用途 |
| --- | --- |
| `classes` | クラスコード、クラス名、先生名、学年、クラス、授業テーマ、授業説明を管理する |
| `students` | 生徒の氏名と参加クラスを管理する |
| `boss_states` | クラスごとのボスHPを管理する |
| `bingo_cards` | 生徒ごとのビンゴカードを管理する |
| `bingo_cells` | ビンゴカードの25マスを管理する |
| `point_events` | マス開放・リーチ・ビンゴなどのポイント履歴を管理する |

SQL実行後、テスト用クラスコードとして `123456` が使えます。

## 先生の認証（Google OAuth）

先生用画面（`/teacher`）は Supabase Auth の Google ログインを使います。Supabase Dashboard で以下を設定します。

1. **Authentication → Providers → Google** を有効化し、Google Cloud で発行した OAuth クライアントの **Client ID / Client Secret** を登録する。
2. **Authentication → URL Configuration → Redirect URLs** に、開発用 `http://localhost:3000` と本番URLを追加する（OAuth後のリダイレクト先）。

ログインフロー:

1. `/teacher/login` で「Googleでログイン」 → Google認証 → `/teacher` に戻る。
2. 初回は先生プロフィール未登録のため `/teacher/profile` に誘導され、先生名・学校を登録する（`teachers` 行を作成）。
3. 以降は `/teacher` でクラスを作成でき、作成したクラスは `classes.teacher_id` で本人に紐付く。

MVPではフロントエンドから開発しやすいように、RLSポリシーは緩めに設定しています。本番公開前には、認証・権限・更新可能範囲を見直してください。

## 開発データのリセット

開発中に溜まったテストデータ（生徒・カード・開けたマス・ポイント・削れたボスHP）を掃除したいときは、SQL Editor で以下を実行します。スキーマとテスト用クラス `123456` は残したまま、プレイデータだけを初期化します。

```sql
-- 1) プレイデータを全削除（依存順）
delete from public.point_events;
delete from public.bingo_cells;
delete from public.bingo_cards;
delete from public.students;

-- 2) ボスをフル回復＆総ダメージリセット
update public.boss_states
set current_hp = max_hp,
    total_damage = 0;

-- 3) 余分なテストクラスを削除し、123456 だけ残す（任意）
delete from public.classes
where code <> '123456';
```

> `classes` を削除すると、そのクラスの生徒・カード・マス・ポイントは `on delete cascade` で連鎖削除されます。`123456` だけ残せば関連データも一緒に整理されます。

リセット後の確認（任意）:

```sql
select
  (select count(*) from public.students)     as students,
  (select count(*) from public.bingo_cards)  as cards,
  (select count(*) from public.bingo_cells)  as cells,
  (select count(*) from public.point_events) as events,
  (select count(*) from public.classes)      as classes;
-- students/cards/cells/events = 0、classes = 1 なら綺麗な状態
```
