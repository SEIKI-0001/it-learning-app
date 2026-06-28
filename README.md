This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

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

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## AI採点（Gemini API）

`/ai-grading` では、ITパスポートの記述問題に回答すると Gemini API が採点・解説します。

- **APIキーの取得**: [Google AI Studio](https://aistudio.google.com/apikey) で Gemini APIキーを取得します。
- **Vercel への設定**: Vercel のプロジェクト設定 → Environment Variables に以下を登録します（`.env.example` 参照）。
  - `GEMINI_API_KEY`（必須・**サーバー専用**。クライアントへ露出しないこと）
  - `GEMINI_MODEL`（任意。未設定なら `gemini-3.1-flash-lite`）
- **ローカル開発**: `.env.local` に同じ値を設定します。`GEMINI_API_KEY` が未設定の場合は、キーワード一致による「ダミー採点」が表示され、画面の動作確認だけは可能です。

## AI採点 Pro（Claude Sonnet・有料ユーザー向け）

無料ユーザーは Gemini で「通常採点」、Pro ユーザーは Claude Sonnet で「Pro採点」を受けられます。採点処理は `lib/ai/gradeWrittenAnswer.ts` が provider を切り替えて呼び出し、プロバイダ固有処理は `lib/ai/providers/`（`geminiProvider.ts` / `claudeProvider.ts`）に閉じ込めています。

- **Claude APIキー**: [Anthropic Console](https://console.anthropic.com/) で取得し、Vercel / `.env.local` に登録します。
  - `ANTHROPIC_API_KEY`（**サーバー専用**。クライアントへ露出しないこと）
  - `ANTHROPIC_MODEL`（任意。未設定なら `claude-sonnet-4-6`）
  - 未設定の場合、Pro 採点は失敗扱いとなり**自動的に Gemini（通常採点）へフォールバック**します（画面に「通常採点で表示しています」と表示）。
- **Pro 判定（Stripe 連携前の動作確認）**: ユーザーのプランは `user_profiles.plan`（`free` / `pro`）で判定します。Stripe を設定しなくても、Supabase で対象ユーザーの `plan` を `'pro'` に更新すれば Claude 採点を確認できます。
  ```sql
  update public.user_profiles set plan = 'pro', plan_updated_at = now() where user_id = '<line_users.id>';
  ```
  `supabase/schema.sql` を再実行すると `user_profiles.plan` 列と `ai_usage_logs` テーブルが追加されます（加算マイグレーション・冪等）。
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

1. **DB マイグレーション**: `supabase/migrations/20260628_google_auth.sql`（または `supabase/schema.sql` 末尾）を Supabase の SQL Editor で実行（`line_user_id` を NULL 許容化、`auth_user_id` / `email` 追加）。
2. **Supabase Auth（Google プロバイダ）を有効化**（ダッシュボード）:
   - Authentication → Providers → Google を ON にし、Google Cloud の OAuth クライアントID/Secret を登録。
   - Authentication → URL Configuration の Redirect URLs に `http://localhost:3000/auth/callback` と `https://<本番ドメイン>/auth/callback` を追加。
   - Google Cloud 側の「承認済みリダイレクトURI」に Supabase の `https://<project-ref>.supabase.co/auth/v1/callback` を登録。
3. **環境変数**（`.env.example` 参照）:
   - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`（Google ログインで使用）。
   - `SESSION_SECRET`（新認証の有効化スイッチ 兼 LINE 署名鍵。`openssl rand -hex 32`）。
   - `NEXT_PUBLIC_LINE_ADD_FRIEND_URL`（ログインページの「LINEから始める」ボタンのリンク先）。

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
