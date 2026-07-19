"use client";

// レイヤー分割済みSVGを React 上で直接アニメーションさせる無料方式の描画レイヤー。
// Rive の代わりに「生きている待機（Living Idle）」だけを実装する:
//   - ゆるやかな呼吸 / 小さな左右のゆれ / 不規則なまばたき / 小さな視線移動 / アンテナの遅れ追従
// タイミングにはランダム性を持たせ、短い固定ループに見えないようにしている。
//
// 契約:
//   - onReady: SVG が正しく描画できた（親はWebPフォールバックを外してよい）
//   - onLoadFailed: 読み込み/描画に失敗（親はWebPへフォールバック）
//   - reduced-motion / ビューポート外 / タブ非表示 では停止して静止ポーズを保つ
//   - 正解・不正解・完了リアクションはまだ実装しない（Living Idle のみ）

import { useEffect, useRef, useState } from "react";
import { MOCHIT_SVG_MARKUP } from "./mochitSvgMarkup";
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

export default function MochitSvg({
  growthStage,
  reducedMotion,
  compact,
  ariaLabel,
  onReady,
  onLoadFailed,
  className = "",
  forceFailure = false,
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

  // マウント時に描画健全性を確認。critical ノードが無ければ描画失敗扱い。
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

  if (failed) return null;

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 1024 1024"
      role="img"
      aria-label={ariaLabel}
      style={{ overflow: "visible" }}
      className={`h-full w-full mochit-growth-${growthStage} ${className}`}
      dangerouslySetInnerHTML={{ __html: MOCHIT_SVG_MARKUP }}
    />
  );
}
