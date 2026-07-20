"use client";

import { useEffect, useRef, useState } from "react";

// ============================================================================
// 数値表示をカウントアップさせる軽量フック。XP・スコアなど「増えた」を体感させたい
// 数字表示向け。初回マウント時はアニメーションせず即座に確定値を出す
// （初期表示で毎回0からアニメーションすると、再訪問時にわざとらしく見えるため）。
// ============================================================================

const DEFAULT_DURATION_MS = 500;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** イーズアウト（3乗）。終盤ほど変化が緩やかになる。 */
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function useCountUp(target: number, options?: { durationMs?: number }): number {
  const durationMs = options?.durationMs ?? DEFAULT_DURATION_MS;
  const [prevTarget, setPrevTarget] = useState(target);
  const [displayed, setDisplayed] = useState(target);
  // アニメーション開始時の「from」参照用。ref自体はrender中に読み書きせず、
  // 専用effect(下記)でdisplayedの確定値をコミット後に写すだけに使う。
  const displayedRef = useRef(target);
  const rafRef = useRef<number | null>(null);

  // レンダー中にtargetの変化を検知する(Reactの「前回レンダー値を保持する」パターン)。
  // reduced-motion時はアニメーションせず、ここで即座に確定値へ合わせる
  // （初回マウント時はtarget===prevTargetなので、この分岐自体が発火しない＝アニメ無し）。
  // 通常時はprevTargetの更新だけ行い、実際のカウントアップは下のeffect(rAF)に任せる。
  if (target !== prevTarget) {
    setPrevTarget(target);
    if (prefersReducedMotion()) {
      setDisplayed(target);
    }
  }

  // displayedの確定値をコミット後にrefへ写す(refの読み書きはeffect内だけに限定する)。
  useEffect(() => {
    displayedRef.current = displayed;
  }, [displayed]);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    if (displayedRef.current === target) return;

    const from = displayedRef.current;
    const to = target;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / durationMs);
      const eased = easeOutCubic(progress);
      setDisplayed(Math.round(from + (to - from) * eased));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [target, durationMs]);

  return displayed;
}
