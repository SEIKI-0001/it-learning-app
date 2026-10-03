import { NextResponse } from "next/server";

// /admin と /api/admin/* の Basic 認証。
// proxy.ts の画面ゲートと、各管理 Route Handler の両方から呼ぶ（Proxy を
// すり抜けられても管理 API 単体で拒否できるようにする）。

/** 認証済みなら null、そうでなければそのまま返すべき拒否レスポンス。 */
export function adminAuthFailure(request: Request): NextResponse | null {
  const password = process.env.ADMIN_PASSWORD?.trim();

  // パスワード未設定では保護できないため、公開せず 503。
  if (!password) {
    return new NextResponse(
      "管理画面は無効です（ADMIN_PASSWORD が未設定）。環境変数を設定してください。",
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const expectedUser = process.env.ADMIN_USER?.trim() || "admin";
  const header = request.headers.get("authorization");
  if (header?.startsWith("Basic ")) {
    let decoded = "";
    try {
      decoded = atob(header.slice(6));
    } catch {
      return unauthorized();
    }
    const sep = decoded.indexOf(":");
    const user = sep >= 0 ? decoded.slice(0, sep) : "";
    const pass = sep >= 0 ? decoded.slice(sep + 1) : "";
    // 両方を必ず比較して、どちらが違ったかを応答時間から読ませない。
    const userOk = constantTimeEqual(user, expectedUser);
    const passOk = constantTimeEqual(pass, password);
    if (userOk && passOk) return null;
  }
  return unauthorized();
}

/**
 * 状態を変える管理 API 用。Basic 認証の資格情報はブラウザが自動で付けるため、
 * 別サイトから管理者のブラウザ経由で叩かれないよう同一オリジンも要求する。
 */
export function adminMutationFailure(request: Request): NextResponse | null {
  const denied = adminAuthFailure(request);
  if (denied) return denied;
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return NextResponse.json(
      { ok: false, error: "cross-origin request rejected" },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }
  return null;
}

function unauthorized(): NextResponse {
  return new NextResponse("認証が必要です。", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="admin", charset="UTF-8"',
      "Cache-Control": "no-store",
    },
  });
}

/** 長さ以外の情報を応答時間に出さない文字列比較（Proxy でも動くよう node:crypto は使わない）。 */
function constantTimeEqual(a: string, b: string): boolean {
  const length = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < length; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}
