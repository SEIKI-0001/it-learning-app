// モチットSVGの「生きている待機（Living Idle）」の純粋ロジック。
// DOM/WAAPIには触れず、変換文字列の組み立てとタイミングの乱数生成だけを担う。
// ここを純関数に切り出すことで単体テスト可能にし、MochitSvg.tsx は
// これらを DOM に適用するオーケストレーションに専念する。
//
// 座標は全て master ピクセル空間（Mochit_Root の scale(0.816587) の内側）。
// CSS transform を SVG 要素へ適用すると px = ローカルのユーザー単位になるため、
// master 座標をそのまま px として使える。

export type RNG = () => number; // [0,1)

/** 目が動いてから体・アンテナが追従するまでのタイミング（ms）。 */
export type EmbodiedAttentionTiming = {
  bodyDelayMs: number;
  bodyMs: number;
  antennaDelayMs: number;
  antennaMs: number;
};

/**
 * Semantic Attention の身体連動の振幅（master px / deg）。視線オフセットを
 * 視線レンジで正規化した -1〜1 に掛けて使う（mochitEmbodiedAttention.ts）。
 */
export type EmbodiedAttentionTuning = {
  /** 足元支点の傾き（最大） */
  tiltDeg: number;
  /** 対象側への平行移動（最大） */
  leanX: number;
  leanY: number;
  /** 上下を見る時の足元支点の伸び縮み（最大・下を覗く=縮む／見上げる=伸びる） */
  stretchY: number;
  /**
   * 横方向の応答カーブの指数（0〜1）。|n|^exponent で小さな横成分を持ち上げ、
   * 「ほぼ真下だが少し左」のような対象でも向きが読めるようにする。1 で線形。
   */
  horizontalExponent: number;
  /** アンテナの追加回転（最大）。体より少し大きく、遅れて追従する */
  antennaDeg: number;
  /** 対象を見る時（目→体→アンテナ） */
  attend: EmbodiedAttentionTiming;
  /** 基底へ戻る時（同じ順序で戻る） */
  release: EmbodiedAttentionTiming;
};

/** 指定ピボットを中心に回転する CSS transform 文字列。 */
export function rotateAbout(cx: number, cy: number, deg: number): string {
  return `translate(${cx}px, ${cy}px) rotate(${deg}deg) translate(${-cx}px, ${-cy}px)`;
}

/** 指定ピボットを中心に拡縮する CSS transform 文字列。 */
export function scaleAbout(cx: number, cy: number, sx: number, sy: number): string {
  return `translate(${cx}px, ${cy}px) scale(${sx}, ${sy}) translate(${-cx}px, ${-cy}px)`;
}

/** 平行移動のみの CSS transform 文字列（視線用）。 */
export function offsetTransform(dx: number, dy: number): string {
  return `translate(${dx}px, ${dy}px)`;
}

export function randRange(min: number, max: number, rng: RNG = Math.random): number {
  return min + (max - min) * rng();
}

// ---- プロファイル（フル / コンパクト） ----

export type IdleProfile = {
  breathe: { cx: number; cy: number; sx: number; sy: number; durationMs: number };
  sway: { cx: number; cy: number; deg: number; durationMs: number };
  antenna: { cx: number; cy: number; deg: number; durationMs: number; delayMs: number };
  blink: {
    cxL: number;
    cxR: number;
    pivotY: number;
    closeMs: number;
    holdMs: number;
    openMs: number;
    minGapMs: number;
    maxGapMs: number;
    doubleChance: number;
    doubleGapMs: number;
  };
  /** 視線移動。compact では null（省アニメーション）。 */
  gaze: {
    moveMs: number;
    minHoldMs: number;
    maxHoldMs: number;
    rangeX: number;
    rangeY: number;
    recenterChance: number;
  } | null;
  /**
   * Semantic Attention の身体連動（目→体→アンテナの時間差で対象へ向く）。
   * floating（84px）だけが持ち、full / compact では null（視線のみ）。
   */
  embody: EmbodiedAttentionTuning | null;
};

const FULL_PROFILE: IdleProfile = {
  // 息づかい: 足元中央を支点にわずかに縦へ伸び縮み。周期は sway と互いに素気味にして
  // 合成モーションが短周期で繰り返して見えないようにする。
  breathe: { cx: 616, cy: 1002, sx: 1.014, sy: 1.024, durationMs: 3800 },
  // ゆれ: 足元を支点にごく浅い左右ロック。
  sway: { cx: 616, cy: 1012, deg: 1.1, durationMs: 5200 },
  // アンテナ遅れ追従: 頭頂の付け根を支点に、体のゆれより大きく・遅れて振れる。
  antenna: { cx: 680, cy: 360, deg: 2.4, durationMs: 5200, delayMs: 520 },
  blink: {
    cxL: 496,
    cxR: 734,
    pivotY: 557,
    closeMs: 90,
    holdMs: 55,
    openMs: 110,
    minGapMs: 2400,
    maxGapMs: 6000,
    doubleChance: 0.18,
    doubleGapMs: 230,
  },
  gaze: {
    moveMs: 130,
    minHoldMs: 900,
    maxHoldMs: 2200,
    rangeX: 7,
    rangeY: 4,
    recenterChance: 0.5,
  },
  embody: null,
};

/**
 * floating（常時表示の 84px）。本体は full と同じ待機で、視線の振幅と身体連動だけを強める。
 * 84px では master 1px ≒ CSS 0.067px なので full の ±7 は約 0.5px で見えない。
 * 瞳は白目と同形の暗色ピルで clip-path により白目内へマスクされるため、はみ出しは起きない。
 * 振幅は「反対側に白目の三日月が約1CSSpx見え、ハイライトが白目の縁で大きく欠けない」上限。
 */
const FLOATING_PROFILE: IdleProfile = {
  ...FULL_PROFILE,
  gaze: {
    moveMs: 140,
    minHoldMs: 900,
    maxHoldMs: 2200,
    rangeX: 16,
    rangeY: 12,
    recenterChance: 0.5,
  },
  embody: {
    tiltDeg: 3,
    leanX: 18,
    leanY: 12,
    stretchY: 0.018,
    horizontalExponent: 0.6,
    antennaDeg: 5.5,
    attend: { bodyDelayMs: 100, bodyMs: 380, antennaDelayMs: 240, antennaMs: 520 },
    release: { bodyDelayMs: 90, bodyMs: 420, antennaDelayMs: 230, antennaMs: 560 },
  },
};

const COMPACT_PROFILE: IdleProfile = {
  breathe: { cx: 616, cy: 1002, sx: 1.008, sy: 1.014, durationMs: 4200 },
  sway: { cx: 616, cy: 1012, deg: 0.6, durationMs: 6000 },
  antenna: { cx: 680, cy: 360, deg: 1.3, durationMs: 6000, delayMs: 560 },
  blink: {
    cxL: 496,
    cxR: 734,
    pivotY: 557,
    closeMs: 95,
    holdMs: 55,
    openMs: 115,
    minGapMs: 3200,
    maxGapMs: 7000,
    doubleChance: 0.1,
    doubleGapMs: 240,
  },
  gaze: null,
  embody: null,
};

/** compact が優先（compact なら floating 指定でも控えめ）。floating は 84px 常時表示版。 */
export function getIdleProfile(compact: boolean, floating = false): IdleProfile {
  if (compact) return COMPACT_PROFILE;
  return floating ? FLOATING_PROFILE : FULL_PROFILE;
}

// ---- 連続モーションのキーフレーム（direction: alternate 前提で2キー） ----

export function breatheKeyframes(p: IdleProfile): Keyframe[] {
  const { cx, cy, sx, sy } = p.breathe;
  return [
    { transform: scaleAbout(cx, cy, 1, 1) },
    { transform: scaleAbout(cx, cy, sx, sy) },
  ];
}

export function swayKeyframes(p: IdleProfile): Keyframe[] {
  const { cx, cy, deg } = p.sway;
  return [
    { transform: rotateAbout(cx, cy, -deg) },
    { transform: rotateAbout(cx, cy, deg) },
  ];
}

export function antennaKeyframes(p: IdleProfile): Keyframe[] {
  const { cx, cy, deg } = p.antenna;
  return [
    { transform: rotateAbout(cx, cy, -deg) },
    { transform: rotateAbout(cx, cy, deg) },
  ];
}

// ---- まばたき ----

// scaleY 0 だと変換行列が特異になるため、全開は極小値で表す。
const EYELID_OPEN_SCALE = 0.0001;

function eyelidScale(rest: number): number {
  return Math.min(1, Math.max(EYELID_OPEN_SCALE, rest));
}

/**
 * 片目まぶたの1回のまばたきキーフレーム（上端支点）。
 * rest（平常時の閉じ量）→ 全閉 → rest。rest 省略時は全開（scaleY≈0）から。
 */
export function blinkKeyframes(p: IdleProfile, cx: number, rest = 0): Keyframe[] {
  const { pivotY, closeMs, holdMs, openMs } = p.blink;
  const total = closeMs + holdMs + openMs;
  const closeAt = closeMs / total;
  const holdAt = (closeMs + holdMs) / total;
  const restScale = eyelidScale(rest);
  return [
    { transform: scaleAbout(cx, pivotY, 1, restScale), offset: 0 },
    { transform: scaleAbout(cx, pivotY, 1, 1), offset: closeAt },
    { transform: scaleAbout(cx, pivotY, 1, 1), offset: holdAt },
    { transform: scaleAbout(cx, pivotY, 1, restScale), offset: 1 },
  ];
}

export function blinkDurationMs(p: IdleProfile): number {
  return p.blink.closeMs + p.blink.holdMs + p.blink.openMs;
}

/** まぶたの静止状態。rest 省略時は全開（scaleY≈0 で不可視）。sleepy では少し閉じる。 */
export function eyelidRestTransform(p: IdleProfile, cx: number, rest = 0): string {
  return scaleAbout(cx, p.blink.pivotY, 1, eyelidScale(rest));
}

export function nextBlinkGapMs(p: IdleProfile, rng: RNG = Math.random): number {
  return randRange(p.blink.minGapMs, p.blink.maxGapMs, rng);
}

export function shouldDoubleBlink(p: IdleProfile, rng: RNG = Math.random): boolean {
  return rng() < p.blink.doubleChance;
}

// ---- 視線 ----

export type GazeOffset = { x: number; y: number };

export const GAZE_CENTER: GazeOffset = { x: 0, y: 0 };

/** 次の視線ターゲット。一定確率で中央へ戻す。 */
export function nextGazeTarget(p: IdleProfile, rng: RNG = Math.random): GazeOffset {
  if (!p.gaze) return GAZE_CENTER;
  if (rng() < p.gaze.recenterChance) return GAZE_CENTER;
  return {
    x: Math.round(randRange(-p.gaze.rangeX, p.gaze.rangeX, rng)),
    y: Math.round(randRange(-p.gaze.rangeY, p.gaze.rangeY, rng)),
  };
}

export function nextGazeHoldMs(p: IdleProfile, rng: RNG = Math.random): number {
  if (!p.gaze) return 0;
  return randRange(p.gaze.minHoldMs, p.gaze.maxHoldMs, rng);
}
