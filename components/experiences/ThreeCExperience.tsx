"use client";

import { useState } from "react";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「3C分析」専用の体験。
//   ① 市場マップ：クレープ屋の出店を例に、顧客/競合/自社の3視点をタップ調査。
//      3つ全部そろうと「勝てる場所（作戦）」が見えるコンプリート体験
//      ＋ よくある罠「Cost（費用）は3Cに入らない」を強調
//   ② 観点の振り分けクイズ
// ============================================================================

type C = "customer" | "competitor" | "company";

const CARDS: Record<
  C,
  { name: string; emoji: string; who: string; q: string; found: string; color: string; pos: { left: string; top: string } }
> = {
  customer: {
    name: "Customer（顧客）",
    emoji: "🙋",
    who: "買ってくれる相手・市場",
    q: "誰が、何を求めてる？",
    found: "放課後の学生が多い。「安くて写真映えするおやつ」を探している！",
    color: "sky",
    pos: { left: "50%", top: "10%" },
  },
  competitor: {
    name: "Competitor（競合）",
    emoji: "🥊",
    who: "同じお客を狙うライバル",
    q: "ライバルの強み・弱みは？",
    found: "隣のカフェはおしゃれだけど、値段が高くて提供が遅い。",
    color: "rose",
    pos: { left: "84%", top: "80%" },
  },
  company: {
    name: "Company（自社）",
    emoji: "🏢",
    who: "自分たちの会社",
    q: "自社の強み・弱みは？",
    found: "うちは「早い・安い・トッピング豊富」が売り！",
    color: "emerald",
    pos: { left: "16%", top: "80%" },
  },
};

const TONE: Record<string, { on: string; off: string; done: string }> = {
  sky: {
    on: "bg-sky-500 text-white ring-sky-500",
    off: "bg-sky-50 text-sky-700 ring-sky-200",
    done: "bg-white text-sky-700 ring-sky-400",
  },
  rose: {
    on: "bg-rose-500 text-white ring-rose-500",
    off: "bg-rose-50 text-rose-700 ring-rose-200",
    done: "bg-white text-rose-700 ring-rose-400",
  },
  emerald: {
    on: "bg-emerald-500 text-white ring-emerald-500",
    off: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    done: "bg-white text-emerald-700 ring-emerald-400",
  },
};

function MarketMap() {
  const [sel, setSel] = useState<C | null>(null);
  const [seen, setSeen] = useState<Record<C, boolean>>({ customer: false, competitor: false, company: false });
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
        マップの3か所を<b className="text-gray-800">全部タップ</b>して調査すると、勝てる作戦が見えてきます。
      </p>

      {/* 市場マップ: 上=顧客、下=自社と競合が顧客を取り合う */}
      <div className="relative mx-auto mt-5 h-44 max-w-[300px]">
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
          {/* 自社→顧客 / 競合→顧客 : どちらも同じお客を狙う */}
          <line x1="16" y1="80" x2="50" y2="10" stroke={sel === "company" ? "#10b981" : "#e5e7eb"} strokeWidth={sel === "company" ? 2.5 : 1.5} />
          <line x1="84" y1="80" x2="50" y2="10" stroke={sel === "competitor" ? "#f43f5e" : "#e5e7eb"} strokeWidth={sel === "competitor" ? 2.5 : 1.5} />
          <line x1="16" y1="80" x2="84" y2="80" stroke="#e5e7eb" strokeWidth="1.5" strokeDasharray="3 3" />
        </svg>

        {order.map((c) => {
          const it = CARDS[c];
          const on = sel === c;
          const tone = TONE[it.color];
          return (
            <button
              key={c}
              onClick={() => tap(c)}
              style={{ left: it.pos.left, top: it.pos.top }}
              className={`absolute z-10 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full text-center ring-2 transition active:scale-95 ${
                on ? tone.on : seen[c] ? tone.done : tone.off
              }`}
            >
              <span className="text-xl leading-none">{it.emoji}</span>
              <span className="mt-0.5 text-[9px] font-bold leading-tight">
                {c === "customer" ? "顧客" : c === "competitor" ? "競合" : "自社"}
              </span>
              <span className="text-[8px] font-bold opacity-70">{seen[c] ? "調査済✓" : "タップ"}</span>
            </button>
          );
        })}

        {/* 取り合いの説明 */}
        <span className="absolute left-1/2 top-[46%] -translate-x-1/2 text-[9px] font-bold text-gray-400">
          同じお客を取り合う
        </span>
      </div>

      {/* 調査結果 */}
      <div className="mt-3 min-h-[5em] rounded-xl bg-gray-50 px-4 py-3 ring-1 ring-gray-200">
        {card ? (
          <>
            <div className="text-sm font-bold text-gray-800">
              {card.emoji} {card.name} ＝ {card.who}
            </div>
            <p className="mt-1 text-xs text-gray-500">考えること：{card.q}</p>
            <p className="mt-1.5 text-sm font-bold leading-relaxed text-gray-800">🔍 {card.found}</p>
          </>
        ) : (
          <span className="text-sm text-gray-400">マップの丸をタップすると調査結果が出ます。</span>
        )}
      </div>

      {/* 3つそろうと作戦が見える */}
      <div
        className={`mt-3 rounded-xl px-4 py-3 text-sm leading-relaxed ring-1 transition ${
          allSeen ? "bg-emerald-50 text-emerald-900 ring-emerald-300" : "bg-gray-50 text-gray-400 ring-gray-200"
        }`}
      >
        {allSeen ? (
          <>
            ✨ <b>3つの調査がそろって、作戦が見えた！</b>
            <br />
            顧客は「安くて映える」を求め（C1）、競合は「高くて遅い」（C2）、自社は「早い・安い」が強み（C3）
            → <b>「ワンコインの映えクレープを、待たせず出す」</b>で勝負！
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
