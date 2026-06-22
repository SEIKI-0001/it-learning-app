"use client";

import { useState } from "react";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「3C分析」専用の体験。
//   ① 3つのC（Customer/Competitor/Company）をタップで確認
//      ＋ よくある罠「Cost（費用）は3Cに入らない」を強調
//   ② 観点の振り分けクイズ
// ============================================================================

type C = "customer" | "competitor" | "company";

const CARDS: Record<C, { name: string; emoji: string; who: string; q: string; color: string }> = {
  customer: {
    name: "Customer（顧客）",
    emoji: "🙋",
    who: "買ってくれる相手・市場",
    q: "誰が、どんな理由で買う？　ニーズは？",
    color: "sky",
  },
  competitor: {
    name: "Competitor（競合）",
    emoji: "🥊",
    who: "同じお客を狙うライバル",
    q: "ライバルは誰？　何が強い？",
    color: "rose",
  },
  company: {
    name: "Company（自社）",
    emoji: "🏢",
    who: "自分たちの会社",
    q: "自社の強み・弱みは？　何ができる？",
    color: "emerald",
  },
};

const TONE: Record<string, { on: string; off: string }> = {
  sky: { on: "bg-sky-500 text-white ring-sky-500", off: "bg-sky-50 text-sky-700 ring-sky-200" },
  rose: { on: "bg-rose-500 text-white ring-rose-500", off: "bg-rose-50 text-rose-700 ring-rose-200" },
  emerald: { on: "bg-emerald-500 text-white ring-emerald-500", off: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
};

function ThreeCircles() {
  const [sel, setSel] = useState<C | null>(null);
  const order: C[] = ["customer", "competitor", "company"];
  return (
    <Panel>
      <SectionTitle step={1}>3つの「C」から見る</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        事業の環境を、頭文字がCの3つの視点で整理します。タップして中身を見よう。
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {order.map((c) => {
          const card = CARDS[c];
          const on = sel === c;
          const tone = TONE[card.color];
          return (
            <button
              key={c}
              onClick={() => setSel(c)}
              className={`flex flex-col items-center rounded-xl p-2.5 ring-2 transition active:scale-95 ${
                on ? tone.on : tone.off
              }`}
            >
              <span className="text-2xl leading-none">{card.emoji}</span>
              <span className="mt-1.5 text-[11px] font-extrabold leading-tight">{card.name}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 min-h-[4em] rounded-xl bg-gray-50 px-4 py-3 ring-1 ring-gray-200">
        {sel ? (
          <>
            <div className="text-sm font-extrabold text-gray-800">
              {CARDS[sel].emoji} {CARDS[sel].name} ＝ {CARDS[sel].who}
            </div>
            <p className="mt-1 text-sm leading-relaxed text-gray-700">考えること：{CARDS[sel].q}</p>
          </>
        ) : (
          <span className="text-sm text-gray-400">3つのうちどれかをタップしてね。</span>
        )}
      </div>

      <div className="mt-3 rounded-xl bg-rose-50 px-4 py-3 text-sm leading-relaxed text-rose-900 ring-1 ring-rose-200">
        ⚠️ よくある罠：4つめのCに <b>Cost（費用）</b> を入れてしまう間違い。3Cは
        <b>顧客・競合・自社</b>の3つだけ。費用はQCDなど別の話です。
      </div>
    </Panel>
  );
}

const ITEMS: { t: string; ans: C | "trap"; why: string }[] = [
  { t: "20代女性に人気が出てきた", ans: "customer", why: "買い手・市場の話＝Customer（顧客）。" },
  { t: "隣町の同業店がセールを始めた", ans: "competitor", why: "同じ客を狙うライバル＝Competitor（競合）。" },
  { t: "うちは配達が速いのが売り", ans: "company", why: "自分たちの強み＝Company（自社）。" },
  { t: "材料費が1個300円かかる", ans: "trap", why: "これは費用（Cost）。3Cには含まれません！" },
];
const OPTS: { key: C | "trap"; label: string }[] = [
  { key: "customer", label: "🙋 顧客" },
  { key: "competitor", label: "🥊 競合" },
  { key: "company", label: "🏢 自社" },
  { key: "trap", label: "💰 費用(罠)" },
];

function Quiz() {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  return (
    <Panel>
      <SectionTitle step={2}>どのCにあたる？</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        「費用(Cost)」のワナにも注意。3Cに<b className="text-gray-800">入らない</b>ものもあるよ。
      </p>
      <ul className="mt-3 space-y-2.5">
        {ITEMS.map((it, i) => {
          const chosen = answers[i];
          const correct = chosen === it.ans;
          return (
            <li key={i} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
              <p className="text-sm font-bold text-gray-800">{it.t}</p>
              <div className="mt-2 grid grid-cols-4 gap-1.5">
                {OPTS.map((opt) => {
                  const picked = chosen === opt.key;
                  const tone = !chosen
                    ? "text-gray-600 ring-1 ring-gray-300"
                    : picked
                      ? opt.key === it.ans
                        ? "bg-emerald-500 text-white"
                        : "bg-rose-500 text-white"
                      : opt.key === it.ans
                        ? "ring-2 ring-emerald-400 text-emerald-700"
                        : "text-gray-400 ring-1 ring-gray-200";
                  return (
                    <button
                      key={opt.key}
                      onClick={() => setAnswers((p) => ({ ...p, [i]: opt.key }))}
                      className={`rounded-lg px-1 py-1.5 text-[11px] font-bold transition active:scale-95 ${tone}`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              {chosen && (
                <p className={`mt-2 text-xs font-medium ${correct ? "text-emerald-700" : "text-rose-600"}`}>
                  {correct ? "⭕ 正解！ " : "❌ ちがうよ。 "}
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

export default function ThreeCExperience() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        🔭 <b>3C分析</b>は <b>Customer（顧客）・Competitor（競合）・Company（自社）</b> の3つで事業環境を見る方法。
        「Cost（費用）」は<b>入らない</b>のが引っかけポイント。
      </div>

      <ThreeCircles />
      <Quiz />
    </div>
  );
}
