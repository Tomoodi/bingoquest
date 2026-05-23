## 👥 開発の始め方（チームメンバー向け）

### 初回セットアップ
```
git clone 
cd bingoquest
npm install
npm run dev
```
→ localhost:3000が開けばOK

### 作業するときの流れ
```
git checkout dev
git pull origin dev
git checkout -b feature/イシュー番号-作業名
```
### 作業が終わったら
```
git add .
git commit -m "feat: 作業内容 #イシュー番号"
git push origin feature/イシュー番号-作業名
```
→ GitHubでdevへのPRを作る

### 注意
- .env.localはGitHubに上げない
- mainには直接pushしない
- .env.localはともよからSlackで受け取る
