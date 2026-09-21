"use client";

// /today の Contextual Attention。常駐 FloatingMochit に「今ここを見てほしい」を控えめに伝える。
// モチット側は DOM を探さない。見てほしい要素は Today 側が ref で持ち、通知時に
// viewport 座標（中心点）へ変換して渡す。要素そのものは渡さない（古い DOM を保持させない）。
//
//   表示直後: user（約0.8秒）→ 今日の最優先タスク（約1.5秒）→ random（FloatingMochit が戻す）
//   taskComplete: Reaction が終わってから次の開始ボタンを約1.2秒 → random
//   離脱（アンマウント）: 予定を全て取り消し、Today の通知を random へ戻す
//
// 学習ロジック（何をやるか・順番・完了判定）には一切関与しない。

import { useEffect, useRef } from "react";
import { subscribeMochitEvent } from "@/components/mochit/mochitEventBus";
import {
  releaseMochitAttention,
  requestMochitAttention,
  type MochitViewportTarget,
} from "@/components/mochit/mochitAttentionBus";

export const TODAY_MOCHIT_ATTENTION_SOURCE = "today";

export const TODAY_MOCHIT_ATTENTION_TIMING = Object.freeze({
  /** 表示直後にユーザーを見る時間 */
  userMs: 800,
  /** 続けて最優先タスクを見る時間 */
  primaryMs: 1500,
  /** タスク完了の Reaction 後に次の開始ボタンを見る時間 */
  nextMs: 1200,
});

/** 要素の中心（viewport 座標）。未接続・非表示（大きさ0）なら null */
export function viewportCenterOf(element: Element | null): MochitViewportTarget | null {
  if (!element || !element.isConnected) return null;
  const rect = element.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return null;
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

export function useTodayMochitAttention() {
  /** 今日の最優先タスク（進行表で「いま」の行の見出し） */
  const primaryRef = useRef<HTMLDivElement | null>(null);
  /** 次に押す主要ボタン（「いま」の行の開始ボタン） */
  const ctaRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    const { userMs, primaryMs, nextMs } = TODAY_MOCHIT_ATTENTION_TIMING;
    const timers = new Set<number>();
    let frame: number | null = null;
    const clearScheduled = () => {
      for (const id of timers) window.clearTimeout(id);
      timers.clear();
      if (frame !== null) window.cancelAnimationFrame(frame);
      frame = null;
    };
    const lookAt = (element: Element | null, holdMs: number) => {
      const target = viewportCenterOf(element);
      if (!target) return;
      requestMochitAttention({ attention: "content", target, holdMs }, TODAY_MOCHIT_ATTENTION_SOURCE);
    };

    // 表示直後。最優先タスクが無い日（全部完了など）は何もしない（random のまま）。
    if (viewportCenterOf(primaryRef.current)) {
      // user は次の通知に置き換わるまで保つ（間に random を挟まない）。取りこぼしても自然に戻る長さ。
      requestMochitAttention({ attention: "user", holdMs: userMs + 500 }, TODAY_MOCHIT_ATTENTION_SOURCE);
      const id = window.setTimeout(() => {
        timers.delete(id);
        lookAt(primaryRef.current, primaryMs);
      }, userMs);
      timers.add(id);
    }

    // タスク完了。完了で「いま」の行が次へ移った後の DOM を読むため、描画を2フレーム待つ。
    // Reaction の最中なら FloatingMochit 側が終わるまで反映を待つ。次が無ければ何もしない。
    const unsubscribe = subscribeMochitEvent((signal) => {
      if (signal.type !== "taskComplete") return;
      clearScheduled();
      frame = window.requestAnimationFrame(() => {
        frame = window.requestAnimationFrame(() => {
          frame = null;
          lookAt(ctaRef.current, nextMs);
        });
      });
    });

    return () => {
      unsubscribe();
      clearScheduled();
      releaseMochitAttention(TODAY_MOCHIT_ATTENTION_SOURCE);
    };
  }, []);

  return { primaryRef, ctaRef };
}
