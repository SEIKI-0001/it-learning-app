// モチットの Activity（長く続く行動状態）の純粋ロジック。DOM/React/タイマーに依存しない。
//
// 概念の分担:
//   Activity  = 長時間続く行動（idle / studying=一緒に勉強 / resting=意図的な休憩）
//   Emotion   = 感情（mochitBehavior.ts）
//   Attention = 何を見ているか（mochitAttention.ts / Contextual Attention）
//   Reaction  = 一時的な出来事への反応（mochitEvents.ts / mochitReactionAnimation.ts）
// 優先順位: Learning Reaction > Contextual Attention > Activity > Sleep > Macro Idle > Micro Idle
//
// Activity は Micro Idle を止めない。姿勢（持続する add 合成の小さなずれ）・Micro Idle の
// 速さと振幅・平常表情・視線のパターンだけを変える。Reaction / Contextual Attention の間は
// 姿勢を一時的に解いて（顔を上げて）ユーザーや対象を見る。終われば元の Activity へ戻る。
// resting は Sleep（放置されて眠くなった）とは別物: 笑顔でゆっくり呼吸し、ときどき周りを見る。
//
// 座標は master px（Mochit_Root の内側）。体の姿勢は Anim_Breathe、腕は Arm_L/R の子要素、
// アンテナは Anim_Antenna へ add で重ねる（DOM への適用は mochitActivityController.ts）。

import type { FocusTimerPhase } from "./mochitFocusSession";
import { randRange, rotateAbout, scaleAbout, type GazeOffset, type RNG } from "./mochitIdleAnimation";
import type { MochitRestingExpression } from "./mochitRestingExpression";
import type { MochitReactionProfile } from "./mochitTypes";
import type { ReactionTrack } from "./mochitReactionAnimation";

export type MochitActivity = "idle" | "studying" | "resting";

export const MOCHIT_ACTIVITIES: readonly MochitActivity[] = ["idle", "studying", "resting"];

export function isMochitActivity(value: unknown): value is MochitActivity {
  return (MOCHIT_ACTIVITIES as readonly unknown[]).includes(value);
}

/** 集中タイマーの phase → Activity。一時停止中は「手を止めた」ので idle */
export function activityForFocusPhase(phase: FocusTimerPhase): MochitActivity {
  if (phase === "focus") return "studying";
  if (phase === "break") return "resting";
  return "idle";
}

/** 自動 Sleep（60秒無操作）を許すか。集中中・休憩中は眠らない */
export function activityAllowsSleep(activity: MochitActivity): boolean {
  return activity === "idle";
}

/** Macro Idle（見回す/気づく/伸び）の自発再生を許すか。Activity 中は割り込ませない */
export function activityAllowsMacroIdle(activity: MochitActivity): boolean {
  return activity === "idle";
}

// ---- 平常表情 ----

/**
 * studying: 目線を教材へ落とす（まぶたが下がる＝下を見ている）。84px で読めるよう深めだが
 * sleepy（0.3）より浅い。瞳も下へ寄せ、体は前傾・呼吸は普段どおりなので眠そうには見せない。
 */
export const STUDYING_EYELID_REST = 0.26;
export const STUDYING_EYELID_REST_COMPACT = 0.16;
/** resting: 目を少し細めて笑う */
export const RESTING_EYELID_REST = 0.22;
export const RESTING_EYELID_REST_COMPACT = 0.14;

/**
 * Activity の平常表情。idle は null（emotion の表情に任せる）。
 * lifted=true（Reaction / Contextual Attention で顔を上げている間）は目を開ける。
 */
export function getActivityRestingExpression(
  activity: MochitActivity,
  options: { compact?: boolean; lifted?: boolean } = {},
): MochitRestingExpression | null {
  if (activity === "idle") return null;
  const compact = options.compact === true;
  if (activity === "studying") {
    return {
      mouth: "neutral",
      eyelidRest: options.lifted ? 0 : compact ? STUDYING_EYELID_REST_COMPACT : STUDYING_EYELID_REST,
    };
  }
  return {
    mouth: "smile",
    eyelidRest: options.lifted ? 0 : compact ? RESTING_EYELID_REST_COMPACT : RESTING_EYELID_REST,
  };
}

// ---- Micro Idle の速さ・振幅 ----

export type ActivityTempo = {
  breatheRate: number;
  swayRate: number;
  antennaRate: number;
  breatheAmplitude: number;
  swayAmplitude: number;
  antennaAmplitude: number;
};

export const NORMAL_ACTIVITY_TEMPO: Readonly<ActivityTempo> = Object.freeze({
  breatheRate: 1,
  swayRate: 1,
  antennaRate: 1,
  breatheAmplitude: 1,
  swayAmplitude: 1,
  antennaAmplitude: 1,
});

const ACTIVITY_TEMPOS: Record<MochitActivity, Readonly<ActivityTempo>> = {
  idle: NORMAL_ACTIVITY_TEMPO,
  // 集中: 体のゆれは半分・アンテナは静か（止めはしない）。呼吸はほぼそのまま
  studying: Object.freeze({
    breatheRate: 0.95,
    swayRate: 0.9,
    antennaRate: 0.85,
    breatheAmplitude: 0.85,
    swayAmplitude: 0.55,
    antennaAmplitude: 0.4,
  }),
  // 休憩: ゆっくり深い呼吸。ゆれ・アンテナはのんびり
  resting: Object.freeze({
    breatheRate: 0.72,
    swayRate: 0.85,
    antennaRate: 0.8,
    breatheAmplitude: 1.25,
    swayAmplitude: 0.8,
    antennaAmplitude: 0.8,
  }),
};

export function getActivityTempo(activity: MochitActivity): Readonly<ActivityTempo> {
  return ACTIVITY_TEMPOS[activity];
}

// ---- 姿勢 ----

export type ActivityPose = {
  /** 体の下方向への平行移動（master px） */
  dy: number;
  /** 足元支点の拡縮 */
  sx: number;
  sy: number;
  /** 腕の角度（正=外側へ上げる / 負=体の前へ寄せる・下ろす） */
  armDeg: number;
  /** アンテナの追加回転（deg） */
  antennaDeg: number;
};

export const NEUTRAL_ACTIVITY_POSE: Readonly<ActivityPose> = Object.freeze({
  dy: 0,
  sx: 1,
  sy: 1,
  armDeg: 0,
  antennaDeg: 0,
});

// studying: 少し前傾＝頭が下がって縦に縮み、腕を体の前へ寄せる（教材を持つ）。
// 84px で頭頂が約3CSSpx下がる量。sleepy の沈み（sy 0.985）より深い。
const STUDYING_POSE: ActivityPose = { dy: 16, sx: 1.012, sy: 0.958, armDeg: -14, antennaDeg: 0 };
// resting: 力が抜けて少し低く横に広がる。腕はだらんと下ろし、アンテナは少し倒れる。
const RESTING_POSE: ActivityPose = { dy: 6, sx: 1.018, sy: 0.982, armDeg: -4, antennaDeg: 3 };

/** compact は姿勢を弱める（小さい表示で形が崩れて見えないように） */
const COMPACT_POSE_SCALE = 0.5;

export function getActivityPose(activity: MochitActivity, options: { compact?: boolean } = {}): ActivityPose {
  if (activity === "idle") return { ...NEUTRAL_ACTIVITY_POSE };
  const pose = activity === "studying" ? STUDYING_POSE : RESTING_POSE;
  return options.compact ? interpolateActivityPose(NEUTRAL_ACTIVITY_POSE, pose, COMPACT_POSE_SCALE) : { ...pose };
}

function round(v: number): number {
  return Math.round(v * 1000) / 1000 || 0;
}

export function isNeutralActivityPose(pose: ActivityPose): boolean {
  return pose.dy === 0 && pose.sx === 1 && pose.sy === 1 && pose.armDeg === 0 && pose.antennaDeg === 0;
}

export function sameActivityPose(a: ActivityPose, b: ActivityPose): boolean {
  return a.dy === b.dy && a.sx === b.sx && a.sy === b.sy && a.armDeg === b.armDeg && a.antennaDeg === b.antennaDeg;
}

export function interpolateActivityPose(a: ActivityPose, b: ActivityPose, t: number): ActivityPose {
  const k = Math.min(1, Math.max(0, Number.isFinite(t) ? t : 1));
  const lerp = (x: number, y: number) => round(x + (y - x) * k);
  return {
    dy: lerp(a.dy, b.dy),
    sx: lerp(a.sx, b.sx),
    sy: lerp(a.sy, b.sy),
    armDeg: lerp(a.armDeg, b.armDeg),
    antennaDeg: lerp(a.antennaDeg, b.antennaDeg),
  };
}

/** 体（足元支点）。Micro Idle の呼吸・ゆれと同じ支点 */
export const ACTIVITY_BODY_PIVOT = Object.freeze({ x: 616, y: 1012 });
/** 腕の支点（リアクションと同じ接続シーム中央）。左は正で開く、右は負で開く */
export const ACTIVITY_ARM_PIVOTS = Object.freeze({
  L: Object.freeze({ x: 296, y: 745, openSign: 1 }),
  R: Object.freeze({ x: 934, y: 745, openSign: -1 }),
});
export const ACTIVITY_ANTENNA_PIVOT = Object.freeze({ x: 680, y: 360 });

export function activityBodyTransform(pose: Pick<ActivityPose, "dy" | "sx" | "sy">): string {
  const { x, y } = ACTIVITY_BODY_PIVOT;
  return `translate(0px, ${round(pose.dy)}px) ${scaleAbout(x, y, round(pose.sx), round(pose.sy))}`;
}

export function activityArmTransform(side: "L" | "R", deg: number): string {
  const pivot = ACTIVITY_ARM_PIVOTS[side];
  return rotateAbout(pivot.x, pivot.y, round(deg * pivot.openSign));
}

export function activityAntennaTransform(deg: number): string {
  return rotateAbout(ACTIVITY_ANTENNA_PIVOT.x, ACTIVITY_ANTENNA_PIVOT.y, round(deg));
}

// ---- 視線のパターン ----

/**
 * none: 通常の Living Idle（ランダム視線）
 * studying: 教材（下）を見て、読むように小さく左右へ送る。ときどきユーザーをちらっと見る
 * resting: 少し上・正面寄りでのんびり、ときどき周りを見る
 * user: ユーザー（正面）を見る（Reaction で顔を上げている間）
 */
export type ActivityGazeMode = "none" | "studying" | "resting" | "user";

export function activityGazeMode(activity: MochitActivity): ActivityGazeMode {
  if (activity === "studying") return "studying";
  if (activity === "resting") return "resting";
  return "none";
}

export type ActivityGazeRange = { rangeX: number; rangeY: number };

export type ActivityGazeStep = {
  offset: GazeOffset;
  /** この位置へ動く時間 */
  moveMs: number;
  /** この位置で止まる時間（Infinity = 次の指示まで） */
  holdMs: number;
};

/** 読む位置（視線レンジに対する割合）。左→右へ送り、行末で左へ戻る */
const READING_STOPS = [-0.45, -0.15, 0.15, 0.45] as const;
const READING_Y = 0.75;
const READING_GLANCE_CHANCE = 0.07;
const RESTING_Y = -0.15;
const RESTING_CENTER_CHANCE = 0.45;

/** 1手目（または reduced-motion の静止位置）。studying は教材の中央、resting・user は正面 */
export function staticActivityGaze(mode: ActivityGazeMode, range: ActivityGazeRange): GazeOffset {
  if (mode === "studying") return { x: 0, y: Math.round(range.rangeY * READING_Y) };
  if (mode === "resting") return { x: 0, y: Math.round(range.rangeY * RESTING_Y) };
  return { x: 0, y: 0 };
}

export type ActivityGazeCursor = { index: number };

/**
 * 次の視線の1手。cursor は呼び出し側が保持する（読む位置の順番）。
 * mode=none は対象外（通常のランダム視線を使う）。
 */
export function nextActivityGaze(
  mode: Exclude<ActivityGazeMode, "none">,
  range: ActivityGazeRange,
  cursor: ActivityGazeCursor,
  rng: RNG = Math.random,
): ActivityGazeStep {
  if (mode === "user") return { offset: { x: 0, y: 0 }, moveMs: 160, holdMs: Infinity };
  if (mode === "studying") {
    if (rng() < READING_GLANCE_CHANCE) {
      // ちらっとユーザーを見る（読んでいる位置は保持）
      return { offset: { x: 0, y: 0 }, moveMs: 170, holdMs: Math.round(randRange(700, 1100, rng)) };
    }
    const index = cursor.index % READING_STOPS.length;
    const lineReturn = index === 0 && cursor.index > 0;
    cursor.index = index + 1;
    return {
      offset: { x: Math.round(range.rangeX * READING_STOPS[index]), y: Math.round(range.rangeY * READING_Y) },
      moveMs: lineReturn ? 260 : 180,
      holdMs: Math.round(randRange(650, 1100, rng)),
    };
  }
  const centered = rng() < RESTING_CENTER_CHANCE;
  return {
    offset: {
      x: centered ? 0 : Math.round(randRange(-0.7, 0.7, rng) * range.rangeX),
      y: Math.round(range.rangeY * RESTING_Y),
    },
    moveMs: 420,
    holdMs: Math.round(randRange(2200, 4200, rng)),
  };
}

// ---- Activity の切り替わりの振り付け ----

export type ActivityTransitionKind = "enterStudying" | "exitStudying" | "enterResting" | "exitResting";

/** from → to の切り替わりで再生する振り付け。同じ Activity なら null */
export function activityTransitionKind(from: MochitActivity, to: MochitActivity): ActivityTransitionKind | null {
  if (from === to) return null;
  if (to === "resting") return "enterResting";
  if (from === "resting") return "exitResting";
  if (to === "studying") return "enterStudying";
  return "exitStudying";
}

/** 姿勢の段階的な移り方。delayMs は切り替わり開始からの時刻 */
export type ActivityPoseStep = { pose: ActivityPose; delayMs: number; ms: number };

export type ActivityTransitionPlan = {
  kind: ActivityTransitionKind;
  /** 一回きりの振り付け（リアクションと同じ ReactionTrack 契約: 恒等で始まり恒等で終わる）。無ければ null */
  flourish: { totalMs: number; tracks: ReactionTrack[] } | null;
  /** 持続する姿勢の移り方（最後の step が到達点） */
  poseSteps: ActivityPoseStep[];
};

type MotionScale = { move: number; squash: number; arm: number; antenna: number };
const FULL_SCALE: MotionScale = { move: 1, squash: 1, arm: 1, antenna: 1 };
const FLOATING_SCALE: MotionScale = { move: 0.8, squash: 0.85, arm: 0.85, antenna: 1 };

type BodyPose = { y?: number; sx?: number; sy?: number };

function bodyFrame(offset: number, pose: BodyPose, s: MotionScale, easing?: string): Keyframe {
  const y = (pose.y ?? 0) * s.move;
  const sx = 1 + ((pose.sx ?? 1) - 1) * s.squash;
  const sy = 1 + ((pose.sy ?? 1) - 1) * s.squash;
  const kf: Keyframe = { offset, transform: `translateY(${round(y)}%) rotate(0deg) scale(${round(sx)}, ${round(sy)})` };
  if (easing) kf.easing = easing;
  return kf;
}

function armFrame(offset: number, side: "L" | "R", deg: number, s: MotionScale, easing?: string): Keyframe {
  const kf: Keyframe = { offset, transform: activityArmTransform(side, deg * s.arm) };
  if (easing) kf.easing = easing;
  return kf;
}

function antennaFrame(offset: number, deg: number, s: MotionScale, easing?: string): Keyframe {
  const kf: Keyframe = { offset, transform: activityAntennaTransform(deg * s.antenna) };
  if (easing) kf.easing = easing;
  return kf;
}

function bothArms(frames: Array<[offset: number, deg: number, easing?: string]>, s: MotionScale): ReactionTrack[] {
  return (["L", "R"] as const).map((side) => ({
    target: side === "L" ? ("armL" as const) : ("armR" as const),
    keyframes: frames.map(([offset, deg, easing]) => armFrame(offset, side, deg, s, easing)),
  }));
}

const FLOURISH_MS: Record<ActivityTransitionKind, number> = {
  enterStudying: 700,
  exitStudying: 800,
  enterResting: 1700,
  exitResting: 750,
};

type Flourish = (s: MotionScale) => ReactionTrack[];

const FLOURISHES: Record<ActivityTransitionKind, Flourish> = {
  // 集中に入る: 「よし」と小さくうなずいて手を構え、アンテナがぴっと立つ
  enterStudying: (s) => [
    {
      target: "body",
      keyframes: [
        bodyFrame(0, {}, s, "ease-in"),
        bodyFrame(0.25, { y: 0.9, sx: 1.015, sy: 0.98 }, s, "ease-out"),
        bodyFrame(0.5, { y: -0.8, sy: 1.01 }, s, "ease-in-out"),
        bodyFrame(1, {}, s),
      ],
    },
    ...bothArms(
      [
        [0, 0],
        [0.12, 0, "ease-out"],
        [0.32, 8],
        [0.6, 6, "ease-in-out"],
        [1, 0],
      ],
      s,
    ),
    {
      target: "antenna",
      composite: "add",
      keyframes: [
        antennaFrame(0, 0, s),
        antennaFrame(0.2, 0, s, "ease-out"),
        antennaFrame(0.4, 4, s, "ease-in-out"),
        antennaFrame(0.65, -2, s, "ease-in-out"),
        antennaFrame(1, 0, s),
      ],
    },
  ],
  // 集中を終える: 顔を上げ、ふっと息を吐くように小さく伸びてから戻る
  exitStudying: (s) => [
    {
      target: "body",
      keyframes: [
        bodyFrame(0, {}, s, "ease-out"),
        bodyFrame(0.35, { y: -0.8, sx: 0.99, sy: 1.02 }, s, "ease-in-out"),
        bodyFrame(0.7, { y: 0.4, sx: 1.01, sy: 0.99 }, s, "ease-in-out"),
        bodyFrame(1, {}, s),
      ],
    },
    {
      target: "antenna",
      composite: "add",
      keyframes: [
        antennaFrame(0, 0, s, "ease-out"),
        antennaFrame(0.4, 3, s, "ease-in-out"),
        antennaFrame(0.7, -1.5, s, "ease-in-out"),
        antennaFrame(1, 0, s),
      ],
    },
  ],
  // 休憩に入る: 少し力が抜ける → ぐーっと伸び → ふにゃっと休憩姿勢へ
  enterResting: (s) => [
    {
      target: "body",
      keyframes: [
        bodyFrame(0, {}, s, "ease-out"),
        bodyFrame(0.18, { y: 1.2, sx: 1.03, sy: 0.96 }, s),
        bodyFrame(0.3, { y: 1.1, sx: 1.028, sy: 0.962 }, s, "ease-in-out"),
        bodyFrame(0.55, { y: -1.6, sx: 0.975, sy: 1.05 }, s),
        bodyFrame(0.7, { y: -1.4, sx: 0.978, sy: 1.045 }, s, "ease-in-out"),
        bodyFrame(0.85, { y: 0.3, sx: 1.01, sy: 0.99 }, s, "ease-out"),
        bodyFrame(1, {}, s),
      ],
    },
    ...bothArms(
      [
        [0, 0, "ease-out"],
        [0.18, -6],
        [0.3, -6, "ease-in-out"],
        [0.55, 24],
        [0.7, 22, "ease-in-out"],
        [0.9, 0],
        [1, 0],
      ],
      s,
    ),
    {
      target: "antenna",
      composite: "add",
      keyframes: [
        antennaFrame(0, 0, s, "ease-out"),
        antennaFrame(0.18, -3, s, "ease-in-out"),
        antennaFrame(0.55, 5, s),
        antennaFrame(0.7, 4, s, "ease-in-out"),
        antennaFrame(0.85, -1.5, s, "ease-in-out"),
        antennaFrame(1, 0, s),
      ],
    },
  ],
  // 休憩を終える: 軽く跳ねて「よし」と構える（wakeUp より少し前向き）
  exitResting: (s) => [
    {
      target: "body",
      keyframes: [
        bodyFrame(0, {}, s, "ease-out"),
        bodyFrame(0.18, { y: 0.4, sx: 1.015, sy: 0.985 }, s, "ease-out"),
        bodyFrame(0.42, { y: -2, sx: 0.99, sy: 1.015 }, s, "ease-in"),
        bodyFrame(0.66, { sx: 1.008, sy: 0.994 }, s, "ease-out"),
        bodyFrame(1, {}, s),
      ],
    },
    ...bothArms(
      [
        [0, 0],
        [0.2, 0, "ease-out"],
        [0.42, 10],
        [0.7, 6, "ease-in-out"],
        [1, 0],
      ],
      s,
    ),
    {
      target: "antenna",
      composite: "add",
      keyframes: [
        antennaFrame(0, 0, s, "ease-out"),
        antennaFrame(0.2, 0, s, "ease-out"),
        antennaFrame(0.4, 5, s, "ease-in-out"),
        antennaFrame(0.6, -3, s, "ease-in-out"),
        antennaFrame(0.8, 1.2, s, "ease-in-out"),
        antennaFrame(1, 0, s),
      ],
    },
  ],
};

/**
 * from → to の切り替わり計画。animate=false（reduced-motion・停止中）や初回表示は
 * 振り付けなしで姿勢へ即座に移る（静的な姿勢は残す）。compact は振り付けをアンテナだけにする。
 */
export function buildActivityTransitionPlan(
  from: MochitActivity,
  to: MochitActivity,
  options: { profile: MochitReactionProfile; animate: boolean },
): ActivityTransitionPlan | null {
  const kind = activityTransitionKind(from, to);
  if (!kind) return null;
  const compact = options.profile === "compact";
  const target = getActivityPose(to, { compact });
  if (!options.animate) {
    return { kind, flourish: null, poseSteps: [{ pose: target, delayMs: 0, ms: 0 }] };
  }
  const s = options.profile === "floating" ? FLOATING_SCALE : FULL_SCALE;
  let tracks = FLOURISHES[kind](s);
  if (compact) tracks = tracks.filter((track) => track.target === "antenna");
  const flourish = { totalMs: FLOURISH_MS[kind], tracks };
  const neutral = { ...NEUTRAL_ACTIVITY_POSE };
  let poseSteps: ActivityPoseStep[];
  switch (kind) {
    case "enterStudying":
      poseSteps = [{ pose: target, delayMs: 300, ms: 600 }];
      break;
    case "exitStudying":
      poseSteps = [{ pose: target, delayMs: 0, ms: 420 }];
      break;
    case "enterResting":
      // 前の姿勢（studying）を先に解いてから、伸びの後で休憩姿勢へ
      poseSteps = [
        { pose: neutral, delayMs: 0, ms: 300 },
        { pose: target, delayMs: 1200, ms: 550 },
      ];
      break;
    case "exitResting":
      poseSteps =
        to === "studying"
          ? [
              { pose: neutral, delayMs: 0, ms: 320 },
              { pose: target, delayMs: 700, ms: 550 },
            ]
          : [{ pose: target, delayMs: 0, ms: 320 }];
      break;
  }
  return { kind, flourish, poseSteps };
}

// ---- Reaction / Contextual Attention との重ね方 ----

export const ACTIVITY_LIFT_TIMING = Object.freeze({
  /** 顔を上げる（姿勢を解く）時間。Reaction の予備動作と重なる長さ */
  liftMs: 200,
  /** Reaction 後、ユーザーを見たまま少し待ってから戻る */
  resumeHoldMs: 350,
  /** Activity の姿勢へ戻る時間 */
  resumeMs: 520,
});

/** 視線レンジに対する読書位置（テスト・検証用） */
export function readingGazeOffsets(range: ActivityGazeRange): GazeOffset[] {
  return READING_STOPS.map((x) => ({ x: Math.round(range.rangeX * x), y: Math.round(range.rangeY * READING_Y) }));
}
