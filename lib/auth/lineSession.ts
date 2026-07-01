import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * LINE 起点ユーザー用の署名付きセッション Cookie（サーバー専用）。
 *
 * Google ユーザーは Supabase Auth がセッションを持つが、LINE だけで始めたユーザーは
 * Supabase Auth のセッションを持たない。そこで ?t= トークン解決時に内部 user_id を
 * HMAC 署名した Cookie（fq_line）へ載せ、以降のナビゲーション/保存で本人を識別する。
 *
 * - 署名鍵は SESSION_SECRET。未設定なら発行/検証とも無効（＝新認証システム off）。
 * - 中身は { uid, iat, exp }（秘匿情報は持たない）。改ざんは HMAC で検出。
 */

const COOKIE = "fq_line";
const MAX_AGE = 60 * 60 * 24 * 30; // 継続ログイン用 Cookie は30日。

type VerifiedLineSession = {
  userId: string;
  legacy: boolean;
};

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
  const uid = userId.trim();
  if (!s || !uid) return null;
  const now = Date.now();
  const payload = Buffer.from(
    JSON.stringify({ uid, iat: now, exp: now + MAX_AGE * 1000 }),
  ).toString("base64url");
  const sig = createHmac("sha256", s).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

/** 署名トークンを検証して内部 user_id を取り出す。不正/未設定なら null。 */
export function verifyLineSessionDetails(
  token: string | undefined | null,
): VerifiedLineSession | null {
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
      iat?: unknown;
      exp?: unknown;
    };
    const userId = (data.uid ?? "").trim();
    if (!userId) return null;

    const hasExp = Object.prototype.hasOwnProperty.call(data, "exp");
    const exp =
      typeof data.exp === "number"
        ? data.exp
        : typeof data.exp === "string"
          ? Number(data.exp)
          : NaN;
    if (hasExp && !Number.isFinite(exp)) return null;
    if (hasExp) {
      return exp > Date.now() ? { userId, legacy: false } : null;
    }

    const iat =
      typeof data.iat === "number"
        ? data.iat
        : typeof data.iat === "string"
          ? Number(data.iat)
          : NaN;
    if (!Number.isFinite(iat)) return null;

    // 旧形式 `{ uid, iat }` は既存 LINE ユーザーの急なログイン不能を避ける
    // 短期移行用の後方互換。本番でも新規発行は必ず `exp` 付きにする。
    return iat + MAX_AGE * 1000 > Date.now() ? { userId, legacy: true } : null;
  } catch {
    return null;
  }
}

export function verifyLineSession(token: string | undefined | null): string | null {
  return verifyLineSessionDetails(token)?.userId ?? null;
}

export const LINE_SESSION_COOKIE = COOKIE;
export const LINE_SESSION_MAX_AGE = MAX_AGE;
