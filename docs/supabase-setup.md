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

MVPではフロントエンドから開発しやすいように、RLSポリシーは緩めに設定しています。本番公開前には、認証・権限・更新可能範囲を見直してください。
