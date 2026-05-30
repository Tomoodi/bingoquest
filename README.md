# bingoquest

授業中にビンゴをしながらクラス全員でボスを倒すWebアプリ。
授業への参加意欲と予習習慣を楽しくゲーム化します。

## 🚀 ローカル起動
```
git clone https://github.com/...
cd jugyou-quest
npm install
npm run dev
```
## 🛠 技術スタック
- DB / Realtime / Auth：Supabase
- フロント：Next.js + TypeScript
- UI：Tailwind CSS + shadcn/ui
- AI生成：Gemini API
- API層：Next.js Route Handlers
- デプロイ：Vercel
- 必要ならファイル保存：Supabase Storage

## 📱 画面一覧

| 画面 | 説明 |
|---|---|
| ログイン | クラスコードで参加 |
| ホーム | 今日のカード確認・メニュー |
| ビンゴ作成 | AIがカードを自動生成 |
| ボス画面 | クラスのHP・攻撃状況 |
| 授業中 | リアルタイムでビンゴ |
| 先生用管理 | クラス・ボス・生徒管理 |

## 👥 チーム

| 名前 | 担当 |
| --- | --- |
| ken | API バック |
| ともよ | AI |
| あい | フロント　バック |
| saa1 | フロント |

## 🌿 ブランチルール

- `main` → 動くものだけ。直接pushしない
- `dev` → 開発の統合ブランチ
- `feature/issue番号-作業内容` → 各自の作業ブランチ

## ✅ コミットメッセージの形式
```
feat: 新機能追加
fix: バグ修正
style: デザイン変更
refactor: リファクタリング
docs: README等のドキュメント
```
