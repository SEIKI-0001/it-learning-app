# LINE リッチメニュー

トーク画面下部に表示する FE Quest のリッチメニュー。
ボタンは webhook の既存テキスト応答（はじめる / 今日 / 進捗 / ヘルプ）に対応する。

| 位置   | ラベル         | タップ時に送る message | 既存 webhook の応答         |
| ------ | -------------- | ---------------------- | -------------------------- |
| 左上   | はじめる       | `はじめる`             | `/onboarding` の案内       |
| 右上   | 今日のクエスト | `今日`                 | `/quest/today` の案内      |
| 左下   | 進捗マップ     | `進捗`                 | `/map` の案内              |
| 右下   | ヘルプ         | `ヘルプ`               | 使い方テキスト             |

各エリアは `message` アクションなので、タップ＝そのテキストを送信したのと同じ。
応答ロジックは `app/api/line/webhook/route.ts` の `buildReplyText` がそのまま処理する
（リッチメニュー導入で既存のテキスト応答仕様は変更していない）。

## 構成

- `richmenu-image.mjs` … 2500x1686 の PNG をベクター描画で生成（絵文字非依存）。
- `setup-richmenu.mjs` … 画像生成 → 既存同名メニュー削除 → 作成 → 画像アップロード → デフォルト設定。

## 使い方

プレビュー画像を確認:

```bash
npm run richmenu:preview        # scripts/richmenu/richmenu-preview.png を書き出す
# または送信せず内容確認だけ
node scripts/richmenu/setup-richmenu.mjs --dry-run
```

## 公開（GitHub だけで完結・推奨）

ローカルを触らず GitHub 上で公開できる。

1. **シークレット登録（初回のみ）**
   GitHub リポジトリ → Settings → Secrets and variables → Actions → New repository secret
   - Name: `LINE_CHANNEL_ACCESS_TOKEN`
   - Secret: Vercel と同じ長期チャネルアクセストークン
2. **実行**
   Actions タブ → 「LINE リッチメニュー公開」→ Run workflow
   - 様子見したいときは `dry_run` にチェック（送信せず画像だけ生成）
   - 本番反映はチェックを外して実行
3. 実行後、Actions の成果物 `richmenu-preview` から画像を確認できる。

定義は `.github/workflows/line-richmenu.yml`。手動実行（workflow_dispatch）のみで、
push やデプロイでは自動実行されない。

## 公開（ローカルから実行する場合）

```bash
# Vercel と同じ長期チャネルアクセストークンが必要
LINE_CHANNEL_ACCESS_TOKEN=xxxx npm run richmenu:setup
# .env.local に LINE_CHANNEL_ACCESS_TOKEN を書いてあれば npm run richmenu:setup だけでOK
```

> 公開すると全友だちのトーク画面に即時反映される。文言やデザインを変えたら
> 再度 `richmenu:setup` を実行すれば、同名の旧メニューは自動で削除され差し替わる。
