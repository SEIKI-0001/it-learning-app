import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabaseServer";
import { getRequestUserId } from "@/lib/apiUser";
import { referenceBookToRow } from "@/lib/dbMappers";
import type { ReferenceBook } from "@/types/referenceBook";

export const runtime = "nodejs";

/**
 * POST /api/reference-book/save
 * ユーザーの参考書アウトラインを UPSERT する（1ユーザー1冊）。
 * body: { userId?: string, book: ReferenceBook }（ユーザーはセッション Cookie から解決）
 *
 * Supabase 未設定: 503 / userId なし: 401 / book 不正: 400 / 保存失敗: 500
 */
export async function POST(request: Request) {
  let body: { userId?: string; book?: ReferenceBook } = {};
  try {
    body = (await request.json()) as { userId?: string; book?: ReferenceBook };
  } catch {
    return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 });
  }

  const userId = await getRequestUserId(body);
  if (!userId) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }

  const book = body.book;
  if (!book || !Array.isArray(book.chapters)) {
    return NextResponse.json({ ok: false, error: "book invalid" }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "supabase not configured" },
      { status: 503 },
    );
  }

  const { error } = await supabase
    .from("user_reference_books")
    .upsert(referenceBookToRow(userId, book), { onConflict: "user_id" });

  if (error) {
    return NextResponse.json({ ok: false, error: "save failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
