import { NextResponse } from "next/server";
import { loadGradingRecordsForUser } from "@/lib/ai/gradingRecords";
import { getRequestUserId } from "@/lib/apiUser";

export const runtime = "nodejs";

/**
 * POST /api/ai-grading/history
 * ログイン中ユーザーのAI採点履歴（復習用）を新しい順に返す。
 * body: { userId?: string }（userId は後方互換時のみ参照）
 * 未ログイン / 未設定は空配列を返す（UI を止めない）。
 */
export async function POST(request: Request) {
  let body: { userId?: string } = {};
  try {
    body = (await request.json()) as { userId?: string };
  } catch {
    /* body 無しでも続行（userId はセッションから解決する） */
  }

  const userId = await getRequestUserId(body);
  const records = await loadGradingRecordsForUser(userId);
  return NextResponse.json({ ok: true, records });
}
