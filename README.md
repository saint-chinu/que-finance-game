# 資本主義の権化 〜財務で遊ぼう〜

釣具店の月次経営を通じて、利益・現金・貸借対照表のつながりを学ぶブラウザゲームです。融資、採用、設備投資、漁業・釣船・不動産への進出を選び、10年間の経営結果を振り返ります。

- ゲーム: https://que-finance-game.doppel-tag.workers.dev/
- エンジン: `v44-release`
- 実行環境: Node.js 24 / Cloudflare Workers + D1
- 通常セーブ: ブラウザ内。「経営メニュー → セーブ」からJSONを書き出し・復元できます。
- ランキング: サーバーで操作を再計算します。

## 開発

```sh
npm ci
npm test
npm run test:ui
npm run test:cloudflare
npm run dev:cloudflare
```

`dist/` 内のHTML・CSS・JavaScriptが編集元です。`npm run build:cloudflare` で `.cloudflare/` に公開用成果物を生成します。

公開手順は [RELEASE_README.md](RELEASE_README.md)、修正・確認結果は [docs/V44_RELEASE_REVIEW.md](docs/V44_RELEASE_REVIEW.md) を参照してください。ゲーム内の税務・会計・審査は学習用の簡略化です。
