This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Database schema

`supabase/migrations` is the sole source of truth for Supabase schema changes. Active migrations use unique 14-digit UTC versions. `supabase/schema.sql` is a generated snapshot for inspection and compatibility tests; do not edit it independently or apply it manually. Historical manual-era files are preserved in `supabase/legacy_migrations` and are not active CLI migrations.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to load Geist.

## AI採点（Gemini API）

`/ai-grading` では、ITパスポートの記述問題に回答すると Gemini API が採点・解説します。

- **APIキーの取得**: [Google AI Studio](https://aistudio.google.com/apikey) で Gemini APIキーを取得します。
- **Cloudflare への設定**: 本番 Worker の Secret に以下を登録します（`.env.example` 参照）。
  - `GEMINI_API_KEY`（必須・**サーバー専用**。クライアントへ露出しないこと）
  - `GEMINI_MODEL`（任意。未設定なら `gemini-3.1-flash-lite`）
- **ローカル開発**: `.env.local` に同じ値を設定します。`GEMINI_API_KEY` が未設定の場合は、キーワード一致による「ダミー採点」が表示され、画面の動作確認だけは可能です。

## モチット AI 相談（常駐モチット）

常駐モチットをタップすると相談シートが開き、学習状況・今日やること・表示中の問題・1日の振り返りを相談できます（長押し・右クリックは従来のクイックメニュー）。

- **構成**: `components/mochit/MochitConsultSheet.tsx`（UI）→ `app/api/mochit/chat`（サーバー）→ `lib/mochitAi/learningContext.ts`（Learning Context 層：実力・学習ペース・回答集計・ミッションを既存ロジックから集める）→ `lib/ai/mochitChat.ts`（Gemini REST）。
- **役割分担**: 実力・計画・正誤はアプリの判定が正。LLM には集計済みの事実だけを渡し、`lib/mochitAi/prompt.ts` のガードで「事実に無い数字」「判定を超える合格断定」を落とします。
- **環境変数**（サーバー専用）: `GEMINI_API_KEY`（AI 採点と共用）、`MOCHIT_AI_MODEL`（任意。未設定なら `GEMINI_MODEL` と同じ）、`MOCHIT_AI_DAILY_LIMIT`（任意。1ユーザー1日の送信上限・既定30）。
- **DB**: `supabase/migrations/20260926151209_mochit_ai_events.sql`（計測イベント＋送信回数。会話本文は保存しない。本番適用済み）。日次上限はユーザーのローカル日付で数え（日本時間なら 0:00 でリセット）、直近24時間は日次上限の2倍までに抑える。未適用でも相談は動きますが、回数制限と計測が効きません。
- **ローカル開発**: `GEMINI_API_KEY` 未設定時は固定文を返します（画面確認用・production では 502）。

## AI採点 Pro（Claude Sonnet・有料ユーザー向け）

無料ユーザーは Gemini で「通常採点」、Pro ユーザーは Claude Sonnet で「Pro採点」を受けられます。採点処理は `lib/ai/gradeWrittenAnswer.ts` が provider を切り替えて呼び出し、プロバイダ固有処理は `lib/ai/providers/`（`geminiProvider.ts` / `claudeProvider.ts`）に閉じ込めています。

- **Claude APIキー**: [Anthropic Console](https://console.anthropic.com/) で取得し、Cloudflare Worker の Secret / `.env.local` に登録します。
  - `ANTHROPIC_API_KEY`（**サーバー専用**。クライアントへ露出しないこと）
  - `ANTHROPIC_MODEL`（任意。未設定なら `claude-sonnet-4-6`）
  - 未設定の場合、Pro 採点は失敗扱いとなり**自動的に Gemini（通常採点）へフォールバック**します（画面に「通常採点で表示しています」と表示）。
- **Pro 判定（Stripe 連携前の動作確認）**: ユーザーのプランは `user_profiles.plan`（`free` / `pro`）で判定します。Stripe を設定しなくても、Supabase で対象ユーザーの `plan` を `'pro'` に更新すれば Claude 採点を確認できます。
  ```sql
  update public.user_profiles set plan = 'pro', plan_updated_at = now() where user_id = '<line_users.id>';
  ```
  DB変更は `supabase/migrations` に一意な14桁UTC versionのmigrationを追加して適用します。
- **利用回数制限**: 1日あたり free=3回 / pro=10回（`lib/billing/constants.ts`）。AI 呼び出し前に `ai_usage_logs` の当日件数で判定し、超過時は AI を呼ばずにメッセージを返します。userId（LINE 連携で解決される内部ID）がある場合のみ集計・制限します。

## Stripe 課金（Proプランの土台）

`/api/billing/checkout` が Stripe Checkout Session を作成し、`/api/billing/webhook` が支払い完了・解約・更新を受けて `user_profiles.plan` を更新します（Stripe SDK は使わず REST + 署名の自前検証）。

- 必要な環境変数（`.env.example` 参照）: `STRIPE_SECRET_KEY` / `STRIPE_PRICE_ID_PRO` / `STRIPE_WEBHOOK_SECRET` / `NEXT_PUBLIC_APP_URL`
- いずれか未設定のときは `/api/billing/checkout` は 503（「準備中」）、`/api/billing/webhook` は 503 を返し、UI 側は Pro 誘導ボタンを「準備中」と表示します。
- Webhook の登録 URL: `<本番URL>/api/billing/webhook`。購読イベントの例: `checkout.session.completed` / `customer.subscription.updated` / `customer.subscription.deleted`。

## ユーザー管理（Google ログイン + LINE 連携）

Web 利用のアカウント本体を **Google ログイン（Supabase Auth）** に寄せつつ、初回導線・通知は従来どおり **LINE** を使う構成です。学習履歴・復習・単語帳進捗・AI採点 Pro・利用回数制限はすべて同じ内部ユーザーID（`line_users.id`）で扱います。

- **アカウント本体 = `line_users` 行（ハブ）**。複数プロバイダを集約します。
  - `line_user_id` … LINE（初回導線）。Google 単独ユーザーは NULL。
  - `auth_user_id` … Supabase Auth（Google）の `auth.users.id`。
  - `email` … Google から取得。`stripe_customer_id` … 課金（既存）。
  - 既存テーブルの外部キーは今までどおり `line_users.id` を指したまま無変更。
- **ユーザー解決の共通化**: サーバー側は `lib/auth/currentUser.ts` の `getInternalUserId()` が唯一の解決口です（Google セッション → `auth_user_id` を `line_users` へ写像 → 無ければ LINE 署名 Cookie）。API は `lib/apiUser.ts` の `getRequestUserId()` 経由でこれを使います。各画面・API に解決処理を散らしません。
- **紐づけ・復元**:
  - LINE で始めたユーザーが Google ログインすると、既存ユーザーに Google が紐づきます（`fq_line` Cookie の指す行へ後付け）。
  - Web 直接アクセスで Google ログインすると、既存の紐づけがあれば同じユーザーを復元、無ければ新規ユーザーを開始します。
- **全画面ログイン必須**: 未ログインでアプリ画面（`/today` `/review` `/glossary` `/ai-grading` など）へ来ると `proxy.ts` が `/login` へ誘導します。匿名では保存系・AI採点が動きません（API は 401）。
- **段階的ロールアウト（既存を壊さない）**: 厳格ゲーティング・匿名遮断・LINE 署名 Cookie は `SESSION_SECRET` 設定時のみ有効です。未設定の間は従来どおり素通しします。

### セットアップ手順

1. **DB マイグレーション**: Google認証用schemaはproduction baselineに含まれています。今後の変更は `supabase/migrations` に追加し、Supabase CLIで適用します。
2. **Supabase Auth（Google プロバイダ）を有効化**（ダッシュボード）:
   - Authentication → Providers → Google を ON にし、Google Cloud の OAuth クライアントID/Secret を登録。
   - Authentication → URL Configuration の Redirect URLs に `http://localhost:3000/auth/callback` と `https://<本番ドメイン>/auth/callback` を追加。
   - Google Cloud 側の「承認済みリダイレクトURI」に Supabase の `https://<project-ref>.supabase.co/auth/v1/callback` を登録。
3. **環境変数**（`.env.example` 参照）:
   - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`（Google ログインで使用）。
   - `SESSION_SECRET`（新認証の有効化スイッチ 兼 LINE 署名鍵。`openssl rand -hex 32`）。
   - `NEXT_PUBLIC_LINE_ADD_FRIEND_URL`（ログインページの「LINEから始める」ボタンのリンク先）。

## LINE学習リマインダー（GF-P0-006）

当日まだ学習していないユーザーにだけ、LINE で1日1通までリマインドを送ります。
明示オプトイン制で、既定は OFF。`/settings` の「学習リマインダー」から時刻変更・停止ができます。

### 構成

スケジューラーは **Cloudflare Workers Cron Trigger**（`workers/line-reminder-cron/`）です。
Worker は毎時起動して `APP_BASE_URL/api/cron/line-reminder` を
`Authorization: Bearer ${CRON_SECRET}` 付きで GET するだけの薄い層で、
通知判定・Supabase アクセス・LINE 送信はいっさい持ちません。

```
Cloudflare Cron (0 * * * *, UTC)
  └─ workers/line-reminder-cron   … GET するだけ。Supabase鍵もLINEトークンも持たない
       └─ GET /api/cron/line-reminder   （it-learning-app 側）
            └─ runDueLineReminders()    … 判定・冪等性・push の唯一の窓口
```

Cloudflare Cron は UTC で起動しますが、**起動時刻をユーザー時刻として扱いません**。
誰にいつ送るかは既存の timezone / ローカル日付ロジック（`lib/notifications/schedule.ts`）が決めます。

### セットアップ

1. **マイグレーション適用**: `supabase/migrations/20260906000000_line_notification_reminders.sql`
   （`notification_preferences` / `notification_deliveries`）。通知機能を有効化する前に必ず適用します。
2. **it-learning-app 側の環境変数**:
   - `CRON_SECRET` … Cron endpoint の保護。未設定なら `/api/cron/line-reminder` は 503 を返し実行しません
     （誰でも叩ける口を作らないため）。`openssl rand -hex 32`
   - `LINE_CHANNEL_ACCESS_TOKEN` … push 送信（Webhook の返信と共通）。未設定なら送信しません。
     **Scheduler Worker 側には渡しません。**
   - `APP_BASE_URL`（または `NEXT_PUBLIC_APP_URL`）… `https://shikaku-mochit.com`。未設定なら送信しません。
3. **Scheduler Worker 側の設定**:
   - `APP_BASE_URL`（var・秘密ではない）… `https://shikaku-mochit.com`。
     `workers/line-reminder-cron/wrangler.jsonc` に設定済みです。
   - `CRON_SECRET`（secret）… it-learning-app と**同じ値**。
     `npm run worker:deploy` 後に `npx --yes wrangler@4 secret put CRON_SECRET --config workers/line-reminder-cron/wrangler.jsonc`。
     秘密値は wrangler の設定ファイルへ平文でコミットしません。
4. **デプロイ**: `npm run worker:deploy`（`wrangler.jsonc` の `triggers.crons` = `0 * * * *`）。

### ローカルで scheduled handler を実行する

`wrangler dev --test-scheduled` で Cron 起動をローカルに再現できます。

`npm run worker:*` は独立したCron Worker用で、`npx wrangler@4` を使います。

```bash
# 1) 通知APIの受け口（Next.js dev か、叩かれたことを見たいだけならスタブ）を用意しておく
npm run dev   # → http://localhost:3000

# 2) Worker を起動（秘密値はコマンドラインの --var で渡し、ファイルに残さない）
npm run worker:dev -- \
  --var APP_BASE_URL:http://127.0.0.1:3000 \
  --var CRON_SECRET:local-dev-secret

# 3) 別ターミナルから scheduled イベントを発火させる
curl "http://127.0.0.1:8787/cdn-cgi/local/scheduled?cron=0+*+*+*+*"
# → "Ran scheduled event"。`/__scheduled` でも同じハンドラーが動く。
```

`GET /api/cron/line-reminder` に `Authorization: Bearer local-dev-secret` が付いて届けば成功です
（アプリ側の `CRON_SECRET` も同じ値にしておくこと。違えば 401 が返ります）。

### 挙動

- 通知は1ユーザー・1ローカル日につき最大1通。種別は 復帰 > ストリーク危機 > 定時リマインド の優先順。
- 重複防止は `notification_deliveries` の主キー `(user_id, notification_type, local_date)`。
- 送信直前に当日学習済みかを再確認し、済んでいれば送りません（枠も消費しません）。
- push / Cron の失敗は `notification_deliveries.status` に記録するだけで、
  進捗・ストリーク・XP などの学習データには一切書き戻しません。
- Scheduler Worker は設定（`APP_BASE_URL` / `CRON_SECRET`）が欠けていれば通知APIを呼ばず、
  例外も投げずに終了します。呼び出しが失敗しても Worker からは再送も書き込みも行わず、
  次の毎時起動に任せます（冪等キーがあるので二重送信になりません）。

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Cloudflare 本番デプロイ

`origin/main` が本番の正です。GitHub `SEIKI-0001/it-learning-app` の `main` は
Cloudflare Workers Builds に接続され、`npm run build:vinext` と
`npx wrangler deploy --config dist/server/wrangler.json` で自動配信されます。
本番ドメインは `https://shikaku-mochit.com` です。Worker名
`it-learning-app-vinext-pilot` は既存のGitHub接続とドメインを維持するための旧名です。

`wrangler.jsonc` は公開URL、`fe-quest` の公開Supabase URL/キー、
Stripeの価格IDを管理します。サーバー専用の
`SUPABASE_SERVICE_ROLE_KEY`、`SESSION_SECRET`、`CRON_SECRET`、
LINE・Stripe・AIの鍵は本番WorkerのSecretで管理し、Gitに入れません。
Cron Workerは別デプロイで、アプリ側と同じ `CRON_SECRET` を設定します。
配信後は `PILOT_BASE_URL=https://shikaku-mochit.com PILOT_EXPECT_AUTH_GATE=1 npm run verify:cloudflare`
で公開経路を確認します。
