"use client";

import { useState } from "react";
import { useReducedMotion } from "./scene/useReducedMotion";
import { MarketScene } from "./threec/MarketScene";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「3C分析」専用の体験。
//   ① 市場マップ：クレープ屋の出店を例に、2.5D の駅前の街で顧客/競合/自社を調査。
//      見つけた事実がチップとして中央の作戦ボードへ集まり、3つそろうと作戦が組み上がる
//      ＋ よくある罠「Cost（費用）は3Cに入らない」を強調
//   ② 観点の振り分けクイズ
// ============================================================================

type C = "customer" | "competitor" | "company";

const CARDS: Record<
  C,
  { name: string; emoji: string; who: string; q: string; found: string }
> = {
  customer: {
    name: "Customer（顧客）",
    emoji: "🙋",
    who: "買ってくれる相手・市場",
    q: "誰が、何を求めてる？",
    found: "放課後の学生が多い。「安くて写真映えするおやつ」を探している！",
  },
  competitor: {
    name: "Competitor（競合）",
    emoji: "🥊",
    who: "同じお客を狙うライバル",
    q: "ライバルの強み・弱みは？",
    found: "隣のカフェはおしゃれだけど、値段が高くて提供が遅い。",
  },
  company: {
    name: "Company（自社）",
    emoji: "🏢",
    who: "自分たちの会社",
    q: "自社の強み・弱みは？",
    found: "うちは「早い・安い・トッピング豊富」が売り！",
  },
};

const STRATEGY = "ワンコインの映えクレープを、待たせず出す";

function MarketMap() {
  const reducedMotion = useReducedMotion();
  const [sel, setSel] = useState<C | null>(null);
  const [seen, setSeen] = useState<Record<C, boolean>>({ customer: false, competitor: false, company: false });
  const [costTries, setCostTries] = useState(0);
  const order: C[] = ["customer", "competitor", "company"];
  const allSeen = order.every((c) => seen[c]);
  const card = sel ? CARDS[sel] : null;

  const tap = (c: C) => {
    setSel(c);
    setSeen((p) => ({ ...p, [c]: true }));
  };

  return (
    <Panel>
      <SectionTitle step={1}>3つの視点で市場を調査せよ</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        あなたは<b className="text-gray-800">駅前にクレープ屋さんを出す</b>ことに。
        街の3か所を<b className="text-gray-800">全部調べる</b>と、見つけた事実が中央の作戦ボードに集まり、勝てる作戦が組み上がります。
      </p>

      <div className="-mx-2 mt-3 sm:mx-auto sm:max-w-xl">
        <MarketScene
          researched={seen}
          focus={sel}
          costTries={costTries}
          strategy={STRATEGY}
          onResearch={tap}
          reducedMotion={reducedMotion}
        />
      </div>

      {/* 調査結果 */}
      <div className="mt-3 min-h-[5em] rounded-xl bg-gray-50 px-4 py-3 ring-1 ring-gray-200" aria-live="polite" data-testid="research-result">
        {card ? (
          <>
            <div className="text-sm font-bold text-gray-800">
              {card.emoji} {card.name} ＝ {card.who}
            </div>
            <p className="mt-1 text-xs text-gray-500">考えること：{card.q}</p>
            <p className="mt-1.5 text-sm font-bold leading-relaxed text-gray-800">🔍 {card.found}</p>
          </>
        ) : (
          <span className="text-sm text-gray-400">街の「🔍 調べる」を押すと調査結果が出ます。</span>
        )}
      </div>

      {/* 3つそろうと作戦が見える */}
      <div
        className={`mt-3 rounded-xl px-4 py-3 text-sm leading-relaxed ring-1 transition ${
          allSeen ? "bg-emerald-50 text-emerald-900 ring-emerald-300" : "bg-gray-50 text-gray-400 ring-gray-200"
        }`}
        data-testid="strategy-summary"
      >
        {allSeen ? (
          <>
            ✨ <b>3つの調査がそろって、作戦が見えた！</b>
            <br />
            顧客は「安くて映える」を求め（C1）、競合は「高くて遅い」（C2）、自社は「早い・安い」が強み（C3）
            → <b>「{STRATEGY}」</b>で勝負！
            このように3つを重ねて<b>勝てる場所</b>を探すのが3C分析です。
          </>
        ) : (
          <>
            🔒 作戦はまだ見えない… （調査 {order.filter((c) => seen[c]).length} / 3）
            1つの視点だけでは作戦は立てられません。
          </>
        )}
      </div>

      <div className="mt-3 rounded-xl bg-rose-50 px-4 py-3 text-sm leading-relaxed text-rose-900 ring-1 ring-rose-200">
        ⚠️ よくある罠：4つめのCに <b>Cost（費用）</b> を入れてしまう間違い。3Cは
        <b>顧客・競合・自社</b>の3つだけ。費用はQCDなど別の話です。
        <button
          type="button"
          onClick={() => setCostTries((n) => n + 1)}
          className="mt-2 block w-full rounded-full bg-white px-3 py-1.5 text-xs font-bold text-rose-700 ring-1 ring-rose-300 transition active:scale-95"
        >
          💰 「材料費300円」を作戦ボードに入れてみる
        </button>
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
      <div className="rounded-xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        🔭 <b>3C分析</b>は <b>Customer（顧客）・Competitor（競合）・Company（自社）</b> の3つで事業環境を見る方法。
        「Cost（費用）」は<b>入らない</b>のが引っかけポイント。
      </div>

      <MarketMap />
      <Quiz />
    </div>
  );
}
