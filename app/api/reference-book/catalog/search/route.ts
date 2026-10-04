import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabaseServer";
import { catalogKey, isCatalogVisible } from "@/lib/referenceBookCatalog";
import { catalogRowToEntry, type CatalogRow } from "@/lib/referenceBookCatalogServer";

export const runtime = "nodejs";

const LIMIT = 8;

/**
 * POST /api/reference-book/catalog/search
 * 書名で共有カタログを探す（オンボーディング前でも使えるようログインは問わない）。
 * body: { q: string }（2文字以上）
 * 返すのは他の利用者に見せてよいものだけ（運営の承認、または別々の2人以上から同じ構造の提出）。
 * 提出者の情報は返さない。
 */
export async function POST(request: Request) {
  let body: { q?: unknown } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 });
  }
  const q = typeof body.q === "string" ? body.q.trim().slice(0, 100) : "";
  const key = catalogKey(q).split("|")[0];
  if (key.length < 2) return NextResponse.json({ ok: true, entries: [] });

  const supabase = getServiceSupabase();
  if (!supabase) return NextResponse.json({ ok: true, entries: [] });

  const { data, error } = await supabase
    .from("reference_book_catalog")
    .select("*")
    .neq("status", "hidden")
    .ilike("normalized_key", `%${key.replace(/[%_\\]/g, "")}%`)
    .order("use_count", { ascending: false })
    .limit(LIMIT * 3);
  if (error) {
    return NextResponse.json({ ok: false, error: "search failed" }, { status: 500 });
  }
  const entries = ((data ?? []) as CatalogRow[])
    .filter(isCatalogVisible)
    .slice(0, LIMIT)
    .map(catalogRowToEntry);
  return NextResponse.json({ ok: true, entries }, { headers: { "Cache-Control": "no-store" } });
}
