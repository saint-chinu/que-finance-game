# Cloudflare公開手順

Node.js 24を使用します。エンジンは `v44-release`。

## 検証

```sh
npm ci
npm test
npm run test:ui
npm run test:cloudflare
```

## 認証と公開

```sh
npx wrangler login
npx wrangler whoami
npx wrangler d1 list
```

Worker名・D1名は `que-finance-game`。既存DBを使用し、同名のものを重複作成しないでください。APIトークンやパスワードをソース・チャットへ記載しないでください。

PowerShell:

```powershell
$env:CLOUDFLARE_D1_DATABASE_ID='844c8ecc-2394-40b6-bf99-e6baf8340426'
npm run deploy:cloudflare
```

macOS / Linux:

```sh
export CLOUDFLARE_D1_DATABASE_ID='844c8ecc-2394-40b6-bf99-e6baf8340426'
npm run deploy:cloudflare
```

設定元は `wrangler.template.json`。ビルド→公開設定生成→リモートD1マイグレーション→Worker公開を行います。`.cloudflare/wrangler.local.json` はローカル用です。

GitHub Actionsでは自動テストを実行します。Cloudflareへの自動公開は未接続です。更新時は検証後に上記の公開コマンドを実行してください。

## 公開後確認

- ゲームURL： https://que-finance-game.doppel-tag.workers.dev/
- 新規開始、月次確定、保存と再読み込み、ランキングチャレンジの開始と同期を確認します。
- 通常セーブはURLごとに別です。旧サイトからは「経営メニュー → セーブ」で書き出したJSONを復元します。
- 新D1でランキングを開始します。旧サイトのDB・所有権Cookieの移管は未実装です。
- 本番DBの削除やリセットは通常の再公開には不要です。
