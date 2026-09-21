// Semantic Attention の身体連動（Embodied Attention）の純粋ロジック。
// 視線だけでは 84px の floating で「どこを見ているか」が読めないため、
//   目が対象を見る → 約100ms遅れて体が対象側へ少し傾く → さらに遅れてアンテナが追従
// という時間差で「自分の意思で見た」印象を作る。終了時も同じ順序で基底へ戻る。
// ここでは DOM に触れず、姿勢の計算・補間・transform 文字列だけを扱う。
// DOM への適用（Anim_Sway / Anim_Antenna への composite:"add" 持続アニメ）は MochitSvg.tsx。
//
// 座標は master px（Mochit_Root の内側）。体の支点は Micro Idle のゆれと同じ足元。

import { rotateAbout, scaleAbout, type EmbodiedAttentionTuning, type GazeOffset } from "./mochitIdleAnimation";

export type AttentionPose = {
  /** 体の傾き（deg・正=時計回り＝頭が右へ） */
  tilt: number;
  /** 体の平行移動（master px） */
  leanX: number;
  leanY: number;
  /** 足元支点の縦スケール（1=そのまま・下を覗くと縮み、見上げると伸びる） */
  sy: number;
  /** アンテナの追加回転（deg） */
  antenna: number;
};

export const NEUTRAL_ATTENTION_POSE: Readonly<AttentionPose> = Object.freeze({
  tilt: 0,
  leanX: 0,
  leanY: 0,
  sy: 1,
  antenna: 0,
});

/** 体の傾きの支点（Micro Idle のゆれと同じ足元中央） */
export const EMBODIED_BODY_PIVOT = Object.freeze({ x: 616, y: 1012 });
/** アンテナの付け根（Micro Idle / リアクションと同じ） */
export const EMBODIED_ANTENNA_PIVOT = Object.freeze({ x: 680, y: 360 });

function clampUnit(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.min(1, Math.max(-1, v));
}

function round(v: number): number {
  return Math.round(v * 1000) / 1000 || 0;
}

/**
 * 視線オフセット（master px）→ 身体の姿勢。視線レンジで -1〜1 に正規化してから
 * 振幅を掛けるので、視線の向きと体の向きは常に一致する（右を見れば右へ傾く）。
 * 横成分は応答カーブで小さな値を持ち上げる（真下に近い対象でも左右が読める）。
 * 下を見る時は少し沈んで縮み（覗き込む）、上を見る時はわずかに伸び上がる。
 */
export function attentionPoseForGaze(
  offset: GazeOffset,
  range: { rangeX: number; rangeY: number },
  tuning: EmbodiedAttentionTuning,
): AttentionPose {
  const rawX = range.rangeX > 0 ? clampUnit(offset.x / range.rangeX) : 0;
  const ny = range.rangeY > 0 ? clampUnit(offset.y / range.rangeY) : 0;
  const exponent = Math.min(1, Math.max(0.1, tuning.horizontalExponent));
  const nx = Math.sign(rawX) * Math.abs(rawX) ** exponent;
  return {
    tilt: round(nx * tuning.tiltDeg),
    leanX: round(nx * tuning.leanX),
    leanY: round(ny * tuning.leanY),
    sy: round(1 - ny * tuning.stretchY),
    antenna: round(nx * tuning.antennaDeg),
  };
}

export function isNeutralAttentionPose(pose: AttentionPose): boolean {
  return pose.tilt === 0 && pose.leanX === 0 && pose.leanY === 0 && pose.sy === 1 && pose.antenna === 0;
}

/** 体（Anim_Sway への add）の transform。恒等姿勢は恒等変換になる。 */
export function attentionBodyTransform(pose: Pick<AttentionPose, "tilt" | "leanX" | "leanY" | "sy">): string {
  const { x, y } = EMBODIED_BODY_PIVOT;
  return `translate(${round(pose.leanX)}px, ${round(pose.leanY)}px) ${rotateAbout(x, y, round(pose.tilt))} ${scaleAbout(
    x,
    y,
    1,
    round(pose.sy),
  )}`;
}

/** アンテナ（Anim_Antenna への add）の transform。 */
export function attentionAntennaTransform(deg: number): string {
  return rotateAbout(EMBODIED_ANTENNA_PIVOT.x, EMBODIED_ANTENNA_PIVOT.y, round(deg));
}

/** アンテナが目標角を少し行き過ぎてから落ち着く量（遅れ追従の「しなり」） */
export const EMBODIED_ANTENNA_OVERSHOOT = 0.3;

/**
 * アンテナの補間キーフレーム。from→to の変化量の約30%だけ行き過ぎてから to に落ち着く。
 * 変化が無ければ2キー（同値）。
 */
export function attentionAntennaKeyframes(from: number, to: number): Keyframe[] {
  const overshoot = to + (to - from) * EMBODIED_ANTENNA_OVERSHOOT;
  return [
    { offset: 0, transform: attentionAntennaTransform(from), easing: "ease-out" },
    { offset: 0.55, transform: attentionAntennaTransform(overshoot), easing: "ease-in-out" },
    { offset: 1, transform: attentionAntennaTransform(to) },
  ];
}

/** 体の補間キーフレーム（行き過ぎなし）。 */
export function attentionBodyKeyframes(from: AttentionPose, to: AttentionPose): Keyframe[] {
  return [{ transform: attentionBodyTransform(from) }, { transform: attentionBodyTransform(to) }];
}

/** 2姿勢の線形補間（t は 0〜1 に丸める）。進行中の遷移を途中位置から切り替える時に使う。 */
export function interpolateAttentionPose(a: AttentionPose, b: AttentionPose, t: number): AttentionPose {
  const k = Math.min(1, Math.max(0, Number.isFinite(t) ? t : 1));
  const lerp = (x: number, y: number) => round(x + (y - x) * k);
  return {
    tilt: lerp(a.tilt, b.tilt),
    leanX: lerp(a.leanX, b.leanX),
    leanY: lerp(a.leanY, b.leanY),
    sy: lerp(a.sy, b.sy),
    antenna: lerp(a.antenna, b.antenna),
  };
}
