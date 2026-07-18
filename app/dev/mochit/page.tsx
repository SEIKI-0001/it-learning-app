"use client";

// モチット開発プレビュー（開発環境専用）。
// 本番ビルドでは notFound を返す。.riv 完成前でも
// フォールバック表示・セマンティックイベント・優先度制御の確認に使える。

import { notFound } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import Mochit from "@/components/mochit/Mochit";
import type { MochitGrowthStage, MochitScreenContext, MochitSize, MochitState } from "@/components/mochit/mochitTypes";
import type { MochitEvent, MochitEventSignal } from "@/components/mochit/mochitEvents";
import { MOCHIT_EVENT_PRIORITIES } from "@/components/mochit/mochitEvents";

const STATES: MochitState[] = ["normal", "happy", "thinking", "cheering"];
const SIZES: MochitSize[] = ["small", "medium", "large"];
const STAGES: MochitGrowthStage[] = [1, 2, 3];
const CONTEXTS: MochitScreenContext[] = ["other", "today", "progress", "avatar", "quizResult", "checkpoint", "rank"];
const EVENTS: MochitEvent[] = [
  "checkpointClear",
  "badgeEarned",
  "taskComplete",
  "allCorrect",
  "correct",
  "incorrect",
  "encourage",
  "tap",
  "wakeUp",
];

type RendererMode = "auto" | "rive" | "fallback" | "loadError";

export default function MochitDevPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const [rendererMode, setRendererMode] = useState<RendererMode>("auto");
  const [reducedMotion, setReducedMotion] = useState(false);
  const [stage, setStage] = useState<MochitGrowthStage>(1);
  const [screenContext, setScreenContext] = useState<MochitScreenContext>("other");
  const [mood, setMood] = useState(0);
  const [signal, setSignal] = useState<MochitEventSignal | null>(null);
  const [eventLog, setEventLog] = useState<string[]>([]);
  const eventIdRef = useRef(0);

  const rendererProps = useMemo(() => {
    if (rendererMode === "fallback") return { rendererOverride: "fallback" as const };
    if (rendererMode === "rive") return { rendererOverride: "rive" as const };
    if (rendererMode === "loadError")
      return { rendererOverride: "rive" as const, riveSrcOverride: "/characters/mochit/__load-error-sim__.riv" };
    return {};
  }, [rendererMode]);

  const sendEvent = (type: MochitEvent) => {
    eventIdRef.current += 1;
    setSignal({ type, id: eventIdRef.current });
    setEventLog((log) =>
      [`#${eventIdRef.current} ${type}（優先度${MOCHIT_EVENT_PRIORITIES[type]}）`, ...log].slice(0, 8),
    );
  };

  const shared = { ...rendererProps, reducedMotion, screenContext, mood };

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-gradient-to-r from-sky-600 to-cyan-600 px-4 py-4 text-white">
        <div className="mx-auto w-full max-w-3xl">
          <p className="text-lg font-extrabold">モチット開発プレビュー</p>
          <p className="text-xs font-semibold text-white/80">
            開発環境専用。mochit.riv を public/characters/mochit/ に置くとRive描画へ切替わる。
          </p>
        </div>
      </header>

      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6">
        {/* コントロール */}
        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <h2 className="text-base font-extrabold text-gray-800">コントロール</h2>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm font-semibold text-gray-700">
            <label className="flex items-center gap-2">
              描画:
              <select
                className="rounded-lg border border-gray-200 px-2 py-1"
                value={rendererMode}
                onChange={(e) => setRendererMode(e.target.value as RendererMode)}
              >
                <option value="auto">自動（.rivがあればRive）</option>
                <option value="rive">Rive強制</option>
                <option value="fallback">フォールバック強制</option>
                <option value="loadError">ロード失敗シミュレーション</option>
              </select>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={reducedMotion} onChange={(e) => setReducedMotion(e.target.checked)} />
              reduced-motion
            </label>
            <label className="flex items-center gap-2">
              成長段階:
              <select
                className="rounded-lg border border-gray-200 px-2 py-1"
                value={stage}
                onChange={(e) => setStage(Number(e.target.value) as MochitGrowthStage)}
              >
                {STAGES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2">
              screenContext:
              <select
                className="rounded-lg border border-gray-200 px-2 py-1"
                value={screenContext}
                onChange={(e) => setScreenContext(e.target.value as MochitScreenContext)}
              >
                {CONTEXTS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2">
              mood {mood.toFixed(1)}:
              <input
                type="range"
                min={-1}
                max={1}
                step={0.1}
                value={mood}
                onChange={(e) => setMood(Number(e.target.value))}
              />
            </label>
          </div>
        </section>

        {/* メインステージ（primary想定）＋イベントボタン */}
        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <h2 className="text-base font-extrabold text-gray-800">セマンティックイベント（primaryインスタンス）</h2>
          <div className="mt-3 flex justify-center">
            <Mochit
              {...shared}
              state="normal"
              size="large"
              growthStage={stage}
              event={signal}
              message="イベントボタンで反応を確認"
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {EVENTS.map((event) => (
              <button
                key={event}
                type="button"
                onClick={() => sendEvent(event)}
                className="rounded-full bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-800 ring-1 ring-sky-200 hover:bg-sky-100"
              >
                {event}
              </button>
            ))}
          </div>
          <div className="mt-3 rounded-2xl bg-gray-50 p-3 text-xs text-gray-600">
            <p className="font-bold">送信ログ（優先度が高い反応中は低優先度が破棄される）</p>
            {eventLog.length === 0 ? <p className="mt-1">まだ送信なし</p> : (
              <ul className="mt-1 space-y-0.5">{eventLog.map((line) => <li key={line}>{line}</li>)}</ul>
            )}
          </div>
        </section>

        {/* 全状態 × 全サイズ */}
        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <h2 className="text-base font-extrabold text-gray-800">全状態 × 全サイズ</h2>
          {STATES.map((state) => (
            <div key={state} className="mt-4">
              <p className="text-sm font-bold text-gray-600">{state}</p>
              <div className="mt-2 flex flex-wrap items-end gap-6">
                {SIZES.map((size) => (
                  <div key={size} className="text-center">
                    <Mochit
                      {...shared}
                      state={state}
                      size={size}
                      growthStage={stage}
                      animation={state === "cheering" ? "celebrate" : state === "happy" ? "bounce" : state === "thinking" ? "tilt" : "idle"}
                    />
                    <p className="mt-1 text-xs text-gray-400">{size}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* 成長段階 */}
        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <h2 className="text-base font-extrabold text-gray-800">成長段階（1〜3）</h2>
          <div className="mt-3 flex flex-wrap items-end gap-6">
            {STAGES.map((s) => (
              <div key={s} className="text-center">
                <Mochit {...shared} state="normal" size="medium" growthStage={s} />
                <p className="mt-1 text-xs text-gray-400">stage {s}</p>
              </div>
            ))}
          </div>
        </section>

        {/* コンパクト（省アニメ） vs primary */}
        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <h2 className="text-base font-extrabold text-gray-800">コンパクト表示とprimary表示</h2>
          <p className="mt-1 text-xs text-gray-500">
            small/compactは省アニメーションプロファイル。同一画面のフル演出は1体のみ（primaryInstance）。
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-6">
            <div className="text-center">
              <Mochit {...shared} state="normal" size="small" growthStage={stage} compact message="コンパクト" />
              <p className="mt-1 text-xs text-gray-400">compact</p>
            </div>
            <div className="text-center">
              <Mochit {...shared} state="normal" size="medium" growthStage={stage} compact={false} message="primary候補" />
              <p className="mt-1 text-xs text-gray-400">full</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
