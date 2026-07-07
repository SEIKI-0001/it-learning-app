// 達成演出（お祝い）のグローバルバス（クライアント専用）。
//
// XP獲得・レベル/ランクアップ・CP突破・ストリーク節目などの「達成の瞬間」を、
// どの画面からでも1本の経路で演出ホスト(CelebrationHost)へ届ける。
// 発火側は学習前後の AppState を渡すだけでよく、差分（XP・レベル・ランク・
// クリア済みCP）はここで自動検出する。ストリーク節目・ミッション達成のように
// 状態差分から判定できないものは extras で明示的に渡す。
// バッジ・装備解放のトーストは既存の unlockNotice が担当し、本バスは重ねない。

import type { AppState } from "@/types";
import type { CheckpointId } from "@/types/checkpoint";
import { getRankStatus } from "@/lib/rank";
import { getLevelName } from "@/lib/game";
import { getCheckpointProgress } from "@/lib/checkpoints";

export type Celebration =
  | { kind: "xpGain"; amount: number }
  | { kind: "levelUp"; level: number; name: string }
  | { kind: "rankUp"; rankId: string }
  | {
      kind: "streakMilestone";
      days: number;
      rewardXp: number;
      shieldGranted: boolean;
    }
  | { kind: "questClear"; label: string }
  | { kind: "cpCleared"; cpId: CheckpointId };

const CELEBRATION_EVENT = "fequest:celebration";

/**
 * 学習前後の状態差分から演出イベントを組み立てて発火する。
 * 差分も extras も無ければ何もしない。SSR中も no-op。
 */
export function emitCelebration(
  before: AppState,
  after: AppState,
  extras: Celebration[] = [],
): void {
  if (typeof window === "undefined") return;
  const celebrations: Celebration[] = [];

  const xpDiff = after.progress.exp - before.progress.exp;
  if (xpDiff > 0) celebrations.push({ kind: "xpGain", amount: xpDiff });

  if (after.progress.level > before.progress.level) {
    celebrations.push({
      kind: "levelUp",
      level: after.progress.level,
      name: getLevelName(after.progress.level),
    });
  }

  const rankBefore = getRankStatus(before.progress.exp);
  const rankAfter = getRankStatus(after.progress.exp);
  if (rankAfter.index > rankBefore.index) {
    celebrations.push({ kind: "rankUp", rankId: rankAfter.current.id });
  }

  const clearedBefore = new Set(
    getCheckpointProgress(before).clearedCheckpointIds,
  );
  for (const cpId of getCheckpointProgress(after).clearedCheckpointIds) {
    if (!clearedBefore.has(cpId)) celebrations.push({ kind: "cpCleared", cpId });
  }

  celebrations.push(...extras);
  if (celebrations.length === 0) return;
  window.dispatchEvent(
    new CustomEvent<Celebration[]>(CELEBRATION_EVENT, { detail: celebrations }),
  );
}

/** 演出イベントを購読する。返り値は購読解除関数。 */
export function subscribeCelebration(
  onCelebrations: (celebrations: Celebration[]) => void,
): () => void {
  const handler = (e: Event) => {
    onCelebrations((e as CustomEvent<Celebration[]>).detail);
  };
  window.addEventListener(CELEBRATION_EVENT, handler);
  return () => window.removeEventListener(CELEBRATION_EVENT, handler);
}
