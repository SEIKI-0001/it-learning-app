"use client";

import { useState } from "react";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「プロジェクトとQCD」専用の体験。
//   ① 通常業務 ⇄ プロジェクトの違い
//   ② QCDの3観点（品質・費用・納期）
//   ③ トレードオフ体験：作戦を選ぶとQCDメーターが動き、しわ寄せが見える
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

type Pri = "Q" | "C" | "D" | "balance";
const PLANS: Record<Pri, { label: string; emoji: string; q: number; c: number; d: number; effect: string }> = {
  Q: {
    label: "品質を最優先",
    emoji: "⭐",
    q: 95,
    c: 30,
    d: 35,
    effect: "丁寧に作り込んだ分、お金と時間を使いすぎ。予算オーバー＆本番に間に合わないかも…",
  },
  C: {
    label: "費用を最優先",
    emoji: "💰",
    q: 35,
    c: 95,
    d: 45,
    effect: "節約した分、人手も材料も足りず出来ばえがボロボロに。急ごしらえで納期もギリギリ…",
  },
  D: {
    label: "納期を最優先",
    emoji: "📅",
    q: 35,
    c: 45,
    d: 95,
    effect: "急いで仕上げた分、確認不足で出来ばえが雑に。人を急きょ増やしてお金も余計にかかった…",
  },
  balance: {
    label: "バランス重視",
    emoji: "⚖️",
    q: 70,
    c: 70,
    d: 70,
    effect: "どれも満点ではないけれど、全部が合格ライン。これがプロジェクトマネジメントの基本です！",
  },
};

const GAUGES = [
  { key: "q" as const, emoji: "⭐", name: "品質", sub: "出来ばえ" },
  { key: "c" as const, emoji: "💰", name: "費用", sub: "予算の余裕" },
  { key: "d" as const, emoji: "📅", name: "納期", sub: "時間の余裕" },
];

function Tradeoff() {
  const [pri, setPri] = useState<Pri | null>(null);
  const plan = pri ? PLANS[pri] : null;
  const barTone = (v: number) => (v >= 70 ? "bg-emerald-500" : v >= 50 ? "bg-amber-400" : "bg-rose-500");
  const textTone = (v: number) => (v >= 70 ? "text-emerald-600" : v >= 50 ? "text-amber-600" : "text-rose-600");

  return (
    <Panel>
      <SectionTitle step={3}>3つは引っ張り合う（トレードオフ）</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        文化祭のカフェ企画をあなたが仕切るとしたら？　<b className="text-gray-800">作戦を選んで</b>、
        3つのメーターがどう動くか見てみよう。
      </p>

      <div className="mt-4 grid grid-cols-2 gap-1.5">
        {(["Q", "C", "D", "balance"] as Pri[]).map((k) => (
          <button
            key={k}
            onClick={() => setPri(k)}
            className={`rounded-lg px-1 py-2 text-xs font-bold transition active:scale-95 ${
              pri === k ? "bg-indigo-600 text-white" : "text-gray-600 ring-1 ring-gray-300"
            }`}
          >
            {PLANS[k].emoji} {PLANS[k].label}
          </button>
        ))}
      </div>

      {/* QCDメーター */}
      <div className="mt-4 space-y-2.5">
        {GAUGES.map((g) => {
          const v = plan ? plan[g.key] : 60;
          return (
            <div key={g.key} className="flex items-center gap-2">
              <div className="w-20 flex-none text-right">
                <span className="text-sm font-extrabold text-gray-800">
                  {g.emoji} {g.name}
                </span>
                <div className="text-[10px] text-gray-400">{g.sub}</div>
              </div>
              <div className="h-5 flex-1 overflow-hidden rounded-full bg-gray-100 ring-1 ring-gray-200">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${plan ? barTone(v) : "bg-gray-300"}`}
                  style={{ width: `${v}%` }}
                />
              </div>
              <span className={`w-10 flex-none font-mono text-xs font-extrabold ${plan ? textTone(v) : "text-gray-400"}`}>
                {v}
              </span>
            </div>
          );
        })}
      </div>

      <div
        className={`mt-3 min-h-[3.5em] rounded-xl px-4 py-3 text-sm leading-relaxed ring-1 ${
          !plan
            ? "bg-gray-50 text-gray-400 ring-gray-200"
            : pri === "balance"
              ? "bg-emerald-50 text-emerald-900 ring-emerald-200"
              : "bg-rose-50 text-rose-900 ring-rose-200"
        }`}
      >
        {plan ? (
          <>
            <b>{plan.emoji} {plan.label}</b>にすると… {plan.effect}
          </>
        ) : (
          <>上の作戦ボタンを押すと、1つを上げたとき他のメーターがどう下がるかが見えます。</>
        )}
      </div>

      <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        💡 3つ全部を100にはできない。だから<b>どれか1つに偏らず、3つの釣り合い</b>をとって計画・調整するのが基本です。
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
