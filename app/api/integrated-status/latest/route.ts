import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabaseServer";
import { getRequestUserId } from "@/lib/apiUser";
import {
  integratedStatusRowToStatus,
  type IntegratedStatusRow,
} from "@/lib/dbMappers";

export const runtime = "nodejs";

// POST /api/integrated-status/latest
// 最新の統合進捗スナップショットを返す。
// body: { userId? }
// 返却: { ok, status | null }
//
// Supabase 未設定: 503 / userId なし: 401 / 未保存: { ok:true, status:null }
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
    .from("integrated_learning_status")
    .select("*")
    .eq("user_id", userId)
    .order("status_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: "get failed" }, { status: 500 });
  }

  const status = data
    ? integratedStatusRowToStatus(data as IntegratedStatusRow)
    : null;

  return NextResponse.json({ ok: true, status });
}
