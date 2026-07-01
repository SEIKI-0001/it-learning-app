"use client";

import type { ReferenceBook } from "@/types/referenceBook";

// ログイン時の参考書アウトラインの DB 同期（クライアント fetch）。
// localStorage が主。ここは fire-and-forget の保存＋別端末向けの読み込み。
// 単語帳（word-progress）と同じ設計。Supabase 未設定でも UI は localStorage で動く。

/** DB から参考書を取得（無ければ null）。userId が無ければ呼ばない。 */
export async function loadReferenceBookFromDb(
  userId: string,
): Promise<ReferenceBook | null> {
  try {
    const res = await fetch("/api/reference-book/get", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      ok: boolean;
      book?: ReferenceBook | null;
    };
    return data.ok ? (data.book ?? null) : null;
  } catch {
    return null;
  }
}

/** DB へ参考書を保存（fire-and-forget。失敗しても UI は止めない）。 */
export function saveReferenceBookToDb(
  userId: string,
  book: ReferenceBook,
): void {
  void fetch("/api/reference-book/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, book }),
  }).catch(() => {
    /* fire-and-forget */
  });
}
