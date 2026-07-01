import { getInternalUserId } from "@/lib/auth/currentUser";

// API Route 用のユーザー解決処理（共通化）。
//
// セッション（Google ログイン / LINE 署名 Cookie）から内部 user_id を解決する。
// - セッションがあればそれを最優先する。body の userId は信用しない（なりすまし防止）。
// - production では body.userId fallback を絶対に採用しない。
// - development / test の間だけ、後方互換で body.userId を採用する
//   （開発用の後方互換。本番では禁止）。
// - どちらも無ければ null（＝匿名）。保存系・AI採点は呼び出し側で拒否する。

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/** 現在のリクエストの内部 user_id を解決する。匿名なら null。 */
export async function getRequestUserId(body?: { userId?: string }): Promise<string | null> {
  const fromSession = await getInternalUserId();
  if (fromSession) return fromSession;

  if (isProduction()) return null;

  // 開発用の後方互換。本番では body.userId fallback は禁止。
  const fromBody = (body?.userId ?? "").trim();
  return fromBody || null;
}
