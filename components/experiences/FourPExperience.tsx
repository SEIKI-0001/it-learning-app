"use client";

import { useState } from "react";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「マーケティングと4P分析」専用の体験。
//   ① 文化祭のクレープ屋を例に、4つのPをタップで確認
//   ② 具体的な決めごとを4Pに振り分けるクイズ
// ============================================================================

type P = "product" | "price" | "place" | "promotion";

const CARDS: Record<P, { name: string; emoji: string; mean: string; ex: string; color: string }> = {
  product: {
    name: "Product（製品）",
    emoji: "🍦",
    mean: "何を売るか／中身・品ぞろえ",
    ex: "例：チョコバナナ味のクレープを作る",
    color: "indigo",
  },
  price: {
    name: "Price（価格）",
    emoji: "💴",
    mean: "いくらで売るか",
    ex: "例：1個400円に決める",
    color: "emerald",
  },
  place: {
    name: "Place（流通）",
    emoji: "📍",
    mean: "どこで・どうやって届けるか",
    ex: "例：人通りの多い昇降口前で売る",
    color: "amber",
  },
  promotion: {
    name: "Promotion（販売促進）",
    emoji: "📣",
    mean: "どう知らせて買ってもらうか",
    ex: "例：SNSとポスターで宣伝する",
    color: "rose",
  },
};

const TONE: Record<string, { on: string; off: string }> = {
  indigo: { on: "bg-indigo-500 text-white ring-indigo-500", off: "bg-indigo-50 text-indigo-700 ring-indigo-200" },
  emerald: { on: "bg-emerald-500 text-white ring-emerald-500", off: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  amber: { on: "bg-amber-500 text-white ring-amber-500", off: "bg-amber-50 text-amber-700 ring-amber-200" },
  rose: { on: "bg-rose-500 text-white ring-rose-500", off: "bg-rose-50 text-rose-700 ring-rose-200" },
};

const ORDER: P[] = ["product", "price", "place", "promotion"];

function FourCards() {
  const [sel, setSel] = useState<P | null>(null);
  return (
    <Panel>
      <SectionTitle step={1}>4つのPで「売り方」を考える</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        文化祭で<b className="text-gray-800">クレープ屋</b>を出すとして、決めることを4つに整理します。タップして確認しよう。
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {ORDER.map((p) => {
          const card = CARDS[p];
          const on = sel === p;
          const tone = TONE[card.color];
          return (
            <button
              key={p}
              onClick={() => setSel(p)}
              className={`flex items-center gap-2 rounded-xl p-2.5 text-left ring-2 transition active:scale-95 ${
                on ? tone.on : tone.off
              }`}
            >
              <span className="text-xl leading-none">{card.emoji}</span>
              <span className="text-[11px] font-extrabold leading-tight">{card.name}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 min-h-[4em] rounded-xl bg-gray-50 px-4 py-3 ring-1 ring-gray-200">
        {sel ? (
          <>
            <div className="text-sm font-extrabold text-gray-800">
              {CARDS[sel].emoji} {CARDS[sel].name}
            </div>
            <p className="mt-1 text-sm leading-relaxed text-gray-700">{CARDS[sel].mean}</p>
            <p className="mt-1 text-xs text-gray-500">{CARDS[sel].ex}</p>
          </>
        ) : (
          <span className="text-sm text-gray-400">4つのうちどれかをタップしてね。</span>
        )}
      </div>

      <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        💡 4つすべて頭文字が <b>P</b>。組み合わせて売り方を決めることを
        <b>マーケティングミックス</b>と呼びます。
      </div>
    </Panel>
  );
}

const ITEMS: { t: string; ans: P; why: string }[] = [
  { t: "新作の抹茶味を増やす", ans: "product", why: "売る物・中身の話＝Product（製品）。" },
  { t: "値下げして350円にする", ans: "price", why: "いくらで売るか＝Price（価格）。" },
  { t: "ネット注文できるようにする", ans: "place", why: "どこで・どう届けるか＝Place（流通）。" },
  { t: "インフルエンサーに紹介してもらう", ans: "promotion", why: "知らせて買ってもらう＝Promotion（販売促進）。" },
];

function Quiz() {
  const [answers, setAnswers] = useState<Record<number, P>>({});
  return (
    <Panel>
      <SectionTitle step={2}>どのPの決めごと？</SectionTitle>
      <ul className="mt-3 space-y-2.5">
        {ITEMS.map((it, i) => {
          const chosen = answers[i];
          const correct = chosen === it.ans;
          return (
            <li key={i} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
              <p className="text-sm font-bold text-gray-800">{it.t}</p>
              <div className="mt-2 grid grid-cols-4 gap-1.5">
                {ORDER.map((opt) => {
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
                      className={`rounded-lg px-1 py-1.5 text-[11px] font-bold transition active:scale-95 ${tone}`}
                    >
                      {CARDS[opt].emoji}
                    </button>
                  );
                })}
              </div>
              {chosen && (
                <p className={`mt-2 text-xs font-medium ${correct ? "text-emerald-700" : "text-rose-600"}`}>
                  {correct ? "⭕ 正解！ " : `❌ 正解は ${CARDS[it.ans].name}。 `}
                  {it.why}
                </p>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-center text-[11px] text-gray-400">
        ボタンの絵文字：🍦製品 / 💴価格 / 📍流通 / 📣販売促進
      </p>
    </Panel>
  );
}

export default function FourPExperience() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        🛍️ <b>4P分析</b>は <b>Product（製品）・Price（価格）・Place（流通）・Promotion（販売促進）</b>
        の4つで売り方を整理する方法。「何を・いくらで・どこで・どう知らせて」売るかです。
      </div>

      <FourCards />
      <Quiz />
    </div>
  );
}
