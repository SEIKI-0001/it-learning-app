import { NextResponse } from "next/server";
import { adminAuthFailure, adminMutationFailure } from "@/lib/auth/adminAuth";
import { getServiceSupabase } from "@/lib/supabaseServer";
import { isCatalogVisible } from "@/lib/referenceBookCatalog";
import { catalogRowToEntry, type CatalogRow } from "@/lib/referenceBookCatalogServer";

export const runtime = "nodejs";

/** GET /api/admin/book-catalog … 共有カタログの一覧（提出者は出さない）。 */
export async function GET(request: Request) {
  const denied = adminAuthFailure(request);
  if (denied) return denied;
  const supabase = getServiceSupabase();
  if (!supabase) return NextResponse.json({ ok: true, entries: [] });
  const { data, error } = await supabase
    .from("reference_book_catalog")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ ok: false, error: "load failed" }, { status: 500 });
  const entries = ((data ?? []) as CatalogRow[]).map((row) => ({
    ...catalogRowToEntry(row),
    status: row.status,
    submitCount: row.submit_count,
    useCount: row.use_count,
    visible: isCatalogVisible(row),
    updatedAt: row.updated_at,
  }));
  return NextResponse.json({ ok: true, entries }, { headers: { "Cache-Control": "no-store" } });
}

/** POST /api/admin/book-catalog { id, status } … 承認・非表示・未確認へ戻す。 */
export async function POST(request: Request) {
  const denied = adminMutationFailure(request);
  if (denied) return denied;
  let body: { id?: unknown; status?: unknown } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 });
  }
  const status = body.status === "approved" || body.status === "hidden" || body.status === "pending" ? body.status : null;
  if (typeof body.id !== "string" || !status) {
    return NextResponse.json({ ok: false, error: "invalid input" }, { status: 400 });
  }
  const supabase = getServiceSupabase();
  if (!supabase) return NextResponse.json({ ok: false, error: "supabase not configured" }, { status: 503 });
  const { error } = await supabase
    .from("reference_book_catalog")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", body.id);
  if (error) return NextResponse.json({ ok: false, error: "update failed" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
