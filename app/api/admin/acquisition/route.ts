import { NextResponse } from "next/server";
import { adminAuthFailure } from "@/lib/auth/adminAuth";
import { getServiceSupabase } from "@/lib/supabaseServer";
import { acquisitionReportToCsv, parseAcquisitionPeriod } from "@/lib/growth/acquisition";
import { loadAcquisitionReport } from "@/lib/growth/acquisitionData";

export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * GET /api/admin/acquisition?days=7|30|90[&format=csv]
 * 流入元別の訪問・登録・学習開始・再学習（lib/growth/acquisition.ts）。管理者のみ。
 */
export async function GET(request: Request) {
  const denied = adminAuthFailure(request);
  if (denied) return denied;

  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "supabase not configured" }, { status: 503, headers: NO_STORE });
  }

  const params = new URL(request.url).searchParams;
  const days = parseAcquisitionPeriod(params.get("days"));
  const result = await loadAcquisitionReport(supabase, days);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500, headers: NO_STORE });
  }

  if (params.get("format") === "csv") {
    const date = result.report.period.endAt.slice(0, 10);
    return new NextResponse(acquisitionReportToCsv(result.report), {
      headers: {
        ...NO_STORE,
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="acquisition-${days}d-${date}.csv"`,
      },
    });
  }

  return NextResponse.json(
    { ok: true, report: result.report, warnings: result.warnings },
    { headers: NO_STORE },
  );
}
