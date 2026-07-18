"use client";

// モチットの唯一の公開描画窓口。
// - 従来props（state/size/message/animation/growthStage/className）は完全互換
// - /characters/mochit/mochit.riv が存在する場合のみRive描画へ切替え、
//   それ以外・ロード失敗時は従来のWebPフォールバックを表示する
// - どちらの描画でも外形寸法とセリフ表示は同一（レイアウトシフトなし）

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import MochitFallback, { MOCHIT_STATE_META } from "./MochitFallback";
import MochitMessage from "./MochitMessage";
import { useMochitController } from "./useMochitController";
import { MOCHIT_RIVE_SRC } from "./mochitTypes";
import type {
  MochitAnimation,
  MochitGrowthStage,
  MochitScreenContext,
  MochitSize,
  MochitState,
} from "./mochitTypes";
import type { MochitEventSignal } from "./mochitEvents";

// 後方互換: 既存コードは型をこのモジュールからimportしている。
export type { MochitAnimation, MochitGrowthStage, MochitSize, MochitState };

const MochitRive = dynamic(() => import("./MochitRive"), { ssr: false, loading: () => null });

const SIZE_CLASS: Record<MochitSize, string> = {
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
  // ---- dev/テスト用の切替口 ----
  rendererOverride?: "rive" | "fallback";
  riveSrcOverride?: string;
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
  rendererOverride,
  riveSrcOverride,
}: Props) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const effectiveReducedMotion = reducedMotion ?? prefersReducedMotion;
  const effectiveCompact = compact ?? size === "small";
  const riveSrc = riveSrcOverride ?? MOCHIT_RIVE_SRC;

  const probeEnabled = rendererOverride !== "fallback";
  const assetStatus = useMochitRiveAvailability(riveSrc, probeEnabled);
  const [riveReady, setRiveReady] = useState(false);
  const [riveFailed, setRiveFailed] = useState(false);

  const wantRive =
    !riveFailed &&
    rendererOverride !== "fallback" &&
    (rendererOverride === "rive" || assetStatus === "available");

  const { dispatch, registerTriggerFirer } = useMochitController();

  // event propの変化をセマンティックイベントとして優先度制御付きで反映する。
  const lastEventIdRef = useRef<number | null>(null);
  useEffect(() => {
    if (!event) return;
    if (lastEventIdRef.current === event.id) return;
    lastEventIdRef.current = event.id;
    dispatch(event.type);
  }, [event, dispatch]);

  const meta = MOCHIT_STATE_META[state];

  return (
    <div className={`mochit flex items-center gap-3 ${className}`}>
      <div className={`relative shrink-0 ${SIZE_CLASS[size]}`}>
        {/* Rive準備完了までは必ずWebPを表示（壊れたcanvasを見せない） */}
        {!(wantRive && riveReady) && (
          <MochitFallback
            state={state}
            animation={effectiveReducedMotion ? "none" : animation}
            growthStage={growthStage}
            sizesAttr={SIZES_ATTR}
          />
        )}
        {wantRive && (
          <MochitRive
            state={state}
            growthStage={growthStage}
            reducedMotion={effectiveReducedMotion}
            compact={effectiveCompact}
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
