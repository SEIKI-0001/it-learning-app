import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * LINE 起点ユーザー用の署名付きセッション Cookie（サーバー専用）。
 *
 * Google ユーザーは Supabase Auth がセッションを持つが、LINE だけで始めたユーザーは
 * Supabase Auth のセッションを持たない。そこで ?t= トークン解決時に内部 user_id を
 * HMAC 署名した Cookie（fq_line）へ載せ、以降のナビゲーション/保存で本人を識別する。
 *
 * - 署名鍵は SESSION_SECRET。未設定なら発行/検証とも無効（＝新認証システム off）。
 * - 中身は { uid, iat } のみ（秘匿情報は持たない）。改ざんは HMAC で検出。
 */

const COOKIE = "fq_line";
const MAX_AGE = 60 * 60 * 24 * 30; // 30日（line_sessions の有効期限に合わせる）

function secret(): string | null {
  return process.env.SESSION_SECRET?.trim() || null;
}

/** 新認証システム（署名 Cookie / 厳格ゲーティング）が有効か。 */
export function isAuthEnabled(): boolean {
  return Boolean(secret());
}

/** 内部 user_id を署名トークンへ。SESSION_SECRET 未設定なら null。 */
export function signLineSession(userId: string): string | null {
  const s = secret();
  if (!s) return null;
  const payload = Buffer.from(
    JSON.stringify({ uid: userId, iat: Date.now() }),
  ).toString("base64url");
  const sig = createHmac("sha256", s).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

/** 署名トークンを検証して内部 user_id を取り出す。不正/未設定なら null。 */
export function verifyLineSession(token: string | undefined | null): string | null {
  const s = secret();
  if (!s || !token) return null;
  const dot = token.lastIndexOf(".");
  if (dot < 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = createHmac("sha256", s).update(payload).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as {
      uid?: string;
    };
    return (data.uid ?? "").trim() || null;
  } catch {
    return null;
  }
}

export const LINE_SESSION_COOKIE = COOKIE;
export const LINE_SESSION_MAX_AGE = MAX_AGE;
