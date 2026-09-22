"use client";

import { useState, type ReactNode } from "react";
import type { NodeState } from "./network/NetworkSceneBase";
import { OsScene, type OsSceneProps } from "./os/OsScene";
import { SceneTimeline } from "./scene/SceneTimeline";
import { useReducedMotion } from "./scene/useReducedMotion";
import { useStepPlayer } from "./scene/useStepPlayer";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「OS・ソフトウェア・ハードウェア」専用の体験。
//   ① 3層の構造 … アプリ → OS → ハードウェア（タップで役割）
//   ② 取り次ぎ体験 … スマホの中を3枚の板（アプリ/OS/ハードウェア）に分けた 2.5D 分解図で、
//      「音を再生」「ファイルを保存」の要求が板を上下に流れる。直接アクセスを試すとOSで止められる
//   ③ 分類のおさらい
// ============================================================================

const LAYERS = [
  {
    id: "app",
    emo: "📱",
    name: "アプリケーション",
    tag: "応用ソフト",
    color: "border-sky-300 bg-sky-50",
    on: "border-sky-500 bg-sky-100",
    d: "ユーザーが直接使うソフト。SNS・ブラウザ・表計算・ゲームなど「やりたいこと」専用。",
  },
  {
    id: "os",
    emo: "⚙️",
    name: "OS（オーエス）",
    tag: "基本ソフト",
    color: "border-brand-300 bg-brand-50",
    on: "border-brand-500 bg-brand-100",
    d: "アプリと機械の間に立つ土台。メモリ・ファイル・画面・入出力など全体を管理し、機械を使えるように取り次ぐ。例：Windows / macOS / iOS / Android。",
  },
  {
    id: "hw",
    emo: "🖥️",
    name: "ハードウェア",
    tag: "機械",
    color: "border-gray-300 bg-gray-50",
    on: "border-gray-500 bg-gray-100",
    d: "目に見える機械本体。CPU・メモリ・ストレージ・画面・キーボードなど。",
  },
];

function LayerStack() {
  const [sel, setSel] = useState(1); // 既定はOS（主役）
  const cur = LAYERS[sel];
  return (
    <Panel>
      <SectionTitle step={1}>3層の構造（タップして役割を見る）</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        コンピュータは<b className="text-gray-800">上から アプリ → OS → ハードウェア</b>の3層。
        <b className="text-brand-700">OSが真ん中</b>で全体を管理しています。
      </p>

      <div className="mt-4 space-y-2">
        {LAYERS.map((l, i) => {
          const on = i === sel;
          return (
            <button
              key={l.id}
              onClick={() => setSel(i)}
              className={`flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition active:scale-[0.99] ${
                on ? l.on : l.color
              }`}
            >
              <span className="text-2xl">{l.emo}</span>
              <span className="flex-1">
                <span className="text-sm font-bold text-gray-800">{l.name}</span>
                <span className="ml-2 rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-bold text-gray-600">
                  {l.tag}
                </span>
              </span>
              {l.id === "os" && (
                <span className="text-[11px] font-bold text-brand-600">仲介役</span>
              )}
            </button>
          );
        })}
      </div>

      <p className="mt-3 rounded-xl bg-gray-50 px-4 py-3 text-sm leading-relaxed text-gray-700 ring-1 ring-gray-200">
        <b className="text-gray-900">{cur.name}</b>：{cur.d}
      </p>
    </Panel>
  );
}

// ② 取り次ぎ体験 ----------------------------------------------------------
type Scenario = "sound" | "save";
type RelayStep = { title: string; detail: ReactNode; view: Omit<OsSceneProps, "reducedMotion" | "barrier"> };

const L = (app: NodeState, os: NodeState, hw: NodeState) => ({ app, os, hw });

const SCENARIOS: Record<Scenario, { label: string; app: "music" | "files"; steps: RelayStep[] }> = {
  sound: {
    label: "🎵 音を再生",
    app: "music",
    steps: [
      {
        title: "ユーザーが「再生」を押す",
        detail: <>🎵 音楽アプリで「▶ 再生」を押しました。でもアプリは<b>スピーカー（機械）を直接さわれません</b>。</>,
        view: { layers: L("active", "idle", "idle"), parts: { music: "active" }, links: [{ from: "user", to: "music", tone: "request" }], capsule: { at: "music", text: "▶ 再生", tone: "request" }, userHears: null },
      },
      {
        title: "アプリ → OS「音を出したい」",
        detail: <>➡️ アプリはOSに「この曲の<b>音を出したい</b>」とお願いします（どのアプリも同じ“共通の窓口”を使う）。</>,
        view: { layers: L("idle", "active", "idle"), parts: { music: "sending", core: "active" }, links: [{ from: "music", to: "core", tone: "request" }], capsule: { at: "core", text: "音を出したい", tone: "request" }, userHears: null },
      },
      {
        title: "OSがCPU・スピーカーへ指示",
        detail: <>⚙️ OSが<b>CPUに音データの処理</b>を割り当て、<b>スピーカー</b>の使い方も管理します。アプリは機械の細かい操作を知らなくてOK。</>,
        view: {
          layers: L("idle", "active", "active"),
          parts: { core: "sending", cpu: "active", speaker: "active" },
          links: [
            { from: "core", to: "cpu", tone: "request" },
            { from: "core", to: "speaker", tone: "request" },
          ],
          capsule: { at: "cpu", text: "音データを処理", tone: "request" },
          userHears: null,
        },
      },
      {
        title: "ハードウェアが動く",
        detail: <>🔊 CPUが処理した音を、<b>スピーカー</b>が実際に鳴らします。</>,
        view: { layers: L("idle", "idle", "active"), parts: { speaker: "active" }, links: [{ from: "cpu", to: "speaker", tone: "request" }], capsule: { at: "speaker", text: "♪ 出力", tone: "result" }, userHears: null },
      },
      {
        title: "結果がユーザーへ",
        detail: <>✅ 音がユーザーに届き、OSはアプリに「再生中」を返します。<b>アプリ → OS → 機械 → 結果</b>の順でした。</>,
        view: {
          layers: L("active", "active", "idle"),
          parts: { music: "active", core: "active", speaker: "active" },
          links: [
            { from: "core", to: "music", tone: "result" },
            { from: "user", to: "speaker", tone: "result" },
          ],
          capsule: { at: "music", text: "再生中 ♪", tone: "result" },
          userHears: "♪ 聞こえる！",
        },
      },
    ],
  },
  save: {
    label: "💾 ファイルを保存",
    app: "files",
    steps: [
      {
        title: "ユーザーが「保存」を押す",
        detail: <>📝 メモアプリで「保存」を押しました。でもアプリは機械（ストレージ）を<b>直接さわれません</b>。</>,
        view: { layers: L("active", "idle", "idle"), parts: { files: "active" }, links: [{ from: "user", to: "files", tone: "request" }], capsule: { at: "files", text: "💾 保存", tone: "request" }, userHears: null },
      },
      {
        title: "アプリ → OS「保存して」",
        detail: <>➡️ アプリはOSに「このファイルを<b>保存して</b>」とお願いします。</>,
        view: { layers: L("idle", "active", "idle"), parts: { files: "sending", core: "active" }, links: [{ from: "files", to: "core", tone: "request" }], capsule: { at: "core", text: "保存して", tone: "request" }, userHears: null },
      },
      {
        title: "OSがストレージへ書き込み",
        detail: <>⚙️ OSがストレージの空き場所を管理し、実際に<b>書き込み</b>ます。</>,
        view: { layers: L("idle", "active", "active"), parts: { core: "sending", storage: "active" }, links: [{ from: "core", to: "storage", tone: "request" }], capsule: { at: "storage", text: "書き込み", tone: "request" }, userHears: null },
      },
      {
        title: "OS → アプリ「完了」",
        detail: <>✅ 保存できたら、OSが「完了」をアプリに返します。</>,
        view: {
          layers: L("active", "active", "idle"),
          parts: { files: "active", core: "active" },
          links: [{ from: "core", to: "files", tone: "result" }],
          capsule: { at: "files", text: "✅ 保存完了", tone: "result" },
          userHears: "保存できた！",
        },
      },
    ],
  },
};

function Relay() {
  const reducedMotion = useReducedMotion();
  const [scenario, setScenario] = useState<Scenario>("sound");
  const [bypass, setBypass] = useState(false);
  const sc = SCENARIOS[scenario];
  const player = useStepPlayer(sc.steps.length, reducedMotion);
  const idx = Math.min(player.index, sc.steps.length - 1);
  const step = sc.steps[idx];
  const target = scenario === "sound" ? "speaker" : "storage";

  const pick = (next: Scenario) => {
    setScenario(next);
    setBypass(false);
    player.reset();
  };

  const view: Omit<OsSceneProps, "reducedMotion"> = bypass
    ? {
        layers: L("active", "error", "idle"),
        parts: { [sc.app]: "sending", core: "idle", [target]: "idle" },
        links: [{ from: sc.app, to: sc.app === "music" ? "wallL" : "wallR", tone: "blocked" }],
        capsule: { at: sc.app === "music" ? "wallL" : "wallR", text: scenario === "sound" ? "スピーカーを直接操作" : "ストレージに直接書く", tone: "blocked" },
        barrier: true,
        userHears: null,
      }
    : { ...step.view, barrier: false };

  return (
    <Panel>
      <SectionTitle step={2}>OSが間に立って「取り次ぐ」</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        アプリは機械を直接さわらず、<b className="text-gray-800">OSにお願いして</b>動かします。
        スマホの中を3枚の板に分けた模型で、お願い（要求）の流れを追ってみよう。
      </p>

      <div className="mt-3 grid grid-cols-2 gap-1.5">
        {(Object.keys(SCENARIOS) as Scenario[]).map((id) => (
          <button
            key={id}
            type="button"
            aria-pressed={scenario === id}
            onClick={() => pick(id)}
            className={`rounded-lg px-2 py-1.5 text-xs font-bold transition active:scale-95 ${scenario === id ? "bg-brand-600 text-white" : "text-gray-600 ring-1 ring-gray-300"}`}
          >
            {SCENARIOS[id].label}
          </button>
        ))}
      </div>

      <div className="mt-3 min-w-0">
        <p className={`text-[11px] font-bold ${bypass ? "text-rose-700" : "text-brand-700"}`}>
          {bypass ? "実験：OSを通さずに機械を動かそうとすると？" : `STEP ${idx + 1} / ${sc.steps.length}`}
        </p>
        <p className="mt-0.5 text-sm font-bold text-gray-900" data-testid="os-step-title">
          {bypass ? "アプリ → ハードウェアへ直接 → OSで止められる" : step.title}
        </p>
      </div>

      <div className="-mx-2 mt-3 sm:mx-auto sm:max-w-xl">
        <OsScene {...view} reducedMotion={reducedMotion} />
      </div>

      <div
        className={`mt-3 min-h-[3.5em] rounded-xl px-4 py-3 text-sm leading-relaxed text-gray-700 ring-1 [&_b]:text-gray-900 ${bypass ? "bg-rose-50 ring-rose-200" : "bg-sky-50 ring-sky-200"}`}
        aria-live="polite"
      >
        {bypass ? (
          <>
            ⛔ アプリが{scenario === "sound" ? "スピーカー" : "ストレージ"}を<b>直接</b>操作しようとしても、OSが止めます。
            機械を使えるのは<b>OSを通したときだけ</b>。だから勝手なアプリが機械を壊したり、ほかのアプリの邪魔をしたりできません。
          </>
        ) : (
          step.detail
        )}
      </div>

      <div className="mt-3">
        <SceneTimeline
          index={idx}
          steps={sc.steps}
          playing={player.playing && !bypass}
          reducedMotion={reducedMotion}
          onMove={(next) => {
            setBypass(false);
            player.move(next);
          }}
          onTogglePlay={() => {
            setBypass(false);
            player.togglePlay();
          }}
          playLabel="要求の流れを再生"
          timelineLabel="要求の流れのタイムライン"
          startCaption="アプリ"
          endCaption="結果"
        />
      </div>

      <button
        type="button"
        onClick={() => setBypass((v) => !v)}
        aria-pressed={bypass}
        className={`mt-3 w-full rounded-full px-4 py-2 text-xs font-bold transition active:scale-95 ${
          bypass ? "bg-white text-gray-700 ring-1 ring-gray-300" : "bg-white text-rose-700 ring-1 ring-rose-300"
        }`}
      >
        {bypass ? "↩ OSを通す正しい流れに戻す" : "🚫 アプリからハードウェアを直接さわってみる"}
      </button>

      <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        💡 OSが間に立つから、<b>どのアプリも同じやり方で機械を使える</b>＝アプリ作りが楽で安全。
        OSは単なる箱ではなく、<b>アプリの要求を機械へ取り次ぎ、機械を管理する</b>存在です。
      </div>
    </Panel>
  );
}

export default function OsExperience() {
  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        📱 スマホでたとえると——<b>本体＝ハードウェア</b>（機械）、<b>SNSアプリ＝アプリケーション</b>、
        画面・保存・通信などを<b>まとめて面倒みるのがOS</b>。OSはアプリと機械の<b>間に立つ土台</b>です。
      </div>

      <LayerStack />
      <Relay />

      <Panel>
        <SectionTitle step={3}>分類のおさらい</SectionTitle>
        <div className="mt-3 space-y-2 text-sm">
          <div className="rounded-xl bg-gray-50 px-3 py-2.5 ring-1 ring-gray-200">
            <b>ハードウェア</b>＝目に見える<b>機械</b>　／　<b>ソフトウェア</b>＝機械に仕事をさせる<b>命令</b>（見えない）
          </div>
          <div className="rounded-xl bg-gray-50 px-3 py-2.5 ring-1 ring-gray-200">
            ソフトウェアは2種類：<b className="text-brand-700">基本ソフト（OS）</b>＝全体を管理／
            <b className="text-sky-700">応用ソフト（アプリ）</b>＝やりたいこと専用
          </div>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-gray-500">
          ※ よくある勘違い：「OSとアプリは同じ」ではありません。アプリはOSの上で動きます。
        </p>
      </Panel>
    </div>
  );
}
