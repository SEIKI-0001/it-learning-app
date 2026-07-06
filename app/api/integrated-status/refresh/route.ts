import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabaseServer";
import { getRequestUserId } from "@/lib/apiUser";
import { refreshIntegratedStatusForUser } from "@/lib/progressBootstrap";

export const runtime = "nodejs";

// 統合進捗を計算し、当日分を integrated_learning_status に upsert する。
//
// 集計・データ取得は lib/progressBootstrap の refreshIntegratedStatusForUser に集約している
// （/progress の bootstrap・LINE webhook・各学習 API の鮮度フックと同じ経路）。
//   確認問題(基礎理解) / 単語帳(用語定着) / 過去問レベル(本番対応力) / 日次達成度・参考書 を統合し、
//   合格に対する現在地・主なリスク・推奨配分を返す。自己申告は外部学習の推定にだけ使う。
//
// - Supabase 未設定: 503 / userId なし: 401
// - 計算はできたが保存に失敗しても画面は止めない（ok:true, saved:false で status を返す）。

function isIsoDate(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

export async function POST(request: Request) {
  let body: { userId?: string; date?: string } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    // body なしでも動く（date は今日を使う）。
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

  const result = await refreshIntegratedStatusForUser(supabase, userId, {
    date: isIsoDate(body.date) ? body.date : undefined,
  });

  return NextResponse.json({
    ok: true,
    saved: result.saved ?? false,
    status: result.status,
  });
}
