"use client";

import { useState, type ComponentType } from "react";
import { FLOW_STEPS, scramble } from "@/components/experiences/https/httpsFlow";
import { HttpsCafeScene } from "@/components/experiences/https/HttpsCafeScene";
import { HttpsScene, type HttpsMode } from "@/components/experiences/https/HttpsScene";
import { CafeScreensScene } from "@/components/experiences/https/lab/CafeScreensScene";
import { DioramaScene } from "@/components/experiences/https/lab/DioramaScene";
import { IsoCafeScene } from "@/components/experiences/https/lab/IsoCafeScene";
import { LetterScene } from "@/components/experiences/https/lab/LetterScene";
import { ScreenStoryScene } from "@/components/experiences/https/lab/ScreenStoryScene";
import type { LabSceneProps, LabVariant } from "@/components/experiences/https/lab/labTypes";
import { SceneTimeline } from "@/components/experiences/scene/SceneTimeline";
import { useReducedMotion } from "@/components/experiences/scene/useReducedMotion";
import { useStepPlayer } from "@/components/experiences/scene/useStepPlayer";

// 表示手法の比較ラボ。入力・方式・ステップの状態はパターン間で共有し、
// タブを切り替えても「同じ場面を別の描き方で」見比べられるようにする。

type VariantInfo = {
  label: string;
  name: string;
  aim: string;
  how: string;
  cost: string;
  Scene: ComponentType<LabSceneProps>;
};

/** 現行の 2.5D（本番と同じ部品）をラボの props で描く */
function CurrentScene({ mode, step, plain, cipher, forward, reducedMotion, index }: LabSceneProps) {
  const https = mode === "https";
  const capsule =
    !https || step.stop === "desk"
      ? { state: "plain" as const, tag: https ? "入力（まだPCの中）" : "平文（HTTP）", body: plain, label: `平文のデータ：${plain}` }
      : step.stop === "arrived"
        ? { state: "decrypted" as const, tag: "サーバで復号", body: plain, label: `サーバで復号されたデータ：${plain}` }
        : {
            state: "encrypted" as const,
            tag: "ENCRYPTED DATA",
            body: cipher.length > 14 ? `${cipher.slice(0, 14)}…` : cipher || "…",
            label: "暗号化されたデータ",
          };
  return (
    <div className="mx-auto max-w-xl">
      <HttpsScene
        mode={mode}
        nodes={step.nodes}
        laneActive={step.laneActive}
        capsule={{ stop: step.stop, ...capsule }}
        eveSees={step.intercepted ? (https ? cipher || "…" : plain) : null}
        trail={forward && step.moves && !reducedMotion ? `${mode}-${index}` : null}
        reducedMotion={reducedMotion}
      />
    </div>
  );
}

const VARIANTS: Record<LabVariant, VariantInfo> = {
  current: {
    label: "現行",
    name: "現行の 2.5D 模型",
    aim: "比較の基準。アイソメトリックの床に人・サーバ・盗聴者を並べた SVG。",
    how: "SVG（アイソメ投影）＋ HTML オーバーレイ",
    cost: "—",
    Scene: CurrentScene,
  },
  a: {
    label: "A 3Dジオラマ",
    name: "A. リアル 3D ジオラマ",
    aim: "本物の奥行きと光で「部屋の中の出来事」として見せる。ステップごとにカメラが寄り、ドラッグで視点を回せる。",
    how: "CSS 3D（perspective / preserve-3d）で直方体・円柱ケーブル・ガラスのTLS管を組み、人物はカメラを向くビルボード。追加ライブラリなし。",
    cost: "中：共通の 3D 部品（Box / Cylinder / Billboard / カメラ）を作れば他の図解にも流用できる。",
    Scene: DioramaScene,
  },
  b: {
    label: "B 画面で追う",
    name: "B. 3つの画面で追う",
    aim: "「誰の画面に何が映るか」を実物そっくりのブラウザ・盗聴ツール・サーバログで直接見せる。抽象化を最小にして直感で分かる。",
    how: "HTML/CSS の UI モック（ブラウザ枠・ターミナル・ログ）＋ 通信路を流れる文字。ステップごとに主役の画面へスポットライト。",
    cost: "低：DOM だけで作れ、文字が常に読める（スマホでも縮まない）。他の通信系テーマへ横展開しやすい。",
    Scene: ScreenStoryScene,
  },
  c: {
    label: "C ハガキと封筒",
    name: "C. ハガキと封筒（たとえをそのまま絵に）",
    aim: "冒頭のたとえ「HTTP＝ハガキ／HTTPS＝封筒」をそのまま街のイラストにし、配達員が運ぶ物語で記憶に残す。",
    how: "レイヤー構成の SVG イラスト（空・丘・道・家・ビル）＋ 道に沿って走る配達員（rAF で経路追従）＋ 盗聴者の虫めがね拡大。",
    cost: "中：絵の作り込みが必要。テーマごとにたとえの絵を描き起こす形になる。",
    Scene: LetterScene,
  },
  d: {
    label: "D 2.5D改",
    name: "D. 2.5D のアップグレード（フリーWi-Fi のカフェ）",
    aim: "現行と同じアイソメトリックの見せ方のまま、舞台を「盗聴が実際に起きやすいフリーWi-Fiのカフェ」にして作り込む。電波が床いっぱいに広がり、隣の席にも届くのが一目で分かる。",
    how: "SVG のアイソメ投影。面ごとの陰影・やわらかい影・壁と家具・広がる電波の輪・光る小包。拡大しても線がにじまない。",
    cost: "低〜中：今の 2.5D 部品の延長で作れ、本番の他の図解もそのまま底上げできる。",
    Scene: IsoCafeScene,
  },
  e: {
    label: "E 3Dカフェ",
    name: "E. リアル 3D（フリーWi-Fi のカフェ）",
    aim: "A の 3D を実際の場面に置き換え。カフェの席からの電波が壁のフリーWi-Fiと隣の席の盗聴者の両方に届き、インターネットを通ってデータセンターの Webサーバへ。",
    how: "A と同じ CSS 3D 部品。空中の電波の経路は傾いた円柱、電波はカメラを向く輪。HTTPS では PC からサーバまでガラスのトンネルが通る。",
    cost: "中：A の部品をそのまま使える。",
    Scene: HttpsCafeScene,
  },
  f: {
    label: "F 3D＋画面",
    name: "F. 3D カフェ ＋ 画面を拡大",
    aim: "E の 3D に、B の実物そっくりの画面を拡大してつなげる。「どこで」（3D）と「何が見えるか」（画面）を同時に見せる。",
    how: "ステップの主役の機器から、下の拡大画面へ光の帯を伸ばす（3D の点を毎フレーム投影）。画面は B の部品をそのまま使用。",
    cost: "中：E と B の部品の組み合わせ。文字は常に読める大きさ。",
    Scene: CafeScreensScene,
  },
};

export default function SceneLab({ initialVariant }: { initialVariant: LabVariant }) {
  const [variant, setVariant] = useState<LabVariant>(initialVariant);
  const [text, setText] = useState("password: himitsu123");
  const [mode, setMode] = useState<HttpsMode>("http");
  const reducedMotion = useReducedMotion();
  const player = useStepPlayer(FLOW_STEPS.length, reducedMotion);
  const step = FLOW_STEPS[player.index];
  const https = mode === "https";
  const info = VARIANTS[variant];
  const Scene = info.Scene;

  function selectVariant(next: LabVariant) {
    setVariant(next);
    // URL に残すのは便利機能だけ（埋め込み先などで history が使えなくても切替は動かす）
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("v", next);
      window.history.replaceState(null, "", url);
    } catch {}
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-gray-900 px-4 py-4 text-white">
        <div className="mx-auto w-full max-w-3xl">
          <p className="text-lg font-bold">図解ラボ：表示手法の3パターン</p>
          <p className="mt-0.5 text-xs font-semibold text-white/70">
            開発環境専用。題材は「HTTPとHTTPS ① 盗み見くらべ」。内容（ステップ・文言）は本番と同じで、描き方だけを差し替えています。
          </p>
        </div>
      </header>

      <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-5">
        <div className="grid grid-cols-4 gap-1 rounded-xl bg-white p-1 ring-1 ring-gray-200 sm:grid-cols-7" role="tablist" aria-label="表示パターン">
          {(Object.keys(VARIANTS) as LabVariant[]).map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={variant === key}
              onClick={() => selectVariant(key)}
              data-testid={`lab-tab-${key}`}
              className={`rounded-lg px-1 py-2 text-xs font-bold transition ${
                variant === key ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {VARIANTS[key].label}
            </button>
          ))}
        </div>

        <section className="rounded-xl bg-white p-4 text-sm ring-1 ring-gray-200">
          <p className="font-bold text-gray-900">{info.name}</p>
          <dl className="mt-2 space-y-1.5 text-[13px] leading-relaxed text-gray-600">
            <div className="flex gap-2">
              <dt className="w-10 flex-none font-bold text-gray-800">狙い</dt>
              <dd>{info.aim}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-10 flex-none font-bold text-gray-800">手法</dt>
              <dd>{info.how}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-10 flex-none font-bold text-gray-800">展開</dt>
              <dd>{info.cost}</dd>
            </div>
          </dl>
        </section>

        {/* ここから下は本番の ① 盗み見くらべ と同じ操作・文言 */}
        <section className="rounded-xl bg-white p-5 ring-1 ring-gray-200">
          <div className="flex items-center gap-2">
            <label htmlFor="lab-payload" className="flex-none text-sm text-gray-500">送る内容：</label>
            <input
              id="lab-payload"
              value={text}
              maxLength={28}
              onChange={(e) => setText(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border-2 border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2" role="group" aria-label="通信方式">
            <button
              type="button"
              onClick={() => setMode("http")}
              aria-pressed={!https}
              data-testid="lab-mode-http"
              className={`rounded-lg py-2 text-sm font-bold transition active:scale-95 ${
                !https ? "bg-rose-500 text-white" : "text-gray-500 ring-1 ring-gray-300"
              }`}
            >
              HTTP（暗号化なし）
            </button>
            <button
              type="button"
              onClick={() => setMode("https")}
              aria-pressed={https}
              data-testid="lab-mode-https"
              className={`rounded-lg py-2 text-sm font-bold transition active:scale-95 ${
                https ? "bg-emerald-600 text-white" : "text-gray-500 ring-1 ring-gray-300"
              }`}
            >
              HTTPS 🔒（暗号化）
            </button>
          </div>

          <div className="mt-3 min-w-0">
            <p className="text-[11px] font-bold text-brand-700">
              STEP {player.index + 1} / {FLOW_STEPS.length}
            </p>
            <p className="mt-0.5 text-sm font-bold text-gray-900">{step.title}</p>
          </div>

          <div className="-mx-2 mt-2 sm:mx-0" data-testid="lab-scene">
            <Scene
              key={variant}
              mode={mode}
              index={player.index}
              step={step}
              plain={text || "（空）"}
              cipher={scramble(text)}
              forward={player.forward}
              reducedMotion={reducedMotion}
            />
          </div>

          <div
            className="mt-3 rounded-xl bg-sky-50 px-4 py-3 text-sm leading-relaxed text-gray-700 ring-1 ring-sky-200 [&_b]:text-gray-900"
            aria-live="polite"
          >
            {step.detail[mode]}
          </div>

          <div className="mt-3">
            <SceneTimeline
              index={player.index}
              steps={FLOW_STEPS}
              playing={player.playing}
              reducedMotion={reducedMotion}
              onMove={player.move}
              onTogglePlay={player.togglePlay}
              playLabel="通信を再生"
              timelineLabel="通信のタイムライン"
              startCaption="入力"
              endCaption="サーバに届く"
            />
          </div>
        </section>
      </div>
    </main>
  );
}
