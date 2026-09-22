import { NextResponse } from "next/server";
import { getRequestUserId } from "@/lib/apiUser";
import { isAuthEnabled } from "@/lib/auth/lineSession";
import { sanitizeAiPayload } from "@/lib/weeklyReportNarrative";
import { generateWeeklyNarrative, WeeklyReportAiError } from "@/lib/ai/weeklyReportCoach";

export const runtime = "nodejs";

/**
 * POST /api/weekly-report
 * 週間レポートの文章を AI で生成する。body: { payload: WeeklyAiPayload }
 *
 * - 数値・成長判定はクライアントの lib/weeklyReportFacts.ts が確定済み。ここは文章化だけ。
 * - 失敗しても画面は壊れない（クライアントがテンプレート文で表示する）。
 *   そのため失敗時も詳細は返さず、状態コードと短いコードだけ返す。
 * - 学習記録が0件の週は AI を呼ばない（テンプレートで十分・コストを使わない）。
 */
export async function POST(request: Request) {
  let body: { payload?: unknown; userId?: string } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  const userId = await getRequestUserId(body);
  if (!userId && (process.env.NODE_ENV === "production" || isAuthEnabled())) {
    return NextResponse.json({ ok: false, error: "login_required" }, { status: 401 });
  }

  const payload = sanitizeAiPayload(body.payload);
  if (!payload || payload.totals.answered <= 0) {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  try {
    const { part, model } = await generateWeeklyNarrative(payload);
    return NextResponse.json({ ok: true, narrative: part, meta: { model } });
  } catch (e) {
    const code = e instanceof WeeklyReportAiError ? e.code : "request_failed";
    if (code !== "not_configured") console.error("[weekly-report] generation failed:", e);
    return NextResponse.json({ ok: false, error: code }, { status: code === "not_configured" ? 503 : 502 });
  }
}
