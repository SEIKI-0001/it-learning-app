"use client";

// モチットの唯一の公開描画窓口。
// - 従来props（state/size/message/animation/growthStage/className）は完全互換
// - /characters/mochit/mochit.riv が存在する場合のみRive描画へ切替え、
//   それ以外・ロード失敗時は従来のWebPフォールバックを表示する
// - どちらの描画でも外形寸法とセリフ表示は同一（レイアウトシフトなし）

import dynamic from "next/dynamic";
import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import MochitFallback, { MOCHIT_STATE_META } from "./MochitFallback";
import MochitMessage from "./MochitMessage";
import { useMochitController } from "./useMochitController";
import { MOCHIT_RIVE_SRC } from "./mochitTypes";
import type {
  MochitAnimation,
  MochitGrowthStage,
  MochitReactionProfile,
  MochitScreenContext,
  MochitSize,
  MochitState,
} from "./mochitTypes";
import type { MochitEventSignal } from "./mochitEvents";
import { createMochitBehaviorState, type MochitBehaviorState } from "./mochitBehavior";
import type { MochitAttentionPoint } from "./mochitAttention";

// 後方互換: 既存コードは型をこのモジュールからimportしている。
export type { MochitAnimation, MochitGrowthStage, MochitSize, MochitState };

const MochitRive = dynamic(() => import("./MochitRive"), { ssr: false, loading: () => null });
// SVGアニメーションは window/WAAPI に依存するためクライアント専用で読み込む。
const MochitSvg = dynamic(() => import("./MochitSvg"), { ssr: false, loading: () => null });

// SVG描画中の想定外エラーを捕捉してWebPフォールバックへ落とす小さな境界。
class MochitSvgBoundary extends Component<{ onError: () => void; children: ReactNode }, { crashed: boolean }> {
  state = { crashed: false };
  static getDerivedStateFromError() {
    return { crashed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.crashed ? null : this.props.children;
  }
}

const SIZE_CLASS: Record<MochitSize, string> = {
  xs: "h-14 w-14", // クエストルートのレール上に座る最小サイズ
  floating: "h-[84px] w-[84px]",
  small: "h-24 w-24",
  medium: "h-32 w-32",
  large: "h-60 w-60",
};

const SIZES_ATTR = "(max-width: 640px) 128px, 240px";

// ---- Riveアセットの存在確認（モジュール単位でキャッシュ） ----

type RiveAssetStatus = "unknown" | "available" | "missing";
const assetStatusCache = new Map<string, RiveAssetStatus>();
const assetProbes = new Map<string, Promise<RiveAssetStatus>>();

function probeRiveAsset(src: string): Promise<RiveAssetStatus> {
  const existing = assetProbes.get(src);
  if (existing) return existing;
  const probe = Promise.resolve()
    .then(() => fetch(src, { method: "HEAD" }))
    .then((res) => {
      const contentType = res.headers.get("content-type") ?? "";
      // 404ページ等のHTML応答を「存在する」と誤認しない
      const status: RiveAssetStatus = res.ok && !contentType.includes("text/html") ? "available" : "missing";
      return status;
    })
    .catch((): RiveAssetStatus => "missing")
    .then((status) => {
      assetStatusCache.set(src, status);
      if (status === "missing" && process.env.NODE_ENV !== "production") {
        console.info(`[Mochit] ${src} が見つからないため、WebPフォールバックで表示します。`);
      }
      return status;
    });
  assetProbes.set(src, probe);
  return probe;
}

function useMochitRiveAvailability(src: string, enabled: boolean): RiveAssetStatus {
  const [status, setStatus] = useState<RiveAssetStatus>(assetStatusCache.get(src) ?? "unknown");
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    // キャッシュ済みでもPromise経由（マイクロタスク）で反映し、effect内の同期setStateを避ける
    probeRiveAsset(src).then((result) => {
      if (!cancelled) setStatus(result);
    });
    return () => {
      cancelled = true;
    };
  }, [src, enabled]);
  return status;
}

function usePrefersReducedMotion(): boolean {
  const [prefers, setPrefers] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPrefers(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return prefers;
}

type Props = {
  state?: MochitState;
  size?: MochitSize;
  message?: string;
  animation?: MochitAnimation;
  growthStage?: MochitGrowthStage;
  className?: string;
  // ---- セマンティックprops（Rive移行用・省略可） ----
  /** -1〜1。省略時は state から導出 */
  mood?: number;
  /** セマンティックイベント。id を変えると同種イベントを再発火できる */
  event?: MochitEventSignal | null;
  screenContext?: MochitScreenContext;
  /** 明示指定が無ければ prefers-reduced-motion に従う */
  reducedMotion?: boolean;
  /** コンパクト表示（省アニメーションプロファイル）。省略時は size==="small" */
  compact?: boolean;
  /** リアクション強度。常時表示版は floating を明示する。 */
  reactionProfile?: MochitReactionProfile;
  /** 既存優先度コントローラーがイベントを受理した時だけ通知する。 */
  onEventAccepted?: (signal: MochitEventSignal) => void;
  /**
   * 平常時の Behavior State（Living Character）。省略時は既定値＝従来表示。
   * state（既存UI互換の表示状態）とは独立で、自動で同一視しない。
   * 現状は emotion（平常表情）と attention（視線）を SVG 描画へ反映する。
   * attention 未指定の場合は従来どおりのランダム視線（random 相当）。
   */
  behavior?: Partial<MochitBehaviorState>;
  /**
   * behavior.attention が content/result のときに見る位置。正規化座標
   * （0,0=左上 / 0.5,0.5=中央 / 1,1=右下）。DOM の pixel 座標ではない。省略時は中央。
   */
  attentionPoint?: MochitAttentionPoint;
  // ---- dev/テスト用の切替口 ----
  rendererOverride?: "rive" | "svg" | "fallback";
  riveSrcOverride?: string;
  /** devプレビュー用: SVG描画失敗を強制する */
  forceSvgFailure?: boolean;
};

export default function Mochit({
  state = "normal",
  size = "medium",
  message,
  animation = "idle",
  growthStage = 1,
  className = "",
  mood,
  event = null,
  screenContext = "other",
  reducedMotion,
  compact,
  reactionProfile,
  onEventAccepted,
  behavior,
  attentionPoint,
  rendererOverride,
  riveSrcOverride,
  forceSvgFailure,
}: Props) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const effectiveReducedMotion = reducedMotion ?? prefersReducedMotion;
  const sizeCompact = compact ?? (size === "small" || size === "xs");
  const effectiveReactionProfile =
    reactionProfile ?? (sizeCompact ? "compact" : "full");
  const effectiveCompact = effectiveReactionProfile === "compact";
  const riveSrc = riveSrcOverride ?? MOCHIT_RIVE_SRC;

  const forceFallback = rendererOverride === "fallback";
  const forceRive = rendererOverride === "rive";
  const forceSvg = rendererOverride === "svg";

  // Riveプローブは .riv を積極的に使う場合のみ（svg/fallback強制時は不要）。
  const probeEnabled = !forceFallback && !forceSvg;
  const assetStatus = useMochitRiveAvailability(riveSrc, probeEnabled);
  const [riveReady, setRiveReady] = useState(false);
  const [riveFailed, setRiveFailed] = useState(false);
  const [svgReady, setSvgReady] = useState(false);
  const [svgFailed, setSvgFailed] = useState(false);

  // 描画方式の決定:
  //  1. .riv があれば Rive（従来通り）
  //  2. .riv が無い / Riveロード失敗 → SVGアニメーション（無料方式・優先）
  //  3. SVG も失敗 → WebP フォールバック
  const wantRive =
    !riveFailed && !forceFallback && !forceSvg && (forceRive || assetStatus === "available");
  const wantSvg = !svgFailed && !forceFallback && !forceRive && (forceSvg || !wantRive);

  // どちらの描画も準備できるまで（および両方失敗時）は WebP を土台として表示する。
  const showWebP = !(wantRive && riveReady) && !(wantSvg && svgReady);

  const { activeEvent, dispatch, registerTriggerFirer } =
    useMochitController();
  const onEventAcceptedRef = useRef(onEventAccepted);
  useEffect(() => {
    onEventAcceptedRef.current = onEventAccepted;
  }, [onEventAccepted]);

  // event propの変化をセマンティックイベントとして優先度制御付きで反映する。
  const lastEventIdRef = useRef<number | null>(null);
  useEffect(() => {
    if (!event) return;
    if (lastEventIdRef.current === event.id) return;
    lastEventIdRef.current = event.id;
    if (dispatch(event.type)) {
      onEventAcceptedRef.current?.(event);
    }
  }, [event, dispatch]);

  const meta = MOCHIT_STATE_META[state];
  // 部分指定を完全な Behavior State へ正規化。子へは primitive だけ渡す
  // （behavior オブジェクトの同一性に依存して再描画・再適用させない）。
  const normalizedBehavior = createMochitBehaviorState(behavior);
  const emotion = normalizedBehavior.emotion;
  // attention を明示していない既存呼び出しは従来の Living Idle（ランダム視線）のまま。
  // Behavior State の既定値（user）は「意味上の既定」で、未指定の見た目は変えない。
  const attention = behavior?.attention === undefined ? "random" : normalizedBehavior.attention;

  return (
    <div
      className={`mochit flex items-center gap-3 ${className}`}
      data-active-event={activeEvent ?? undefined}
    >
      <div className={`relative shrink-0 ${SIZE_CLASS[size]}`}>
        {/* Rive/SVG準備完了までは必ずWebPを表示（壊れたcanvas・空SVGを見せない） */}
        {showWebP && (
          <MochitFallback
            state={state}
            animation={effectiveReducedMotion ? "none" : animation}
            growthStage={growthStage}
            sizesAttr={SIZES_ATTR}
          />
        )}
        {wantSvg && (
          <div className="absolute inset-0 flex items-center justify-center">
            <MochitSvgBoundary
              onError={() => {
                setSvgReady(false);
                setSvgFailed(true);
              }}
            >
              <MochitSvg
                growthStage={growthStage}
                reducedMotion={effectiveReducedMotion}
                compact={effectiveCompact}
                reactionProfile={effectiveReactionProfile}
                ariaLabel={meta.alt}
                forceFailure={forceSvgFailure}
                registerTriggerFirer={registerTriggerFirer}
                emotion={emotion}
                attention={attention}
                attentionPoint={attentionPoint}
                onReady={() => setSvgReady(true)}
                onLoadFailed={() => {
                  setSvgReady(false);
                  setSvgFailed(true);
                }}
              />
            </MochitSvgBoundary>
          </div>
        )}
        {wantRive && (
          <MochitRive
            state={state}
            growthStage={growthStage}
            reducedMotion={effectiveReducedMotion}
            compact={effectiveCompact}
            reactionProfile={effectiveReactionProfile}
            screenContext={screenContext}
            mood={mood}
            registerTriggerFirer={registerTriggerFirer}
            onReady={() => setRiveReady(true)}
            onLoadFailed={() => {
              setRiveReady(false);
              setRiveFailed(true);
            }}
            srcOverride={riveSrcOverride}
            ariaLabel={meta.alt}
          />
        )}
      </div>
      {message ? <MochitMessage message={message} /> : null}
    </div>
  );
}
