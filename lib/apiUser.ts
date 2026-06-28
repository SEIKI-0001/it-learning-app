import { getInternalUserId } from "@/lib/auth/currentUser";
import { isAuthEnabled } from "@/lib/auth/lineSession";

// API Route 用のユーザー解決処理（共通化）。
//
// セッション（Google ログイン / LINE 署名 Cookie）から内部 user_id を解決する。
// - セッションがあればそれを最優先する。body の userId は信用しない（なりすまし防止）。
// - 新認証システムが無効（SESSION_SECRET 未設定）の間だけ、後方互換で body.userId を採用する
//   （段階的ロールアウト。既存 LINE 導線・localStorage 経由の保存を壊さない）。
// - どちらも無ければ null（＝匿名）。保存系・AI採点は呼び出し側で拒否する。

/** 現在のリクエストの内部 user_id を解決する。匿名なら null。 */
export async function getRequestUserId(body?: { userId?: string }): Promise<string | null> {
  const fromSession = await getInternalUserId();
  if (fromSession) return fromSession;

  // 新認証システムが有効なら body の userId は信用しない（匿名として扱う）。
  if (isAuthEnabled()) return null;

  // 後方互換（ロールアウト前）: body の userId を採用する。
  const fromBody = (body?.userId ?? "").trim();
  return fromBody || null;
}
