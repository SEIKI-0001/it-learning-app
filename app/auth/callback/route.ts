import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/serverClient";
import { getInternalUserId } from "@/lib/auth/currentUser";

export const runtime = "nodejs";

/**
 * GET /auth/callback
 * Google（Supabase Auth）の OAuth リダイレクト先。
 * 認可コードをセッションへ交換し（Cookie を発行）、内部ユーザーへ写像してからアプリへ戻す。
 *
 * - 既に Google 紐づけ済みのユーザー → 既存の内部ユーザーを復元。
 * - LINE 起点ユーザーが fq_line Cookie を持っていれば、その既存ユーザーへ Google を紐づけ。
 * - どちらも無ければ新規ユーザーを作成（getInternalUserId 内で実行）。
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = sanitizeNext(url.searchParams.get("next"));
  const base = resolveBaseUrl(request);

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

  // 内部ユーザー（line_users.id）へ写像。必要なら作成 / LINE 紐づけが行われる。
  await getInternalUserId();

  return NextResponse.redirect(`${base}${next}`);
}

/** オープンリダイレクト防止: アプリ内パス（/... 単独）だけ許可。 */
function sanitizeNext(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/";
  return next;
}

/** 戻り先の基点 URL。env 優先、無ければ forwarded ヘッダ、最後に request.url。 */
function resolveBaseUrl(request: Request): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_APP_URL?.trim() || process.env.APP_BASE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, "");
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (host) return `${proto}://${host}`;
  return new URL(request.url).origin;
}
