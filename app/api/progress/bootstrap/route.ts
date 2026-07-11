import { NextResponse } from "next/server";
import { getRequestUserIdFast } from "@/lib/apiUser";
import { getServiceSupabase } from "@/lib/supabaseServer";
import { loadAppStateForUser } from "@/lib/serverAppState";
import {
  generatePlanAdjustmentForUser,
  getLatestOrRefreshIntegratedStatus,
  getLatestPlanAdjustmentProposal,
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

  // 初期表示専用の読み取り API のため、高速版（getClaims）でユーザーを解決する。
  const userId = await getRequestUserIdFast(body);
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
  // 立て直し提案の「最新取得」は統合進捗に依存しないため並列で走らせ、
  // 依存が必要な「生成」（提案が無いときだけ）のみ後段で行う。
  const [appState, integrated, latestProposal] = await Promise.all([
    loadAppStateForUser(userId),
    getLatestOrRefreshIntegratedStatus(supabase, userId, now),
    getLatestPlanAdjustmentProposal(supabase, userId),
  ]);

  const planAdjustmentProposal =
    latestProposal ??
    (integrated.status
      ? await generatePlanAdjustmentForUser(supabase, userId, integrated.row, now)
      : null);

  return NextResponse.json({
    ok: true,
    userId,
    appState,
    integratedStatus: integrated.status,
    planAdjustmentProposal,
  });
}
