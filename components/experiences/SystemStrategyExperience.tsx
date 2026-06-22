"use client";

import { useState } from "react";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「システム戦略」専用の体験。
//   ① IT導入は「目的」ではなく「手段」。良い考え方 ⇄ ダメな考え方をトグル比較
//   ② 目的 → IT → 効果 の流れ
//   ③ システム戦略の考え方として適切か クイズ
// ============================================================================

function MeansVsGoal() {
  const [good, setGood] = useState(true);
  return (
    <Panel>
      <SectionTitle step={1}>ITは「手段」？「目的」？</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        新しいシステムを入れること<b className="text-gray-800">自体</b>がゴールではありません。切り替えて比べてみよう。
      </p>

      <div className="mt-4 grid grid-cols-2 gap-1.5 rounded-xl bg-gray-100 p-1">
        <button
          onClick={() => setGood(false)}
          className={`rounded-lg px-2 py-2 text-sm font-bold transition active:scale-95 ${
            !good ? "bg-rose-500 text-white" : "text-gray-500"
          }`}
        >
          🙅 ダメな考え方
        </button>
        <button
          onClick={() => setGood(true)}
          className={`rounded-lg px-2 py-2 text-sm font-bold transition active:scale-95 ${
            good ? "bg-emerald-500 text-white" : "text-gray-500"
          }`}
        >
          🙆 良い考え方
        </button>
      </div>

      <div
        className={`mt-3 rounded-xl px-4 py-4 ring-1 ${
          good ? "bg-emerald-50 ring-emerald-200" : "bg-rose-50 ring-rose-200"
        }`}
      >
        {good ? (
          <>
            <p className="text-sm font-extrabold text-emerald-700">「売上を伸ばすために、ITをどう使う？」</p>
            <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-gray-700">
              <li>🎯 まず<b>経営の目的</b>（売上・効率・コスト）を決める</li>
              <li>🛠️ 目的に合うITを<b>手段</b>として選ぶ</li>
              <li>📈 効果を測れるようにして導入する</li>
            </ul>
          </>
        ) : (
          <>
            <p className="text-sm font-extrabold text-rose-700">「最新のITだから、とりあえず導入しよう」</p>
            <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-gray-700">
              <li>❌ 目的があいまいなまま導入する</li>
              <li>❌ 「入れること」がゴールになっている</li>
              <li>❌ 効果が出ず、お金だけかかる</li>
            </ul>
          </>
        )}
      </div>

      <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        💡 勉強アプリを入れること自体がゴールではなく、<b>成績を上げるためにどう使うか</b>を考えるのと同じ。
      </div>
    </Panel>
  );
}

function Flow() {
  const steps = [
    { emoji: "🎯", t: "経営の目的", d: "売上を伸ばす・コストを下げる など" },
    { emoji: "🛠️", t: "ITを手段に", d: "目的に合うシステムを選ぶ・作る" },
    { emoji: "📈", t: "効果を測る", d: "本当に目的に役立ったか評価する" },
  ];
  return (
    <Panel>
      <SectionTitle step={2}>目的 → 手段 → 効果の順番</SectionTitle>
      <div className="mt-3 flex items-stretch gap-1">
        {steps.map((s, i) => (
          <div key={s.t} className="flex flex-1 items-center gap-1">
            <div className="flex-1 rounded-xl bg-indigo-50 p-3 text-center ring-1 ring-indigo-200">
              <div className="text-xl">{s.emoji}</div>
              <div className="mt-1 text-xs font-extrabold text-indigo-700">{s.t}</div>
              <p className="mt-0.5 text-[10px] leading-tight text-gray-500">{s.d}</p>
            </div>
            {i < steps.length - 1 && <span className="text-lg text-gray-300">→</span>}
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-xl bg-sky-50 px-4 py-3 text-sm leading-relaxed text-sky-900 ring-1 ring-sky-200">
        🔄 この「目的に役立てる」考え方が<b>システム戦略</b>。ITで会社を変える取り組みは <b>DX</b> とも呼ばれます。
      </div>
    </Panel>
  );
}

const ITEMS: { t: string; ok: boolean; why: string }[] = [
  { t: "経営目標の達成に向けてITの使い方を考える", ok: true, why: "システム戦略そのもの。目的に役立てる視点。" },
  { t: "流行っている技術を、目的なく入れる", ok: false, why: "手段が目的化している。効果を出しにくい。" },
  { t: "導入後に効果を測り、改善につなげる", ok: true, why: "効果測定は戦略の大事な一部。" },
  { t: "プログラムの細かい文法だけを先に決める", ok: false, why: "それは実装の話。戦略はもっと上の「目的と活用」。" },
];

function Quiz() {
  const [answers, setAnswers] = useState<Record<number, boolean>>({});
  return (
    <Panel>
      <SectionTitle step={3}>システム戦略の考え方として正しい？</SectionTitle>
      <ul className="mt-3 space-y-2.5">
        {ITEMS.map((it, i) => {
          const chosen = answers[i];
          const answered = chosen !== undefined;
          const correct = chosen === it.ok;
          return (
            <li key={i} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
              <p className="text-sm font-bold text-gray-800">{it.t}</p>
              <div className="mt-2 flex gap-2">
                {[
                  { v: true, label: "⭕ 正しい" },
                  { v: false, label: "🙅 ちがう" },
                ].map((opt) => {
                  const picked = chosen === opt.v;
                  const tone = !answered
                    ? "text-gray-600 ring-1 ring-gray-300"
                    : picked
                      ? opt.v === it.ok
                        ? "bg-emerald-500 text-white"
                        : "bg-rose-500 text-white"
                      : opt.v === it.ok
                        ? "ring-2 ring-emerald-400 text-emerald-700"
                        : "text-gray-400 ring-1 ring-gray-200";
                  return (
                    <button
                      key={String(opt.v)}
                      onClick={() => setAnswers((p) => ({ ...p, [i]: opt.v }))}
                      className={`flex-1 rounded-lg px-2 py-1.5 text-sm font-bold transition active:scale-95 ${tone}`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              {answered && (
                <p className={`mt-2 text-xs font-medium ${correct ? "text-emerald-700" : "text-rose-600"}`}>
                  {correct ? "⭕ 正解！ " : "❌ 残念。 "}
                  {it.why}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

export default function SystemStrategyExperience() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        🧩 <b>システム戦略</b>は、会社の目標を達成するためにITを<b>どう活用するか</b>を考えること。
        ITを入れること自体が目的ではなく、あくまで<b>手段</b>です。
      </div>

      <MeansVsGoal />
      <Flow />
      <Quiz />
    </div>
  );
}
