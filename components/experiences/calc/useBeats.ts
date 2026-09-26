import { useEffect, useRef, useState } from "react";
import { useInView } from "../scene/useInView";
import { useReducedMotion } from "../scene/useReducedMotion";

/** 解説アニメーションの標準速度。1.5倍の時間を使い、従来比およそ0.67倍速にする。 */
export const EXPLANATION_TIME_SCALE = 1.5;

/**
 * 計算の解説スライド用の「ビート」再生。スライドが見えた瞬間に 0 → last まで1回だけ自動で進む。
 *   - delays[i] は beat i → i+1 までの待ち時間（足りない分は最後の値を使う）。モジュール定数で渡すこと
 *   - reduced-motion 中は最初から最後のビート（＝全部の情報が出た状態）
 *   - autoStart=false のときは start() を呼ぶまで beat 0 のまま（問いに答えてから動かす用）
 */
export function useBeats(count: number, delays: readonly number[], autoStart = true) {
  const reducedMotion = useReducedMotion();
  const [ref, inView] = useInView<HTMLDivElement>();
  const [beat, setBeat] = useState(0);
  const [playing, setPlaying] = useState(false);
  const started = useRef(false);
  const last = count - 1;

  useEffect(() => {
    if (autoStart && inView && !started.current) {
      started.current = true;
      setPlaying(true);
    }
  }, [autoStart, inView]);

  useEffect(() => {
    if (!playing || reducedMotion || beat >= last) return;
    const delay = Math.round(delays[Math.min(beat, delays.length - 1)] * EXPLANATION_TIME_SCALE);
    const timer = window.setTimeout(() => {
      setBeat(beat + 1);
      if (beat + 1 >= last) setPlaying(false);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [playing, beat, reducedMotion, last, delays]);

  function start() {
    started.current = true;
    setBeat(0);
    setPlaying(true);
  }

  return {
    ref,
    beat: reducedMotion ? last : beat,
    done: reducedMotion || beat >= last,
    reducedMotion,
    start,
    replay: start,
  };
}
