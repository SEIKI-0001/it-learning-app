import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabaseServer";

export const runtime = "nodejs";

/**
 * POST /api/reference-book/catalog/use
 * カタログの目次が登録に使われた回数を数える（並び順の参考。誰が使ったかは保存しない）。
 * body: { id: string }
 */
export async function POST(request: Request) {
  let body: { id?: unknown } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 });
  }
  const id = typeof body.id === "string" && /^[0-9a-f-]{36}$/i.test(body.id) ? body.id : null;
  if (!id) return NextResponse.json({ ok: false, error: "invalid id" }, { status: 400 });
  const supabase = getServiceSupabase();
  if (!supabase) return NextResponse.json({ ok: true });
  const { data } = await supabase.from("reference_book_catalog").select("use_count").eq("id", id).maybeSingle();
  if (!data) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  await supabase
    .from("reference_book_catalog")
    .update({ use_count: (data as { use_count: number }).use_count + 1 })
    .eq("id", id);
  return NextResponse.json({ ok: true });
}
