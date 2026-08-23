"use client";

import type { BadgeSignals } from "@/lib/badges";
import { getWordProgressMap } from "@/lib/wordlistProgress";
import { loadCachedProgressBootstrap } from "@/lib/userSession";
import type { ExamReadinessResult } from "@/types/examReadiness";

// バッジ判定に必要な「既存 AppState 外のシグナル」をクライアントで集める。
// - 単語帳のマスター数は localStorage（fequest:wordlistProgress）から数える。
// - 合格準備度は呼び出し元が渡した完全な共有結果、または bootstrap の完全結果を使う。
// - 過去問レベルのクリア数は将来 question_attempts から供給する（現状は未提供＝0）。

export function getClientBadgeSignals(
  examReadiness?: ExamReadinessResult | null,
): BadgeSignals {
  let wordMasteredCount = 0;
  try {
    const map = getWordProgressMap();
    wordMasteredCount = Object.values(map).filter(
      (w) => w.status === "mastered",
    ).length;
  } catch {
    // localStorage 未対応・破損時は 0 のまま（安全側）。
  }
  const current = examReadiness === undefined
    ? loadCachedProgressBootstrap()?.examReadiness
    : examReadiness;
  return { wordMasteredCount, examReadiness: current ?? null };
}
