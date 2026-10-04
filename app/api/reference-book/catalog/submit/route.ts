import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabaseServer";
import { getRequestUserId } from "@/lib/apiUser";
import {
  catalogKey,
  catalogStructureHash,
  sanitizeCatalogChapters,
  sanitizeCatalogMeta,
} from "@/lib/referenceBookCatalog";
import { recountCatalogSubmitters } from "@/lib/referenceBookCatalogServer";

export const runtime = "nodejs";

const MIN_CHAPTERS = 2;

/**
 * POST /api/reference-book/catalog/submit
 * 目次の読み取りで登録した章立てを、共有カタログへ提出する（ログイン必須）。
 * body: { book: { title, publisher?, edition?, chapters } }
 * 共有するのは章・節の名前・キーワード・トピックの紐づけだけ（メモ・読了・計画は取り除く）。
 * 同じ本・同じ構造の提出は1行にまとめ、提出した人数を数え直す。
 * 返却: { ok: true, catalogId } / 章が少なすぎる: { ok: true, skipped: true }
 */
export async function POST(request: Request) {
  let body: { userId?: string; book?: { title?: unknown; publisher?: unknown; edition?: unknown; chapters?: unknown } } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 });
  }
  const userId = await getRequestUserId(body);
  if (!userId) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }
  const meta = sanitizeCatalogMeta(body.book ?? {});
  if (!meta) {
    return NextResponse.json({ ok: false, error: "title required" }, { status: 400 });
  }
  const chapters = sanitizeCatalogChapters(body.book?.chapters);
  if (chapters.length < MIN_CHAPTERS) {
    return NextResponse.json({ ok: true, skipped: true });
  }
  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "supabase not configured" }, { status: 503 });
  }

  const normalizedKey = catalogKey(meta.title, meta.edition);
  const structureHash = catalogStructureHash(chapters);
  const { data: existing, error: readError } = await supabase
    .from("reference_book_catalog")
    .select("id")
    .eq("normalized_key", normalizedKey)
    .eq("structure_hash", structureHash)
    .maybeSingle();
  if (readError) {
    return NextResponse.json({ ok: false, error: "submit failed" }, { status: 500 });
  }

  let catalogId = (existing as { id: string } | null)?.id;
  if (!catalogId) {
    const { data: inserted, error: insertError } = await supabase
      .from("reference_book_catalog")
      .insert({
        normalized_key: normalizedKey,
        title: meta.title,
        publisher: meta.publisher,
        edition: meta.edition,
        chapters,
        structure_hash: structureHash,
      })
      .select("id")
      .single();
    if (insertError || !inserted) {
      return NextResponse.json({ ok: false, error: "submit failed" }, { status: 500 });
    }
    catalogId = (inserted as { id: string }).id;
  }

  // 同じ人の再提出は1件のまま（主キーで重複を吸収する）。
  const { error: submitError } = await supabase
    .from("reference_book_catalog_submissions")
    .upsert({ catalog_id: catalogId, user_id: userId }, { onConflict: "catalog_id,user_id", ignoreDuplicates: true });
  if (submitError) {
    return NextResponse.json({ ok: false, error: "submit failed" }, { status: 500 });
  }
  const submitters = await recountCatalogSubmitters(supabase, catalogId);
  await supabase
    .from("reference_book_catalog")
    .update({ submit_count: submitters, updated_at: new Date().toISOString() })
    .eq("id", catalogId);

  return NextResponse.json({ ok: true, catalogId });
}
