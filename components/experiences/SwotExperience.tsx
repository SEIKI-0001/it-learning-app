"use client";

import { useState } from "react";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「SWOT分析」専用の体験。
//   ① 仕分けマシン … 出来事に「内か外か」「＋か−か」の2つの質問で答えると、
//      カードが4マスのどこかに入っていき、マトリクスが完成する
//   ② 具体例を4マスへ振り分けるクイズ（内 ⇄ 外 の取り違えがポイント）
// ============================================================================

type Q = "S" | "W" | "O" | "T";

const CELLS: Record<Q, { name: string; short: string; emoji: string; axis: string; color: string }> = {
  S: { name: "強み (Strength)", short: "強み", emoji: "💪", axis: "内部 × プラス", color: "emerald" },
  W: { name: "弱み (Weakness)", short: "弱み", emoji: "😓", axis: "内部 × マイナス", color: "rose" },
  O: { name: "機会 (Opportunity)", short: "機会", emoji: "🌱", axis: "外部 × プラス", color: "sky" },
  T: { name: "脅威 (Threat)", short: "脅威", emoji: "🌪️", axis: "外部 × マイナス", color: "amber" },
};

const TONE: Record<string, { filled: string; empty: string }> = {
  emerald: { filled: "bg-emerald-100 ring-emerald-400", empty: "bg-emerald-50/50 ring-emerald-200" },
  rose: { filled: "bg-rose-100 ring-rose-400", empty: "bg-rose-50/50 ring-rose-200" },
  sky: { filled: "bg-sky-100 ring-sky-400", empty: "bg-sky-50/50 ring-sky-200" },
  amber: { filled: "bg-amber-100 ring-amber-400", empty: "bg-amber-50/50 ring-amber-200" },
};

// クレープ屋の店長として出来事を仕分ける
const EVENTS: { emo: string; t: string; inside: boolean; plus: boolean; ans: Q }[] = [
  { emo: "🥞", t: "うちには他店にない自家製ソースのレシピがある", inside: true, plus: true, ans: "S" },
  { emo: "🏗️", t: "駅前の再開発で、店の前の人通りが増えそうだ", inside: false, plus: true, ans: "O" },
  { emo: "📱", t: "うちはSNSでの宣伝が苦手で、発信できていない", inside: true, plus: false, ans: "W" },
  { emo: "📈", t: "小麦粉やバターの値段が世界的に上がってきた", inside: false, plus: false, ans: "T" },
];

function judge(inside: boolean, plus: boolean): Q {
  if (inside) return plus ? "S" : "W";
  return plus ? "O" : "T";
}

function Sorter() {
  const [idx, setIdx] = useState(0);
  const [ansIn, setAnsIn] = useState<boolean | null>(null);
  const [ansPlus, setAnsPlus] = useState<boolean | null>(null);
  const [placed, setPlaced] = useState<Partial<Record<Q, { emo: string; t: string }>>>({});

  const done = idx >= EVENTS.length;
  const ev = done ? null : EVENTS[idx];
  const answered = ansIn !== null && ansPlus !== null;
  const myCell = answered ? judge(ansIn!, ansPlus!) : null;
  const correct = answered && ev ? myCell === ev.ans : false;

  const next = () => {
    if (!ev) return;
    setPlaced((p) => ({ ...p, [ev.ans]: { emo: ev.emo, t: ev.t } }));
    setIdx((i) => i + 1);
    setAnsIn(null);
    setAnsPlus(null);
  };

  const reset = () => {
    setIdx(0);
    setAnsIn(null);
    setAnsPlus(null);
    setPlaced({});
  };

  const cell = (q: Q) => {
    const c = CELLS[q];
    const item = placed[q];
    const tone = TONE[c.color];
    const isTarget = answered && ev && ev.ans === q;
    return (
      <div
        className={`min-h-[72px] rounded-xl p-2 ring-2 transition ${item ? tone.filled : tone.empty} ${
          isTarget ? "animate-pulse" : ""
        }`}
      >
        <div className="text-[11px] font-extrabold text-gray-700">
          {c.emoji} {c.short}
          <span className="ml-1 font-mono text-[10px] text-gray-400">{q}</span>
        </div>
        {item ? (
          <div className="mt-1 rounded-lg bg-white/80 px-1.5 py-1 text-[10px] font-bold leading-tight text-gray-700">
            {item.emo} {item.t}
          </div>
        ) : (
          <div className="mt-1 text-center text-[10px] text-gray-300">（まだ空き）</div>
        )}
      </div>
    );
  };

  return (
    <Panel>
      <SectionTitle step={1}>2つの質問で仕分けるマシン</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        あなたはクレープ屋の店長。お店に起きた出来事を、
        <b className="text-gray-800">「内か外か」「＋か−か」の2つの質問だけ</b>で4マスに仕分けてみよう。
      </p>

      {/* 2x2 マトリクス */}
      <div className="mt-4">
        <div className="ml-10 grid grid-cols-2 text-center text-[11px] font-bold text-gray-500">
          <span>😀 プラス</span>
          <span>😟 マイナス</span>
        </div>
        <div className="mt-1 flex items-stretch gap-1">
          <div className="flex w-10 flex-col">
            <div className="flex flex-1 items-center justify-center text-[11px] font-bold text-gray-500">
              <span className="-rotate-90 whitespace-nowrap">🏠 内部</span>
            </div>
            <div className="flex flex-1 items-center justify-center text-[11px] font-bold text-gray-500">
              <span className="-rotate-90 whitespace-nowrap">🌍 外部</span>
            </div>
          </div>
          <div className="grid flex-1 grid-cols-2 gap-1.5">
            {cell("S")}
            {cell("W")}
            {cell("O")}
            {cell("T")}
          </div>
        </div>
      </div>

      {/* 出来事カード＋2つの質問 */}
      {!done && ev && (
        <div className="mt-4 rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
          <div className="text-[11px] font-bold text-gray-400">
            出来事 {idx + 1} / {EVENTS.length}
          </div>
          <p className="mt-1 text-sm font-extrabold text-gray-800">
            {ev.emo} {ev.t}
          </p>

          <div className="mt-3 space-y-2">
            <div>
              <div className="text-xs font-bold text-gray-500">Q1. これは自分の会社の話？　世の中の話？</div>
              <div className="mt-1 flex gap-1.5">
                {([true, false] as const).map((v) => (
                  <button
                    key={String(v)}
                    onClick={() => setAnsIn(v)}
                    className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition active:scale-95 ${
                      ansIn === v ? "bg-indigo-600 text-white" : "bg-white text-gray-600 ring-1 ring-gray-300"
                    }`}
                  >
                    {v ? "🏠 会社の中（内部）" : "🌍 世の中（外部）"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs font-bold text-gray-500">Q2. お店にとって追い風？　向かい風？</div>
              <div className="mt-1 flex gap-1.5">
                {([true, false] as const).map((v) => (
                  <button
                    key={String(v)}
                    onClick={() => setAnsPlus(v)}
                    className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition active:scale-95 ${
                      ansPlus === v ? "bg-indigo-600 text-white" : "bg-white text-gray-600 ring-1 ring-gray-300"
                    }`}
                  >
                    {v ? "😀 追い風（プラス）" : "😟 向かい風（マイナス）"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {answered && myCell && (
            <div
              className={`mt-3 rounded-lg px-3 py-2 text-xs leading-relaxed ring-1 ${
                correct
                  ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
                  : "bg-rose-50 text-rose-800 ring-rose-200"
              }`}
            >
              {correct ? (
                <>
                  ⭕ その通り！　<b>{CELLS[myCell].axis}</b> ＝ {CELLS[myCell].emoji}{" "}
                  <b>{CELLS[myCell].name}</b> のマスに入ります。
                </>
              ) : (
                <>
                  ❌ おしい。この出来事は <b>{ev.inside ? "会社の中（内部）" : "世の中（外部）"}</b> ×{" "}
                  <b>{ev.plus ? "追い風（プラス）" : "向かい風（マイナス）"}</b> なので、
                  {CELLS[ev.ans].emoji} <b>{CELLS[ev.ans].name}</b> のマスです。
                </>
              )}
              <button
                onClick={next}
                className="mt-2 block w-full rounded-lg bg-indigo-600 py-1.5 text-center text-xs font-bold text-white active:scale-95"
              >
                マスに入れて{idx < EVENTS.length - 1 ? "次の出来事へ →" : "完成！"}
              </button>
            </div>
          )}
        </div>
      )}

      {done && (
        <div className="mt-4">
          <div className="rounded-xl bg-indigo-50 px-4 py-3 text-sm leading-relaxed text-indigo-900 ring-1 ring-indigo-200">
            💡 <b>気づいた？</b>　どんな出来事も<b>「内か外か」「＋か−か」の2つの質問だけ</b>で
            必ず4マスのどこかに入ります。埋めたマトリクスから
            <b>「強み×機会」を組み合わせて作戦を立てる</b>のがSWOT分析の使い方です。
          </div>
          <button
            onClick={reset}
            className="mt-2 w-full rounded-lg py-1.5 text-xs font-bold text-gray-500 ring-1 ring-gray-300 active:scale-95"
          >
            ↺ もう一度仕分ける
          </button>
        </div>
      )}

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

      <Sorter />
      <Quiz />
    </div>
  );
}
