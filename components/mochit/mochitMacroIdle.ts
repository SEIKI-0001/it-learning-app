// モチットの Macro Idle（低頻度で自発的に行う待機動作）の純粋ロジック。
// Micro Idle（呼吸/ゆれ/アンテナ/まばたき/視線: mochitIdleAnimation.ts）に加えて、
// 数秒おきに「きょろきょろ見回す / 何かに気づく / 伸びをする」を差し込む。
// ここでは DOM/React/タイマーに触れず、次回発火までの時間・Behavior の選択・
// 継続時間・キーフレーム仕様だけを組み立てる。実行は mochitMacroIdleController.ts、
// DOM への適用は MochitSvg.tsx が担う。
//
// キーフレーム仕様はリアクションと同じ ReactionTrack 形式で、同じ契約に従う:
//   - 全トラックは恒等（基底状態）で始まり恒等で終わる。fill:"none" で再生すれば
//     終了と同時に、その時点の emotion / 視線 / 姿勢へ位置飛びなしで戻る。
//   - gaze / antenna は Micro Idle と同じ要素なので composite:"add" で上乗せする。
//   - body は外側<svg>への CSS transform（足元原点）。

import type { MochitAttention, MochitIdleBehavior } from "./mochitBehavior";
import { offsetTransform, randRange, rotateAbout, type GazeOffset, type RNG } from "./mochitIdleAnimation";
import type { ReactionTrack } from "./mochitReactionAnimation";

/** 実際に動きを伴う Macro Idle（sleepy は次Step） */
export type MochitMacroIdleBehavior = Extract<MochitIdleBehavior, "lookAround" | "curious" | "stretch">;

/** 抽選対象。normal は「何もしないで次回まで待つ」 */
export type MochitMacroIdleChoice = "normal" | MochitMacroIdleBehavior;

export const MOCHIT_MACRO_IDLE_BEHAVIORS: readonly MochitMacroIdleBehavior[] = ["lookAround", "curious", "stretch"];

export function isMochitMacroIdleBehavior(value: unknown): value is MochitMacroIdleBehavior {
  return (MOCHIT_MACRO_IDLE_BEHAVIORS as readonly unknown[]).includes(value);
}

// ---- 発火間隔 ----

export const MACRO_IDLE_MIN_DELAY_MS = 8000;
export const MACRO_IDLE_MAX_DELAY_MS = 20000;

/** 次の抽選までの待ち時間（既定 8〜20秒）。Reaction 後・復帰後もこの値から数え直す。 */
export function nextMacroIdleDelayMs(rng: RNG = Math.random, tuning: MacroIdleTuning = DEFAULT_MACRO_IDLE_TUNING): number {
  return Math.round(randRange(tuning.minDelayMs, tuning.maxDelayMs, rng));
}

// ---- Behavior 選択 ----

export const MACRO_IDLE_WEIGHTS: Readonly<Record<MochitMacroIdleChoice, number>> = Object.freeze({
  normal: 0.55,
  lookAround: 0.25,
  curious: 0.12,
  stretch: 0.08,
});

/** 直前に再生した特殊 Behavior の重みに掛ける係数（連続しにくくする。0 にはしない） */
export const MACRO_IDLE_REPEAT_PENALTY = 0.2;

const CHOICE_ORDER: readonly MochitMacroIdleChoice[] = ["normal", "lookAround", "curious", "stretch"];

/** 直前の特殊 Behavior を考慮した抽選重み（合計 1 に正規化済み） */
export function macroIdleWeights(
  previous: MochitMacroIdleBehavior | null,
  base: Readonly<Record<MochitMacroIdleChoice, number>> = MACRO_IDLE_WEIGHTS,
): Record<MochitMacroIdleChoice, number> {
  const raw = { ...base };
  if (previous) raw[previous] *= MACRO_IDLE_REPEAT_PENALTY;
  const total = CHOICE_ORDER.reduce((sum, k) => sum + raw[k], 0);
  const out = {} as Record<MochitMacroIdleChoice, number>;
  for (const k of CHOICE_ORDER) out[k] = raw[k] / total;
  return out;
}

/**
 * 次の Macro Idle を抽選する。previous は「最後に再生した特殊 Behavior」
 * （間に normal を挟んでも保持する＝見た目上の連続を避ける）。
 */
export function pickMacroIdleBehavior(
  previous: MochitMacroIdleBehavior | null,
  rng: RNG = Math.random,
  base: Readonly<Record<MochitMacroIdleChoice, number>> = MACRO_IDLE_WEIGHTS,
): MochitMacroIdleChoice {
  const weights = macroIdleWeights(previous, base);
  const r = rng();
  let acc = 0;
  for (const k of CHOICE_ORDER) {
    acc += weights[k];
    if (r < acc) return k;
  }
  return "normal";
}

// ---- 継続時間 ----

export const MACRO_IDLE_DURATION_RANGE_MS: Readonly<Record<MochitMacroIdleBehavior, readonly [number, number]>> =
  Object.freeze({
    lookAround: [1200, 1800],
    curious: [900, 1400],
    stretch: [1200, 1800],
  });

export function macroIdleDurationMs(
  behavior: MochitMacroIdleBehavior,
  rng: RNG = Math.random,
  tuning: MacroIdleTuning = DEFAULT_MACRO_IDLE_TUNING,
): number {
  const [min, max] = tuning.durations[behavior];
  return Math.round(randRange(min, max, rng));
}

// ---- プロファイル別の頻度・継続時間（floating は 84px で気づける程度に強める） ----

export type MacroIdleTuning = {
  weights: Readonly<Record<MochitMacroIdleChoice, number>>;
  minDelayMs: number;
  maxDelayMs: number;
  durations: Readonly<Record<MochitMacroIdleBehavior, readonly [number, number]>>;
};

export const DEFAULT_MACRO_IDLE_TUNING: MacroIdleTuning = Object.freeze({
  weights: MACRO_IDLE_WEIGHTS,
  minDelayMs: MACRO_IDLE_MIN_DELAY_MS,
  maxDelayMs: MACRO_IDLE_MAX_DELAY_MS,
  durations: MACRO_IDLE_DURATION_RANGE_MS,
});

/**
 * floating（常時表示の 84px）。15〜20秒ほど眺めていれば一度は「何かしている」と
 * 気づける頻度にする（normal を減らし、待ち時間も少し短く）。1回ごとの動きは短いまま。
 * curious は「目→体→アンテナ」の時間差を見せるため少し長い。
 */
export const FLOATING_MACRO_IDLE_TUNING: MacroIdleTuning = Object.freeze({
  weights: Object.freeze({ normal: 0.3, lookAround: 0.35, curious: 0.22, stretch: 0.13 }),
  minDelayMs: 7000,
  maxDelayMs: 15000,
  durations: Object.freeze({
    lookAround: [1400, 1900] as const,
    curious: [1300, 1700] as const,
    stretch: [1300, 1800] as const,
  }),
});

export function getMacroIdleTuning(floating: boolean): MacroIdleTuning {
  return floating ? FLOATING_MACRO_IDLE_TUNING : DEFAULT_MACRO_IDLE_TUNING;
}

// ---- キーフレーム仕様 ----

export type MacroIdleSpec = {
  behavior: MochitMacroIdleBehavior;
  totalMs: number;
  tracks: ReactionTrack[];
};

export type MacroIdleSpecOptions = {
  durationMs: number;
  /** 開始時点の基底視線（master px）。lookAround はここから左右の絶対位置へ寄る */
  gazeBase?: GazeOffset;
  /** 84px 常時表示版。振幅を強め、目→体→アンテナの時間差をはっきりさせる */
  floating?: boolean;
  rng?: RNG;
};

// Micro Idle / リアクションと同じ支点（master px）
const ANTENNA_PIVOT = { x: 680, y: 360 };
const ARM_L_PIVOT = { x: 296, y: 745 };
const ARM_R_PIVOT = { x: 934, y: 745 };

/** lookAround で寄る左右の視線位置（master px）。ランダム視線の範囲±7より少しだけ外 */
export const LOOK_AROUND_GAZE_X = 9;
/** floating の lookAround 視線位置。floating のランダム視線±16より少しだけ外（白目内に収まる上限） */
export const FLOATING_LOOK_AROUND_GAZE_X = 18;

function round(v: number): number {
  return Math.round(v * 1000) / 1000 || 0;
}

type BodyPose = { y?: number; rot?: number; sx?: number; sy?: number };

function body(offset: number, pose: BodyPose, easing?: string): Keyframe {
  const kf: Keyframe = {
    offset,
    transform: `translateY(${round(pose.y ?? 0)}%) rotate(${round(pose.rot ?? 0)}deg) scale(${round(pose.sx ?? 1)}, ${round(pose.sy ?? 1)})`,
  };
  if (easing) kf.easing = easing;
  return kf;
}

function gaze(offset: number, dx: number, dy: number, easing?: string): Keyframe {
  const kf: Keyframe = { offset, transform: offsetTransform(round(dx), round(dy)) };
  if (easing) kf.easing = easing;
  return kf;
}

function antenna(offset: number, deg: number, easing?: string): Keyframe {
  const kf: Keyframe = { offset, transform: rotateAbout(ANTENNA_PIVOT.x, ANTENNA_PIVOT.y, round(deg)) };
  if (easing) kf.easing = easing;
  return kf;
}

/** 腕を開く方向を正とした角度（左腕=正回転・右腕=負回転） */
function arm(offset: number, side: "L" | "R", openDeg: number, easing?: string): Keyframe {
  const pivot = side === "L" ? ARM_L_PIVOT : ARM_R_PIVOT;
  const deg = side === "L" ? openDeg : -openDeg;
  const kf: Keyframe = { offset, transform: rotateAbout(pivot.x, pivot.y, round(deg)) };
  if (easing) kf.easing = easing;
  return kf;
}

const EASE = "ease-in-out";

/**
 * lookAround: 現在の視線 → 左寄り → 少し保持 → 右寄り → 元の視線。
 * 視線は add なので「絶対位置 − 基底」を差分として積む。身体はほぼ動かさない。
 */
function lookAroundTracks(base: GazeOffset): ReactionTrack[] {
  const leftDx = -LOOK_AROUND_GAZE_X - base.x;
  const rightDx = LOOK_AROUND_GAZE_X - base.x;
  return [
    {
      target: "gaze",
      composite: "add",
      keyframes: [
        gaze(0, 0, 0, EASE),
        gaze(0.18, leftDx, 0),
        gaze(0.42, leftDx, 0, EASE),
        gaze(0.62, rightDx, 0),
        gaze(0.82, rightDx, 0, EASE),
        gaze(1, 0, 0),
      ],
    },
    {
      // 見る方向へごくわずかに体を向ける（首を振る代わり）
      target: "body",
      keyframes: [
        body(0, {}, EASE),
        body(0.2, { rot: -0.5 }),
        body(0.42, { rot: -0.5 }, EASE),
        body(0.64, { rot: 0.5 }),
        body(0.82, { rot: 0.5 }, EASE),
        body(1, {}),
      ],
    },
    {
      // 体の向き替えに遅れてアンテナが少し揺れる
      target: "antenna",
      composite: "add",
      keyframes: [antenna(0, 0, EASE), antenna(0.3, -1.5, EASE), antenna(0.72, 1.5, EASE), antenna(1, 0)],
    },
  ];
}

/**
 * floating の lookAround: 目が先に左へ → 体が遅れて左へ傾く → アンテナがさらに遅れて追う →
 * 目が右へ振れ、体・アンテナが同じ順で追従 → 元へ。84px で「見回している」と読める振幅。
 */
function floatingLookAroundTracks(base: GazeOffset): ReactionTrack[] {
  const leftDx = -FLOATING_LOOK_AROUND_GAZE_X - base.x;
  const rightDx = FLOATING_LOOK_AROUND_GAZE_X - base.x;
  return [
    {
      target: "gaze",
      composite: "add",
      keyframes: [
        gaze(0, 0, 0, EASE),
        gaze(0.12, leftDx, 0),
        gaze(0.42, leftDx, 0, EASE),
        gaze(0.54, rightDx, 0),
        gaze(0.8, rightDx, 0, EASE),
        gaze(0.92, 0, 0),
        gaze(1, 0, 0),
      ],
    },
    {
      target: "body",
      keyframes: [
        body(0, {}),
        body(0.06, {}, EASE),
        body(0.26, { rot: -2.2 }),
        body(0.46, { rot: -2.2 }, EASE),
        body(0.66, { rot: 2.2 }),
        body(0.82, { rot: 2.2 }, EASE),
        body(1, {}),
      ],
    },
    {
      target: "antenna",
      composite: "add",
      keyframes: [
        antenna(0, 0),
        antenna(0.12, 0, EASE),
        antenna(0.34, -4.5, EASE),
        antenna(0.5, -3, EASE),
        antenna(0.74, 4.5, EASE),
        antenna(0.9, 1.5, EASE),
        antenna(1, 0),
      ],
    },
  ];
}

/**
 * curious: 視線を少し上か横へ → 本体をごく小さく傾ける → アンテナがぴくっと反応 → 戻る。
 * 「何かに気づいた」程度に抑える。
 */
function curiousTracks(rng: RNG): ReactionTrack[] {
  const up = rng() < 0.5;
  const side = rng() < 0.5 ? -1 : 1;
  const gx = up ? 0 : 6 * side;
  const gy = up ? -5 : -2;
  return [
    {
      target: "gaze",
      composite: "add",
      keyframes: [gaze(0, 0, 0, "ease-out"), gaze(0.2, gx, gy), gaze(0.72, gx, gy, EASE), gaze(1, 0, 0)],
    },
    {
      target: "body",
      keyframes: [
        body(0, {}, "ease-out"),
        body(0.26, { rot: 1.6 * side, y: -0.4 }),
        body(0.7, { rot: 1.6 * side, y: -0.4 }, EASE),
        body(1, {}),
      ],
    },
    {
      target: "antenna",
      composite: "add",
      keyframes: [
        antenna(0, 0, "ease-out"),
        antenna(0.16, -3.5 * side, EASE),
        antenna(0.34, 2.5 * side, EASE),
        antenna(0.56, -1 * side, EASE),
        antenna(0.8, 0),
        antenna(1, 0),
      ],
    },
  ];
}

/**
 * floating の curious: 何かに気づいた順序を84pxでも読めるようにする。
 *   目がぱっと向く(〜12%) → 体が遅れて傾き少し伸び上がる(10〜32%) →
 *   アンテナがさらに遅れて同じ向きへしなって揺れ戻す(22〜60%) → 保持 → 目→体→アンテナの順で戻る
 */
function floatingCuriousTracks(rng: RNG): ReactionTrack[] {
  const up = rng() < 0.5;
  const side = rng() < 0.5 ? -1 : 1;
  const gx = up ? 6 * side : 15 * side;
  const gy = up ? -9 : -4;
  return [
    {
      target: "gaze",
      composite: "add",
      keyframes: [gaze(0, 0, 0, "ease-out"), gaze(0.12, gx, gy), gaze(0.7, gx, gy, EASE), gaze(0.86, 0, 0), gaze(1, 0, 0)],
    },
    {
      target: "body",
      keyframes: [
        body(0, {}),
        body(0.1, {}, "ease-out"),
        body(0.32, { rot: 3 * side, y: -1.2, sy: 1.012 }),
        body(0.72, { rot: 3 * side, y: -1.2, sy: 1.012 }, EASE),
        body(0.94, {}),
        body(1, {}),
      ],
    },
    {
      target: "antenna",
      composite: "add",
      keyframes: [
        antenna(0, 0),
        antenna(0.22, 0, "ease-out"),
        antenna(0.36, 7 * side, EASE),
        antenna(0.48, 2 * side, EASE),
        antenna(0.6, 3.5 * side, EASE),
        antenna(0.78, 3.5 * side, EASE),
        antenna(0.9, -1.5 * side, EASE),
        antenna(1, 0),
      ],
    },
  ];
}

/**
 * stretch: 少し沈む → 縦に約3%伸びる（腕をわずかに開く）→ 元へ戻る。
 * 伸びの間は横幅を少し細くして体積感を保ち、シルエットを崩さない。
 */
function stretchTracks(floating = false): ReactionTrack[] {
  // floating は 84px でも「伸びた」と読める振幅（縦約5.5%・腕16°）。形は既定と同じ
  const k = floating
    ? { squashX: 1.024, squashY: 0.962, reachX: 0.978, reachY: 1.056, holdX: 0.981, holdY: 1.05, arm: 16, antenna: 4 }
    : { squashX: 1.015, squashY: 0.975, reachX: 0.988, reachY: 1.032, holdX: 0.99, holdY: 1.028, arm: 9, antenna: 2 };
  const armKeys = (side: "L" | "R") => [
    arm(0, side, 0, EASE),
    arm(0.22, side, -2),
    arm(0.5, side, k.arm),
    arm(0.7, side, k.arm, EASE),
    arm(0.92, side, 0),
    arm(1, side, 0),
  ];
  return [
    {
      target: "body",
      keyframes: [
        body(0, {}, EASE),
        body(0.22, { sx: k.squashX, sy: k.squashY }, EASE),
        body(0.5, { sx: k.reachX, sy: k.reachY }),
        body(0.7, { sx: k.holdX, sy: k.holdY }, EASE),
        body(0.88, { sx: 1.004, sy: 0.994 }, EASE),
        body(1, {}),
      ],
    },
    { target: "armL", keyframes: armKeys("L") },
    { target: "armR", keyframes: armKeys("R") },
    {
      target: "antenna",
      composite: "add",
      keyframes: [
        antenna(0, 0, EASE),
        antenna(0.5, -k.antenna, EASE),
        antenna(0.8, k.antenna * 0.6, EASE),
        antenna(1, 0),
      ],
    },
  ];
}

export function buildMacroIdleSpec(behavior: MochitMacroIdleBehavior, options: MacroIdleSpecOptions): MacroIdleSpec {
  const rng = options.rng ?? Math.random;
  const base = options.gazeBase ?? { x: 0, y: 0 };
  const floating = options.floating === true;
  const tracks =
    behavior === "lookAround"
      ? floating
        ? floatingLookAroundTracks(base)
        : lookAroundTracks(base)
      : behavior === "curious"
        ? floating
          ? floatingCuriousTracks(rng)
          : curiousTracks(rng)
        : stretchTracks(floating);
  return { behavior, totalMs: options.durationMs, tracks };
}

/** この仕様が視線を動かすか（再生中はランダム視線の移動を止める） */
export function macroIdleMovesGaze(spec: MacroIdleSpec): boolean {
  return spec.tracks.some((t) => t.target === "gaze");
}

// ---- 自動発火の条件 ----

export type MacroIdleConditions = {
  /** 描画可能かつビューポート内・タブ表示中・reduced-motion でない（Micro Idle が動いている） */
  active: boolean;
  reducedMotion: boolean;
  compact: boolean;
  /** Reaction 再生中（置換待ちを含む） */
  reacting: boolean;
  /** random 以外（Semantic Attention）では自動発火しない */
  attention: MochitAttention;
  /** Sleep 状態（idleBehavior=sleepy の継続状態）。眠っている間は再生しない */
  sleeping?: boolean;
  /** 84px 常時表示版。自動発火の頻度・継続時間に FLOATING_MACRO_IDLE_TUNING を使う */
  floating?: boolean;
};

/** Macro Idle を再生できる状態か（明示再生を含む）。attention は問わない */
export function canPlayMacroIdle(c: MacroIdleConditions): boolean {
  return c.active && !c.reducedMotion && !c.compact && !c.reacting && !c.sleeping;
}

/** 自動 Macro Idle が有効か（active ∧ ¬reducedMotion ∧ ¬compact ∧ ¬Reaction ∧ ¬Sleep ∧ attention=random） */
export function isMacroIdleAutoEnabled(c: MacroIdleConditions): boolean {
  return canPlayMacroIdle(c) && c.attention === "random";
}
