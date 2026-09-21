// Contextual Attention の通知口（ページ → 常駐 FloatingMochit）。
// 「今ここを見てほしい」をページ側が明示的に渡すための、ブラウザ内の小さなストア。
// Mochit / FloatingMochit はページの DOM を探索しない。ページが viewport 座標を渡し、
// FloatingMochit が自分の位置との関係から視線（attentionPoint）へ変換する。
//
// mochitEventBus（学習イベント → Reaction）とは責務が違うので混ぜない:
//   - イベントは「一瞬の出来事」。取りこぼしても後から再生しない。
//   - attention は「今の状態」。後から購読した側も現在値を読める（ストア）。
// 現在値は1つだけ。新しい通知は前の通知を置き換える（キューなし）。

import type { MochitAttention } from "./mochitBehavior";

/** viewport 上の位置（CSS px・clientX/clientY と同じ座標系） */
export type MochitViewportTarget = {
  x: number;
  y: number;
};

export type MochitAttentionSignal = {
  attention: MochitAttention;
  /** content/result のときに見る位置（viewport 座標）。省略時は正面 */
  target?: MochitViewportTarget;
  /**
   * 実際に視線へ反映されてから、この時間だけ見て random へ戻る。
   * Reaction 中は反映を待つので、待ち時間はここに含まれない。省略時は次の通知まで保持。
   */
  holdMs?: number;
};

export type MochitAttentionRequest = MochitAttentionSignal & {
  /** 通知ごとに増える識別子（同じ通知を二重に適用しないため） */
  id: number;
  /** 通知した時刻（ms, Date.now）。古すぎる通知を捨てる判断に使う */
  requestedAt: number;
  /** 通知元。release で他の通知元の現在値を消さないため */
  source?: string;
};

const RANDOM_REQUEST: MochitAttentionRequest = Object.freeze({ attention: "random", id: 0, requestedAt: 0 });

let current: MochitAttentionRequest = RANDOM_REQUEST;
let lastId = 0;
const listeners = new Set<() => void>();

function publish(next: MochitAttentionRequest) {
  current = next;
  for (const listener of [...listeners]) listener();
}

/** 見てほしい対象を通知する。前の通知は置き換わる。 */
export function requestMochitAttention(signal: MochitAttentionSignal, source?: string): MochitAttentionRequest {
  const target =
    signal.target && Number.isFinite(signal.target.x) && Number.isFinite(signal.target.y)
      ? { x: signal.target.x, y: signal.target.y }
      : undefined;
  const holdMs = signal.holdMs !== undefined && Number.isFinite(signal.holdMs) && signal.holdMs > 0 ? signal.holdMs : undefined;
  lastId += 1;
  const request: MochitAttentionRequest = {
    attention: signal.attention,
    ...(target ? { target } : {}),
    ...(holdMs !== undefined ? { holdMs } : {}),
    id: lastId,
    requestedAt: Date.now(),
    ...(source ? { source } : {}),
  };
  publish(request);
  return request;
}

/**
 * attention を random（通常の Living Idle）へ戻す。
 * source を渡すと、その通知元の通知が現在値のときだけ戻す（他ページの通知を消さない）。
 */
export function releaseMochitAttention(source?: string): void {
  if (current.attention === "random" && current.id === 0) return;
  if (source !== undefined && current.source !== source) return;
  lastId += 1;
  publish({ attention: "random", id: lastId, requestedAt: Date.now() });
}

export function getMochitAttentionSnapshot(): MochitAttentionRequest {
  return current;
}

export function getMochitAttentionServerSnapshot(): MochitAttentionRequest {
  return RANDOM_REQUEST;
}

export function subscribeMochitAttention(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
