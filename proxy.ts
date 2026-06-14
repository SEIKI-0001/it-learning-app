import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ============================================================================
// Proxy (Next.js 16 で middleware から改名)。ルート描画前に実行される。
// 役割: /admin と /api/admin/* を Basic 認証で保護する。
//   - ユーザー名は ADMIN_USER(未設定なら "admin")、パスワードは ADMIN_PASSWORD。
//   - ADMIN_PASSWORD 未設定時は安全側に倒して 503 を返し、管理画面を一切公開しない。
// 既存の LINE/Supabase/学習画面には一切触れない(matcher で /admin 系のみ対象)。
// ============================================================================

export const config = {
  matcher: ["/admin", "/admin/:path*", "/api/admin/:path*"],
};

function unauthorized(): NextResponse {
  return new NextResponse("認証が必要です。", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="admin", charset="UTF-8"',
      "Cache-Control": "no-store",
    },
  });
}

export function proxy(request: NextRequest): NextResponse {
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
    if (user === expectedUser && pass === password) {
      return NextResponse.next();
    }
  }

  return unauthorized();
}
