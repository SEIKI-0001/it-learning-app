import { useEffect, useState } from "react";

/** 1つの場面を見せる長さの既定値。移動のアニメーション（約1〜1.5秒）を見終えて吹き出しを読める長さにする */
export const PHASE_MS = 2600;

/**
 * STEP と場面（フェーズ）の再生（動く3D模型の解説で共通）。STEP に入ると場面が自動で進み、最後の場面で止まる。
 * 次の STEP へは move を呼んだときだけ進む。paused の間は場面を進めない。
 * run は「もう一度見る」のたびに増え、模型のアニメーションを最初からやり直す合図にする。
 * waitsAt が true を返す場面は利用者の操作待ち。そこで止まり、advance を呼ぶとすぐ次の場面へ進む。
 */
export function usePhasePlayer(
  phaseCounts: number[],
  paused: boolean,
  phaseMs = PHASE_MS,
  waitsAt?: (step: number, phase: number) => boolean,
) {
  const [pos, setPos] = useState({ step: 0, phase: 0, run: 0 });
  const step = Math.min(pos.step, phaseCounts.length - 1);
  const lastPhase = phaseCounts[step] - 1;
  const phase = Math.min(pos.phase, lastPhase);
  const waiting = !!waitsAt?.(step, phase);
  useEffect(() => {
    if (paused || waiting || phase >= lastPhase) return;
    const timer = window.setTimeout(() => setPos((p) => ({ ...p, phase: p.phase + 1 })), phaseMs);
    return () => window.clearTimeout(timer);
  }, [pos, phase, paused, waiting, lastPhase, phaseMs]);
  return {
    step,
    phase,
    run: pos.run,
    lastPhase,
    waiting,
    done: phase >= lastPhase,
    move: (next: number) => setPos((p) => ({ step: Math.max(0, Math.min(next, phaseCounts.length - 1)), phase: 0, run: p.run + 1 })),
    advance: () => setPos((p) => ({ ...p, phase: Math.min(p.phase + 1, lastPhase) })),
    replay: () => setPos((p) => ({ ...p, phase: 0, run: p.run + 1 })),
  };
}
