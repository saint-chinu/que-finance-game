# GitHub / Cloudflare 移行

対象: v37。移行用コードを準備した段階で、Cloudflareへの本番公開は未実施。

## 構成

- ソース: GitHubのゲーム専用リポジトリ。チヌクエスト2のリポジトリを上書きしない。
- 配信: Cloudflare Workers Static Assets（HTML/CSS/JS/画像）。
- `/api/*`: Workersで同一ゲームエンジンによる操作再生・ランキング検証。
- D1: `DB` バインディング。既存のDrizzle SQLをそのまま使用。
- URL名: `que-finance-game`。アカウント側のworkers.devサブドメインも個人情報を含まない名前を選ぶ。既存サブドメイン変更は他のWorkersにも影響するため、既存利用状況を確認する。

## 接続が必要な項目

GitHubコネクタの一覧取得は0件だが、所有者指定の検索と直接取得は成功した。`saint-chinu/chinu-quest2` から画像を取得済み。ゲーム専用リポジトリは未作成。コネクタに新規リポジトリ作成機能がないため、ブラウザの作成画面へ進んだが認証要求が中断され、作成・pushは未実施。
Cloudflareはこのクラウドブラウザでセキュリティ検証が繰り返され、管理画面へ進めなかった。認証情報は本作業環境に設定されていない。APIトークンをチャット本文やGitに記載しない。

## ローカル検証

Node.js 24を使用。

```sh
npm ci
npm test
npm run test:cloudflare
npm run build:cloudflare
npx wrangler deploy --config .cloudflare/wrangler.local.json --dry-run
npm run dev:cloudflare
```

`.cloudflare/wrangler.local.json` はローカル用。リモート公開に使わない。

確認済み: v35時点の自動テスト101件合格、Wrangler dry-run成功、ローカルD1マイグレーション成功。実際のローカルWorkers上で画面配信、内部ファイル非公開、チャレンジ開始、1ターンのサーバー再生、Cookie未保持時のアクセス拒否まで確認した。本番Cloudflareの認証・GitHub保存・新URLの発行は未完了。

## 初回公開とGit連携

1. GitHubのゲーム専用リポジトリに、本ソースとlockfileを保存。古い `site-archive*.zip`、`.openai/`、生成物、環境変数ファイルは新しいGitHubリポジトリへ持ち込まない。
2. CloudflareでD1 `que-finance-game` を作成し、返された本物のdatabase_idを取得。
3. Cloudflare Workers Buildsで対象GitHubリポジトリを連携し、Worker名を `que-finance-game` にする。
4. Node.js 24、ビルドコマンド `npm ci && npm test && npm run build:cloudflare`、デプロイコマンド `npm run deploy:cloudflare` を設定。
5. ビルド環境変数 `CLOUDFLARE_D1_DATABASE_ID` に実際のD1 UUIDを設定。ビルド用トークンには対象アカウントのWorkers公開・D1操作に必要な権限を設定。
6. 公開実行。設定生成 → 未適用D1マイグレーション → Worker公開の順で処理する。既存DBを削除しない。
7. 新URLで起動、ランキングの新規チャレンジ・1ターン同期を確認してから切り替える。

CLIで公開する場合はローカル端末の `npx wrangler login`、または安全に設定した環境変数で認証する。`npm run build:cloudflare` 後に `npm run deploy:cloudflare` を実行する。D1 UUIDが未設定・不正ならリモート操作前に停止する。

## セーブ・ランキングの移行

- 通常セーブは旧画面でバックアップをダウンロードし、新画面で復元。localStorageはドメインごとなので自動では移らない。
- ランキング用HttpOnly Cookieも旧ドメインに紐づく。DBをコピーするだけでは管理権限を引き継げない。既存ランキング・進行中チャレンジの有無を確認し、存在する場合は移管方法を確定するまで旧DBを削除しない。
- 現時点で旧ランキングのDB転送やCookie移管は実装していない。新URLで始める新規チャレンジは新D1で管理する。
- 旧Sitesの公開停止は新URLの確認とセーブの保全後に行う。独自に旧サイトを削除しない。

## 参照

- https://developers.cloudflare.com/workers/static-assets/binding/
- https://developers.cloudflare.com/workers/ci-cd/builds/
- https://developers.cloudflare.com/d1/reference/migrations/
- https://developers.cloudflare.com/workers/configuration/routing/workers-dev/
