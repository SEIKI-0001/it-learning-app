import { useEffect, useState } from "react";

// 図解の説明を目で追えるよう、従来3秒より余裕を持たせる（約0.68倍速）。
export const AUTOPLAY_INTERVAL_MS = 4400;

/**
 * ステップ式シーンの再生状態（Play / Step / Scrub）。
 * reduced-motion 中は自動再生しない。forward は「前へ進んだ直後」だけ軌跡を描くために使う。
 */
export function useStepPlayer(stepCount: number, reducedMotion: boolean, interval = AUTOPLAY_INTERVAL_MS) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [forward, setForward] = useState(true);
  const lastIndex = stepCount - 1;

  useEffect(() => {
    if (!playing || reducedMotion || index >= lastIndex) return;
    const timer = window.setTimeout(() => {
      const next = Math.min(index + 1, lastIndex);
      setForward(true);
      setIndex(next);
      if (next >= lastIndex) setPlaying(false);
    }, interval);
    return () => window.clearTimeout(timer);
  }, [index, interval, lastIndex, playing, reducedMotion]);

  function move(next: number) {
    const clamped = Math.max(0, Math.min(next, lastIndex));
    setPlaying(false);
    setForward(clamped >= index);
    setIndex(clamped);
  }

  function togglePlay() {
    if (!playing && index >= lastIndex) {
      setForward(false);
      setIndex(0);
    }
    setPlaying((current) => !current);
  }

  /** 先頭から再生を始める（何度呼んでも再生中のまま＝StrictMode の二重実行でも安全） */
  function play() {
    setForward(true);
    setIndex(0);
    setPlaying(true);
  }

  function reset() {
    setPlaying(false);
    setForward(false);
    setIndex(0);
  }

  return { index, playing, forward, lastIndex, move, togglePlay, play, reset };
}
