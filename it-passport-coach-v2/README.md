# IT Passport Coach ver.2

IT未経験者・初学者が、試験日まで迷わず学習を続けるための LINE 連携型 ITパスポート合格支援サービスです。

旧7日間モデルは使っていません。ver.2 は `コンテンツライブラリ × ユーザー状態 × 学習提案ロジック` を中心に、ユーザーごとの今日の学習を生成します。

## MVPで入っているもの

- 初回設定: 試験日、学習時間、休みたい曜日、参考書、IT経験、苦手分野
- 今日の学習: テーマ、目安時間、参考書範囲、やさしい説明、図解説明、確認問題、復習対象、次アクション
- コンテンツライブラリ: ストラテジ系、マネジメント系、テクノロジ系の主要テーマ
- 4択問題: 正誤判定、解説表示、回答履歴保存
- 復習: 誤答テーマの復習対象化、正解後の優先度低下
- 進捗: 分野別進捗、テーマ別正答率、苦手テーマ、復習待ち、残日数
- LINE webhook: `はじめる` / `今日` / `復習` / `進捗` / `ヘルプ`
- 管理画面: `/admin` 配下、Basic認証、未設定時は404
- ミニゲーム: DNS名前解決ならべかえ

## セットアップ

```bash
npm install
cp .env.example .env.local
npm run dev
```

ローカルでは Supabase 環境変数が未設定の場合、`.local-data/db.json` に保存します。

## 環境変数

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
LINE_CHANNEL_ACCESS_TOKEN=
LINE_CHANNEL_SECRET=
ADMIN_USERNAME=admin
ADMIN_PASSWORD=
```

`ADMIN_PASSWORD` が空の場合、`/admin` は表示されません。

## Supabase

`supabase/schema.sql` を実行すると、MVP用のテーブルを作成できます。

- `user_profiles`
- `answer_history`
- `review_items`
- `study_sessions`

アプリ側は `lib/storage` の `AppRepository` に依存しているため、コンテンツDB化や認証導入時も画面・学習提案ロジックに影響を出しにくい構成です。

## LINE webhook

LINE Developers の Messaging API webhook URL に以下を設定します。

```text
https://your-domain.example/api/line/webhook
```

署名検証には `LINE_CHANNEL_SECRET`、返信には `LINE_CHANNEL_ACCESS_TOKEN` を使います。

## コンテンツ追加

最初は TypeScript データで管理しています。

- テーマ: `data/topics.ts`
- 問題: `data/questions.ts`
- 参考書: `data/books.ts`
- ミニゲーム定義: `data/minigames.ts`

`Topic` と `Question` の型は `types/content.ts` にあります。テーマを追加すると、今日の学習、テーマ一覧、管理画面に反映されます。

## 実装思想

- Day1〜Day7、`current_day`、`completed_days`、EXP、レベルのような旧アプリ由来の進捗モデルは使わない
- 学習計画は `lib/study-planner.ts` に分離し、将来的にAI提案へ置き換えやすくする
- 進捗はテーマ完了数、正答率、復習待ち、試験日までの残り日数で扱う
- LINE返信は長文にせず、次の学習行動に進める短いメッセージにする
