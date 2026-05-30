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