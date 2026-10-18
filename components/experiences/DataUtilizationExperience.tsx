"use client";

import { useState, type ReactNode } from "react";
import { DecisionStage, type DataMode } from "./datautil/DecisionStage";
import { SceneTimeline } from "./scene/SceneTimeline";
import { useReducedMotion } from "./scene/useReducedMotion";
import { CenterStage, OutlierStage, ProbabilityStage, SpreadStage, StatsPractice, StatsSummaryStage } from "./stats/StatsStages";
import { useStepPlayer } from "./scene/useStepPlayer";
import { Panel, SectionTitle } from "./ui";
import { AnalysisMethods, BigDataScales, DeviationStage } from "./datautil/DataTermPanels";
import { InlineIcon } from "@/components/ui/Pictogram";

// ============================================================================
// 「データ活用」専用の体験。
//   ① 成績アップ大作戦 … 実データ（科目別の点数）が「数字の山→グラフ→気づき→行動→結果」
//      と変化していく様子を1つのステージで動かす（カードが列へ移動して棒グラフになる／数学が浮かぶ／
//      行動カードが生まれる／次のテストで棒が伸びる）。比較用に「ためるだけ」も切り替えられる
//   ② 分析の手法と図表（A/Bテスト・主成分分析・クラスター分析・ABC分析・BI・バブルチャート）
//   ③ ビッグデータの用語（3V・ライフログ・データサイエンティスト等）と、データの尺度4種
//      ②③は過去問の出題に合わせた静的な図（datautil/DataTermPanels）
//   ④〜⑩ 確率・統計（stats/StatsStages）。①〜③とは別の学習ブロック：
//        確率（余事象も）→ 平均・中央値・最頻値 → 外れ値 → ばらつき（標準偏差）→ 偏差値 → まとめ → 確認4問
// ============================================================================

// ① 成績アップ大作戦 --------------------------------------------------------
const STEPS: { badge: string; title: string; use: ReactNode; store: ReactNode }[] = [
  {
    badge: "目的",
    title: "目的を決める",
    use: <>まず<b>目的</b>を決める：「テストの成績を上げたい」。目的がないと、何のデータを集めて何を見ればいいか分かりません。</>,
    store: <>目的は同じ「テストの成績を上げたい」。ここから<b>ためるだけ</b>だとどうなるかを見てみます。</>,
  },
  {
    badge: "集める",
    title: "点数を集める",
    use: <>各科目の点数を集めました。でも<b>数字がバラバラに並んだまま</b>では、パッと見て何も分かりません…。</>,
    store: <>各科目の点数を集めました。<b>数字がバラバラ</b>に並んでいます。</>,
  },
  {
    badge: "見える化",
    title: "グラフにする",
    use: <>同じ数字が<b>自分の列へ移動して棒グラフ</b>になりました。高い・低いがひと目で分かる。これが「見える化」。</>,
    store: <>数字を<b>保存箱にしまいました</b>。データはちゃんと残っています…が、それだけ。</>,
  },
  {
    badge: "気づく",
    title: "低いところが浮かぶ",
    use: <>平均線を引くと…<b>数学だけ平均より大きく低い</b>！ 数字の山では埋もれていた傾向が浮かび上がりました。</>,
    store: <>箱の中のデータを眺めても、<b>何も浮かんできません</b>。見える化していないからです。</>,
  },
  {
    badge: "行動",
    title: "行動に変える",
    use: <>気づきから<b>行動</b>が生まれる：「<b>数学を重点学習</b>（毎日 +20分）」。ここで初めてデータが意思決定に変わります。</>,
    store: <>気づきがないので、<b>やることも変わりません</b>。いつもどおりの勉強を続けます。</>,
  },
  {
    badge: "結果",
    title: "次のテストで確かめる",
    use: <>次のテストで<b>数学 45 → 68</b>。点線が前回の高さ（Before）です。<b>可視化 → 発見 → 行動</b>まで行ってこそデータ活用。</>,
    store: <>次のテストでも<b>数学は 45 のまま</b>。データを保存しただけでは、価値は生まれません。</>,
  },
];

function Flow() {
  const reducedMotion = useReducedMotion();
  const [mode, setMode] = useState<DataMode>("use");
  const player = useStepPlayer(STEPS.length, reducedMotion);
  const step = STEPS[player.index];
  const last = player.index === player.lastIndex;
  const [tried, setTried] = useState<Set<DataMode>>(new Set());
  if (last && !tried.has(mode)) setTried(new Set(tried).add(mode));
  return (
    <Panel>
      <SectionTitle step={1}>成績アップ大作戦 ― データ活用の流れ</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        データは<b className="text-gray-800">集めて終わりではありません</b>。1歩ずつ進めて、
        数字の山が<b className="text-gray-800">行動</b>に変わるまでを見てみよう。
      </p>

      <div className="mt-3 grid grid-cols-2 gap-1.5">
        {(
          [
            { v: "use", label: "活用する", on: "bg-brand-600 text-white" },
            { v: "store", label: "比較：ためるだけ", on: "bg-gray-700 text-white" },
          ] as const
        ).map((o) => (
          <button
            key={o.v}
            type="button"
            aria-pressed={mode === o.v}
            onClick={() => {
              setMode(o.v);
              player.reset();
            }}
            className={`rounded-lg px-2 py-1.5 text-xs font-bold transition active:scale-95 ${mode === o.v ? o.on : "text-gray-600 ring-1 ring-gray-300"}`}
          >
            {o.label}
            {tried.has(o.v) && " ✓"}
          </button>
        ))}
      </div>

      <div className="mt-3 flex gap-1">
        {STEPS.map((s, i) => (
          <div
            key={s.badge}
            className={`flex-1 rounded-md px-0.5 py-1.5 text-center text-[10px] font-bold transition ${
              i === player.index ? "bg-brand-600 text-white" : i < player.index ? "bg-brand-100 text-brand-600" : "bg-gray-100 text-gray-400"
            }`}
          >
            {s.badge}
          </div>
        ))}
      </div>

      <div className="-mx-2 mt-3 sm:mx-auto sm:max-w-xl">
        <DecisionStage mode={mode} phase={player.index} reducedMotion={reducedMotion} />
      </div>

      <div
        className={`mt-3 min-h-[4.5em] rounded-xl px-4 py-3 text-sm leading-relaxed text-gray-700 ring-1 [&_b]:text-gray-900 ${
          mode === "store" && player.index >= 2 ? "bg-gray-50 ring-gray-200" : "bg-sky-50 ring-sky-200"
        }`}
        aria-live="polite"
      >
        <b>{step.badge}</b>：{mode === "use" ? step.use : step.store}
      </div>

      <div className="mt-3">
        <SceneTimeline
          index={player.index}
          steps={STEPS}
          playing={player.playing}
          reducedMotion={reducedMotion}
          onMove={player.move}
          onTogglePlay={player.togglePlay}
          playLabel="データ活用の流れを再生"
          timelineLabel="データ活用の流れのタイムライン"
          startCaption="目的"
          endCaption="次のテスト"
        />
      </div>

      {tried.size === 2 && (
        <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200" data-testid="data-lesson">
          <InlineIcon name="lightbulb" />同じデータでも、<b>ためるだけ</b>では次のテストは変わらない。<b>可視化 → 発見 → 行動</b>まで進めて初めて「データ活用」になります。
        </div>
      )}
    </Panel>
  );
}

export default function DataUtilizationExperience() {
  return (
    <div className="space-y-5">
      <div className="border-l-[3px] border-gray-900 py-0.5 pl-4 text-[15px] leading-[1.8] text-gray-700 [&_b]:font-bold [&_b]:text-gray-900">
        <b>データ活用</b>は、集めて終わりではありません。テストの点数をただ保存するのではなく、
        <b>苦手科目を見つけて勉強計画を変える</b>——判断や改善につなげるまでが活用です。
        後半（④〜）は別ブロックで、データを読むための<b>確率・統計</b>（平均・中央値・標準偏差など）を扱います。
      </div>

      <Flow />
      <AnalysisMethods step={2} />
      <BigDataScales step={3} />
      <ProbabilityStage />
      <CenterStage />
      <OutlierStage />
      <SpreadStage />
      <DeviationStage step={8} />
      <StatsSummaryStage />
      <StatsPractice />
    </div>
  );
}
