import { getInternalUserId, getInternalUserIdFast } from "@/lib/auth/currentUser";

// API Route 用のユーザー解決処理（共通化）。
//
// セッション（Google ログイン / LINE 署名 Cookie）から内部 user_id を解決する。
// - セッションがあればそれを最優先する。body の userId は信用しない（なりすまし防止）。
// - body.userId fallback は、ローカル開発で ALLOW_BODY_USER_ID=true を明示したときだけ採用する。
//   NODE_ENV だけで判定すると、production 以外で動くプレビュー/検証環境が
//   「本文の userId を名乗れば誰にでもなれる」状態になるため。production では常に禁止。
// - どちらも無ければ null（＝匿名）。保存系・AI採点は呼び出し側で拒否する。

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

function bodyUserIdAllowed(): boolean {
  return !isProduction() && process.env.ALLOW_BODY_USER_ID?.trim() === "true";
}

/** 現在のリクエストの内部 user_id を解決する。匿名なら null。 */
export async function getRequestUserId(body?: { userId?: string }): Promise<string | null> {
  const fromSession = await getInternalUserId();
  if (fromSession) return fromSession;
  return fallbackFromBody(body);
}

/**
 * getRequestUserId の高速版（getClaims によるローカル署名検証）。
 * 初期表示ブートストラップなど読み取り中心の API 専用。
 * 保存系・課金・AI採点の実行では従来どおり getRequestUserId を使うこと。
 */
export async function getRequestUserIdFast(body?: { userId?: string }): Promise<string | null> {
  const fromSession = await getInternalUserIdFast();
  if (fromSession) return fromSession;
  return fallbackFromBody(body);
}

function fallbackFromBody(body?: { userId?: string }): string | null {
  if (!bodyUserIdAllowed()) return null;

  const fromBody = (body?.userId ?? "").trim();
  return fromBody || null;
}
