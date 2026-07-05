import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabaseServer";
import { getRequestUserId } from "@/lib/apiUser";
import {
  integratedStatusRowToStatus,
  planAdjustmentRowToProposal,
  planAdjustmentToRow,
  type IntegratedStatusRow,
  type PlanAdjustmentRow,
} from "@/lib/dbMappers";
import { buildPlanAdjustmentProposal } from "@/lib/planAdjustment";

export const runtime = "nodejs";

// POST /api/plan-adjustment/generate
// 最新の integrated_learning_status からルールベースで立て直し提案を生成し保存する。
// body: { userId? }
// 返却: { ok, proposal | null }
//
// - Supabase 未設定: 503 / userId なし: 401
// - 統合進捗が未保存: proposal:null（提案の土台がない）
// - 提案不要（on_track・重大リスクなし）: proposal:null
// - 同日に proposed / accepted の提案が既にあれば、それを再利用する（重複生成しない）
// - AI API は呼ばない（すべてルールベース）。

/** exam_date（"YYYY-MM-DD"）から試験までの残り日数を求める。 */
function daysUntil(examDate: string | null, now: Date): number | null {
  if (!examDate) return null;
  const exam = new Date(`${examDate}T00:00:00`);
  if (Number.isNaN(exam.getTime())) return null;
  return Math.max(0, Math.ceil((exam.getTime() - now.getTime()) / 86_400_000));
}

export async function POST(request: Request) {
  let body: { userId?: string } = {};
  try {
    body = (await request.json()) as { userId?: string };
  } catch {
    // body なしでも動く。
  }

  const userId = await getRequestUserId(body);
  if (!userId) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }

  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "supabase not configured" },
      { status: 503 },
    );
  }

  // 提案の土台となる最新の統合進捗スナップショットを取得。
  const { data: statusData, error: statusError } = await supabase
    .from("integrated_learning_status")
    .select("*")
    .eq("user_id", userId)
    .order("status_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (statusError || !statusData) {
    // 統合進捗がまだ無ければ提案は作れない（UIは止めない）。
    return NextResponse.json({ ok: true, proposal: null });
  }

  const statusRow = statusData as IntegratedStatusRow;
  const status = integratedStatusRowToStatus(statusRow);
  const statusDate = statusRow.status_date;

  // 同日に有効な提案（proposed / accepted）があれば再利用（重複生成しない）。
  const { data: existing } = await supabase
    .from("plan_adjustment_proposals")
    .select("*")
    .eq("user_id", userId)
    .eq("status_date", statusDate)
    .in("status", ["proposed", "accepted"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({
      ok: true,
      proposal: planAdjustmentRowToProposal(existing as PlanAdjustmentRow),
    });
  }

  // 試験までの残り日数（直前期判定に使う）。
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("exam_date")
    .eq("user_id", userId)
    .maybeSingle();
  const examDate =
    (profile as { exam_date: string | null } | null)?.exam_date ?? null;

  const generated = buildPlanAdjustmentProposal({
    statusDate,
    status,
    daysUntilExam: daysUntil(examDate, new Date()),
  });

  // 提案不要。
  if (!generated) {
    return NextResponse.json({ ok: true, proposal: null });
  }

  const row = planAdjustmentToRow(userId, {
    statusDate,
    sourceStatusId: statusRow.id ?? null,
    triggerType: generated.triggerType,
    severity: generated.severity,
    headline: generated.headline,
    reasonSummary: generated.reasonSummary,
    options: generated.options,
  });

  const { data: inserted, error: insertError } = await supabase
    .from("plan_adjustment_proposals")
    .insert(row)
    .select("*")
    .single();

  if (insertError || !inserted) {
    // 保存に失敗しても、生成結果は返して画面に出せるようにする。
    return NextResponse.json({
      ok: true,
      saved: false,
      proposal: {
        proposalId: "",
        statusDate,
        sourceStatusId: statusRow.id ?? null,
        triggerType: generated.triggerType,
        severity: generated.severity,
        headline: generated.headline,
        reasonSummary: generated.reasonSummary,
        options: generated.options,
        selectedOptionId: null,
        status: "proposed" as const,
        acceptedAt: null,
      },
    });
  }

  return NextResponse.json({
    ok: true,
    saved: true,
    proposal: planAdjustmentRowToProposal(inserted as PlanAdjustmentRow),
  });
}
