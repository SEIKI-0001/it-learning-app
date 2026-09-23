// Activity（studying / resting）を SVG へ適用するコントローラー。React には依存しない
// （MochitSvg が1つだけ作り、Activity・稼働状態・Reaction の開始/終了を通知する）。
//
// 適用のしかた（Micro Idle のループは作り直さない）:
//   - 姿勢: Anim_Breathe（体）/ Arm_L・Arm_R の子要素（腕）/ Anim_Antenna（アンテナ）へ
//     composite:"add"・fill:"both" の持続アニメを1本ずつ重ねる。腕は Reaction が Arm_L/R 自体を
//     replace で動かすので、その子要素に置いて Reaction と衝突させない（同じ支点の回転は足し算になる）。
//   - 切り替わりの振り付け（集中に入る・休憩の伸び など）は Reaction と同じ有限アニメを注入された
//     playFlourish で再生する。
//   - Micro Idle の速さ・振幅、平常表情、視線のパターンは注入されたコールバックへ渡す。
//
// Reaction / Contextual Attention との重ね方（Reaction > Attention > Activity）:
//   lift(reason) で姿勢を解いて顔を上げ（目を開け、正面を見る）、release(reason) で
//   少しユーザーを見たまま待ってから元の Activity の姿勢へ戻る。Reaction が neutral へ
//   戻すのではなく、Reaction 開始前の Activity へ復帰する。
//   reduced-motion・停止中は静的な姿勢を保ち、顔を上げる動きはしない。

import {
  ACTIVITY_LIFT_TIMING,
  activityAntennaTransform,
  activityArmTransform,
  activityBodyTransform,
  activityGazeMode,
  buildActivityTransitionPlan,
  getActivityPose,
  getActivityRestingExpression,
  getActivityTempo,
  interpolateActivityPose,
  isNeutralActivityPose,
  NEUTRAL_ACTIVITY_POSE,
  sameActivityPose,
  type ActivityGazeMode,
  type ActivityPose,
  type ActivityTempo,
  type MochitActivity,
} from "./mochitActivity";
import type { MochitRestingExpression } from "./mochitRestingExpression";
import type { MochitReactionProfile } from "./mochitTypes";
import type { ReactionTrack } from "./mochitReactionAnimation";

export type ActivityFlourishPlayback = { stop(settleMs: number): void };

export type ActivityControllerDeps = {
  svg: SVGSVGElement;
  /** 有限の振り付けを再生する（Reaction と同じ契約）。再生できなければ null */
  playFlourish(spec: { totalMs: number; tracks: ReactionTrack[] }, onEnd: () => void): ActivityFlourishPlayback | null;
  setGazeMode(mode: ActivityGazeMode): void;
  setTempo(tempo: ActivityTempo): void;
  /** Activity の平常表情。null は「emotion の表情へ戻す」 */
  setExpression(expression: MochitRestingExpression | null, transitionMs: number): void;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
  now?: () => number;
};

export type ActivityConfig = {
  activity: MochitActivity;
  /** false = reduced-motion・非表示・ビューポート外（静的な姿勢だけを置く） */
  animate: boolean;
  profile: MochitReactionProfile;
};

export type ActivityLiftReason = "reaction" | "attention";

export type ActivityController = {
  configure(config: ActivityConfig): void;
  /** Reaction / Contextual Attention の開始: 姿勢を解いて顔を上げる */
  lift(reason: ActivityLiftReason): void;
  /** 終了: holdMs だけユーザーを見たまま待ってから Activity の姿勢へ戻る */
  release(reason: ActivityLiftReason, holdMs?: number): void;
  getState(): { activity: MochitActivity; lifted: boolean; target: ActivityPose; flourishing: boolean };
  dispose(): void;
};

/** 振り付けを途中で打ち切るときの戻し時間（Reaction の置換 settle と同じ） */
const FLOURISH_SETTLE_MS = 90;
/** 平常表情（まぶた・口）の切替時間 */
const EXPRESSION_MS = 260;

type PoseTransition = {
  from: ActivityPose;
  to: ActivityPose;
  startedAt: number;
  delayMs: number;
  ms: number;
  animations: Animation[];
};

function canAnimate(el: Element | null): el is SVGGraphicsElement {
  return !!el && typeof (el as SVGGraphicsElement).animate === "function";
}

export function createActivityController(deps: ActivityControllerDeps): ActivityController {
  const { svg } = deps;
  const setTimer = deps.setTimer ?? ((fn: () => void, ms: number) => setTimeout(fn, ms));
  const clearTimer = deps.clearTimer ?? ((h: unknown) => clearTimeout(h as ReturnType<typeof setTimeout>));
  const now = deps.now ?? (() => (typeof performance !== "undefined" ? performance.now() : Date.now()));

  const body = svg.querySelector<SVGGraphicsElement>("#Anim_Breathe");
  const antenna = svg.querySelector<SVGGraphicsElement>("#Anim_Antenna");
  const arms = (["L", "R"] as const).flatMap((side) =>
    Array.from(svg.querySelectorAll<SVGGraphicsElement>(`#Arm_${side} > *`)).map((el) => ({ el, side })),
  );

  let config: ActivityConfig | null = null;
  let pose: PoseTransition | null = null;
  let stepTimers: unknown[] = [];
  let releaseTimer: unknown = null;
  let flourish: ActivityFlourishPlayback | null = null;
  const lifts = new Set<ActivityLiftReason>();
  let disposed = false;

  const compactOf = (c: ActivityConfig) => c.profile === "compact";
  const targetOf = (c: ActivityConfig) => getActivityPose(c.activity, { compact: compactOf(c) });

  // 今見えている姿勢（delay 中は from、補間中は ease-in-out 近似の途中位置）
  const visiblePose = (): ActivityPose => {
    if (!pose) return { ...NEUTRAL_ACTIVITY_POSE };
    const t = pose.ms > 0 ? (now() - pose.startedAt - pose.delayMs) / pose.ms : 1;
    if (t <= 0) return pose.from;
    if (t >= 1) return pose.to;
    return interpolateActivityPose(pose.from, pose.to, t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
  };

  const cancelPose = () => {
    for (const a of pose?.animations ?? []) {
      try {
        a.cancel();
      } catch {
        /* noop */
      }
    }
    pose = null;
  };

  const poseTo = (to: ActivityPose, delayMs: number, ms: number) => {
    const from = visiblePose();
    if (pose && sameActivityPose(pose.to, to) && sameActivityPose(from, to)) return;
    cancelPose();
    if (isNeutralActivityPose(from) && isNeutralActivityPose(to)) return;
    const options: KeyframeAnimationOptions = {
      duration: Math.max(1, ms),
      delay: delayMs,
      easing: "ease-in-out",
      fill: "both",
      composite: "add",
    };
    const animations: Animation[] = [];
    const run = (el: SVGGraphicsElement | null, keyframes: Keyframe[]) => {
      if (!canAnimate(el)) return;
      try {
        const animation = el.animate(keyframes, options);
        animation.persist?.();
        animations.push(animation);
      } catch {
        // composite 未対応などでは姿勢なし（表情・視線・テンポは効く）
      }
    };
    run(body, [{ transform: activityBodyTransform(from) }, { transform: activityBodyTransform(to) }]);
    for (const { el, side } of arms) {
      run(el, [{ transform: activityArmTransform(side, from.armDeg) }, { transform: activityArmTransform(side, to.armDeg) }]);
    }
    run(antenna, [
      { transform: activityAntennaTransform(from.antennaDeg) },
      { transform: activityAntennaTransform(to.antennaDeg) },
    ]);
    pose = { from, to, startedAt: now(), delayMs, ms, animations };
  };

  const clearSteps = () => {
    for (const t of stepTimers) clearTimer(t);
    stepTimers = [];
  };
  const clearRelease = () => {
    if (releaseTimer !== null) clearTimer(releaseTimer);
    releaseTimer = null;
  };
  const stopFlourish = (settleMs: number) => {
    const running = flourish;
    flourish = null;
    running?.stop(settleMs);
  };

  const lifted = () => lifts.size > 0 && !!config && config.activity !== "idle";

  const applyLook = (c: ActivityConfig, transitionMs: number) => {
    const up = lifted();
    deps.setGazeMode(up ? "user" : activityGazeMode(c.activity));
    deps.setExpression(getActivityRestingExpression(c.activity, { compact: compactOf(c), lifted: up }), transitionMs);
  };

  const settleInto = (c: ActivityConfig, ms: number) => {
    clearSteps();
    poseTo(lifted() ? { ...NEUTRAL_ACTIVITY_POSE } : targetOf(c), 0, ms);
  };

  return {
    configure(next) {
      if (disposed) return;
      const prev = config;
      config = { ...next };
      deps.setTempo(getActivityTempo(next.activity));

      if (!prev) {
        // 初回（マウント・リロード直後）: 振り付けなしで今の Activity の姿勢に置く
        settleInto(next, 0);
        applyLook(next, 0);
        return;
      }
      if (!next.animate) {
        // reduced-motion・停止: 動きは止め、静的な姿勢と表情だけを残す（顔を上げる動きもしない）
        stopFlourish(0);
        clearRelease();
        lifts.clear();
        settleInto(next, 0);
        applyLook(next, 0);
        return;
      }
      if (prev.activity === next.activity) {
        // compact 切替・停止からの復帰: 姿勢はそのまま（プロファイルが変わった時だけ置き直す）
        if (prev.profile !== next.profile || !prev.animate) settleInto(next, 0);
        return;
      }

      // Activity の切り替わり
      stopFlourish(FLOURISH_SETTLE_MS);
      clearSteps();
      applyLook(next, EXPRESSION_MS);
      if (lifted()) {
        // Reaction 中: 振り付けは挟まず、終わった後に新しい Activity の姿勢へ戻る
        return;
      }
      const plan = buildActivityTransitionPlan(prev.activity, next.activity, {
        profile: next.profile,
        animate: true,
      });
      if (!plan) return;
      if (plan.flourish && plan.flourish.tracks.length > 0) {
        const playback = deps.playFlourish(plan.flourish, () => {
          if (flourish === playback) flourish = null;
        });
        flourish = playback;
      }
      const [first, ...rest] = plan.poseSteps;
      if (first) poseTo(first.pose, first.delayMs, first.ms);
      for (const step of rest) {
        stepTimers.push(
          setTimer(() => {
            if (!lifted()) poseTo(step.pose, 0, step.ms);
          }, step.delayMs),
        );
      }
    },
    lift(reason) {
      if (disposed || !config || !config.animate) return;
      const wasLifted = lifted();
      lifts.add(reason);
      clearRelease();
      if (wasLifted || config.activity === "idle") return;
      // Reaction は同じ要素を上書きするので振り付けはすぐ止める。Attention は短く戻す
      stopFlourish(reason === "reaction" ? 0 : FLOURISH_SETTLE_MS);
      clearSteps();
      poseTo({ ...NEUTRAL_ACTIVITY_POSE }, 0, ACTIVITY_LIFT_TIMING.liftMs);
      applyLook(config, ACTIVITY_LIFT_TIMING.liftMs);
    },
    release(reason, holdMs = 0) {
      if (disposed || !lifts.delete(reason) || lifts.size > 0 || !config) return;
      clearRelease();
      const resume = () => {
        releaseTimer = null;
        // idle では lift で何も変えていないので戻すものも無い（Reaction のたびに表情を再適用しない）
        if (disposed || !config || lifts.size > 0 || config.activity === "idle") return;
        applyLook(config, EXPRESSION_MS);
        settleInto(config, config.animate ? ACTIVITY_LIFT_TIMING.resumeMs : 0);
      };
      if (holdMs > 0 && config.activity !== "idle") releaseTimer = setTimer(resume, holdMs);
      else resume();
    },
    getState() {
      return {
        activity: config?.activity ?? "idle",
        lifted: lifted(),
        target: pose ? pose.to : { ...NEUTRAL_ACTIVITY_POSE },
        flourishing: flourish !== null,
      };
    },
    dispose() {
      disposed = true;
      clearSteps();
      clearRelease();
      stopFlourish(0);
      cancelPose();
    },
  };
}
