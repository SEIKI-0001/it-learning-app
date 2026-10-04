import { NextResponse } from "next/server";
import { adminAuthFailure } from "@/lib/auth/adminAuth";
import { getServiceSupabase } from "@/lib/supabaseServer";
import { getAllTopics } from "@/lib/content";
import { loadAppStateForUser } from "@/lib/serverAppState";
import { referenceBookRowToBook, type ReferenceBookRow } from "@/lib/dbMappers";
import { diagnoseBookOrder, type BookOrderDiagnosis } from "@/lib/bookOrderDiagnostics";
import { listReferenceBookPresets, referenceBookFromPreset } from "@/lib/referenceBookPresets";

export const runtime = "nodejs";

/**
 * GET /api/admin/book-order
 * 参考書順（Book mode）の Shadow 比較レポート。読むだけで、何も書き込まない。
 *   - users   … 参考書を登録しているユーザーごとの品質・現在地・次に学ぶトピック（アプリ順 vs 参考書順）
 *   - presets … 同梱プリセット（進捗なし）の品質・ユニットの粒度
 * ユーザーは user_id の先頭8文字だけを出す。
 */
export async function GET(request: Request) {
  const denied = adminAuthFailure(request);
  if (denied) return denied;

  const topics = getAllTopics();
  const presets = listReferenceBookPresets().map((preset) => ({
    id: preset.id,
    title: preset.title,
    diagnosis: diagnoseBookOrder({ book: referenceBookFromPreset(preset.id), state: null, topics }),
  }));

  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json({ ok: true, users: [], presets, supabase: false });
  }

  const { data, error } = await supabase.from("user_reference_books").select("*");
  if (error) {
    return NextResponse.json({ ok: false, error: "load failed" }, { status: 500 });
  }

  const users: {
    user: string;
    title: string;
    active: boolean;
    preference: string | null;
    diagnosis: BookOrderDiagnosis;
  }[] = [];
  for (const row of (data ?? []) as (ReferenceBookRow & { user_id: string })[]) {
    const book = referenceBookRowToBook(row);
    const state = await loadAppStateForUser(row.user_id).catch(() => null);
    users.push({
      user: row.user_id.slice(0, 8),
      title: book.title,
      active: book.active,
      preference: state?.profile?.studyOrderPreference ?? null,
      diagnosis: diagnoseBookOrder({ book, state, topics }),
    });
  }

  return NextResponse.json(
    { ok: true, users, presets, supabase: true },
    { headers: { "Cache-Control": "no-store" } },
  );
}
