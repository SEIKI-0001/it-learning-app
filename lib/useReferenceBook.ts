"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReferenceBook } from "@/types/referenceBook";
import { loadReferenceBook } from "@/lib/referenceBook";
import { loadReferenceBookSynced, persistReferenceBook } from "@/lib/referenceBookSync";

/**
 * 使用中の参考書（1冊）を読み書きするフック。
 *   - book: undefined = 読み込み中 / null = 未登録 / ReferenceBook = 登録済み
 *   - save: 端末と DB（ログイン時）の両方へ保存し、表示にも反映する
 * 端末の版を即座に返し、ログイン中は DB と比べて新しい方に揃える。
 */
export function useReferenceBook(): {
  book: ReferenceBook | null | undefined;
  save: (next: ReferenceBook) => ReferenceBook;
} {
  const [book, setBook] = useState<ReferenceBook | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      // 端末の版を先に出して、DB との照合は裏で行う（初期表示を待たせない）。
      setBook(loadReferenceBook());
      const synced = await loadReferenceBookSynced();
      if (!cancelled) setBook(synced);
    }
    void init();
    return () => {
      cancelled = true;
    };
  }, []);

  const save = useCallback((next: ReferenceBook) => {
    const saved = persistReferenceBook(next);
    setBook(saved);
    return saved;
  }, []);

  return { book, save };
}
