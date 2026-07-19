// モチットSVGの学習イベントリアクションの純粋ロジック。
// DOM/WAAPIには触れず、「イベント → どのパーツをどう動かすか」のキーフレーム仕様
// （ReactionSpec）を組み立てるだけを担う。MochitSvg.tsx がこれをDOMへ適用する。
//
// 設計ルール:
//   - 全トラックはリアクション全体を1本のタイムライン（offset 0..1）で表現する。
//     1要素につき1つの有限アニメーションになるため、中断時の後始末が単純になる。
//   - transform系トラックは必ず恒等変換で始まり恒等変換で終わる。
//     fill:"none" で再生すれば、終了と同時に Living Idle の土台へ位置飛びなしで戻る。
//   - 口の切替は不透明度のクロスフェード。開始/終了時点では Neutral=1・変形口=0 に戻す。
//   - gaze / antenna は Living Idle と同じ要素を動かすため composite:"add" で
//     Idle の変換に加算する（Idle側の再設計はしない）。
//   - 本体（body）は外側<svg>要素へのCSS transform。移動は要素サイズ比の%、
//     squashは足元原点（MOCHIT_BODY_TRANSFORM_ORIGIN）前提。
//
// モード:
//   - full: 通常のフル演出
//   - compact: 移動・変形を大きく減衰し、表情・アンテナ・Core発光を主体にする
//   - reducedMotion: transform系を全廃し、表情の切替とCoreの控えめな不透明度変化のみ

import type { MochitEvent } from "./mochitEvents";
import { MOCHIT_EVENT_REACTION_MS } from "./mochitEvents";
import { offsetTransform, rotateAbout } from "./mochitIdleAnimation";

export type ReactionTargetId =
  | "body"
  | "armL"
  | "armR"
  | "coreGlow"
  | "mouthNeutral"
  | "mouthSmile"
  | "mouthThinking"
  | "mouthOpen"
  | "gaze"
  | "antenna";

export type ReactionTrack = {
  target: ReactionTargetId;
  keyframes: Keyframe[];
  /** Idleが動かしている要素（gaze/antenna）は add で上乗せする */
  composite?: "replace" | "add";
};

export type ReactionSpec = {
  event: MochitEvent;
  totalMs: number;
  tracks: ReactionTrack[];
};

export type ReactionMode = {
  compact: boolean;
  reducedMotion: boolean;
};

// ---- 定数（master ピクセル空間 / body は外側svgのCSS空間） ----

/** 外側<svg>のtransform原点（足元中央: master y≈1012 → 1012*0.816587/1024 ≈ 80.7%） */
export const MOCHIT_BODY_TRANSFORM_ORIGIN = "50% 80.7%";

// 腕は本体と「開いた接続」で重なっているため、接続シーム中央を支点に回すと
// 中程度の角度までは接続部に隙間が出ない。
const ARM_L_PIVOT = { x: 296, y: 745 };
const ARM_R_PIVOT = { x: 934, y: 745 };
// 左腕を外側（左上）へ開く＝正の角度、右腕は負の角度（CSS回転は時計回りが正）。
const ARM_L_OPEN_SIGN = 1;
const ARM_R_OPEN_SIGN = -1;

// アンテナ支点は Living Idle と同一（頭頂の付け根）。
const ANTENNA_PIVOT = { x: 680, y: 360 };

// ---- 減衰プロファイル ----

type MotionScale = {
  /** translateY(%) の係数 */
  move: number;
  /** scaleの1からの偏差の係数 */
  squash: number;
  /** 本体rotateの係数 */
  rot: number;
  /** 腕の角度係数 */
  arm: number;
  /** 視線オフセット係数 */
  gaze: number;
  /** アンテナ角度係数 */
  antenna: number;
};

const FULL_SCALE: MotionScale = { move: 1, squash: 1, rot: 1, arm: 1, gaze: 1, antenna: 1 };
// compact: 大きなジャンプを使わず、主に表情・アンテナ・Core発光で伝える。
const COMPACT_SCALE: MotionScale = { move: 0.3, squash: 0.4, rot: 0.5, arm: 0.35, gaze: 0.7, antenna: 0.8 };

// ---- キーフレーム組み立てヘルパ ----

type BodyPose = { y?: number; rot?: number; sx?: number; sy?: number };

function bodyFrame(offset: number, pose: BodyPose, s: MotionScale, easing?: string): Keyframe {
  const y = (pose.y ?? 0) * s.move;
  const rot = (pose.rot ?? 0) * s.rot;
  const sx = 1 + ((pose.sx ?? 1) - 1) * s.squash;
  const sy = 1 + ((pose.sy ?? 1) - 1) * s.squash;
  const kf: Keyframe = {
    offset,
    transform: `translateY(${round(y)}%) rotate(${round(rot)}deg) scale(${round(sx)}, ${round(sy)})`,
  };
  if (easing) kf.easing = easing;
  return kf;
}

function armFrame(offset: number, side: "L" | "R", deg: number, s: MotionScale, easing?: string): Keyframe {
  const pivot = side === "L" ? ARM_L_PIVOT : ARM_R_PIVOT;
  const sign = side === "L" ? ARM_L_OPEN_SIGN : ARM_R_OPEN_SIGN;
  const kf: Keyframe = { offset, transform: rotateAbout(pivot.x, pivot.y, deg * sign * s.arm) };
  if (easing) kf.easing = easing;
  return kf;
}

function antennaFrame(offset: number, deg: number, s: MotionScale, easing?: string): Keyframe {
  const kf: Keyframe = { offset, transform: rotateAbout(ANTENNA_PIVOT.x, ANTENNA_PIVOT.y, deg * s.antenna) };
  if (easing) kf.easing = easing;
  return kf;
}

function gazeFrame(offset: number, dx: number, dy: number, s: MotionScale, easing?: string): Keyframe {
  const kf: Keyframe = { offset, transform: offsetTransform(round(dx * s.gaze), round(dy * s.gaze)) };
  if (easing) kf.easing = easing;
  return kf;
}

function opacityFrame(offset: number, opacity: number, easing?: string): Keyframe {
  const kf: Keyframe = { offset, opacity };
  if (easing) kf.easing = easing;
  return kf;
}

function round(v: number): number {
  return Math.round(v * 1000) / 1000;
}

/**
 * 口のクロスフェード一式。開始と終了は必ず Neutral=1 / 指定バリアント=0。
 * segments: バリアントごとの [表示開始offset, 全開offset, 維持終了offset, 消灯offset]
 */
function mouthTracks(
  segments: Array<{ variant: "mouthSmile" | "mouthThinking" | "mouthOpen"; on: number; full: number; hold: number; off: number }>,
): ReactionTrack[] {
  const tracks: ReactionTrack[] = [];
  // Neutral: 最初のバリアント点灯で消え、最後のバリアント消灯で戻る。
  const firstOn = Math.min(...segments.map((seg) => seg.on));
  const lastOff = Math.max(...segments.map((seg) => seg.off));
  tracks.push({
    target: "mouthNeutral",
    keyframes: [
      opacityFrame(0, 1),
      opacityFrame(firstOn, 1),
      opacityFrame(Math.min(firstOn + 0.06, 1), 0),
      opacityFrame(lastOff, 0),
      opacityFrame(Math.min(lastOff + 0.05, 1), 1),
      opacityFrame(1, 1),
    ],
  });
  for (const seg of segments) {
    tracks.push({
      target: seg.variant,
      keyframes: [
        opacityFrame(0, 0),
        opacityFrame(seg.on, 0),
        opacityFrame(seg.full, 1),
        opacityFrame(seg.hold, 1),
        opacityFrame(seg.off, 0),
        opacityFrame(1, 0),
      ],
    });
  }
  return tracks;
}

function glowTrack(points: Array<[offset: number, opacity: number]>): ReactionTrack {
  const keyframes: Keyframe[] = [];
  if (points[0][0] > 0) keyframes.push(opacityFrame(0, 0));
  for (const [offset, opacity] of points) keyframes.push(opacityFrame(offset, opacity));
  if (points[points.length - 1][0] < 1) keyframes.push(opacityFrame(1, 0));
  return { target: "coreGlow", keyframes };
}

// ---- reduced-motion 用（表情切替＋Coreの控えめな不透明度変化のみ） ----

type ReducedRecipe = {
  mouth?: "mouthSmile" | "mouthThinking" | "mouthOpen";
  /** Core発光ピーク（控えめ・最大0.35） */
  glowPeak?: number;
};

const REDUCED_RECIPES: Partial<Record<MochitEvent, ReducedRecipe>> = {
  correct: { mouth: "mouthSmile", glowPeak: 0.3 },
  incorrect: { mouth: "mouthThinking" },
  allCorrect: { mouth: "mouthSmile", glowPeak: 0.35 },
  taskComplete: { mouth: "mouthSmile", glowPeak: 0.35 },
  badgeEarned: { mouth: "mouthSmile", glowPeak: 0.3 },
  checkpointClear: { mouth: "mouthSmile", glowPeak: 0.35 },
  encourage: { mouth: "mouthSmile", glowPeak: 0.25 },
  tap: { mouth: "mouthSmile" },
};

function buildReducedSpec(event: MochitEvent, totalMs: number): ReactionSpec | null {
  const recipe = REDUCED_RECIPES[event];
  if (!recipe) return null;
  const tracks: ReactionTrack[] = [];
  if (recipe.mouth) {
    tracks.push(...mouthTracks([{ variant: recipe.mouth, on: 0.05, full: 0.15, hold: 0.8, off: 0.92 }]));
  }
  if (recipe.glowPeak) {
    tracks.push(glowTrack([[0.1, 0], [0.45, Math.min(recipe.glowPeak, 0.35)], [0.9, 0]]));
  }
  return tracks.length > 0 ? { event, totalMs, tracks } : null;
}

// ---- 各リアクションの振り付け ----

/**
 * イベントに対応するリアクション仕様を返す。対応する振り付けが無いイベント
 * （wakeUp等）は null（＝何もしない）。
 * totalMs は必ず MOCHIT_EVENT_REACTION_MS（優先度制御の占有時間）以下。
 */
export function buildReactionSpec(event: MochitEvent, mode: ReactionMode): ReactionSpec | null {
  const totalMs = REACTION_TOTAL_MS[event] ?? 0;
  if (totalMs <= 0) return null;
  if (mode.reducedMotion) return buildReducedSpec(event, totalMs);
  const s = mode.compact ? COMPACT_SCALE : FULL_SCALE;
  const build = CHOREOGRAPHIES[event];
  return build ? { event, totalMs, tracks: build(s) } : null;
}

/** アニメーション全長。占有時間（MOCHIT_EVENT_REACTION_MS）以下に収める。 */
export const REACTION_TOTAL_MS: Partial<Record<MochitEvent, number>> = {
  correct: 800,
  incorrect: 900,
  allCorrect: 1200,
  taskComplete: 1400,
  badgeEarned: 1500,
  checkpointClear: 2200,
  tap: 550,
  encourage: 900,
};

type Choreography = (s: MotionScale) => ReactionTrack[];

const CHOREOGRAPHIES: Partial<Record<MochitEvent, Choreography>> = {
  // 1. 正解: 小さな予備動作 → 控えめな1回のバウンド → 柔らかい笑顔 → Core1回発光。
  correct: (s) => [
    {
      target: "body",
      keyframes: [
        bodyFrame(0, {}, s, "ease-in"),
        bodyFrame(0.14, { y: 0.6, sx: 1.02, sy: 0.975 }, s, "ease-out"),
        bodyFrame(0.4, { y: -3.2, sx: 0.985, sy: 1.02 }, s, "ease-in"),
        bodyFrame(0.62, { sx: 1.015, sy: 0.985 }, s, "ease-out"),
        bodyFrame(1, {}, s),
      ],
    },
    ...mouthTracks([{ variant: "mouthSmile", on: 0.1, full: 0.18, hold: 0.78, off: 0.93 }]),
    glowTrack([[0.15, 0], [0.42, 0.8], [0.75, 0.15], [1, 0]]),
  ],

  // 2. 不正解: 説明側（吹き出し側=右）へ視線 → 軽い体の傾き → 考えている表情。
  //    否定的表現（落ち込み・首振り・暗転）は使わない。Core発光なし。
  incorrect: (s) => [
    {
      target: "body",
      keyframes: [
        bodyFrame(0, {}, s, "ease-out"),
        bodyFrame(0.28, { y: 0.3, rot: 2.2 }, s),
        bodyFrame(0.72, { y: 0.3, rot: 2.2 }, s, "ease-in-out"),
        bodyFrame(1, {}, s),
      ],
    },
    {
      target: "gaze",
      composite: "add",
      keyframes: [
        gazeFrame(0, 0, 0, s, "ease-out"),
        gazeFrame(0.22, 8, 3, s),
        gazeFrame(0.75, 8, 3, s, "ease-in-out"),
        gazeFrame(1, 0, 0, s),
      ],
    },
    {
      target: "antenna",
      composite: "add",
      keyframes: [
        antennaFrame(0, 0, s, "ease-in-out"),
        antennaFrame(0.35, -2, s),
        antennaFrame(0.7, -2, s, "ease-in-out"),
        antennaFrame(1, 0, s),
      ],
    },
    ...mouthTracks([{ variant: "mouthThinking", on: 0.14, full: 0.22, hold: 0.76, off: 0.9 }]),
  ],

  // 3. 全問正解: 正解より少し大きいバウンド＋腕を少し上げる＋明るい表情＋Core強め1回。
  allCorrect: (s) => [
    {
      target: "body",
      keyframes: [
        bodyFrame(0, {}, s, "ease-in"),
        bodyFrame(0.1, { y: 0.8, sx: 1.03, sy: 0.96 }, s, "ease-out"),
        bodyFrame(0.32, { y: -5, sx: 0.975, sy: 1.035 }, s, "ease-in"),
        bodyFrame(0.52, { sx: 1.04, sy: 0.965 }, s, "ease-out"),
        bodyFrame(0.68, { y: -1 }, s, "ease-in"),
        bodyFrame(0.82, { sx: 1.01, sy: 0.99 }, s, "ease-out"),
        bodyFrame(1, {}, s),
      ],
    },
    {
      target: "armL",
      keyframes: [
        armFrame(0, "L", 0, s),
        armFrame(0.12, "L", 0, s, "ease-out"),
        armFrame(0.36, "L", 16, s),
        armFrame(0.6, "L", 14, s, "ease-in-out"),
        armFrame(0.9, "L", 0, s),
        armFrame(1, "L", 0, s),
      ],
    },
    {
      target: "armR",
      keyframes: [
        armFrame(0, "R", 0, s),
        armFrame(0.12, "R", 0, s, "ease-out"),
        armFrame(0.36, "R", 16, s),
        armFrame(0.6, "R", 14, s, "ease-in-out"),
        armFrame(0.9, "R", 0, s),
        armFrame(1, "R", 0, s),
      ],
    },
    ...mouthTracks([
      { variant: "mouthOpen", on: 0.14, full: 0.22, hold: 0.55, off: 0.66 },
      { variant: "mouthSmile", on: 0.64, full: 0.72, hold: 0.85, off: 0.95 },
    ]),
    glowTrack([[0.12, 0], [0.38, 1], [0.7, 0.3], [1, 0]]),
  ],

  // 4. タスク完了: 中程度のジャンプ＋腕を開く＋Core2段階発光。
  taskComplete: (s) => [
    {
      target: "body",
      keyframes: [
        bodyFrame(0, {}, s, "ease-in"),
        bodyFrame(0.09, { y: 0.9, sx: 1.035, sy: 0.955 }, s, "ease-out"),
        bodyFrame(0.28, { y: -6, sx: 0.97, sy: 1.04 }, s, "ease-in"),
        bodyFrame(0.46, { sx: 1.045, sy: 0.96 }, s, "ease-out"),
        bodyFrame(0.6, { y: -1.4 }, s, "ease-in"),
        bodyFrame(0.74, { sx: 1.015, sy: 0.985 }, s, "ease-out"),
        bodyFrame(1, {}, s),
      ],
    },
    {
      target: "armL",
      keyframes: [
        armFrame(0, "L", 0, s),
        armFrame(0.1, "L", 0, s, "ease-out"),
        armFrame(0.34, "L", 22, s),
        armFrame(0.58, "L", 19, s, "ease-in-out"),
        armFrame(0.85, "L", 0, s),
        armFrame(1, "L", 0, s),
      ],
    },
    {
      target: "armR",
      keyframes: [
        armFrame(0, "R", 0, s),
        armFrame(0.13, "R", 0, s, "ease-out"),
        armFrame(0.37, "R", 22, s),
        armFrame(0.6, "R", 19, s, "ease-in-out"),
        armFrame(0.87, "R", 0, s),
        armFrame(1, "R", 0, s),
      ],
    },
    ...mouthTracks([
      { variant: "mouthOpen", on: 0.12, full: 0.2, hold: 0.58, off: 0.68 },
      { variant: "mouthSmile", on: 0.66, full: 0.74, hold: 0.88, off: 0.96 },
    ]),
    glowTrack([[0.08, 0], [0.25, 0.55], [0.45, 0.2], [0.62, 1], [0.85, 0.25], [1, 0]]),
  ],

  // 5. バッジ獲得: タスク完了と同程度の喜びだが動きは別物。バッジ/メッセージの
  //    表示方向（右上）へ体を向け視線を送る。片腕だけ上げ、発光は控えめ。
  badgeEarned: (s) => [
    {
      target: "body",
      keyframes: [
        bodyFrame(0, {}, s, "ease-in"),
        bodyFrame(0.1, { y: 0.7, sx: 1.025, sy: 0.97 }, s, "ease-out"),
        bodyFrame(0.3, { y: -4.2, rot: 2.5, sx: 0.98, sy: 1.03 }, s, "ease-in"),
        bodyFrame(0.48, { rot: 2.5, sx: 1.03, sy: 0.975 }, s, "ease-out"),
        bodyFrame(0.68, { rot: 2.5 }, s, "ease-in-out"),
        bodyFrame(0.92, {}, s, "ease-out"),
        bodyFrame(1, {}, s),
      ],
    },
    {
      target: "gaze",
      composite: "add",
      keyframes: [
        gazeFrame(0, 0, 0, s, "ease-out"),
        gazeFrame(0.3, 7, -5, s),
        gazeFrame(0.7, 7, -5, s, "ease-in-out"),
        gazeFrame(0.95, 0, 0, s),
        gazeFrame(1, 0, 0, s),
      ],
    },
    {
      target: "armR",
      keyframes: [
        armFrame(0, "R", 0, s),
        armFrame(0.1, "R", 0, s, "ease-out"),
        armFrame(0.35, "R", 18, s),
        armFrame(0.6, "R", 16, s, "ease-in-out"),
        armFrame(0.88, "R", 0, s),
        armFrame(1, "R", 0, s),
      ],
    },
    {
      target: "armL",
      keyframes: [
        armFrame(0, "L", 0, s),
        armFrame(0.12, "L", 0, s, "ease-out"),
        armFrame(0.38, "L", 8, s),
        armFrame(0.62, "L", 7, s, "ease-in-out"),
        armFrame(0.88, "L", 0, s),
        armFrame(1, "L", 0, s),
      ],
    },
    ...mouthTracks([{ variant: "mouthSmile", on: 0.12, full: 0.2, hold: 0.85, off: 0.96 }]),
    glowTrack([[0.15, 0], [0.4, 0.65], [0.75, 0.2], [1, 0]]),
  ],

  // 6. チェックポイント完了: 最強のお祝い。深い予備動作 → 大きなジャンプ1回 →
  //    着地反動1回 → 両腕を上げて維持 → 強いCore発光（ゆらめき付き）。
  //    連続ジャンプはしない。
  checkpointClear: (s) => [
    {
      target: "body",
      keyframes: [
        bodyFrame(0, {}, s, "ease-in"),
        bodyFrame(0.08, { y: 1.2, sx: 1.05, sy: 0.93 }, s, "ease-out"),
        bodyFrame(0.24, { y: -7.5, sx: 0.955, sy: 1.055 }, s, "ease-out"),
        bodyFrame(0.34, { y: -7, sx: 0.97, sy: 1.04 }, s, "ease-in"),
        bodyFrame(0.46, { sx: 1.055, sy: 0.94 }, s, "ease-out"),
        bodyFrame(0.58, { y: -0.8, sx: 0.99, sy: 1.01 }, s, "ease-in"),
        bodyFrame(0.68, { sx: 1.015, sy: 0.99 }, s, "ease-out"),
        bodyFrame(0.9, {}, s, "ease-in-out"),
        bodyFrame(1, {}, s),
      ],
    },
    {
      target: "armL",
      keyframes: [
        armFrame(0, "L", 0, s),
        armFrame(0.08, "L", 0, s, "ease-out"),
        armFrame(0.3, "L", 26, s),
        armFrame(0.55, "L", 24, s, "ease-in-out"),
        armFrame(0.82, "L", 0, s),
        armFrame(1, "L", 0, s),
      ],
    },
    {
      target: "armR",
      keyframes: [
        armFrame(0, "R", 0, s),
        armFrame(0.1, "R", 0, s, "ease-out"),
        armFrame(0.32, "R", 26, s),
        armFrame(0.57, "R", 24, s, "ease-in-out"),
        armFrame(0.84, "R", 0, s),
        armFrame(1, "R", 0, s),
      ],
    },
    {
      target: "antenna",
      composite: "add",
      keyframes: [
        antennaFrame(0, 0, s, "ease-out"),
        antennaFrame(0.3, 4, s, "ease-in-out"),
        antennaFrame(0.45, -3, s, "ease-in-out"),
        antennaFrame(0.6, 2, s, "ease-in-out"),
        antennaFrame(0.8, 0, s),
        antennaFrame(1, 0, s),
      ],
    },
    ...mouthTracks([
      { variant: "mouthOpen", on: 0.12, full: 0.22, hold: 0.6, off: 0.7 },
      { variant: "mouthSmile", on: 0.68, full: 0.78, hold: 0.9, off: 0.98 },
    ]),
    glowTrack([[0.1, 0], [0.3, 1], [0.45, 0.8], [0.58, 1], [0.7, 0.85], [0.88, 0.3], [1, 0]]),
  ],

  // 7. タップ: 400〜700msの小反応。視線＋アンテナ＋軽い体の反応。
  tap: (s) => [
    {
      target: "body",
      keyframes: [
        bodyFrame(0, {}, s, "ease-out"),
        bodyFrame(0.3, { y: 0.3, sx: 1.025, sy: 0.98 }, s, "ease-in-out"),
        bodyFrame(0.75, {}, s),
        bodyFrame(1, {}, s),
      ],
    },
    {
      target: "antenna",
      composite: "add",
      keyframes: [
        antennaFrame(0, 0, s, "ease-out"),
        antennaFrame(0.25, -5, s, "ease-in-out"),
        antennaFrame(0.5, 4, s, "ease-in-out"),
        antennaFrame(0.7, -2, s, "ease-in-out"),
        antennaFrame(1, 0, s),
      ],
    },
    {
      target: "gaze",
      composite: "add",
      keyframes: [
        gazeFrame(0, 0, 0, s, "ease-out"),
        gazeFrame(0.3, 0, -2, s),
        gazeFrame(0.8, 0, -2, s, "ease-in-out"),
        gazeFrame(1, 0, 0, s),
      ],
    },
    ...mouthTracks([{ variant: "mouthSmile", on: 0.12, full: 0.3, hold: 0.6, off: 0.88 }]),
  ],

  // 8. 励まし: 小さな前傾（おじぎ風の沈み）＋柔らかい笑顔＋控えめなCore発光。
  //    不正解直後でも押しつけがましくない強さに抑える。
  encourage: (s) => [
    {
      target: "body",
      keyframes: [
        bodyFrame(0, {}, s, "ease-in-out"),
        bodyFrame(0.35, { y: 1.2, sx: 1.015, sy: 0.98 }, s),
        bodyFrame(0.6, { y: 1.2, sx: 1.015, sy: 0.98 }, s, "ease-in-out"),
        bodyFrame(1, {}, s),
      ],
    },
    ...mouthTracks([{ variant: "mouthSmile", on: 0.15, full: 0.25, hold: 0.8, off: 0.94 }]),
    glowTrack([[0.15, 0], [0.45, 0.4], [0.9, 0]]),
  ],
};

// 実装検証用（テストから参照）: totalMs が占有時間を超えないことの静的確認に使う。
export const REACTION_OCCUPANCY_MS = MOCHIT_EVENT_REACTION_MS;
