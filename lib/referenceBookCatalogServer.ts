import type { SupabaseClient } from "@supabase/supabase-js";
import {
  countCatalogSections,
  type CatalogChapter,
  type CatalogEntry,
} from "@/lib/referenceBookCatalog";

// カタログのサーバー側の共通処理（service role 専用）。

export type CatalogRow = {
  id: string;
  normalized_key: string;
  title: string;
  publisher: string | null;
  edition: string | null;
  chapters: CatalogChapter[];
  structure_hash: string;
  status: "pending" | "approved" | "hidden";
  submit_count: number;
  use_count: number;
  created_at: string;
  updated_at: string;
};

export function catalogRowToEntry(row: CatalogRow): CatalogEntry {
  const chapters = Array.isArray(row.chapters) ? row.chapters : [];
  return {
    id: row.id,
    title: row.title,
    publisher: row.publisher,
    edition: row.edition,
    chapters,
    chapterCount: chapters.length,
    sectionCount: countCatalogSections(chapters),
  };
}

/**
 * 提出した人数を数え直す。アカウント統合で別アカウントに統合された利用者は、
 * 統合先と同じ1人として数える（同じ人が2アカウントで出して「2人」にならないように）。
 */
export async function recountCatalogSubmitters(
  supabase: SupabaseClient,
  catalogId: string,
): Promise<number> {
  const { data: submissions } = await supabase
    .from("reference_book_catalog_submissions")
    .select("user_id")
    .eq("catalog_id", catalogId);
  const userIds = (submissions ?? []).map((s) => (s as { user_id: string }).user_id);
  if (userIds.length === 0) return 0;
  const { data: users } = await supabase
    .from("line_users")
    .select("id, merged_into")
    .in("id", userIds);
  const people = new Set(
    (users ?? []).map((u) => {
      const row = u as { id: string; merged_into: string | null };
      return row.merged_into ?? row.id;
    }),
  );
  return people.size;
}
