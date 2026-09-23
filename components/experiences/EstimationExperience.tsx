"use client";

import { useState } from "react";
import {
  EstimationPractice,
  MethodStage,
  PersonMonthStage,
  PhaseSumStage,
  ProductivityStage,
  StaffChangeStage,
} from "./estimation/EstimationStages";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「見積り（FP法・人月）」専用の体験。
//   ① FP法＝機能の数と複雑さから規模を出す（機能を増やすとFPが増える）
//   ②〜⑦ estimation/EstimationStages：人月は面積 → 生産性で割る → 工程ごとに足す
//        → 途中で人数が変わる → 手法の使い分け → 確認5問
// ============================================================================

const FUNCS = [
  { key: "input", emo: "⌨️", name: "入力（画面）", w: 4 },
  { key: "output", emo: "🧾", name: "出力（帳票）", w: 5 },
  { key: "query", emo: "🔍", name: "照会（検索）", w: 4 },
  { key: "file", emo: "🗄️", name: "ファイル（データ）", w: 7 },
];

function FpCounter() {
  const [counts, setCounts] = useState<Record<string, number>>({
    input: 1,
    output: 1,
    query: 0,
    file: 1,
  });
  const fp = FUNCS.reduce((sum, f) => sum + counts[f.key] * f.w, 0);

  const set = (k: string, delta: number) =>
    setCounts((p) => ({ ...p, [k]: Math.max(0, Math.min(9, p[k] + delta)) }));

  return (
    <Panel>
      <SectionTitle step={1}>FP法 ― 機能の数で規模を見積もる</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        <b className="text-gray-800">FP法（ファンクションポイント法）</b>は、
        画面・帳票・データなど<b className="text-gray-800">「機能の数と複雑さ」</b>から開発規模を見積もります。
        機能を増減すると合計（FP）が変わります。
      </p>

      <div className="mt-3 space-y-2">
        {FUNCS.map((f) => (
          <div
            key={f.key}
            className="flex items-center gap-2 rounded-xl bg-gray-50 p-2.5 ring-1 ring-gray-200"
          >
            <span className="text-lg">{f.emo}</span>
            <span className="text-sm font-bold text-gray-800">{f.name}</span>
            <span className="text-[10px] font-bold text-gray-400">×{f.w}点</span>
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => set(f.key, -1)}
                className="grid h-7 w-7 place-items-center rounded-lg bg-white text-base font-bold text-gray-600 ring-1 ring-gray-300 active:scale-95"
              >
                −
              </button>
              <span className="w-5 text-center font-mono text-sm font-bold text-gray-800">
                {counts[f.key]}
              </span>
              <button
                onClick={() => set(f.key, 1)}
                className="grid h-7 w-7 place-items-center rounded-lg bg-brand-600 text-base font-bold text-white active:scale-95"
              >
                ＋
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 rounded-xl bg-brand-50 px-4 py-3 text-center ring-1 ring-brand-200">
        <div className="text-xs font-bold text-brand-500">合計ファンクションポイント</div>
        <div className="mt-0.5 text-2xl font-bold text-brand-700">{fp} FP</div>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-gray-500">
        ※ ポイントは「<b>利用者から見た機能</b>」で測ること。
        プログラムの<b>行数で測るのではない</b>のがFP法の特徴です。
      </p>
    </Panel>
  );
}

export default function EstimationExperience() {
  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        📐 見積りは、開発の<b>規模や手間を前もって数値化</b>すること。
        <b>FP法＝機能の数から規模／人月＝人数×期間で工数</b>。計算のしかたと、手法の選び方まで進みます。
      </div>

      <FpCounter />
      <PersonMonthStage />
      <ProductivityStage />
      <PhaseSumStage />
      <StaffChangeStage />
      <MethodStage />
      <EstimationPractice />
    </div>
  );
}
