import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabaseServer";
import { getRequestUserId } from "@/lib/apiUser";
import {
  planAdjustmentRowToProposal,
  type PlanAdjustmentRow,
} from "@/lib/dbMappers";

export const runtime = "nodejs";

// POST /api/plan-adjustment/latest
// 最新の有効な立て直し提案（proposed または accepted）を返す。
// body: { userId? }
// 返却: { ok, proposal | null }
//
// Supabase 未設定: 503 / userId なし: 401 / 無し: { ok:true, proposal:null }
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

  const { data, error } = await supabase
    .from("plan_adjustment_proposals")
    .select("*")
    .eq("user_id", userId)
    .in("status", ["proposed", "accepted"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: "get failed" }, { status: 500 });
  }

  const proposal = data
    ? planAdjustmentRowToProposal(data as PlanAdjustmentRow)
    : null;

  return NextResponse.json({ ok: true, proposal });
}
