import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/serverClient";
import { getInternalUserId } from "@/lib/auth/currentUser";
import {
  ATTRIBUTION_COOKIE,
  parseAttributionCookie,
  recordSignupAttribution,
} from "@/lib/growth/attribution";

export const runtime = "nodejs";

/**
 * GET /auth/callback
 * Google（Supabase Auth）の OAuth リダイレクト先。
 * 認可コードをセッションへ交換し（Cookie を発行）、内部ユーザーへ写像してからアプリへ戻す。
 *
 * - 既に Google 紐づけ済みのユーザー → 既存の内部ユーザーを復元。
 * - 無ければ新規ユーザーを作成（getInternalUserId 内で実行）。
 *   LINE 起点ユーザーとの統合は設定画面の連携コードで行う。
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = sanitizeNext(url.searchParams.get("next"));
  const base = resolveBaseUrl(request);
  if (!base) {
    return NextResponse.json(
      { ok: false, error: "app url not configured" },
      { status: 503 },
    );
  }

  if (!code) {
    return NextResponse.redirect(`${base}/login?error=oauth`);
  }

  const supabase = await getServerSupabase();
  if (!supabase) {
    return NextResponse.redirect(`${base}/login?error=config`);
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("[auth/callback] exchange failed:", error.message);
    return NextResponse.redirect(`${base}/login?error=exchange`);
  }

  // 内部ユーザー（line_users.id）へ写像。必要なら作成される。
  const userId = await getInternalUserId();

  // 新規登録なら流入元（first-touch）を記録する。失敗してもログインは続行。
  const attribution = parseAttributionCookie(readCookie(request, ATTRIBUTION_COOKIE));
  if (userId && attribution) {
    try {
      await recordSignupAttribution(userId, attribution);
    } catch (e) {
      console.error("[auth/callback] attribution failed:", e);
    }
  }

  const response = NextResponse.redirect(`${base}${next}`);
  if (userId && attribution) response.cookies.delete(ATTRIBUTION_COOKIE);
  return response;
}

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return rest.join("=");
  }
  return null;
}

/** オープンリダイレクト防止: アプリ内パス（/... 単独）だけ許可。 */
function sanitizeNext(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/";
  return next;
}

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/** 戻り先の基点 URL。production では env 必須、development では host fallback を許容。 */
function resolveBaseUrl(request: Request): string | null {
  const fromEnv =
    process.env.NEXT_PUBLIC_APP_URL?.trim() || process.env.APP_BASE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, "");
  if (isProduction()) return null;
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (host) return `${proto}://${host}`;
  return new URL(request.url).origin;
}
