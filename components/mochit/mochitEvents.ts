// モチットのセマンティックイベント定義と、反応の優先度制御。
// 低優先度のイベントが高優先度の反応中に割り込まないことを保証する。

import type { MochitRiveTriggerInput } from "./mochitTypes";

export type MochitEvent =
  | "checkpointClear"
  | "badgeEarned"
  | "taskComplete"
  | "allCorrect"
  | "correct"
  | "incorrect"
  | "encourage"
  | "tap"
  | "wakeUp";

// イベント → Riveトリガー入力のマッピング。
export const MOCHIT_EVENT_TRIGGERS: Record<MochitEvent, MochitRiveTriggerInput> = {
  checkpointClear: "triggerCheckpointClear",
  badgeEarned: "triggerBadgeEarned",
  taskComplete: "triggerTaskComplete",
  allCorrect: "triggerAllCorrect",
  correct: "triggerCorrect",
  incorrect: "triggerIncorrect",
  encourage: "triggerEncourage",
  tap: "triggerTap",
  wakeUp: "triggerWakeUp",
};

// トリガー入力 → イベントの逆引き（SVG描画層がコントローラ発火を受けるのに使う）。
export const MOCHIT_TRIGGER_EVENTS: Record<MochitRiveTriggerInput, MochitEvent> = Object.fromEntries(
  Object.entries(MOCHIT_EVENT_TRIGGERS).map(([event, trigger]) => [trigger, event as MochitEvent]),
) as Record<MochitRiveTriggerInput, MochitEvent>;

// 優先度（大きいほど強い）。仕様の序列:
// checkpoint > badge > task > 全問正解 > 個別回答 > 励まし > タップ > (idle)
export const MOCHIT_EVENT_PRIORITIES: Record<MochitEvent, number> = {
  checkpointClear: 100,
  badgeEarned: 90,
  taskComplete: 80,
  allCorrect: 70,
  correct: 60,
  incorrect: 60,
  encourage: 50,
  tap: 40,
  wakeUp: 30,
};

// 反応のおおよその占有時間。ここを過ぎたら低優先度イベントも受け付ける。
export const MOCHIT_EVENT_REACTION_MS: Record<MochitEvent, number> = {
  checkpointClear: 2200,
  badgeEarned: 1800,
  taskComplete: 1400,
  allCorrect: 1200,
  correct: 900,
  incorrect: 900,
  encourage: 1000,
  tap: 600,
  wakeUp: 800,
};

/**
 * モチットの発言に添える学習コンテキスト（GF-P0-004）。
 *
 * ここに入れてよいのは「表示時点で確定している事実」だけ。推測した成長や
 * 存在しない履歴を発言させないため、値が無い項目は undefined のままにする
 * （0 と undefined は別物として扱う）。本文は永続化しない。
 */
export type MochitContext = {
  /** 前回まちがえた問題のうち、今回正解した数。 */
  recoveredCount?: number;
  /** 現在のチェックポイントで残っている必須バッジ数。 */
  remainingRequiredBadges?: number;
  /** 今回の学習で突破試験が解放されたか。 */
  finalExamUnlocked?: boolean;
  /** 今回の学習で復習キューから外れたか。 */
  reviewCleared?: boolean;
  /** 自己ベストを更新した連続日数。 */
  personalBestStreak?: number;
  /** おまもりでストリークが守られたか。 */
  streakShieldUsed?: boolean;
  /**
   * 今回バッジを獲得したか。true のときバッジ関連の発言は行わない
   * （Celebration が既に演出しており、二重通知になるため）。
   */
  badgeJustEarned?: boolean;
};

// dev/preview で `event` prop として渡す形。id を変えると同種イベントを再発火できる。
// context は任意。無ければ従来どおり汎用メッセージにフォールバックする。
export type MochitEventSignal = {
  type: MochitEvent;
  id: number;
  context?: MochitContext;
};

export function getMochitCompletionEvent({
  checkpointCleared,
  correct,
  total,
}: {
  checkpointCleared: boolean;
  correct: number;
  total: number;
}): MochitEvent {
  if (checkpointCleared) return "checkpointClear";
  if (correct === total) return "allCorrect";
  return "taskComplete";
}

// 連続入力時のルール（キューは持たない）:
//   - 同優先度以上の新イベント → 「置換」: 進行中の反応を打ち切り新しい反応を開始
//   - 低優先度の新イベント → 「無視」: 破棄され、後で再生されることもない
//   - 占有時間（MOCHIT_EVENT_REACTION_MS）経過後は全イベントを受理
export type MochitReactionController = {
  /** 受理したら true。高優先度の反応中は false を返し何もしない。 */
  dispatch: (event: MochitEvent) => boolean;
  /** 現在占有中の反応。期限切れなら null。 */
  activeEvent: () => MochitEvent | null;
  clear: () => void;
};

export function createMochitReactionController(
  now: () => number = () => Date.now(),
): MochitReactionController {
  let active: { event: MochitEvent; priority: number; until: number } | null = null;

  const expireIfNeeded = () => {
    if (active && active.until <= now()) active = null;
  };

  return {
    dispatch(event) {
      expireIfNeeded();
      const priority = MOCHIT_EVENT_PRIORITIES[event];
      if (active && active.priority > priority) return false;
      active = { event, priority, until: now() + MOCHIT_EVENT_REACTION_MS[event] };
      return true;
    },
    activeEvent() {
      expireIfNeeded();
      return active?.event ?? null;
    },
    clear() {
      active = null;
    },
  };
}
