"use client";

import type { ReferenceBook } from "@/types/referenceBook";
import {
  loadReferenceBook,
  normalizeReferenceBook,
  pickNewerReferenceBook,
  saveReferenceBook,
} from "@/lib/referenceBook";
import { getUserId } from "@/lib/userSession";

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

/**
 * 参考書を端末と DB の両方へ保存する（既存の保存経路をまとめた入口）。
 * 未ログインなら localStorage のみ。保存した版（updatedAt 更新済み）を返す。
 */
export function persistReferenceBook(book: ReferenceBook): ReferenceBook {
  const next = { ...book, updatedAt: new Date().toISOString() };
  saveReferenceBook(next, { touch: false });
  const userId = getUserId();
  if (userId) saveReferenceBookToDb(userId, next);
  return next;
}

/**
 * 参考書を読み込む。まず端末の版を返し、ログイン中なら DB と比べて新しい方に揃える。
 *   - DB が新しい: 端末へ写す（別端末で「全部」を押した結果を取り込む）
 *   - 端末が新しい: DB へ送り直す（前回の DB 保存が失敗していた場合の回復）
 */
export async function loadReferenceBookSynced(): Promise<ReferenceBook | null> {
  const local = loadReferenceBook();
  const userId = getUserId();
  if (!userId) return local;
  const fetched = await loadReferenceBookFromDb(userId);
  const remote = fetched ? normalizeReferenceBook(fetched) : null;
  const picked = pickNewerReferenceBook(local, remote);
  if (remote && picked === remote) {
    saveReferenceBook(remote, { touch: false });
  } else if (remote && local && picked === local) {
    saveReferenceBookToDb(userId, local);
  }
  return picked;
}
