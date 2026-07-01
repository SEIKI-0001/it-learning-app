import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabaseServer";
import { loadAppStateForUser } from "@/lib/serverAppState";
import {
  LINE_SESSION_COOKIE,
  LINE_SESSION_MAX_AGE,
  isAuthEnabled,
  signLineSession,
} from "@/lib/auth/lineSession";

export const runtime = "nodejs";

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * POST /api/session/resolve
 * LINE 発行の一時トークンを受け取り、対応する user_id と（あれば）DB上の AppState を返す。
 * あわせて LINE 署名 Cookie（fq_line）を発行し、以降は ?t= が無くても本人を識別できるようにする
 * （SESSION_SECRET 設定時のみ）。クライアントは user_id を localStorage に保存し保存系に使う。
 */
export async function POST(request: Request) {
  if (isProduction() && !isAuthEnabled()) {
    return NextResponse.json(
      { ok: false, error: "session not configured" },
      { status: 503 },
    );
  }

  let token = "";
  try {
    const body = (await request.json()) as { token?: string };
    token = (body.token ?? "").trim();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 });
  }
  if (!token) {
    return NextResponse.json({ ok: false, error: "token required" }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  if (!supabase) {
    // Supabase 未設定時はトークン解決できない。クライアントは localStorage で継続。
    return NextResponse.json({ ok: false, error: "supabase not configured" }, { status: 503 });
  }

  // トークン → user_id（期限切れは無効）
  const { data: session, error: sErr } = await supabase
    .from("line_sessions")
    .select("user_id, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (sErr) {
    return NextResponse.json({ ok: false, error: "lookup failed" }, { status: 500 });
  }
  if (!session) {
    return NextResponse.json(
      {
        ok: false,
        error: "token not found",
        message:
          "このリンクは期限切れ、または使用済みです。LINEで「今日」または「はじめる」と送って、新しいリンクから開いてください。",
      },
      { status: 404 },
    );
  }
  const expiresAt = session.expires_at ? new Date(session.expires_at).getTime() : NaN;
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) {
    await supabase.from("line_sessions").delete().eq("token", token);
    return NextResponse.json(
      {
        ok: false,
        error: "token expired",
        message:
          "このリンクは期限切れです。LINEで「今日」または「はじめる」と送って、新しいリンクから開いてください。",
      },
      { status: 410 },
    );
  }

  const userId = session.user_id as string;
  const { data: consumed, error: consumeErr } = await supabase
    .from("line_sessions")
    .delete()
    .eq("token", token)
    .select("token")
    .maybeSingle();

  if (consumeErr) {
    return NextResponse.json({ ok: false, error: "token consume failed" }, { status: 500 });
  }
  if (!consumed) {
    return NextResponse.json(
      {
        ok: false,
        error: "token already used",
        message:
          "このリンクはすでに使用済みです。LINEで「今日」または「はじめる」と送って、新しいリンクから開いてください。",
      },
      { status: 409 },
    );
  }

  const appState = await loadAppStateForUser(userId);

  const res = NextResponse.json({ ok: true, userId, appState });

  // LINE 署名 Cookie を発行（SESSION_SECRET 設定時のみ）。
  const signed = signLineSession(userId);
  if (signed) {
    res.cookies.set(LINE_SESSION_COOKIE, signed, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: LINE_SESSION_MAX_AGE,
    });
  }
  return res;
}
