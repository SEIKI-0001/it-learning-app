import { useEffect, useState } from "react";

/** 1つの場面を見せる長さの既定値。移動のアニメーション（約1〜1.5秒）を見終えて吹き出しを読める長さにする */
export const PHASE_MS = 2600;

/**
 * STEP と場面（フェーズ）の再生（動く3D模型の解説で共通）。STEP に入ると場面が自動で進み、最後の場面で止まる。
 * 次の STEP へは move を呼んだときだけ進む。paused の間は場面を進めない。
 * run は「もう一度見る」のたびに増え、模型のアニメーションを最初からやり直す合図にする。
 */
export function usePhasePlayer(phaseCounts: number[], paused: boolean, phaseMs = PHASE_MS) {
  const [pos, setPos] = useState({ step: 0, phase: 0, run: 0 });
  const step = Math.min(pos.step, phaseCounts.length - 1);
  const lastPhase = phaseCounts[step] - 1;
  const phase = Math.min(pos.phase, lastPhase);
  useEffect(() => {
    if (paused || phase >= lastPhase) return;
    const timer = window.setTimeout(() => setPos((p) => ({ ...p, phase: p.phase + 1 })), phaseMs);
    return () => window.clearTimeout(timer);
  }, [pos, phase, paused, lastPhase, phaseMs]);
  return {
    step,
    phase,
    run: pos.run,
    lastPhase,
    done: phase >= lastPhase,
    move: (next: number) => setPos((p) => ({ step: Math.max(0, Math.min(next, phaseCounts.length - 1)), phase: 0, run: p.run + 1 })),
    replay: () => setPos((p) => ({ ...p, phase: 0, run: p.run + 1 })),
  };
}
