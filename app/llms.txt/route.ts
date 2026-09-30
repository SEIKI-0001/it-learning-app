import { buildLlmsTxt } from "@/lib/publicPages/llmsTxt";

// /llms.txt。中身は lib/publicPages/llmsTxt.ts。公開データだけから作るのでビルド時に固定する。
// proxy.ts の matcher は .txt を除外しているため、ログインゲートは通らない。
export const dynamic = "force-static";

export function GET() {
  return new Response(buildLlmsTxt(), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
