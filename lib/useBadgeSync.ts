"use client";

import { useEffect } from "react";
import type { AppState } from "@/types";
import { saveAppState } from "@/lib/storage";
import { applyBadgeProgress } from "@/lib/checkpoints";
import { getClientBadgeSignals } from "@/lib/badgeSignals";
import { getUserId, saveProgressToDb } from "@/lib/userSession";
import { emitUnlockNotice } from "@/lib/unlockNotice";
import { emitCelebration } from "@/lib/celebration";

/**
 * バッジ確定付与の「取りこぼしを拾う」冪等な catch-up フック。
 * 学習完了時のバッジ付与・追加ドロップの主経路は lib/studySession.ts の
 * completeStudySession（/today・/review・確認問題で共通）。このフックは、
 * 単語帳・過去問レベルなど別画面のシグナル変化で後から条件を満たしたケースを補完する。
 * - 冪等: 新規獲得が無ければ state を変更しない（無限ループしない）。
 * - 追加ドロップは発生させない（ドロップは完了イベント＝主経路に紐づく）。
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
    // catch-up 経路は画面内の演出を持たないため、バッジ名も含めて通知する。
    emitUnlockNotice(state, next, newlyEarnedIds);
    // バッジXPでのレベル/ランクアップもこの経路で取りこぼさない。
    emitCelebration(state, next);
    const uid = getUserId();
    if (uid) saveProgressToDb(uid, next.progress);
  }, [state, setState]);
}
