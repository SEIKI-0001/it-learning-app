"use client";

// Rive描画レイヤー。/characters/mochit/mochit.riv の
// アートボード MOCHIT_RIVE_ARTBOARD / ステートマシン MOCHIT_RIVE_STATE_MACHINE を再生する。
// - 入力が欠けていてもクラッシュしない（開発時のみ警告）
// - ビューポート外・タブ非表示では一時停止
// - 1画面のフル演出インスタンスは1つに制限（それ以外は primaryInstance=false）
// - ロード失敗は onLoadFailed で親へ通知し、親がWebPフォールバックを表示する

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRive } from "@rive-app/react-canvas";
import {
  applyMochitRiveInputs,
  buildMochitRiveInputValues,
  fireMochitRiveTrigger,
  MOCHIT_RIVE_ARTBOARD,
  MOCHIT_RIVE_SRC,
  MOCHIT_RIVE_STATE_MACHINE,
  shouldPlayMochitRive,
  type MochitGrowthStage,
  type MochitRiveInputLike,
  type MochitScreenContext,
  type MochitState,
} from "./mochitTypes";
import type { MochitTriggerFirer } from "./useMochitController";

const isDev = process.env.NODE_ENV !== "production";

// 同一画面でフル演出を1体に絞るための簡易レジストリ（先着1体がprimary）。
const primaryHolders: symbol[] = [];
const primaryListeners = new Set<() => void>();

function notifyPrimaryListeners() {
  for (const listener of primaryListeners) listener();
}

function claimPrimarySlot(id: symbol) {
  if (!primaryHolders.includes(id)) {
    primaryHolders.push(id);
    notifyPrimaryListeners();
  }
}

function releasePrimarySlot(id: symbol) {
  const index = primaryHolders.indexOf(id);
  if (index >= 0) {
    primaryHolders.splice(index, 1);
    notifyPrimaryListeners();
  }
}

function subscribePrimarySlot(listener: () => void) {
  primaryListeners.add(listener);
  return () => {
    primaryListeners.delete(listener);
  };
}

function usePrimaryInstanceSlot(compact: boolean): boolean {
  const [id] = useState(() => Symbol("mochit-rive"));

  useEffect(() => {
    if (compact) return;
    claimPrimarySlot(id);
    return () => releasePrimarySlot(id);
  }, [compact, id]);

  return useSyncExternalStore(
    subscribePrimarySlot,
    () => !compact && primaryHolders[0] === id,
    () => false,
  );
}

type Props = {
  state: MochitState;
  growthStage: MochitGrowthStage;
  reducedMotion: boolean;
  compact: boolean;
  screenContext: MochitScreenContext;
  mood?: number;
  /** ステートマシンの発火関数を親（useMochitController）へ登録する */
  registerTriggerFirer?: (firer: MochitTriggerFirer | null) => void;
  /** ロード完了（フォールバックを外してよいタイミング） */
  onReady?: () => void;
  /** ロード失敗（親はWebPへ切替える） */
  onLoadFailed?: (error: unknown) => void;
  /** devプレビュー用の差し替え口。通常は使用しない */
  srcOverride?: string;
  ariaLabel: string;
};

export default function MochitRive({
  state,
  growthStage,
  reducedMotion,
  compact,
  screenContext,
  mood,
  registerTriggerFirer,
  onReady,
  onLoadFailed,
  srcOverride,
  ariaLabel,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputsRef = useRef<MochitRiveInputLike[]>([]);
  const warnedMissingRef = useRef(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [inViewport, setInViewport] = useState(true);
  const [documentHidden, setDocumentHidden] = useState(false);
  const primary = usePrimaryInstanceSlot(compact);

  const { rive, RiveComponent } = useRive({
    src: srcOverride ?? MOCHIT_RIVE_SRC,
    artboard: MOCHIT_RIVE_ARTBOARD,
    stateMachines: MOCHIT_RIVE_STATE_MACHINE,
    autoplay: true,
    onLoadError: () => {
      setLoadFailed(true);
      if (isDev) console.warn("[Mochit] Riveアセットのロードに失敗しました。WebPフォールバックへ切替えます。");
      onLoadFailed?.(new Error("mochit.riv load error"));
    },
  });

  // ロード完了: 入力を列挙し、トリガー発火関数を登録する。
  useEffect(() => {
    if (!rive || loadFailed) return;
    let inputs: MochitRiveInputLike[] = [];
    try {
      inputs = (rive.stateMachineInputs(MOCHIT_RIVE_STATE_MACHINE) ?? []) as unknown as MochitRiveInputLike[];
    } catch {
      inputs = [];
    }
    inputsRef.current = inputs;
    onReady?.();
    registerTriggerFirer?.((trigger) => {
      const fired = fireMochitRiveTrigger(inputsRef.current, trigger);
      if (!fired && isDev) {
        console.warn(`[Mochit] トリガー入力 ${trigger} がステートマシンにありません`);
      }
    });
    return () => {
      registerTriggerFirer?.(null);
    };
  }, [rive, loadFailed, onReady, registerTriggerFirer]);

  // セマンティックpropsをRive入力へ同期。欠けた入力は開発時のみ一度だけ警告。
  const inputValues = useMemo(
    () =>
      buildMochitRiveInputValues({
        state,
        growthStage,
        reducedMotion,
        compact,
        primary,
        visible: inViewport && !documentHidden,
        focused: screenContext === "quizResult" || screenContext === "checkpoint",
        screenContext,
        mood,
      }),
    [state, growthStage, reducedMotion, compact, primary, inViewport, documentHidden, screenContext, mood],
  );

  useEffect(() => {
    if (!rive || loadFailed) return;
    const { missing } = applyMochitRiveInputs(inputsRef.current, inputValues);
    if (missing.length > 0 && isDev && !warnedMissingRef.current) {
      warnedMissingRef.current = true;
      console.warn(`[Mochit] ステートマシンに未定義の入力: ${missing.join(", ")}`);
    }
  }, [rive, loadFailed, inputValues]);

  // ビューポート外・タブ非表示での一時停止。
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => {
      setInViewport(entries[0]?.isIntersecting ?? true);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onVisibilityChange = () => setDocumentHidden(document.hidden);
    onVisibilityChange();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  useEffect(() => {
    if (!rive || loadFailed) return;
    if (shouldPlayMochitRive({ inViewport, documentHidden, loadFailed })) {
      rive.play();
    } else {
      rive.pause();
    }
  }, [rive, loadFailed, inViewport, documentHidden]);

  if (loadFailed) return null;

  return (
    <div ref={containerRef} className="absolute inset-0" role="img" aria-label={ariaLabel}>
      <RiveComponent className="h-full w-full" />
    </div>
  );
}
