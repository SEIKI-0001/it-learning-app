import type { NextConfig } from "next";

// NOTE: 以前は Cloudflare Pages 向けに output: 'export'（静的書き出し）を設定していましたが、
// LINE Webhook 用の POST ルートハンドラ（/api/line/webhook）は静的書き出しと両立できないため外しています。
// 本番デプロイ方針が固まったら、API を別ホスティングに分けるか、Node ランタイム前提のホスティングに切り替えてください。
const nextConfig: NextConfig = {};

export default nextConfig;
