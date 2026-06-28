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

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
