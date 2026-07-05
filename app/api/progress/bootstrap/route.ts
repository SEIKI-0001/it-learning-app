import { NextResponse } from "next/server";
import { getRequestUserId } from "@/lib/apiUser";
import { getServiceSupabase } from "@/lib/supabaseServer";
import { loadAppStateForUser } from "@/lib/serverAppState";
import {
  getLatestOrGeneratePlanAdjustment,
  getLatestOrRefreshIntegratedStatus,
} from "@/lib/progressBootstrap";

export const runtime = "nodejs";

// POST /api/progress/bootstrap
// /progress 初期表示用に、セッション復元・統合進捗・計画修正提案をまとめて返す。
// body: { userId? }
//
// - 未ログイン: 401（クライアントは localStorage / onboarding の既存動作にフォールバック）
// - Supabase 未設定: 200 で null 群を返す（localStorage のみで表示継続）
// - 統合進捗: 当日スナップショットがあれば latest、無ければ refresh して返す
// - 計画修正: 有効な latest があればそれ、無ければ生成して返す
export async function POST(request: Request) {
  let body: { userId?: string } = {};
  try {
    body = (await request.json()) as { userId?: string };
  } catch {
    // body なしでもセッション Cookie から解決できる。
  }

  const userId = await getRequestUserId(body);
  if (!userId) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }

  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json({
      ok: true,
      userId,
      appState: null,
      integratedStatus: null,
      planAdjustmentProposal: null,
      fallback: "supabase_not_configured",
    });
  }

  const now = new Date();
  const [appState, integrated] = await Promise.all([
    loadAppStateForUser(userId),
    getLatestOrRefreshIntegratedStatus(supabase, userId, now),
  ]);

  const planAdjustmentProposal = integrated.status
    ? await getLatestOrGeneratePlanAdjustment(
        supabase,
        userId,
        integrated.row,
        now,
      )
    : null;

  return NextResponse.json({
    ok: true,
    userId,
    appState,
    integratedStatus: integrated.status,
    planAdjustmentProposal,
  });
}
