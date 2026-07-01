import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServerSupabase } from "@/lib/supabase/serverClient";
import { LINE_SESSION_COOKIE } from "@/lib/auth/lineSession";

export const runtime = "nodejs";

/**
 * ログアウト。Supabase Auth（Google）セッションと LINE 署名 Cookie を破棄して /login へ。
 * GET / POST どちらでも可（リンク・フォーム双方から呼べるように）。
 */
async function logout(request: Request) {
  const supabase = await getServerSupabase();
  if (supabase) {
    try {
      await supabase.auth.signOut();
    } catch {
      /* ignore */
    }
  }
  try {
    (await cookies()).delete(LINE_SESSION_COOKIE);
  } catch {
    /* ignore */
  }
  const base = resolveBaseUrl(request);
  if (!base) {
    return NextResponse.json(
      { ok: false, error: "app url not configured" },
      { status: 503 },
    );
  }
  return NextResponse.redirect(`${base}/login`, { status: 303 });
}

export async function GET(request: Request) {
  return logout(request);
}

export async function POST(request: Request) {
  return logout(request);
}

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

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
