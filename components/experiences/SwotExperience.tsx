"use client";

import { useState } from "react";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「SWOT分析」専用の体験。
//   ① 2軸（内部/外部 × プラス/マイナス）でできる4マスを、タップで確認
//   ② 具体例を4マスへ振り分けるクイズ（内 ⇄ 外 の取り違えがポイント）
// ============================================================================

type Q = "S" | "W" | "O" | "T";

const CELLS: Record<Q, { name: string; emoji: string; axis: string; desc: string; ex: string; color: string }> = {
  S: {
    name: "強み (Strength)",
    emoji: "💪",
    axis: "内部 × プラス",
    desc: "自社の中にある、得意なこと・有利なこと",
    ex: "例：ファンが多い、技術力が高い",
    color: "emerald",
  },
  W: {
    name: "弱み (Weakness)",
    emoji: "😓",
    axis: "内部 × マイナス",
    desc: "自社の中にある、苦手なこと・不利なこと",
    ex: "例：知名度が低い、人手が足りない",
    color: "rose",
  },
  O: {
    name: "機会 (Opportunity)",
    emoji: "🌱",
    axis: "外部 × プラス",
    desc: "外の世界に起きている、追い風になること",
    ex: "例：市場が拡大、流行が来ている",
    color: "sky",
  },
  T: {
    name: "脅威 (Threat)",
    emoji: "🌪️",
    axis: "外部 × マイナス",
    desc: "外の世界に起きている、向かい風になること",
    ex: "例：強い競合の出現、不景気",
    color: "amber",
  },
};

const TONE: Record<string, { on: string; off: string }> = {
  emerald: { on: "bg-emerald-500 text-white ring-emerald-500", off: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  rose: { on: "bg-rose-500 text-white ring-rose-500", off: "bg-rose-50 text-rose-700 ring-rose-200" },
  sky: { on: "bg-sky-500 text-white ring-sky-500", off: "bg-sky-50 text-sky-700 ring-sky-200" },
  amber: { on: "bg-amber-500 text-white ring-amber-500", off: "bg-amber-50 text-amber-700 ring-amber-200" },
};

function Quadrant() {
  const [sel, setSel] = useState<Q | null>(null);
  const cell = (q: Q) => {
    const c = CELLS[q];
    const on = sel === q;
    const tone = TONE[c.color];
    return (
      <button
        onClick={() => setSel(q)}
        className={`rounded-xl p-3 text-left ring-2 transition active:scale-95 ${on ? tone.on : tone.off}`}
      >
        <div className="text-lg leading-none">{c.emoji}</div>
        <div className="mt-1 text-xs font-extrabold leading-tight">{c.name}</div>
      </button>
    );
  };
  return (
    <Panel>
      <SectionTitle step={1}>4つのマスはどう決まる？</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        <b className="text-gray-800">内か外か</b>（自社の中／世の中）と、
        <b className="text-gray-800">プラスかマイナスか</b>の2軸で、4つのマスに分かれます。タップして確認しよう。
      </p>

      {/* 軸ラベル付き 2x2 */}
      <div className="mt-4">
        <div className="ml-12 grid grid-cols-2 text-center text-[11px] font-bold text-gray-500">
          <span>😀 プラス</span>
          <span>😟 マイナス</span>
        </div>
        <div className="mt-1 flex items-stretch gap-1">
          <div className="flex w-12 flex-col">
            <div className="flex flex-1 items-center justify-center text-[11px] font-bold text-gray-500">
              <span className="-rotate-90 whitespace-nowrap">内部</span>
            </div>
            <div className="flex flex-1 items-center justify-center text-[11px] font-bold text-gray-500">
              <span className="-rotate-90 whitespace-nowrap">外部</span>
            </div>
          </div>
          <div className="grid flex-1 grid-cols-2 gap-2">
            {cell("S")}
            {cell("W")}
            {cell("O")}
            {cell("T")}
          </div>
        </div>
      </div>

      <div className="mt-3 min-h-[4.5em] rounded-xl bg-gray-50 px-4 py-3 ring-1 ring-gray-200">
        {sel ? (
          <>
            <div className="text-sm font-extrabold text-gray-800">
              {CELLS[sel].emoji} {CELLS[sel].name}
              <span className="ml-2 rounded bg-white px-1.5 py-0.5 text-[10px] font-bold text-gray-500 ring-1 ring-gray-200">
                {CELLS[sel].axis}
              </span>
            </div>
            <p className="mt-1 text-sm leading-relaxed text-gray-700">{CELLS[sel].desc}</p>
            <p className="mt-1 text-xs text-gray-500">{CELLS[sel].ex}</p>
          </>
        ) : (
          <span className="text-sm text-gray-400">4つのマスのどれかをタップしてね。</span>
        )}
      </div>

      <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        💡 <b>強み・弱み＝内部</b>（自分で変えられる）、<b>機会・脅威＝外部</b>（自分では変えにくい）。
      </div>
    </Panel>
  );
}

const ITEMS: { t: string; ans: Q; why: string }[] = [
  { t: "うちの店はSNSのフォロワーが多い", ans: "S", why: "自社の中にある有利な点＝強み（内部×プラス）。" },
  { t: "近くに大手のライバル店ができた", ans: "T", why: "外で起きた向かい風＝脅威（外部×マイナス）。" },
  { t: "スタッフが少なく手が回らない", ans: "W", why: "自社の中の不利な点＝弱み（内部×マイナス）。" },
  { t: "この商品ジャンルの人気が上がっている", ans: "O", why: "外で起きた追い風＝機会（外部×プラス）。" },
];
const OPTS: Q[] = ["S", "W", "O", "T"];

function Quiz() {
  const [answers, setAnswers] = useState<Record<number, Q>>({});
  return (
    <Panel>
      <SectionTitle step={2}>どのマスに入る？</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        次の出来事は4つのどれ？　<b className="text-gray-800">内か外か</b>を考えるのがコツ。
      </p>
      <ul className="mt-3 space-y-2.5">
        {ITEMS.map((it, i) => {
          const chosen = answers[i];
          const correct = chosen === it.ans;
          return (
            <li key={i} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
              <p className="text-sm font-bold text-gray-800">{it.t}</p>
              <div className="mt-2 flex gap-1.5">
                {OPTS.map((opt) => {
                  const picked = chosen === opt;
                  const tone = !chosen
                    ? "text-gray-600 ring-1 ring-gray-300"
                    : picked
                      ? opt === it.ans
                        ? "bg-emerald-500 text-white"
                        : "bg-rose-500 text-white"
                      : opt === it.ans
                        ? "ring-2 ring-emerald-400 text-emerald-700"
                        : "text-gray-400 ring-1 ring-gray-200";
                  return (
                    <button
                      key={opt}
                      onClick={() => setAnswers((p) => ({ ...p, [i]: opt }))}
                      className={`flex-1 rounded-lg px-1 py-1.5 text-xs font-bold transition active:scale-95 ${tone}`}
                    >
                      {CELLS[opt].emoji}
                      <span className="ml-0.5">{opt}</span>
                    </button>
                  );
                })}
              </div>
              {chosen && (
                <p className={`mt-2 text-xs font-medium ${correct ? "text-emerald-700" : "text-rose-600"}`}>
                  {correct ? "⭕ 正解！ " : `❌ 正解は ${CELLS[it.ans].name}。 `}
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

export default function SwotExperience() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        🧭 <b>SWOT分析</b>は、<b>強み・弱み（内）</b>と<b>機会・脅威（外）</b>の4つで現状を整理する方法。
        「内か外か」を分けるのが最大のポイントです。
      </div>

      <Quadrant />
      <Quiz />
    </div>
  );
}
