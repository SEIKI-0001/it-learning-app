"use client";

import type { BadgeSignals } from "@/lib/badges";
import { getWordProgressMap } from "@/lib/wordlistProgress";

// バッジ判定に必要な「既存 AppState 外のシグナル」をクライアントで集める。
// - 単語帳のマスター数は localStorage（fequest:wordlistProgress）から数える。
// - 合格準備度は統合進捗の取得成功時に userSession がキャッシュした値を読む
//   （fequest: プレフィクスなのでログアウト時の clearLocalUserData で消える）。
// - 過去問レベルのクリア数は将来 question_attempts から供給する（現状は未提供＝0）。

export const INTEGRATED_READINESS_CACHE_KEY = "fequest:integratedReadiness";

export function getClientBadgeSignals(): BadgeSignals {
  let wordMasteredCount = 0;
  let readinessScore: number | undefined;
  try {
    const map = getWordProgressMap();
    wordMasteredCount = Object.values(map).filter(
      (w) => w.status === "mastered",
    ).length;
  } catch {
    // localStorage 未対応・破損時は 0 のまま（安全側）。
  }
  try {
    const raw = window.localStorage.getItem(INTEGRATED_READINESS_CACHE_KEY);
    const parsed = raw == null ? NaN : Number(raw);
    if (Number.isFinite(parsed)) {
      readinessScore = Math.max(0, Math.min(100, Math.round(parsed)));
    }
  } catch {
    // 読めなければ未供給（ローカル推定にフォールバック）。
  }
  return { wordMasteredCount, readinessScore };
}
