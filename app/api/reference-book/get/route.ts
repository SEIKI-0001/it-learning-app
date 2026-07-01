import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabaseServer";
import { getRequestUserId } from "@/lib/apiUser";
import {
  referenceBookRowToBook,
  type ReferenceBookRow,
} from "@/lib/dbMappers";

export const runtime = "nodejs";

/**
 * POST /api/reference-book/get
 * ユーザーの参考書アウトラインを取得する（1ユーザー1冊）。
 * body: { userId?: string }（production ではセッション / fq_line Cookie からのみ解決）
 * 返却: { ok: true, book: ReferenceBook | null }
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

  const { data, error } = await supabase
    .from("user_reference_books")
    .select("title, publisher, edition, active, note, chapters, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: "get failed" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    book: data ? referenceBookRowToBook(data as ReferenceBookRow) : null,
  });
}
