"use client";

import type { BadgeSignals } from "@/lib/badges";
import { getWordProgressMap } from "@/lib/wordlistProgress";

// バッジ判定に必要な「既存 AppState 外のシグナル」をクライアントで集める。
// - 単語帳のマスター数は localStorage（fequest:wordlistProgress）から数える。
// - 過去問レベルのクリア数は将来 question_attempts から供給する（現状は未提供＝0）。

export function getClientBadgeSignals(): BadgeSignals {
  let wordMasteredCount = 0;
  try {
    const map = getWordProgressMap();
    wordMasteredCount = Object.values(map).filter(
      (w) => w.status === "mastered",
    ).length;
  } catch {
    // localStorage 未対応・破損時は 0 のまま（安全側）。
  }
  return { wordMasteredCount };
}
