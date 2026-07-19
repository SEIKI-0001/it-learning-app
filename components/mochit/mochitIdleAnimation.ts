// モチットSVGの「生きている待機（Living Idle）」の純粋ロジック。
// DOM/WAAPIには触れず、変換文字列の組み立てとタイミングの乱数生成だけを担う。
// ここを純関数に切り出すことで単体テスト可能にし、MochitSvg.tsx は
// これらを DOM に適用するオーケストレーションに専念する。
//
// 座標は全て master ピクセル空間（Mochit_Root の scale(0.816587) の内側）。
// CSS transform を SVG 要素へ適用すると px = ローカルのユーザー単位になるため、
// master 座標をそのまま px として使える。

export type RNG = () => number; // [0,1)

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
};

export function getIdleProfile(compact: boolean): IdleProfile {
  return compact ? COMPACT_PROFILE : FULL_PROFILE;
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

/** 片目まぶたの1回のまばたきキーフレーム（scaleY 0→1→0、上端支点）。 */
export function blinkKeyframes(p: IdleProfile, cx: number): Keyframe[] {
  const { pivotY, closeMs, holdMs, openMs } = p.blink;
  const total = closeMs + holdMs + openMs;
  const closeAt = closeMs / total;
  const holdAt = (closeMs + holdMs) / total;
  return [
    { transform: scaleAbout(cx, pivotY, 1, 0.0001), offset: 0 },
    { transform: scaleAbout(cx, pivotY, 1, 1), offset: closeAt },
    { transform: scaleAbout(cx, pivotY, 1, 1), offset: holdAt },
    { transform: scaleAbout(cx, pivotY, 1, 0.0001), offset: 1 },
  ];
}

export function blinkDurationMs(p: IdleProfile): number {
  return p.blink.closeMs + p.blink.holdMs + p.blink.openMs;
}

/** まぶたの静止状態（開いている＝scaleY 0 で不可視）。 */
export function eyelidRestTransform(p: IdleProfile, cx: number): string {
  return scaleAbout(cx, p.blink.pivotY, 1, 0.0001);
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
