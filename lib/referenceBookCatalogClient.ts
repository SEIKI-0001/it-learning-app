"use client";

import type { ReferenceBook } from "@/types/referenceBook";
import type { CatalogEntry } from "@/lib/referenceBookCatalog";
import type { ReferenceBookChoice } from "@/lib/referenceBookPresets";
import { getUserId } from "@/lib/userSession";

// 目次の共有カタログのクライアント側（検索・提出・利用回数）。失敗しても登録の流れは止めない。

export async function searchReferenceBookCatalog(q: string): Promise<CatalogEntry[]> {
  if (q.trim().length < 2) return [];
  try {
    const res = await fetch("/api/reference-book/catalog/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q }),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { ok?: boolean; entries?: CatalogEntry[] };
    return data.ok && Array.isArray(data.entries) ? data.entries : [];
  } catch {
    return [];
  }
}

/**
 * 参考書を登録したあとに呼ぶ。
 *   - 目次の読み取りで章立てを登録した（その他＋章立て）… ログイン中ならカタログへ提出する
 *   - カタログの目次を使った … 利用回数を数える
 * 共有されるのは章・節の名前と紐づけだけ（サーバーがメモ・読了などを取り除く）。
 */
export function shareReferenceBookChoice(choice: ReferenceBookChoice, book: ReferenceBook): void {
  if (choice.kind === "catalog") {
    void fetch("/api/reference-book/catalog/use", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: choice.entry.id }),
    }).catch(() => {});
    return;
  }
  if (choice.kind !== "other" || !choice.chapters || choice.chapters.length === 0) return;
  const userId = getUserId();
  if (!userId) return;
  void fetch("/api/reference-book/catalog/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId,
      book: { title: book.title, publisher: book.publisher, edition: book.edition, chapters: book.chapters },
    }),
  }).catch(() => {});
}
