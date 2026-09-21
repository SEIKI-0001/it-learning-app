// Contextual Attention の「いつ視線へ反映するか」を決める小さなゲート（DOM/React 非依存）。
// ページからの通知（mochitAttentionBus の現在値）を、常駐 FloatingMochit の状態と突き合わせる:
//
//   - Reaction 中は反映を待つ（Reaction の視線・動きを邪魔しない）。終わったら反映する。
//   - Sleep 中に来た通知は捨てる（起こさない・終わった後にも遅れて反映しない）。
//     反映中に眠ったら、その場で random へ戻す。
//   - 反映してから holdMs たったら random へ戻す（ページが解除し忘れても残らない）。
//   - 待たされすぎた通知（MOCHIT_ATTENTION_MAX_PENDING_MS 超）は古いので捨てる。
//   - 同じ通知（id）は一度しか反映しない。random の通知・無効化で即 random。
//
// 反映中の通知（getApplied）が null のとき＝ random（従来の Living Idle・自動 Macro Idle あり）。

import type { MochitAttentionRequest } from "./mochitAttentionBus";

/** Reaction 待ちなどで反映が遅れても、通知からこの時間を過ぎたら捨てる（最長 Reaction 2200ms＋余裕） */
export const MOCHIT_ATTENTION_MAX_PENDING_MS = 3000;

export type MochitAttentionGate = {
  /** ページからの通知（現在値）を渡す */
  setRequest(request: MochitAttentionRequest): void;
  /** false の間（非表示など）は常に random */
  setEnabled(enabled: boolean): void;
  setSleeping(sleeping: boolean): void;
  /** Reaction を受理した時に呼ぶ。durationMs の間は反映を待つ（新しい Reaction で延長） */
  reactionStarted(durationMs: number): void;
  /** 反映中の通知。null = random */
  getApplied(): MochitAttentionRequest | null;
  subscribe(listener: () => void): () => void;
  dispose(): void;
};

type Deps = {
  now?: () => number;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
};

export function createMochitAttentionGate({
  now = () => Date.now(),
  setTimer = (fn, ms) => setTimeout(fn, ms),
  clearTimer = (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
}: Deps = {}): MochitAttentionGate {
  let request: MochitAttentionRequest | null = null;
  let enabled = true;
  let sleeping = false;
  let reacting = false;
  let reactionTimer: unknown = null;
  let holdTimer: unknown = null;
  let consumedId: number | null = null;
  let applied: MochitAttentionRequest | null = null;
  let disposed = false;
  const listeners = new Set<() => void>();

  const clearHold = () => {
    if (holdTimer !== null) clearTimer(holdTimer);
    holdTimer = null;
  };
  const setApplied = (next: MochitAttentionRequest | null) => {
    if (next === null) clearHold();
    if (applied === next) return;
    applied = next;
    for (const listener of [...listeners]) listener();
  };

  const evaluate = () => {
    if (disposed || !request) return;
    if (!enabled || request.attention === "random" || sleeping) {
      // random へ。Sleep 中の通知は「消費済み」にして、起きた後にも反映しない
      consumedId = request.id;
      setApplied(null);
      return;
    }
    if (consumedId === request.id) return; // 反映済み / 期限切れ / 破棄済み
    if (reacting) return; // Reaction 終了後に改めて評価する
    consumedId = request.id;
    if (now() - request.requestedAt > MOCHIT_ATTENTION_MAX_PENDING_MS) {
      setApplied(null);
      return;
    }
    clearHold();
    setApplied(request);
    if (request.holdMs !== undefined) {
      holdTimer = setTimer(() => {
        holdTimer = null;
        setApplied(null);
      }, request.holdMs);
    }
  };

  return {
    setRequest(next) {
      if (request === next) return;
      request = next;
      evaluate();
    },
    setEnabled(next) {
      if (enabled === next) return;
      enabled = next;
      evaluate();
    },
    setSleeping(next) {
      if (sleeping === next) return;
      sleeping = next;
      evaluate();
    },
    reactionStarted(durationMs) {
      if (disposed) return;
      reacting = true;
      if (reactionTimer !== null) clearTimer(reactionTimer);
      reactionTimer = setTimer(() => {
        reactionTimer = null;
        reacting = false;
        evaluate();
      }, Math.max(0, durationMs));
    },
    getApplied() {
      return applied;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    dispose() {
      disposed = true;
      clearHold();
      if (reactionTimer !== null) clearTimer(reactionTimer);
      reactionTimer = null;
      applied = null;
      listeners.clear();
    },
  };
}
