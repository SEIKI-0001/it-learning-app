"use client";

// ブラウザのユーザー活動・タブ表示を監視して Sleep / Wake を駆動するフック。
// 判定そのものは mochitSleep.ts（DOM 非依存）に任せ、ここはイベントを配線するだけ。
// 常駐する FloatingMochit 1体のための仕組みで、他の Mochit インスタンスとは共有しない。

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createMochitSleepTracker,
  MOCHIT_ACTIVITY_EVENTS,
  type MochitSleepTracker,
  type MochitWakeReason,
} from "./mochitSleep";

type Options = {
  /** false の間は監視しない（非表示設定など）。false に戻ると awake から数え直す */
  enabled?: boolean;
  /** true の間は自動 sleep しない（Semantic Attention が content/result の間など） */
  suppressed?: boolean;
  /** 眠りから覚めた時（reason="activity" なら wakeUp Reaction を出す想定） */
  onWake?: (reason: MochitWakeReason) => void;
  timeoutMs?: number;
  /** dev 用: 活動として数えないイベント（Sleep 操作ボタン自体のクリックなど） */
  isIgnoredActivity?: (event: Event) => boolean;
};

export type MochitSleepControls = {
  sleeping: boolean;
  /** 学習イベント受信時に呼ぶ。眠っていれば wakeUp を挟まず即 awake へ戻す */
  notifyLearningEvent: () => void;
  /** dev 用 */
  sleepNow: () => void;
  wakeNow: (reason?: MochitWakeReason) => void;
};

export function useMochitSleep({
  enabled = true,
  suppressed = false,
  onWake,
  timeoutMs,
  isIgnoredActivity,
}: Options = {}): MochitSleepControls {
  const [sleeping, setSleeping] = useState(false);
  const trackerRef = useRef<MochitSleepTracker | null>(null);
  const onWakeRef = useRef(onWake);
  const isIgnoredRef = useRef(isIgnoredActivity);
  useEffect(() => {
    onWakeRef.current = onWake;
    isIgnoredRef.current = isIgnoredActivity;
  });
  const suppressedRef = useRef(suppressed);

  useEffect(() => {
    if (!enabled) return;
    const tracker = createMochitSleepTracker({
      timeoutMs,
      onSleep: () => setSleeping(true),
      onWake: (reason) => {
        setSleeping(false);
        onWakeRef.current?.(reason);
      },
    });
    trackerRef.current = tracker;
    tracker.setSuppressed(suppressedRef.current);
    tracker.setHidden(document.hidden);

    const onActivity = (event: Event) => {
      if (isIgnoredRef.current?.(event)) return;
      tracker.activity();
    };
    const onVisibility = () => tracker.setHidden(document.hidden);
    // capture: 要素内スクロール（bubble しない）や stopPropagation された操作も拾う
    const listenerOptions: AddEventListenerOptions = { capture: true, passive: true };
    for (const type of MOCHIT_ACTIVITY_EVENTS) document.addEventListener(type, onActivity, listenerOptions);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      for (const type of MOCHIT_ACTIVITY_EVENTS) document.removeEventListener(type, onActivity, listenerOptions);
      document.removeEventListener("visibilitychange", onVisibility);
      tracker.dispose();
      trackerRef.current = null;
      setSleeping(false);
    };
  }, [enabled, timeoutMs]);

  useEffect(() => {
    suppressedRef.current = suppressed;
    trackerRef.current?.setSuppressed(suppressed);
  }, [suppressed]);

  const notifyLearningEvent = useCallback(() => trackerRef.current?.learningEvent(), []);
  const sleepNow = useCallback(() => trackerRef.current?.sleepNow(), []);
  const wakeNow = useCallback((reason?: MochitWakeReason) => trackerRef.current?.wakeNow(reason), []);

  return { sleeping, notifyLearningEvent, sleepNow, wakeNow };
}
