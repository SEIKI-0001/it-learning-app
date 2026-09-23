"use client";

// Focus Session の状態を React から読むフック。状態が変わるのは開始・一時停止・完了などの
// 節目だけで、残り時間の毎秒更新はここでは起こさない（表示する小さな部品が自分で数える）。

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { getFocusRemainingMs, type FocusSessionEvent, type FocusSessionState } from "./mochitFocusSession";
import {
  getFocusSessionServerSnapshot,
  getFocusSessionSnapshot,
  subscribeFocusSession,
  subscribeFocusSessionEvents,
} from "./mochitFocusSessionStore";

export function useMochitFocusSession(): FocusSessionState {
  return useSyncExternalStore(subscribeFocusSession, getFocusSessionSnapshot, getFocusSessionServerSnapshot);
}

/** 集中完了・休憩終了を受け取る。listener は最新参照を使う（購読し直さない） */
export function useMochitFocusSessionEvents(listener: (event: FocusSessionEvent) => void, enabled = true): void {
  const listenerRef = useRef(listener);
  useEffect(() => {
    listenerRef.current = listener;
  });
  useEffect(() => {
    if (!enabled) return;
    return subscribeFocusSessionEvents((event) => listenerRef.current(event));
  }, [enabled]);
}

/**
 * 残り時間（ms）。走行中だけ次の「秒の切り替わり」に合わせて更新し、タブ非表示中は止める
 * （復帰時に絶対時刻から計算し直す）。この値を使う部品だけが毎秒再描画される。
 * 開始・再開の直後は直前の時刻で計算され得るので、区間の長さを上限にし、すぐ読み直す。
 */
export function useFocusRemainingMs(state: FocusSessionState): number {
  const [now, setNow] = useState(() => Date.now());
  const running = state.phase === "focus" || state.phase === "break";
  const endsAt = state.endsAt;

  useEffect(() => {
    if (!running || endsAt === null) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const clear = () => {
      if (timer !== null) clearTimeout(timer);
      timer = null;
    };
    const tick = () => {
      clear();
      const at = Date.now();
      setNow(at);
      if (document.visibilityState === "hidden") return;
      const remaining = endsAt - at;
      if (remaining <= 0) return;
      // 表示は秒の切り上げなので、残りが次に 1000 の倍数を跨ぐ瞬間に合わせる
      timer = setTimeout(tick, (remaining % 1000 || 1000) + 16);
    };
    // 開始・再開の直後はすぐ読み直す（直前の now のままにしない）
    timer = setTimeout(tick, 0);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clear();
      document.removeEventListener("visibilitychange", tick);
    };
  }, [running, endsAt]);

  const remaining = getFocusRemainingMs(state, now);
  return running ? Math.min(state.segmentMs, remaining) : remaining;
}
