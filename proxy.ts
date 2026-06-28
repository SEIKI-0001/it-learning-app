import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// ============================================================================
// Proxy (Next.js 16 で middleware から改名)。ルート描画前に実行される。
// 役割:
//   1. /admin と /api/admin/* を Basic 認証で保護（従来どおり）。
//   2. Supabase Auth（Google）セッションをリフレッシュする（@supabase/ssr 推奨構成）。
//   3. 未ログインでアプリ画面へ来たら /login へ誘導する（全画面ログイン必須）。
//
// 段階的ロールアウト（既存 LINE 導線・既存データを壊さない）:
//   - Supabase 未設定なら新認証は何もせず素通し。
//   - 厳格ゲーティングは SESSION_SECRET 設定時のみ有効（LINE 署名 Cookie が機能する前提）。
//   - LINE からの初回着地（?t=トークン）は素通しし、クライアントが /api/session/resolve で
//     fq_line Cookie を受け取ってからは Cookie で認証される。
// ============================================================================

export const config = {
  // 静的アセット・画像最適化・拡張子付きファイルを除く全リクエストで実行。
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)",
  ],
};

const LINE_SESSION_COOKIE = "fq_line";
// 認証不要で常に通すパス（前方一致）。
const PUBLIC_PREFIXES = ["/login", "/auth"];

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // 1) /admin 系は Basic 認証（従来どおり）。
  if (
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname.startsWith("/api/admin")
  ) {
    return adminBasicAuth(request);
  }

  // 2) その他の API は各 Route Handler が自前で認証する。ここではゲートしない。
  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // 3) Supabase 未設定なら新認証システムは動かさず素通し（既存挙動を維持）。
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnon) {
    return NextResponse.next();
  }

  // 4) Supabase セッションのリフレッシュ。setAll でレスポンスへ Cookie を書き戻す。
  let response = NextResponse.next({ request });
  const supabase = createServerClient(supabaseUrl, supabaseAnon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  let hasSupabaseUser = false;
  try {
    const { data } = await supabase.auth.getUser();
    hasSupabaseUser = Boolean(data.user);
  } catch {
    hasSupabaseUser = false;
  }

  // 5) 認証不要パス（ログイン/コールバック）はそのまま。
  if (
    PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  ) {
    return response;
  }

  // 6) 厳格ゲーティングは SESSION_SECRET 設定時のみ。未設定なら素通し（段階的ロールアウト）。
  const gatingEnabled = Boolean(process.env.SESSION_SECRET?.trim());
  if (!gatingEnabled) {
    return response;
  }

  // 7) 保護対象アプリ画面: Google ログイン / LINE 署名 Cookie / ?t= のいずれかが必要。
  const hasLineCookie = Boolean(request.cookies.get(LINE_SESSION_COOKIE)?.value);
  const hasToken = request.nextUrl.searchParams.has("t");
  if (hasSupabaseUser || hasLineCookie || hasToken) {
    return response;
  }

  // 未ログイン → /login（元の遷移先を next で保持）。
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";
  const target = pathname + (request.nextUrl.search || "");
  if (target && target !== "/") {
    loginUrl.searchParams.set("next", target);
  }
  const redirect = NextResponse.redirect(loginUrl);
  // リフレッシュした Cookie を引き継ぐ。
  for (const cookie of response.cookies.getAll()) {
    redirect.cookies.set(cookie);
  }
  return redirect;
}

// ---- /admin Basic 認証（従来ロジックを関数化） ----
function adminBasicAuth(request: NextRequest): NextResponse {
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

function unauthorized(): NextResponse {
  return new NextResponse("認証が必要です。", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="admin", charset="UTF-8"',
      "Cache-Control": "no-store",
    },
  });
}
