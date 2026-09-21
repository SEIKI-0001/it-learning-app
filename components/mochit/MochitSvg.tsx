"use client";

// レイヤー分割済みSVGを React 上で直接アニメーションさせる無料方式の描画レイヤー。
// 「生きている待機（Living Idle）」に加え、学習イベントのリアクションを再生する:
//   - Idle: ゆるやかな呼吸 / 小さな左右のゆれ / 不規則なまばたき / 小さな視線移動 / アンテナの遅れ追従
//   - リアクション: mochitReactionAnimation.ts の仕様を有限WAAPIアニメとして適用。
//     本体の動きは外側<svg>のCSS transform（Idleの内部グループとは別要素）なので
//     Idleと自然に合成され、終了時は恒等変換＝位置飛びなしでIdleへ戻る。
//     gaze/antenna は composite:"add" でIdleの変換に上乗せする。
//   - 視線: Living Idle（呼吸/ゆれ/アンテナ/まばたき）とは独立した gaze controller が持つ。
//     attention が random の時だけランダム視線、user/content/result（Semantic Attention）は
//     正規化座標の1点を見続ける。attention の変更は gaze controller だけを更新し、
//     Living Idle を再起動しない。
//
// 契約:
//   - onReady: SVG が正しく描画できた（親はWebPフォールバックを外してよい）
//   - onLoadFailed: 読み込み/描画に失敗（親はWebPへフォールバック）
//   - reduced-motion ではIdle停止＋リアクションは表情/Core発光のみの縮退版
//   - ビューポート外 / タブ非表示 では停止して静止ポーズを保つ
//   - registerTriggerFirer: useMochitController のトリガー発火を受け取る口（Riveと同じ契約）
//   - emotion: Behavior State の平常時感情。平常表情（口・まぶた）を既存ノードの
//     インラインstyleへ命令的に反映する（SVGの再注入・再マウントはしない）。
//     インラインstyleはIdle/リアクションの「基底値」なので、リアクション終了後は
//     neutral ではなく現在の平常表情へ戻る。reduced-motion でも静的表情は残る。
//   - attention / attentionPoint: Semantic Attention。瞳のインラインtransform＝基底値へ反映し、
//     リアクションの gaze トラック（composite:"add"）はその上に乗る。
//     reduced-motion・停止中は補間なしで静的な視線位置だけを残す。compact では中央固定。
//   - Macro Idle: 8〜20秒おきに lookAround / curious / stretch を自発的に1回再生する
//     （mochitMacroIdle.ts=仕様・抽選、mochitMacroIdleController.ts=スケジューラ）。
//     リアクションと同じ有限WAAPI（fill:"none"・恒等で開始/終了、gaze/antenna は add）なので
//     Micro Idle を止めず、終了すれば現在の emotion / 視線 / 姿勢へそのまま戻る。
//     自動発火は active ∧ ¬compact ∧ ¬Reaction ∧ attention=random のときだけ。
//     macroIdleRequest で1回だけの明示再生もできる（devプレビュー用）。
//   - sleeping: Sleep 状態（idleBehavior=sleepy の継続状態）。Micro Idle は作り直さず、
//     走っている呼吸/ゆれ/アンテナの速度・振幅だけを落とし、足元支点でごくわずかに沈ませる
//     （add 合成の持続アニメ）。Macro Idle は停止、ランダム視線も中央で休ませる。
//     半目は emotion=sleepy の平常表情が担う。reduced-motion では静的表情のみ。
//   - floating（reactionProfile="floating" ∧ ¬compact・84px 常時表示）: 同じ仕組みのまま
//     知覚できる振幅へ調整する。視線レンジ拡大・Semantic Attention の身体連動
//     （目→約100ms後に体が傾く→さらに遅れてアンテナ。createAttentionPoseController）・
//     Macro Idle の頻度/振幅強化。full / compact の見た目は変えない。

import { useEffect, useMemo, useRef, useState } from "react";
import { MOCHIT_SVG_MARKUP } from "./mochitSvgMarkup";
import { MOCHIT_TRIGGER_EVENTS } from "./mochitEvents";
import type { MochitRiveTriggerInput } from "./mochitTypes";
import type { MochitReactionProfile } from "./mochitTypes";
import type { MochitAttention, MochitEmotion } from "./mochitBehavior";
import { buildMacroIdleSpec, macroIdleMovesGaze, type MochitMacroIdleBehavior } from "./mochitMacroIdle";
import {
  createMacroIdleController,
  type MacroIdleController,
  type MacroIdlePlayer,
} from "./mochitMacroIdleController";
import {
  attentionPointToGazeOffset,
  resolveMochitGazeTarget,
  type MochitAttentionPoint,
  type MochitGazeTarget,
} from "./mochitAttention";
import {
  attentionAntennaKeyframes,
  attentionBodyKeyframes,
  attentionPoseForGaze,
  interpolateAttentionPose,
  isNeutralAttentionPose,
  NEUTRAL_ATTENTION_POSE,
  type AttentionPose,
} from "./mochitEmbodiedAttention";
import {
  getMochitRestingExpression,
  MOCHIT_RESTING_MOUTH_ELEMENT_IDS,
  rebaseReactionMouths,
  type MochitRestingExpression,
  type MochitRestingMouth,
} from "./mochitRestingExpression";
import {
  buildReactionSpec,
  MOCHIT_BODY_TRANSFORM_ORIGIN,
  type ReactionSpec,
  type ReactionTargetId,
} from "./mochitReactionAnimation";
import {
  antennaKeyframes,
  blinkDurationMs,
  blinkKeyframes,
  breatheKeyframes,
  eyelidRestTransform,
  GAZE_CENTER,
  getIdleProfile,
  nextBlinkGapMs,
  nextGazeHoldMs,
  nextGazeTarget,
  offsetTransform,
  scaleAbout,
  shouldDoubleBlink,
  swayKeyframes,
  type EmbodiedAttentionTiming,
  type EmbodiedAttentionTuning,
  type GazeOffset,
} from "./mochitIdleAnimation";

const isDev = process.env.NODE_ENV !== "production";

type Props = {
  growthStage: number;
  reducedMotion: boolean;
  compact: boolean;
  reactionProfile: MochitReactionProfile;
  ariaLabel: string;
  onReady?: () => void;
  onLoadFailed?: (error: unknown) => void;
  className?: string;
  /** devプレビュー用: 描画失敗を強制してWebPフォールバックを確認する */
  forceFailure?: boolean;
  /** useMochitController のトリガー発火を受け取る（Riveと同じ契約） */
  registerTriggerFirer?: (firer: ((trigger: MochitRiveTriggerInput) => void) | null) => void;
  /** Behavior State の平常時感情。省略時 neutral（従来表示と同一） */
  emotion?: MochitEmotion;
  /** 何を見ているか。省略時 random（従来の Living Idle のランダム視線） */
  attention?: MochitAttention;
  /** content/result で見る位置（正規化座標 0〜1）。省略時は中央 */
  attentionPoint?: MochitAttentionPoint;
  /**
   * Macro Idle を1回だけ明示再生する（devプレビュー用）。id が変わるたびに再生する。
   * 自動発火とは独立で attention は問わないが、reduced-motion・compact・Reaction中・停止中は再生しない。
   */
  macroIdleRequest?: MochitMacroIdleRequest;
  /**
   * Sleep 状態（idleBehavior=sleepy）。Macro Idle とランダム視線を止め、Micro Idle を
   * 静かにする。半目は emotion=sleepy で別に指定する。省略時 false。
   */
  sleeping?: boolean;
};

export type MochitMacroIdleRequest = { behavior: MochitMacroIdleBehavior; id: number };

function canAnimate(el: SVGGraphicsElement | null): el is SVGGraphicsElement {
  return !!el && typeof el.animate === "function";
}

// ---- Sleep 中の Micro Idle の静けさ ----

/** Sleep 中の Micro Idle。ループは作り直さず、速度（playbackRate）と振幅だけを変える */
export const MOCHIT_SLEEP_IDLE = {
  /** 呼吸をゆっくり */
  breatheRate: 0.72,
  swayRate: 0.8,
  antennaRate: 0.8,
  /** ゆれ・アンテナの振幅係数 */
  swayAmplitude: 0.5,
  antennaAmplitude: 0.55,
  /** 足元支点の沈み込み（scaleY 0.985 ≒ 頭頂が約1.5%下がる） */
  sinkScaleX: 1.006,
  sinkScaleY: 0.985,
  /** 眠りに入る / 起きる時の沈み込みの補間時間 */
  sinkInMs: 900,
  sinkOutMs: 260,
} as const;

type IdleHandle = {
  stop(): void;
  /** Sleep の静けさを反映する（transitionMs=0 は即時） */
  setSleepy(sleepy: boolean, transitionMs: number): void;
};

function setRate(animation: Animation | null, rate: number): void {
  if (!animation) return;
  try {
    if (typeof animation.updatePlaybackRate === "function") animation.updatePlaybackRate(rate);
    else animation.playbackRate = rate;
  } catch {
    /* noop */
  }
}

function setLoopKeyframes(animation: Animation | null, keyframes: Keyframe[]): void {
  const effect = animation?.effect as KeyframeEffect | null | undefined;
  if (!effect || typeof effect.setKeyframes !== "function") return;
  try {
    effect.setKeyframes(keyframes);
  } catch {
    /* noop */
  }
}

// 待機アニメーション（呼吸/ゆれ/アンテナ/まばたき）を DOM へ適用し、操作ハンドルを返す。
// 視線はここに含めない（createGazeController が独立して持つ）。
// getEyelidRest: 平常時のまぶたの閉じ量（emotion 変更でIdleを作り直さないよう毎回読む）。
function startIdle(svg: SVGSVGElement, compact: boolean, getEyelidRest: () => number): IdleHandle {
  const p = getIdleProfile(compact);
  const loops: Animation[] = [];
  const timers: number[] = [];
  const q = (sel: string) => svg.querySelector<SVGGraphicsElement>(sel);

  const loop = (el: SVGGraphicsElement | null, keyframes: Keyframe[], durationMs: number, delayMs = 0) => {
    if (!canAnimate(el)) return null;
    const animation = el.animate(keyframes, {
      duration: durationMs,
      easing: "ease-in-out",
      direction: "alternate",
      iterations: Infinity,
      delay: delayMs,
    });
    loops.push(animation);
    return animation;
  };

  // 連続モーション
  const sway = q("#Anim_Sway");
  const breathe = q("#Anim_Breathe");
  const antenna = q("#Anim_Antenna");
  const breatheLoop = loop(breathe, breatheKeyframes(p), p.breathe.durationMs);
  const swayLoop = loop(sway, swayKeyframes(p), p.sway.durationMs);
  const antennaLoop = loop(antenna, antennaKeyframes(p), p.antenna.durationMs, p.antenna.delayMs);

  // まばたき（不規則な間隔・時々ダブル）
  const eyelids = [
    { el: q("#Eyelid_L"), cx: p.blink.cxL },
    { el: q("#Eyelid_R"), cx: p.blink.cxR },
  ].filter((e): e is { el: SVGGraphicsElement; cx: number } => canAnimate(e.el));

  for (const { el, cx } of eyelids) {
    // まぶたは静止時 scaleY≈0 で不可視。マークアップの opacity:0 を外して制御下に置く。
    el.style.opacity = "1";
    el.style.transform = eyelidRestTransform(p, cx, getEyelidRest());
  }
  const blinkOnce = () => {
    const rest = getEyelidRest();
    for (const { el, cx } of eyelids) {
      el.animate(blinkKeyframes(p, cx, rest), { duration: blinkDurationMs(p), easing: "ease-in-out" });
    }
  };
  const scheduleBlink = () => {
    const t = window.setTimeout(() => {
      blinkOnce();
      if (shouldDoubleBlink(p)) {
        const t2 = window.setTimeout(blinkOnce, blinkDurationMs(p) + p.blink.doubleGapMs);
        timers.push(t2);
      }
      scheduleBlink();
    }, nextBlinkGapMs(p));
    timers.push(t);
  };
  if (eyelids.length > 0) scheduleBlink();

  // Sleep: 足元支点でごくわずかに沈む。呼吸ループ（replace）の上に add で重ねる持続アニメ。
  let sleepy = false;
  let sink: Animation | null = null;
  const S = MOCHIT_SLEEP_IDLE;
  const sunk = scaleAbout(p.breathe.cx, p.sway.cy, S.sinkScaleX, S.sinkScaleY);
  const level = scaleAbout(p.breathe.cx, p.sway.cy, 1, 1);
  const cancelSink = () => {
    try {
      sink?.cancel();
    } catch {
      /* noop */
    }
    sink = null;
  };
  const setSleepy = (next: boolean, transitionMs: number) => {
    if (sleepy === next) return;
    sleepy = next;
    setRate(breatheLoop, next ? S.breatheRate : 1);
    setRate(swayLoop, next ? S.swayRate : 1);
    setRate(antennaLoop, next ? S.antennaRate : 1);
    setLoopKeyframes(
      swayLoop,
      swayKeyframes({ ...p, sway: { ...p.sway, deg: p.sway.deg * (next ? S.swayAmplitude : 1) } }),
    );
    setLoopKeyframes(
      antennaLoop,
      antennaKeyframes({ ...p, antenna: { ...p.antenna, deg: p.antenna.deg * (next ? S.antennaAmplitude : 1) } }),
    );
    if (!canAnimate(breathe)) return;
    cancelSink();
    try {
      if (next) {
        sink = breathe.animate([{ transform: level }, { transform: sunk }], {
          duration: Math.max(1, transitionMs),
          easing: "ease-in-out",
          fill: "forwards",
          composite: "add",
        });
        sink.persist?.();
      } else if (transitionMs > 0) {
        // 起きる: 沈んだ姿勢から短く戻す（終了後は何も残らない）
        breathe.animate([{ transform: sunk }, { transform: level }], {
          duration: transitionMs,
          easing: "ease-out",
          fill: "none",
          composite: "add",
        });
      }
    } catch {
      /* 沈み込みは演出のみ。失敗しても他は続行 */
    }
  };

  // 停止＝静止ポーズへ戻す（まばたき途中で固まらないように opacity も戻す）。
  const stop = () => {
    cancelSink();
    for (const a of loops) {
      try {
        a.cancel();
      } catch {
        /* noop */
      }
    }
    for (const t of timers) clearTimeout(t);
    for (const el of [sway, breathe, antenna]) if (el) el.style.transform = "";
    for (const { el } of eyelids) {
      el.style.transform = "";
      el.style.opacity = "";
    }
  };
  return { stop, setSleepy };
}

// ---- 身体連動（Embodied Attention） ----

type PoseTransition = {
  from: AttentionPose;
  to: AttentionPose;
  startedAt: number;
  delayMs: number;
  ms: number;
  animation: Animation | null;
};

type AttentionPoseController = {
  /**
   * 対象姿勢へ向かう。tuning が null（full/compact）か animate=false（reduced-motion・停止中）の
   * ときは身体を動かさない（進行中の姿勢も即座に消す）。
   */
  set(pose: AttentionPose, tuning: EmbodiedAttentionTuning | null, animate: boolean): void;
  dispose(): void;
};

/**
 * Semantic Attention の身体連動。体（Anim_Sway）とアンテナ（Anim_Antenna）へ
 * composite:"add"・fill:"both" の持続アニメを1本ずつ重ねる（Micro Idle のループは作り直さない）。
 * 目（gaze controller）が先に動き、体→アンテナの順に遅れて追従する。delay 中は fill:"both" で
 * 直前の姿勢を保つので、途中で対象が変わっても位置飛びしない。
 * Reaction / Macro Idle の body は外側<svg>、gaze/antenna は add なので、この姿勢の上に合成される。
 */
function createAttentionPoseController(svg: SVGSVGElement): AttentionPoseController {
  const bodyEl = svg.querySelector<SVGGraphicsElement>("#Anim_Sway");
  const antennaEl = svg.querySelector<SVGGraphicsElement>("#Anim_Antenna");
  let body: PoseTransition | null = null;
  let antenna: PoseTransition | null = null;
  let target: AttentionPose = NEUTRAL_ATTENTION_POSE;
  const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

  // 今見えている姿勢（delay 中は from、補間中は ease-out 近似の途中位置）
  const visible = (tr: PoseTransition | null): AttentionPose => {
    if (!tr) return NEUTRAL_ATTENTION_POSE;
    const t = tr.ms > 0 ? (now() - tr.startedAt - tr.delayMs) / tr.ms : 1;
    if (t <= 0) return tr.from;
    if (t >= 1) return tr.to;
    return interpolateAttentionPose(tr.from, tr.to, 1 - (1 - t) * (1 - t));
  };
  const cancel = (tr: PoseTransition | null) => {
    try {
      tr?.animation?.cancel();
    } catch {
      /* noop */
    }
  };
  const run = (
    el: SVGGraphicsElement | null,
    prev: PoseTransition | null,
    to: AttentionPose,
    delayMs: number,
    ms: number,
    keyframes: (from: AttentionPose, to: AttentionPose) => Keyframe[],
    easing: string,
  ): PoseTransition | null => {
    const from = visible(prev);
    cancel(prev);
    if (!canAnimate(el)) return null;
    if (isNeutralAttentionPose(from) && isNeutralAttentionPose(to)) return null;
    let animation: Animation | null = null;
    try {
      animation = el.animate(keyframes(from, to), {
        duration: Math.max(1, ms),
        delay: delayMs,
        easing,
        fill: "both",
        composite: "add",
      });
      animation.persist?.();
    } catch {
      // composite 未対応などでは身体連動なし（視線だけは動く）
      return null;
    }
    return { from, to, startedAt: now(), delayMs, ms, animation };
  };
  const clear = () => {
    cancel(body);
    cancel(antenna);
    body = null;
    antenna = null;
    target = NEUTRAL_ATTENTION_POSE;
  };

  return {
    set(pose, tuning, animate) {
      if (!tuning || !animate) {
        clear();
        return;
      }
      const same =
        pose.tilt === target.tilt &&
        pose.leanX === target.leanX &&
        pose.leanY === target.leanY &&
        pose.sy === target.sy &&
        pose.antenna === target.antenna;
      if (same) return;
      target = pose;
      // 対象を見る時と基底へ戻る時でタイミングを分ける（どちらも目→体→アンテナの順）
      const timing: EmbodiedAttentionTiming = isNeutralAttentionPose(pose) ? tuning.release : tuning.attend;
      body = run(bodyEl, body, pose, timing.bodyDelayMs, timing.bodyMs, attentionBodyKeyframes, "ease-out");
      antenna = run(
        antennaEl,
        antenna,
        pose,
        timing.antennaDelayMs,
        timing.antennaMs,
        (from, to) => attentionAntennaKeyframes(from.antenna, to.antenna),
        "linear",
      );
    },
    dispose: clear,
  };
}

// ---- 視線（gaze controller） ----

const GAZE_SELECTORS = ["#Pupil_L", "#Pupil_R", "#EyeHighlight_L", "#EyeHighlight_R"];

type GazeController = {
  /**
   * Idle の状態を反映する。profile.gaze が null（compact）なら視線は中央固定。
   * animate=false（reduced-motion・停止中）はランダム視線を止め、静的な位置だけを残す。
   */
  configure(profile: ReturnType<typeof getIdleProfile>, animate: boolean): void;
  /** 見る対象を変える。Living Idle の他のアニメーションには触れない。 */
  setTarget(target: MochitGazeTarget): void;
  /** 今見えている基底視線（補間中なら途中位置） */
  getBaseOffset(): GazeOffset;
  /**
   * Macro Idle の一時視線（add）の再生中は true。ランダム視線の移動だけを見送り、
   * 乱数リズム（スケジューラ）は作り直さない。
   */
  holdRandom(hold: boolean): void;
  /** Sleep 中はランダム視線を止めて中央で休ませる（Semantic Attention は優先してそのまま） */
  setSleeping(sleeping: boolean): void;
  dispose(): void;
};

/** Sleep に入る時、視線を中央へ戻す補間時間 */
const SLEEP_GAZE_SETTLE_MS = 500;

/**
 * 瞳（とハイライト）の基底transformを一手に持つ命令的コントローラー。
 * 基底値＝インラインstyle なので、リアクションの gaze トラック（composite:"add"）は
 * 常にこの上へ乗り、終了すれば現在の視線（random/semantic）へ自然に戻る。
 */
function createGazeController(svg: SVGSVGElement): GazeController {
  const nodes = GAZE_SELECTORS.map((sel) => svg.querySelector<SVGGraphicsElement>(sel)).filter(
    (el): el is SVGGraphicsElement => el !== null,
  );
  let profile = getIdleProfile(false);
  let animate = false;
  let target: MochitGazeTarget = { kind: "random" };
  let current: GazeOffset = GAZE_CENTER;
  let timer: number | null = null;
  let held = false;
  let sleeping = false;
  // 進行中の補間（次の切替を途中位置から始めるため）
  let moving: { from: GazeOffset; to: GazeOffset; startedAt: number; ms: number; animations: Animation[] } | null =
    null;
  // 視線に追従する身体連動（profile.embody を持つ floating だけが動く）
  const pose = createAttentionPoseController(svg);

  const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());
  const clearTimer = () => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
  };
  const cancelMove = () => {
    if (!moving) return;
    for (const a of moving.animations) {
      try {
        a.cancel();
      } catch {
        /* noop */
      }
    }
    moving = null;
  };
  // 現在見えている基底位置（補間中なら途中位置）
  const visibleOffset = (): GazeOffset => {
    if (!moving) return current;
    const t = moving.ms > 0 ? Math.min(1, (now() - moving.startedAt) / moving.ms) : 1;
    if (t >= 1) return moving.to;
    const e = 1 - (1 - t) * (1 - t); // ease-out 近似
    return {
      x: moving.from.x + (moving.to.x - moving.from.x) * e,
      y: moving.from.y + (moving.to.y - moving.from.y) * e,
    };
  };
  const setBase = (value: string) => {
    for (const el of nodes) el.style.transform = value;
  };
  const moveTo = (to: GazeOffset, ms: number) => {
    const from = visibleOffset();
    cancelMove();
    // 基準スタイルを最終値にしておくと fill なしでもホールドされる
    setBase(offsetTransform(to.x, to.y));
    current = to;
    if (ms <= 0 || (from.x === to.x && from.y === to.y)) return;
    const animations: Animation[] = [];
    for (const el of nodes) {
      if (!canAnimate(el)) continue;
      animations.push(
        el.animate([{ transform: offsetTransform(from.x, from.y) }, { transform: offsetTransform(to.x, to.y) }], {
          duration: ms,
          easing: "ease-out",
        }),
      );
    }
    moving = { from, to, startedAt: now(), ms, animations };
  };
  // 従来の Living Idle のランダム視線（random のときだけ動く）
  const scheduleRandom = () => {
    const gaze = profile.gaze;
    if (!gaze) return;
    timer = window.setTimeout(() => {
      timer = null;
      const next = nextGazeTarget(profile);
      if (!held) moveTo(next, gaze.moveMs);
      scheduleRandom();
    }, nextGazeHoldMs(profile));
  };

  // 直前の apply が Semantic Attention（点を見ていた）か
  let semantic = false;
  const apply = () => {
    const leavingSemantic = semantic && target.kind === "random";
    semantic = target.kind === "point";
    const gaze = profile.gaze;
    if (!gaze || nodes.length === 0) {
      // compact: 視線は中央固定（マークアップ既定値）
      clearTimer();
      cancelMove();
      setBase("");
      current = GAZE_CENTER;
      pose.set(NEUTRAL_ATTENTION_POSE, null, false);
      return;
    }
    if (target.kind === "random") {
      if (!animate) {
        // 停止時は従来どおり中央（マークアップ既定値）の静止ポーズ
        clearTimer();
        cancelMove();
        setBase("");
        current = GAZE_CENTER;
        pose.set(NEUTRAL_ATTENTION_POSE, null, false);
        return;
      }
      // Semantic から戻った時は、目が先に動き、体・アンテナが遅れて基底へ戻る
      pose.set(NEUTRAL_ATTENTION_POSE, profile.embody, animate);
      if (sleeping) {
        // Sleep: ランダム視線を止め、中央でじっとする
        clearTimer();
        moveTo(GAZE_CENTER, SLEEP_GAZE_SETTLE_MS);
        return;
      }
      // 身体連動あり（floating）は Semantic から戻る時も目が先に正面へ戻り、体・アンテナが続く。
      // 身体連動なし（full）は従来どおり今の位置からランダム視線を再開する。
      if (timer === null && profile.embody && leavingSemantic) moveTo(GAZE_CENTER, gaze.moveMs);
      // 既に走っていれば乱数リズムを崩さない。Semantic から戻った時は今の位置から再開する。
      if (timer === null) {
        if (!moving) setBase(offsetTransform(current.x, current.y));
        scheduleRandom();
      }
      return;
    }
    // Semantic Attention: ランダム視線は止め、指定位置を見続ける
    clearTimer();
    const offset = attentionPointToGazeOffset(target.point, gaze);
    moveTo(offset, animate ? gaze.moveMs : 0);
    // 目が先に対象を見て、体→アンテナが遅れて対象側へ向く（reduced-motion・停止中は目だけ）
    const embody = profile.embody;
    pose.set(embody ? attentionPoseForGaze(offset, gaze, embody) : NEUTRAL_ATTENTION_POSE, embody, animate);
  };

  return {
    configure(nextProfile, nextAnimate) {
      if (profile === nextProfile && animate === nextAnimate) return;
      if (profile !== nextProfile) clearTimer(); // 周期・振幅が変わるので組み直す
      profile = nextProfile;
      animate = nextAnimate;
      apply();
    },
    setTarget(next) {
      target = next;
      apply();
    },
    getBaseOffset() {
      return visibleOffset();
    },
    holdRandom(hold) {
      held = hold;
    },
    setSleeping(next) {
      if (sleeping === next) return;
      sleeping = next;
      apply();
    },
    dispose() {
      clearTimer();
      cancelMove();
      pose.dispose();
    },
  };
}


// ---- 平常表情（Behavior emotion） ----

const RESTING_MOUTHS = Object.keys(MOCHIT_RESTING_MOUTH_ELEMENT_IDS) as MochitRestingMouth[];
/** 平常表情の切替を補間する時間（reduced-motion・初回は即時） */
const RESTING_TRANSITION_MS = 180;
/** まぶたが下がる（sleepy へ入る）時の補間時間。とろんと閉じていく */
const SLEEPY_EYELID_CLOSE_MS = 700;

// 現在の見た目から新しい基底値へ短時間で補間する（fill:"none"＝終了後は基底値そのもの）。
function transitionFrom(el: SVGGraphicsElement, from: Keyframe, to: Keyframe, durationMs: number): void {
  if (durationMs <= 0 || typeof el.animate !== "function") return;
  try {
    el.animate([from, to], { duration: durationMs, easing: "ease-out", fill: "none" });
  } catch {
    /* 補間できなくても基底値は反映済み */
  }
}

/** 平常口をインラインstyleへ反映。neutral はマークアップ既定値（style無し）に戻す。 */
function applyRestingMouth(svg: SVGSVGElement, mouth: MochitRestingMouth, transitionMs: number): void {
  for (const candidate of RESTING_MOUTHS) {
    const el = svg.querySelector<SVGGraphicsElement>(`#${MOCHIT_RESTING_MOUTH_ELEMENT_IDS[candidate]}`);
    if (!el) continue;
    const from = transitionMs > 0 ? getComputedStyle(el).opacity : null;
    el.style.opacity = mouth === "neutral" ? "" : candidate === mouth ? "1" : "0";
    if (from !== null) transitionFrom(el, { opacity: from }, { opacity: getComputedStyle(el).opacity }, transitionMs);
  }
}

/**
 * 平常時のまぶたをインラインstyleへ反映。Idle 実行中はまぶたが常に制御下
 * （opacity:1・scaleY=rest）。停止中は閉じ量があるときだけ表示し、無ければ
 * マークアップ既定値（不可視）に戻す。
 */
function applyRestingEyelids(
  svg: SVGSVGElement,
  rest: number,
  compact: boolean,
  idleRunning: boolean,
  transitionMs: number,
): void {
  const p = getIdleProfile(compact);
  for (const [sel, cx] of [
    ["#Eyelid_L", p.blink.cxL],
    ["#Eyelid_R", p.blink.cxR],
  ] as const) {
    const el = svg.querySelector<SVGGraphicsElement>(sel);
    if (!el) continue;
    const before = transitionMs > 0 ? getComputedStyle(el) : null;
    // 不可視（マークアップ既定）のまぶたは「全開」扱い。computed の none は全閉なので使わない。
    const fromTransform =
      before && Number(before.opacity) > 0 && before.transform && before.transform !== "none"
        ? before.transform
        : eyelidRestTransform(p, cx, 0);
    const visible = idleRunning || rest > 0;
    if (visible) {
      el.style.opacity = "1";
      el.style.transform = eyelidRestTransform(p, cx, rest);
      // まぶたの下がり/上がりだけを補間する
      if (before) transitionFrom(el, { transform: fromTransform }, { transform: el.style.transform }, transitionMs);
    } else {
      el.style.transform = "";
      el.style.opacity = "";
    }
  }
}

// ---- 学習イベントリアクション ----

// リアクション仕様のターゲットID → SVG内セレクタ。body は外側<svg>自身。
const REACTION_TARGET_SELECTORS: Record<Exclude<ReactionTargetId, "body">, string[]> = {
  armL: ["#Arm_L"],
  armR: ["#Arm_R"],
  coreGlow: ["#Core_Glow"],
  mouthNeutral: ["#Mouth_Neutral"],
  mouthSmile: ["#Mouth_Smile"],
  mouthThinking: ["#Mouth_Thinking"],
  mouthOpen: ["#Mouth_Open"],
  gaze: ["#Pupil_L", "#Pupil_R", "#EyeHighlight_L", "#EyeHighlight_R"],
  antenna: ["#Anim_Antenna"],
};

type RunningReaction = {
  /** 実行中アニメーションと対象要素（settle用に対で保持） */
  entries: Array<{ el: Element; animation: Animation; composite: "replace" | "add" }>;
  endTimer: number;
};

/**
 * リアクション仕様をDOMへ適用する。全キーフレームが基底状態で始まり基底状態で
 * 終わる契約（fill:"none"）のため、自然終了時は何も片付けなくてもIdleへ戻る。
 */
function startReaction(
  svg: SVGSVGElement,
  spec: Pick<ReactionSpec, "totalMs" | "tracks">,
  onEnd: () => void,
): RunningReaction {
  const entries: RunningReaction["entries"] = [];
  for (const track of spec.tracks) {
    const els: Element[] =
      track.target === "body"
        ? [svg]
        : REACTION_TARGET_SELECTORS[track.target].map((sel) => svg.querySelector(sel)).filter((el): el is Element => el !== null);
    for (const el of els) {
      if (typeof (el as SVGGraphicsElement).animate !== "function") continue;
      const composite = track.composite ?? "replace";
      try {
        const animation = (el as SVGGraphicsElement).animate(track.keyframes, {
          duration: spec.totalMs,
          easing: "linear", // 区間ごとのeasingはキーフレーム側で指定済み
          fill: "none",
          composite,
        });
        entries.push({ el, animation, composite });
      } catch (error) {
        // composite未対応などで個別トラックが失敗しても他のトラックは続行
        if (isDev) console.warn(`[Mochit] リアクショントラック ${track.target} の適用に失敗しました。`, error);
      }
    }
  }
  const endTimer = window.setTimeout(onEnd, spec.totalMs);
  return { entries, endTimer };
}

/**
 * 進行中リアクションを打ち切る。replace系トラックは現在の見た目を捕捉してから
 * 短時間で基底状態へ戻し（settle）、キャンセルによる位置飛びを防ぐ。
 * add系（gaze/antenna）は上乗せ量が小さいためそのままキャンセルする。
 */
function stopReaction(running: RunningReaction, settleMs: number): void {
  clearTimeout(running.endTimer);
  for (const { el, animation, composite } of running.entries) {
    if (animation.playState !== "running" && animation.playState !== "paused") continue;
    if (composite === "add" || settleMs <= 0) {
      try {
        animation.cancel();
      } catch {
        /* noop */
      }
      continue;
    }
    try {
      const style = getComputedStyle(el);
      const from: Keyframe = { transform: style.transform, opacity: style.opacity };
      animation.cancel();
      // 基底状態（インラインstyle・属性値）へ約settleMsでなめらかに戻す
      (el as SVGGraphicsElement).animate([from, {}], {
        duration: settleMs,
        easing: "ease-out",
        fill: "none",
      });
    } catch {
      try {
        animation.cancel();
      } catch {
        /* noop */
      }
    }
  }
}

export default function MochitSvg({
  growthStage,
  reducedMotion,
  compact,
  reactionProfile,
  ariaLabel,
  onReady,
  onLoadFailed,
  className = "",
  forceFailure = false,
  registerTriggerFirer,
  emotion = "neutral",
  attention = "random",
  attentionPoint,
  macroIdleRequest,
  sleeping = false,
}: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [inViewport, setInViewport] = useState(true);
  const [documentHidden, setDocumentHidden] = useState(false);
  const [failed, setFailed] = useState(false);

  // コールバックは最新参照を保持（effect依存から外す）
  const onReadyRef = useRef(onReady);
  const onFailedRef = useRef(onLoadFailed);
  useEffect(() => {
    onReadyRef.current = onReady;
    onFailedRef.current = onLoadFailed;
  });

  // マークアップの注入と描画健全性の確認。critical ノードが無ければ描画失敗扱い。
  // 注入は dangerouslySetInnerHTML ではなく初回マウント時に一度だけ命令的に行う。
  // React の再レンダーで子要素が作り直されると、子要素上で走っている
  // WAAPIアニメーション（Living Idle・リアクション）が全て消えてしまうため、
  // 子要素はReactの管理外に置く。
  useEffect(() => {
    const svg = svgRef.current;
    const fail = (reason: string) => {
      if (isDev) console.warn(`[Mochit] SVG描画に失敗しました（${reason}）。WebPフォールバックへ切替えます。`);
      setFailed(true);
      onFailedRef.current?.(new Error(`mochit svg: ${reason}`));
    };
    try {
      if (forceFailure) return fail("forceFailure");
      if (!svg) return fail("no svg element");
      if (!svg.firstElementChild) svg.innerHTML = MOCHIT_SVG_MARKUP;
      if (!svg.querySelector("#Mochit_Root") || !svg.querySelector("#Anim_Breathe")) {
        return fail("critical nodes missing");
      }
      onReadyRef.current?.();
    } catch (error) {
      fail(error instanceof Error ? error.message : "unknown");
    }
  }, [forceFailure]);

  // ビューポート外での停止
  useEffect(() => {
    const el = svgRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => {
      setInViewport(entries[0]?.isIntersecting ?? true);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // タブ非表示での停止
  useEffect(() => {
    const onVisibilityChange = () => setDocumentHidden(document.hidden);
    onVisibilityChange();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  const active = !failed && !reducedMotion && inViewport && !documentHidden;
  // 84px の常時表示版。視線の振幅・身体連動・Macro Idle の頻度/振幅だけを強める（compact が優先）
  const floating = reactionProfile === "floating" && !compact;

  // ---- 平常表情 ----
  // desired: 最新の emotion から導いた平常表情。appliedMouth: 実際にインラインstyleへ
  // 反映済みの平常口（リアクションの口トラックはこれを基底として付け替える）。
  const expression = useMemo(() => getMochitRestingExpression(emotion, { compact }), [emotion, compact]);
  const desiredRef = useRef<MochitRestingExpression>(expression);
  const appliedMouthRef = useRef<MochitRestingMouth | null>(null);
  const idleRunningRef = useRef(false);
  const transitionMsRef = useRef(0);
  useEffect(() => {
    transitionMsRef.current = reducedMotion ? 0 : RESTING_TRANSITION_MS;
  });
  const runningRef = useRef<RunningReaction | null>(null);

  // リアクションが走っていない時だけ平常口を反映する（リアクション優先）。
  // 走行中の変更はリアクション終了時に反映される。
  const syncRestingMouth = (transitionMs: number) => {
    const svg = svgRef.current;
    if (!svg || runningRef.current) return;
    const mouth = desiredRef.current.mouth;
    if (appliedMouthRef.current === mouth) return;
    // 初回反映（マウント直後）は補間しない
    applyRestingMouth(svg, mouth, appliedMouthRef.current === null ? 0 : transitionMs);
    appliedMouthRef.current = mouth;
  };
  const syncRestingMouthRef = useRef(syncRestingMouth);
  useEffect(() => {
    syncRestingMouthRef.current = syncRestingMouth;
  });

  const eyelidsAppliedRef = useRef(false);
  const appliedEyelidRestRef = useRef(0);
  useEffect(() => {
    desiredRef.current = expression;
    const svg = svgRef.current;
    if (failed || !svg || !svg.firstElementChild) return;
    const transitionMs = transitionMsRef.current;
    // まぶたが下がる（眠くなる）時はゆっくり、開く（起きる）時は通常の速さ
    const closing = expression.eyelidRest > appliedEyelidRestRef.current;
    const eyelidMs = closing && transitionMs > 0 ? SLEEPY_EYELID_CLOSE_MS : transitionMs;
    applyRestingEyelids(
      svg,
      expression.eyelidRest,
      compact,
      idleRunningRef.current,
      eyelidsAppliedRef.current ? eyelidMs : 0,
    );
    eyelidsAppliedRef.current = true;
    appliedEyelidRestRef.current = expression.eyelidRest;
    syncRestingMouthRef.current(transitionMs);
  }, [expression, compact, failed]);

  // ---- 視線（Semantic Attention） ----
  // gaze controller は Living Idle とは独立に1つだけ作り、attention の変更はここだけに届ける。
  const gazeRef = useRef<GazeController | null>(null);
  const getGaze = (): GazeController | null => {
    const svg = svgRef.current;
    if (gazeRef.current) return gazeRef.current;
    if (failed || !svg || !svg.firstElementChild) return null;
    gazeRef.current = createGazeController(svg);
    return gazeRef.current;
  };
  const getGazeRef = useRef(getGaze);
  useEffect(() => {
    getGazeRef.current = getGaze;
  });
  // point はオブジェクト同一性ではなく数値で比較する
  const pointX = attentionPoint?.x;
  const pointY = attentionPoint?.y;
  const gazeTarget = useMemo(
    () =>
      resolveMochitGazeTarget(
        attention,
        pointX === undefined && pointY === undefined ? undefined : { x: pointX as number, y: pointY as number },
      ),
    [attention, pointX, pointY],
  );
  // 見る対象 → Idle の稼働状態 の順に反映する。マウント直後は静的に目標位置へ置いてから
  // 動きを有効にするので、初期表示で視線がすべり込まない。
  useEffect(() => {
    getGazeRef.current()?.setTarget(gazeTarget);
  }, [gazeTarget, failed]);
  useEffect(() => {
    const svg = svgRef.current;
    const gaze = getGazeRef.current();
    if (!svg || !gaze) return;
    // WAAPI 非対応環境では静的な視線だけ
    gaze.configure(getIdleProfile(compact, floating), active && typeof svg.animate === "function");
  }, [active, compact, floating, failed]);
  useEffect(
    () => () => {
      gazeRef.current?.dispose();
      gazeRef.current = null;
    },
    [],
  );

  // ---- Sleep ----
  // Micro Idle は作り直さず、走っているループの速さ・振幅と沈み込みだけを切り替える。
  const idleHandleRef = useRef<IdleHandle | null>(null);
  const sleepingRef = useRef(sleeping);
  useEffect(() => {
    sleepingRef.current = sleeping;
    const reduced = transitionMsRef.current === 0;
    idleHandleRef.current?.setSleepy(
      sleeping,
      reduced ? 0 : sleeping ? MOCHIT_SLEEP_IDLE.sinkInMs : MOCHIT_SLEEP_IDLE.sinkOutMs,
    );
    getGazeRef.current()?.setSleeping(sleeping);
  }, [sleeping, failed]);

  useEffect(() => {
    if (!active) return;
    const svg = svgRef.current;
    if (!svg) return;
    // WAAPI 非対応環境では静止SVGのまま（フォールバックはしない＝描画自体は成功）
    if (typeof svg.animate !== "function") return;
    let handle: IdleHandle | undefined;
    try {
      handle = startIdle(svg, compact, () => desiredRef.current.eyelidRest);
      idleRunningRef.current = true;
      idleHandleRef.current = handle;
      // Sleep 中に再開した場合（タブ復帰など）は静かな状態から始める
      if (sleepingRef.current) handle.setSleepy(true, 0);
    } catch (error) {
      if (isDev) console.warn("[Mochit] 待機アニメーションの初期化に失敗しました。静止表示にします。", error);
    }
    const stop = handle?.stop;
    return () => {
      stop?.();
      if (idleHandleRef.current === handle) idleHandleRef.current = null;
      idleRunningRef.current = false;
      // 停止後も平常時のまぶた（sleepy の半目など）は静的に残す
      if (stop) applyRestingEyelids(svg, desiredRef.current.eyelidRest, compact, false, 0);
    };
  }, [active, compact]);

  // ---- Macro Idle ----
  // スケジューラは1つだけ作り、条件の変化（稼働/compact/attention/Reaction）だけを届ける。
  // 再生は外側<svg>・腕・視線(add)・アンテナ(add)への有限アニメで、Micro Idle には触れない。
  const macroRef = useRef<MacroIdleController | null>(null);
  const floatingRef = useRef(floating);
  useEffect(() => {
    floatingRef.current = floating;
  });
  const getMacro = (): MacroIdleController | null => {
    if (macroRef.current) return macroRef.current;
    const svg = svgRef.current;
    if (failed || !svg || !svg.firstElementChild) return null;
    const play: MacroIdlePlayer = (behavior, durationMs, onEnd) => {
      const target = svgRef.current;
      if (!target || typeof target.animate !== "function") return null;
      const gaze = gazeRef.current;
      const spec = buildMacroIdleSpec(behavior, {
        durationMs,
        gazeBase: gaze?.getBaseOffset(),
        floating: floatingRef.current,
      });
      const holdGaze = macroIdleMovesGaze(spec);
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        if (holdGaze) gaze?.holdRandom(false);
        delete target.dataset.macroIdle;
      };
      if (holdGaze) gaze?.holdRandom(true);
      let running: RunningReaction;
      try {
        running = startReaction(target, spec, () => {
          finish();
          onEnd();
        });
      } catch (error) {
        finish();
        if (isDev) console.warn("[Mochit] Macro Idle の再生に失敗しました。", error);
        return null;
      }
      // 検証・デバッグ用に再生中の Behavior を属性で示す（React はこの属性を管理しない）
      target.dataset.macroIdle = behavior;
      return {
        stop(settleMs) {
          stopReaction(running, settleMs);
          finish();
        },
      };
    };
    macroRef.current = createMacroIdleController({ play });
    return macroRef.current;
  };
  const getMacroRef = useRef(getMacro);
  useEffect(() => {
    getMacroRef.current = getMacro;
  });
  useEffect(() => {
    const svg = svgRef.current;
    getMacroRef.current()?.update({
      active: active && !!svg && typeof svg.animate === "function",
      reducedMotion,
      compact,
      attention,
      sleeping,
      floating,
    });
  }, [active, reducedMotion, compact, attention, sleeping, floating, failed]);
  // マウント時点で既にある要求は再生しない（再マウントで古い要求が再生されないように）
  const macroRequestId = macroIdleRequest?.id;
  const macroRequestBehavior = macroIdleRequest?.behavior;
  const handledMacroRequestRef = useRef(macroRequestId);
  useEffect(() => {
    if (macroRequestId === undefined || !macroRequestBehavior) return;
    if (handledMacroRequestRef.current === macroRequestId) return;
    handledMacroRequestRef.current = macroRequestId;
    getMacroRef.current()?.playNow(macroRequestBehavior);
  }, [macroRequestId, macroRequestBehavior]);
  useEffect(
    () => () => {
      macroRef.current?.dispose();
      macroRef.current = null;
    },
    [],
  );

  // ---- リアクション再生 ----
  // reduced-motion では縮退版（表情/Core発光のみ）を再生するため gating には含めない。
  const reactionGated = failed || !inViewport || documentHidden;
  const reactionEnvRef = useRef({
    reducedMotion,
    reactionProfile,
    gated: reactionGated,
  });
  useEffect(() => {
    reactionEnvRef.current = {
      reducedMotion,
      reactionProfile,
      gated: reactionGated,
    };
  });
  const pendingStartRef = useRef<number | null>(null);

  useEffect(() => {
    if (!registerTriggerFirer) return;
    registerTriggerFirer((trigger) => {
      const svg = svgRef.current;
      if (!svg || typeof svg.animate !== "function") return;
      const env = reactionEnvRef.current;
      if (env.gated) return;
      const event = MOCHIT_TRIGGER_EVENTS[trigger];
      if (!event) return;
      const baseSpec = buildReactionSpec(event, {
        profile: env.reactionProfile,
        reducedMotion: env.reducedMotion,
      });
      if (!baseSpec) return;
      // Reaction > Macro Idle: 再生中の Macro を止め、Reaction 終了まで自動発火しない
      macroRef.current?.update({ reacting: true });
      if (pendingStartRef.current !== null) {
        clearTimeout(pendingStartRef.current);
        pendingStartRef.current = null;
      }
      const begin = () => {
        pendingStartRef.current = null;
        const target = svgRef.current;
        if (!target || reactionEnvRef.current.gated) {
          macroRef.current?.update({ reacting: false });
          return;
        }
        // 開始直前に平常口を確定し、リアクションの口の基底をそれに付け替える
        syncRestingMouthRef.current(0);
        const spec = rebaseReactionMouths(baseSpec, appliedMouthRef.current ?? "neutral");
        try {
          runningRef.current = startReaction(target, spec, () => {
            runningRef.current = null;
            // Macro Idle は新しい待ち時間（8秒以上）から数え直す
            macroRef.current?.update({ reacting: false });
            // リアクション中に emotion が変わっていれば、終了後に新しい平常表情へ移る
            syncRestingMouthRef.current(transitionMsRef.current);
          });
        } catch (error) {
          macroRef.current?.update({ reacting: false });
          if (isDev) console.warn("[Mochit] リアクションの再生に失敗しました。", error);
        }
      };
      if (runningRef.current) {
        // 置換: 進行中の見た目から短時間で基底へ戻してから新リアクションを開始
        const settleMs = 90;
        stopReaction(runningRef.current, settleMs);
        runningRef.current = null;
        pendingStartRef.current = window.setTimeout(begin, settleMs);
      } else {
        begin();
      }
    });
    return () => {
      registerTriggerFirer(null);
    };
  }, [registerTriggerFirer]);

  // 非表示・失敗時とアンマウント時はリアクションを即時停止する。
  useEffect(() => {
    if (!reactionGated) return;
    if (pendingStartRef.current !== null) {
      clearTimeout(pendingStartRef.current);
      pendingStartRef.current = null;
    }
    if (runningRef.current) {
      stopReaction(runningRef.current, 0);
      runningRef.current = null;
    }
    macroRef.current?.update({ reacting: false });
    syncRestingMouthRef.current(0);
  }, [reactionGated]);
  useEffect(
    () => () => {
      if (pendingStartRef.current !== null) clearTimeout(pendingStartRef.current);
      if (runningRef.current) stopReaction(runningRef.current, 0);
    },
    [],
  );

  if (failed) return null;

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 1024 1024"
      role="img"
      aria-label={ariaLabel}
      style={{ overflow: "visible", transformOrigin: MOCHIT_BODY_TRANSFORM_ORIGIN }}
      className={`h-full w-full mochit-growth-${growthStage} ${className}`}
    />
    // 子要素（キャラクター本体のマークアップ）はマウント時effectで一度だけ注入する
  );
}
