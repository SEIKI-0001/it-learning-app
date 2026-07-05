"use client";

import { useEffect } from "react";
import type { AppState } from "@/types";
import { saveAppState } from "@/lib/storage";
import { applyBadgeProgress } from "@/lib/checkpoints";
import { getClientBadgeSignals } from "@/lib/badgeSignals";
import { getUserId, saveProgressToDb } from "@/lib/userSession";

/**
 * 条件を満たしたバッジを取りこぼさず確定付与するための同期フック。
 * どの画面でも状態が更新されたら、いま満たしているバッジを確定で獲得させる。
 * - 冪等: 新規獲得が無ければ state を変更しない（無限ループしない）。
 * - チェックポイントの前進は行わない（最終問題クリアのみ）。
 */
export function useBadgeSync(
  state: AppState | null | undefined,
  setState: (s: AppState) => void,
): void {
  useEffect(() => {
    if (!state) return;
    const signals = getClientBadgeSignals();
    const { state: next, newlyEarnedIds } = applyBadgeProgress(state, signals);
    if (newlyEarnedIds.length === 0) return;
    saveAppState(next);
    setState(next);
    const uid = getUserId();
    if (uid) saveProgressToDb(uid, next.progress);
  }, [state, setState]);
}
