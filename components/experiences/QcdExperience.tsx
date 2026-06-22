"use client";

import { useState } from "react";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「プロジェクトとQCD」専用の体験。
//   ① 通常業務 ⇄ プロジェクトの違い
//   ② QCDの3観点（品質・費用・納期）
//   ③ トレードオフ体験：1つを優先すると他が引っ張られる
// ============================================================================

function WhatIsProject() {
  return (
    <Panel>
      <SectionTitle step={1}>プロジェクトってなに？</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        毎日くり返す<b className="text-gray-800">通常業務</b>とちがい、
        <b className="text-gray-800">始まりと終わりが決まった一度きりの仕事</b>がプロジェクトです。
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <div className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
          <div className="text-sm font-extrabold text-gray-600">🔁 通常業務</div>
          <p className="mt-1 text-xs leading-relaxed text-gray-500">
            毎日同じ手順をくり返す。終わりは決まっていない。（例：日々のレジ打ち）
          </p>
        </div>
        <div className="rounded-xl bg-indigo-50 p-3 ring-1 ring-indigo-200">
          <div className="text-sm font-extrabold text-indigo-700">🎯 プロジェクト</div>
          <p className="mt-1 text-xs leading-relaxed text-gray-600">
            期限と目標がある一度きり。終わったら解散。（例：文化祭の出し物づくり）
          </p>
        </div>
      </div>
      <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        💡 進め方を管理するのが<b>プロジェクトマネジメント</b>。出来ばえは <b>QCD</b> の3つで見ます。
      </div>
    </Panel>
  );
}

function QcdCards() {
  const cards = [
    { k: "Q", emoji: "⭐", name: "Quality（品質）", desc: "求められる出来ばえを満たしているか" },
    { k: "C", emoji: "💰", name: "Cost（費用）", desc: "決めた予算の中におさまっているか" },
    { k: "D", emoji: "📅", name: "Delivery（納期）", desc: "決めた期限までに仕上がるか" },
  ];
  return (
    <Panel>
      <SectionTitle step={2}>QCD ＝ 3つの観点</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        頭文字で <b className="text-gray-800">QCD</b>。文化祭でいうと「良い内容に（品質）／お金は範囲内で（費用）／本番に間に合わせる（納期）」。
      </p>
      <div className="mt-3 space-y-2.5">
        {cards.map((c) => (
          <div key={c.k} className="flex items-center gap-3 rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
            <span className="grid h-9 w-9 flex-none place-items-center rounded-lg bg-white text-lg ring-1 ring-gray-200">
              {c.emoji}
            </span>
            <div>
              <div className="text-sm font-extrabold text-gray-800">{c.name}</div>
              <div className="text-xs text-gray-500">{c.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

type Pri = "Q" | "C" | "D";
const TRADEOFF: Record<Pri, { label: string; emoji: string; effect: string }> = {
  Q: {
    label: "品質を最優先",
    emoji: "⭐",
    effect: "丁寧に作り込むほど、時間がかかり（納期↑）、人手やお金も増えます（費用↑）。",
  },
  C: {
    label: "費用を最優先",
    emoji: "💰",
    effect: "お金を抑えると、人や時間が足りず品質が落ちやすい（品質↓）。無理に間に合わせると納期も危うい。",
  },
  D: {
    label: "納期を最優先",
    emoji: "📅",
    effect: "急いで仕上げると、確認不足で品質が落ちやすく（品質↓）、人を増やせば費用も増えます（費用↑）。",
  },
};

function Tradeoff() {
  const [pri, setPri] = useState<Pri | null>(null);
  const corner = (k: Pri, pos: string) => {
    const on = pri === k;
    return (
      <div className={`${pos} flex flex-col items-center`}>
        <div
          className={`grid h-14 w-14 place-items-center rounded-full text-xl font-extrabold ring-2 transition ${
            on ? "bg-indigo-600 text-white ring-indigo-600 scale-110" : "bg-white text-gray-400 ring-gray-300"
          }`}
        >
          {k}
        </div>
        <span className={`mt-1 text-[11px] font-bold ${on ? "text-indigo-700" : "text-gray-400"}`}>
          {k === "Q" ? "品質" : k === "C" ? "費用" : "納期"}
        </span>
      </div>
    );
  };
  return (
    <Panel>
      <SectionTitle step={3}>3つは引っ張り合う（トレードオフ）</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        QCDは<b className="text-gray-800">同時に全部を最高にはできません</b>。1つを優先すると、他が犠牲になりがち。試してみよう。
      </p>

      {/* 三角形 */}
      <div className="mt-4">
        <div className="flex justify-center">{corner("Q", "")}</div>
        <div className="mt-1 text-center text-lg text-gray-300">△</div>
        <div className="flex justify-between px-6">
          {corner("C", "")}
          {corner("D", "")}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-1.5">
        {(["Q", "C", "D"] as Pri[]).map((k) => (
          <button
            key={k}
            onClick={() => setPri(k)}
            className={`rounded-lg px-1 py-2 text-xs font-bold transition active:scale-95 ${
              pri === k ? "bg-indigo-600 text-white" : "text-gray-600 ring-1 ring-gray-300"
            }`}
          >
            {TRADEOFF[k].emoji} {TRADEOFF[k].label}
          </button>
        ))}
      </div>

      <div className="mt-3 min-h-[3.5em] rounded-xl bg-sky-50 px-4 py-3 text-sm leading-relaxed text-gray-700 ring-1 ring-sky-200">
        {pri ? (
          <>
            <b className="text-gray-900">{TRADEOFF[pri].label}</b>すると… {TRADEOFF[pri].effect}
          </>
        ) : (
          <span className="text-gray-400">上のボタンを押すと、優先した結果どこにしわ寄せが行くか分かります。</span>
        )}
      </div>

      <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        💡 だから<b>どれか1つに偏らず、3つの釣り合い</b>をとって計画・調整するのが基本です。
      </div>
    </Panel>
  );
}

export default function QcdExperience() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        🎯 <b>プロジェクト</b>は「期限のある一度きりの仕事」。その出来ばえは
        <b>品質(Q)・費用(C)・納期(D)</b> の3つで見ます。この3つは<b>引っ張り合う</b>のがポイント。
      </div>

      <WhatIsProject />
      <QcdCards />
      <Tradeoff />
    </div>
  );
}
