import type { NextConfig } from "next";

// NOTE: 以前は Cloudflare Pages 向けに output: 'export'（静的書き出し）を設定していましたが、
// LINE Webhook 用の POST ルートハンドラ（/api/line/webhook）は静的書き出しと両立できないため外しています。
// 本番デプロイ方針が固まったら、API を別ホスティングに分けるか、Node ランタイム前提のホスティングに切り替えてください。
const SECURITY_HEADERS = [
  // 他サイトの iframe に載せさせない（クリックジャッキング対策）。
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // Use the same application type boundary as npm run typecheck. Wrangler
  // runtime globals are checked by the Cloudflare build, not the Next build.
  typescript: { tsconfigPath: "tsconfig.typecheck.json" },
  // 全レスポンス共通のセキュリティヘッダー（vinext でも next.config の headers が適用される）。
  // CSP は今のところ埋め込み禁止など、スクリプトを止めない指示だけにしている。
  // script-src まで絞るには nonce の導入が要るため別対応。
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
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
