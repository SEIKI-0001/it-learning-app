import { NextResponse } from "next/server";
import { getInternalUserId } from "@/lib/auth/currentUser";
import { loadAppStateForUser } from "@/lib/serverAppState";

export const runtime = "nodejs";

/**
 * GET /api/session/state
 * 現在のセッション（Google / LINE Cookie）から内部 user_id を解決し、
 * DB 上の AppState（あれば）を返す。クライアントの復元に使う。
 * - 未ログイン: 401
 * - ログイン済み: 200 { ok, userId, appState }
 */
export async function GET() {
  const userId = await getInternalUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }
  const appState = await loadAppStateForUser(userId);
  return NextResponse.json({ ok: true, userId, appState });
}
