"use client";

// レイヤー分割済みSVGを React 上で直接アニメーションさせる無料方式の描画レイヤー。
// 「生きている待機（Living Idle）」に加え、学習イベントのリアクションを再生する:
//   - Idle: ゆるやかな呼吸 / 小さな左右のゆれ / 不規則なまばたき / 小さな視線移動 / アンテナの遅れ追従
//   - リアクション: mochitReactionAnimation.ts の仕様を有限WAAPIアニメとして適用。
//     本体の動きは外側<svg>のCSS transform（Idleの内部グループとは別要素）なので
//     Idleと自然に合成され、終了時は恒等変換＝位置飛びなしでIdleへ戻る。
//     gaze/antenna は composite:"add" でIdleの変換に上乗せする。
//
// 契約:
//   - onReady: SVG が正しく描画できた（親はWebPフォールバックを外してよい）
//   - onLoadFailed: 読み込み/描画に失敗（親はWebPへフォールバック）
//   - reduced-motion ではIdle停止＋リアクションは表情/Core発光のみの縮退版
//   - ビューポート外 / タブ非表示 では停止して静止ポーズを保つ
//   - registerTriggerFirer: useMochitController のトリガー発火を受け取る口（Riveと同じ契約）

import { useEffect, useRef, useState } from "react";
import { MOCHIT_SVG_MARKUP } from "./mochitSvgMarkup";
import { MOCHIT_TRIGGER_EVENTS } from "./mochitEvents";
import type { MochitRiveTriggerInput } from "./mochitTypes";
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
  shouldDoubleBlink,
  swayKeyframes,
  type GazeOffset,
} from "./mochitIdleAnimation";

const isDev = process.env.NODE_ENV !== "production";

type Props = {
  growthStage: number;
  reducedMotion: boolean;
  compact: boolean;
  ariaLabel: string;
  onReady?: () => void;
  onLoadFailed?: (error: unknown) => void;
  className?: string;
  /** devプレビュー用: 描画失敗を強制してWebPフォールバックを確認する */
  forceFailure?: boolean;
  /** useMochitController のトリガー発火を受け取る（Riveと同じ契約） */
  registerTriggerFirer?: (firer: ((trigger: MochitRiveTriggerInput) => void) | null) => void;
};

function canAnimate(el: SVGGraphicsElement | null): el is SVGGraphicsElement {
  return !!el && typeof el.animate === "function";
}

// 待機アニメーション一式を DOM へ適用し、停止関数を返す。
function startIdle(svg: SVGSVGElement, compact: boolean): () => void {
  const p = getIdleProfile(compact);
  const loops: Animation[] = [];
  const timers: number[] = [];
  const q = (sel: string) => svg.querySelector<SVGGraphicsElement>(sel);

  const loop = (el: SVGGraphicsElement | null, keyframes: Keyframe[], durationMs: number, delayMs = 0) => {
    if (!canAnimate(el)) return;
    loops.push(
      el.animate(keyframes, {
        duration: durationMs,
        easing: "ease-in-out",
        direction: "alternate",
        iterations: Infinity,
        delay: delayMs,
      }),
    );
  };

  // 連続モーション
  const sway = q("#Anim_Sway");
  const breathe = q("#Anim_Breathe");
  const antenna = q("#Anim_Antenna");
  loop(breathe, breatheKeyframes(p), p.breathe.durationMs);
  loop(sway, swayKeyframes(p), p.sway.durationMs);
  loop(antenna, antennaKeyframes(p), p.antenna.durationMs, p.antenna.delayMs);

  // まばたき（不規則な間隔・時々ダブル）
  const eyelids = [
    { el: q("#Eyelid_L"), cx: p.blink.cxL },
    { el: q("#Eyelid_R"), cx: p.blink.cxR },
  ].filter((e): e is { el: SVGGraphicsElement; cx: number } => canAnimate(e.el));

  for (const { el, cx } of eyelids) {
    // まぶたは静止時 scaleY≈0 で不可視。マークアップの opacity:0 を外して制御下に置く。
    el.style.opacity = "1";
    el.style.transform = eyelidRestTransform(p, cx);
  }
  const blinkOnce = () => {
    for (const { el, cx } of eyelids) {
      el.animate(blinkKeyframes(p, cx), { duration: blinkDurationMs(p), easing: "ease-in-out" });
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

  // 視線移動（clipで瞳が白目からはみ出さない）。compact では無効。
  const gazeNodes = ["#Pupil_L", "#Pupil_R", "#EyeHighlight_L", "#EyeHighlight_R"]
    .map(q)
    .filter(canAnimate);
  if (p.gaze && gazeNodes.length > 0) {
    for (const el of gazeNodes) el.style.transform = offsetTransform(0, 0);
    let current: GazeOffset = GAZE_CENTER;
    const scheduleGaze = () => {
      const t = window.setTimeout(() => {
        const target = nextGazeTarget(p);
        for (const el of gazeNodes) {
          el.animate(
            [{ transform: offsetTransform(current.x, current.y) }, { transform: offsetTransform(target.x, target.y) }],
            { duration: p.gaze!.moveMs, easing: "ease-out" },
          );
          // 基準スタイルを最終値にしておくと fill なしでもホールドされる
          el.style.transform = offsetTransform(target.x, target.y);
        }
        current = target;
        scheduleGaze();
      }, nextGazeHoldMs(p));
      timers.push(t);
    };
    scheduleGaze();
  }

  // 停止＝静止ポーズへ戻す（まばたき途中で固まらないように opacity も戻す）。
  return () => {
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
    for (const el of gazeNodes) el.style.transform = "";
  };
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
function startReaction(svg: SVGSVGElement, spec: ReactionSpec, onEnd: () => void): RunningReaction {
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
  ariaLabel,
  onReady,
  onLoadFailed,
  className = "",
  forceFailure = false,
  registerTriggerFirer,
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

  useEffect(() => {
    if (!active) return;
    const svg = svgRef.current;
    if (!svg) return;
    // WAAPI 非対応環境では静止SVGのまま（フォールバックはしない＝描画自体は成功）
    if (typeof svg.animate !== "function") return;
    let stop: (() => void) | undefined;
    try {
      stop = startIdle(svg, compact);
    } catch (error) {
      if (isDev) console.warn("[Mochit] 待機アニメーションの初期化に失敗しました。静止表示にします。", error);
    }
    return () => stop?.();
  }, [active, compact]);

  // ---- リアクション再生 ----
  // reduced-motion では縮退版（表情/Core発光のみ）を再生するため gating には含めない。
  const reactionGated = failed || !inViewport || documentHidden;
  const reactionEnvRef = useRef({ reducedMotion, compact, gated: reactionGated });
  useEffect(() => {
    reactionEnvRef.current = { reducedMotion, compact, gated: reactionGated };
  });
  const runningRef = useRef<RunningReaction | null>(null);
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
      const spec = buildReactionSpec(event, { compact: env.compact, reducedMotion: env.reducedMotion });
      if (!spec) return;
      if (pendingStartRef.current !== null) {
        clearTimeout(pendingStartRef.current);
        pendingStartRef.current = null;
      }
      const begin = () => {
        pendingStartRef.current = null;
        const target = svgRef.current;
        if (!target || reactionEnvRef.current.gated) return;
        try {
          runningRef.current = startReaction(target, spec, () => {
            runningRef.current = null;
          });
        } catch (error) {
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
