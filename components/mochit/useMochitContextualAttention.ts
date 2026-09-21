"use client";

// 常駐 FloatingMochit 用: ページからの Contextual Attention 通知を購読し、
// Reaction / Sleep と突き合わせて「いま反映する通知」を返す。判定は mochitContextualAttention.ts。

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import {
  getMochitAttentionServerSnapshot,
  getMochitAttentionSnapshot,
  subscribeMochitAttention,
  type MochitAttentionRequest,
} from "./mochitAttentionBus";
import { createMochitAttentionGate, type MochitAttentionGate } from "./mochitContextualAttention";

const noopSubscribe = () => () => {};
const getNull = () => null;

type Options = {
  /** false の間（非表示設定など）は常に random */
  enabled: boolean;
  sleeping: boolean;
};

export type MochitContextualAttention = {
  /** 反映中の通知。null = random */
  applied: MochitAttentionRequest | null;
  /** Reaction を受理した時に呼ぶ（その間は新しい通知の反映を待つ） */
  reactionStarted: (durationMs: number) => void;
};

export function useMochitContextualAttention({ enabled, sleeping }: Options): MochitContextualAttention {
  const request = useSyncExternalStore(
    subscribeMochitAttention,
    getMochitAttentionSnapshot,
    getMochitAttentionServerSnapshot,
  );
  // ゲートはクライアントで1つだけ作る（タイマーを持つので SSR では作らない）
  const [gate, setGate] = useState<MochitAttentionGate | null>(null);
  useEffect(() => {
    const created = createMochitAttentionGate();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- マウント時に一度だけ外部コントローラを用意する
    setGate(created);
    return () => created.dispose();
  }, []);

  // 入力は子（Mochit）の effect＝Reaction 受理より後に届く。同じ描画で来た通知は Reaction 待ちになる。
  useEffect(() => {
    if (!gate) return;
    gate.setEnabled(enabled);
    gate.setSleeping(sleeping);
    gate.setRequest(request);
  }, [gate, enabled, sleeping, request]);

  const applied = useSyncExternalStore(
    gate ? gate.subscribe : noopSubscribe,
    gate ? gate.getApplied : getNull,
    getNull,
  );
  const reactionStarted = useCallback((durationMs: number) => gate?.reactionStarted(durationMs), [gate]);
  return { applied, reactionStarted };
}
