import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabaseServer";
import { getRequestUserId } from "@/lib/apiUser";
import {
  referenceBookRowToBook,
  type ReferenceBookRow,
} from "@/lib/dbMappers";
import { parseArchivePayload, parseStudyPlanPayload } from "@/lib/referenceBookPayload";

export const runtime = "nodejs";

/**
 * POST /api/reference-book/get
 * ユーザーの参考書アウトラインを取得する（1ユーザー1冊）。
 * body: { userId?: string }（production ではセッション / fq_line Cookie からのみ解決）
 * 返却: { ok: true, book: ReferenceBook | null, archive: ReferenceBookArchiveEntry[], studyPlan: ReferenceStudyPlan | null }
 *   archive / studyPlan は migration 20261004120000 適用前の環境では空（[] / null）。
 *
 * Supabase 未設定: 503（クライアントは localStorage で継続） / userId なし: 401
 */
export async function POST(request: Request) {
  let body: { userId?: string } = {};
  try {
    body = (await request.json()) as { userId?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 });
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

  // 追加列の有無（migration 適用前後）に関係なく読めるよう * で取る。
  const { data, error } = await supabase
    .from("user_reference_books")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: "get failed" }, { status: 500 });
  }

  const row = (data as ReferenceBookRow | null) ?? null;
  return NextResponse.json({
    ok: true,
    book: row ? referenceBookRowToBook(row) : null,
    archive: (row && parseArchivePayload(row.archived_books ?? [])) ?? [],
    studyPlan: (row?.study_plan && parseStudyPlanPayload(row.study_plan)) ?? null,
  });
}
