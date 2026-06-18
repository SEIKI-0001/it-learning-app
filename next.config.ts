import type { NextConfig } from "next";

// NOTE: 以前は Cloudflare Pages 向けに output: 'export'（静的書き出し）を設定していましたが、
// LINE Webhook 用の POST ルートハンドラ（/api/line/webhook）は静的書き出しと両立できないため外しています。
// 本番デプロイ方針が固まったら、API を別ホスティングに分けるか、Node ランタイム前提のホスティングに切り替えてください。
const nextConfig: NextConfig = {
  // 7日版(FE Quest)の旧URLを、ITパスポート学習コーチの新URLへ転送する。
  // redirects はファイルシステムより先に評価され、クエリ(?t=トークン)も引き継がれる。
  async redirects() {
    return [
      { source: "/map", destination: "/progress", permanent: false },
      { source: "/quest/today", destination: "/today", permanent: false },
      { source: "/quest", destination: "/today", permanent: false },
      { source: "/result", destination: "/today", permanent: false },
      { source: "/topic", destination: "/topics", permanent: false },
      { source: "/topic/:id", destination: "/topics/:id", permanent: false },
    ];
  },
};

export default nextConfig;

import('@opennextjs/cloudflare').then(m => m.initOpenNextCloudflareForDev());
