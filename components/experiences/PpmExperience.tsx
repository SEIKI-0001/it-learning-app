"use client";

import { useState } from "react";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「PPM（プロダクトポートフォリオマネジメント）」専用の体験。
//   ① 資金めぐり体験 … まず「お金を生む事業」を探し、稼いだ💰をどこに
//      投資するかで結末が変わる（金のなる木→問題児/花形へ、負け犬は空振り）
//   ② 「この事業はどのタイプ？」仕分けクイズ
//   ③ まとめ
// ============================================================================

type CellKey = "star" | "question" | "cow" | "dog";

const CELLS: Record<
  CellKey,
  { emo: string; name: string; growth: "高" | "低"; share: "高" | "低"; tone: string }
> = {
  star: { emo: "⭐", name: "花形", growth: "高", share: "高", tone: "bg-amber-50 ring-amber-300" },
  question: { emo: "❓", name: "問題児", growth: "高", share: "低", tone: "bg-sky-50 ring-sky-300" },
  cow: { emo: "🐄", name: "金のなる木", growth: "低", share: "高", tone: "bg-emerald-50 ring-emerald-300" },
  dog: { emo: "🐕", name: "負け犬", growth: "低", share: "低", tone: "bg-gray-50 ring-gray-300" },
};

// 左上=花形 右上=問題児 / 左下=金のなる木 右下=負け犬
const GRID: CellKey[] = ["star", "question", "cow", "dog"];

// フェーズA: お金を生む事業を探す
const EARN_FEEDBACK: Record<CellKey, { ok: boolean; text: string }> = {
  cow: {
    ok: true,
    text: "⭕ その通り！ 成長は止まっていても高シェアで安定して稼ぐ＝会社の財布。大きな投資も要らないので、お金が余ります。",
  },
  star: {
    ok: false,
    text: "❌ おしい。花形は売上こそ大きいけれど、競争に勝ち続けるための投資もかさむので、手元にお金は残りにくい。",
  },
  question: {
    ok: false,
    text: "❌ 問題児は逆に「お金が欲しい側」。市場は伸びているのにシェアが低く、育てるには投資が必要です。",
  },
  dog: { ok: false, text: "❌ 負け犬は成長もシェアも低く、稼ぐ力がありません。" },
};

// フェーズB: 投資先ごとの結末
const INVEST_RESULT: Record<
  "star" | "question" | "dog",
  { good: boolean; title: string; text: string }
> = {
  question: {
    good: true,
    title: "❓ 問題児 → ⭐ 花形に育った！",
    text: "伸びている市場でシェアを取れれば、次の主力（花形）に化けます。PPMの王道の使い方。",
  },
  star: {
    good: true,
    title: "⭐ 花形のシェアを守れた",
    text: "成長市場は競争が激しいので、投資を続けてシェアを維持。将来、市場の成長が止まれば「金のなる木」になります。",
  },
  dog: {
    good: false,
    title: "🐕 負け犬に投資…💸 効果うすし",
    text: "市場が伸びず、シェアも低いままではお金が返ってきません。将来性がなければ撤退・縮小の検討が先です。",
  },
};

function MoneyCycle() {
  const [phase, setPhase] = useState<"earn" | "invest">("earn");
  const [earnPick, setEarnPick] = useState<CellKey | null>(null);
  const [investPick, setInvestPick] = useState<CellKey | null>(null);
  const [invested, setInvested] = useState<Set<CellKey>>(new Set());
  const allInvested = invested.size >= 3;

  const pick = (k: CellKey) => {
    if (phase === "earn") {
      setEarnPick(k);
    } else {
      if (k === "cow") return;
      setInvestPick(k);
      setInvested((p) => new Set(p).add(k));
    }
  };

  const reset = () => {
    setPhase("earn");
    setEarnPick(null);
    setInvestPick(null);
    setInvested(new Set());
  };

  const cell = (k: CellKey) => {
    const c = CELLS[k];
    const isCow = k === "cow";
    const disabled = phase === "invest" && isCow;
    const picked = phase === "earn" ? earnPick === k : investPick === k;
    return (
      <button
        key={k}
        onClick={() => pick(k)}
        disabled={disabled}
        className={`relative rounded-xl p-2.5 text-left ring-1 transition active:scale-[0.98] ${c.tone} ${
          picked ? "ring-2" : ""
        } ${disabled ? "opacity-70" : ""}`}
      >
        <div className="text-lg">{c.emo}</div>
        <div className="mt-0.5 text-sm font-extrabold text-gray-800">{c.name}</div>
        <div className="mt-0.5 text-[10px] font-bold text-gray-400">
          成長{c.growth}・シェア{c.share}
        </div>
        {phase === "invest" && isCow && (
          <span className="absolute -top-2 right-1 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
            💰 財布
          </span>
        )}
        {invested.has(k) && phase === "invest" && (
          <span className="absolute -top-2 left-1 text-sm">
            {INVEST_RESULT[k as "star" | "question" | "dog"].good ? "✅" : "💸"}
          </span>
        )}
      </button>
    );
  };

  return (
    <Panel>
      <SectionTitle step={1}>会社のお金をめぐらせよう</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        あなたは4つの事業を持つ社長。PPMは
        <b className="text-gray-800">市場成長率（縦）× 市場占有率（横）</b>の地図です。
        まずは<b className="text-gray-800">投資のお金を生んでくれる事業</b>を探そう。
      </p>

      {/* 指令 */}
      <div className="mt-3 rounded-xl bg-indigo-600 px-3 py-2 text-center text-sm font-extrabold text-white">
        {phase === "earn" ? "Q1. どの事業がお金を生む？（タップ）" : "Q2. 稼いだ💰をどの事業に投資する？"}
      </div>

      {/* 2x2 マトリクス */}
      <div className="mt-3 flex gap-2">
        <div className="flex flex-col items-center justify-center">
          <span className="text-[10px] font-bold text-gray-400">成長率</span>
          <span className="text-[11px] font-bold text-gray-500">高 ↑</span>
          <span className="my-1 text-[11px] text-gray-300">｜</span>
          <span className="text-[11px] font-bold text-gray-500">低 ↓</span>
        </div>
        <div className="flex-1">
          <div className="grid grid-cols-2 gap-2">{GRID.map(cell)}</div>
          <div className="mt-1 flex items-center justify-between px-1 text-[11px] font-bold text-gray-500">
            <span>← 占有率 高</span>
            <span>占有率 低 →</span>
          </div>
        </div>
      </div>

      {/* フェーズAのフィードバック */}
      {phase === "earn" && earnPick && (
        <div
          className={`mt-3 rounded-xl px-3 py-2.5 text-xs leading-relaxed ring-1 ${
            EARN_FEEDBACK[earnPick].ok
              ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
              : "bg-rose-50 text-rose-800 ring-rose-200"
          }`}
        >
          {EARN_FEEDBACK[earnPick].text}
          {EARN_FEEDBACK[earnPick].ok && (
            <>
              <div className="mt-1.5 text-center text-base font-extrabold">💰💰💰 資金ゲット！</div>
              <button
                onClick={() => setPhase("invest")}
                className="mt-2 block w-full rounded-lg bg-indigo-600 py-1.5 text-center text-xs font-bold text-white active:scale-95"
              >
                💰を持って投資フェーズへ →
              </button>
            </>
          )}
        </div>
      )}

      {/* フェーズBのフィードバック */}
      {phase === "invest" && investPick && investPick !== "cow" && (
        <div
          className={`mt-3 rounded-xl px-3 py-2.5 ring-1 ${
            INVEST_RESULT[investPick as "star" | "question" | "dog"].good
              ? "bg-emerald-50 ring-emerald-200"
              : "bg-rose-50 ring-rose-200"
          }`}
        >
          <div
            className={`text-sm font-extrabold ${
              INVEST_RESULT[investPick as "star" | "question" | "dog"].good
                ? "text-emerald-800"
                : "text-rose-700"
            }`}
          >
            🐄 ──💰──▶ {INVEST_RESULT[investPick as "star" | "question" | "dog"].title}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-gray-700">
            {INVEST_RESULT[investPick as "star" | "question" | "dog"].text}
          </p>
          {!allInvested && (
            <p className="mt-1.5 text-[11px] font-bold text-gray-500">→ ほかの投資先も試してみよう</p>
          )}
        </div>
      )}

      {allInvested && (
        <div className="mt-3 rounded-xl bg-indigo-50 px-4 py-3 text-sm leading-relaxed text-indigo-900 ring-1 ring-indigo-200">
          💡 <b>気づいた？</b>　お金の流れは<b>「金のなる木で稼ぐ → 花形・問題児へ投資」</b>が基本。
          負け犬への投資は空振りしやすく、<b>撤退・縮小の検討</b>が先。
          PPMは「どこにお金を使い、どこから手を引くか」を決める地図です。
        </div>
      )}

      {(earnPick || invested.size > 0) && (
        <button
          onClick={reset}
          className="mt-2 w-full rounded-lg py-1.5 text-xs font-bold text-gray-500 ring-1 ring-gray-300 active:scale-95"
        >
          ↺ 最初からやり直す
        </button>
      )}

      <p className="mt-3 text-xs leading-relaxed text-gray-500">
        ※ <b>花形（高シェア・成長中）</b>と<b>金のなる木（高シェア・成長は低い）</b>の取り違えに注意。
      </p>
    </Panel>
  );
}

const QUIZ: { t: string; ans: string; opts: string[]; why: string }[] = [
  {
    t: "成長が止まった市場だが、自社が高いシェアを持ち、安定して利益を出している事業。",
    ans: "金のなる木",
    opts: ["金のなる木", "花形", "問題児"],
    why: "低成長・高シェア＝金のなる木。稼いだ資金を成長分野へ回す。",
  },
  {
    t: "市場はぐんぐん伸びているのに、自社のシェアはまだ低い事業。",
    ans: "問題児",
    opts: ["問題児", "負け犬", "花形"],
    why: "高成長・低シェア＝問題児。投資して花形に育てるか判断する。",
  },
  {
    t: "成長中の市場で高いシェアを持ち、これからの主力になる事業。",
    ans: "花形",
    opts: ["花形", "金のなる木", "負け犬"],
    why: "高成長・高シェア＝花形。投資して伸ばす。",
  },
];

function Quiz() {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  return (
    <Panel>
      <SectionTitle step={2}>この事業はどのタイプ？</SectionTitle>
      <ul className="mt-3 space-y-3">
        {QUIZ.map((q, i) => {
          const chosen = answers[i];
          const correct = chosen === q.ans;
          return (
            <li key={i} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
              <div className="text-sm font-bold text-gray-800">{q.t}</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {q.opts.map((opt) => {
                  const picked = chosen === opt;
                  const tone = !chosen
                    ? "text-gray-600 ring-1 ring-gray-300"
                    : picked
                      ? opt === q.ans
                        ? "bg-emerald-500 text-white"
                        : "bg-rose-500 text-white"
                      : opt === q.ans
                        ? "ring-2 ring-emerald-400 text-emerald-700"
                        : "text-gray-400 ring-1 ring-gray-200";
                  return (
                    <button
                      key={opt}
                      onClick={() => setAnswers((p) => ({ ...p, [i]: opt }))}
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold transition active:scale-95 ${tone}`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
              {chosen && (
                <p className={`mt-2 text-xs font-medium ${correct ? "text-emerald-700" : "text-rose-600"}`}>
                  {correct ? "⭕ 正解！ " : `❌ 正解は「${q.ans}」。 `}
                  {q.why}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

export default function PpmExperience() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        📊 PPMは、いくつもの事業を<b>「成長率」と「占有率」の2軸</b>で4つに分け、
        <b>どこにお金を使い、どこから手を引くか</b>を考える地図です。
      </div>

      <MoneyCycle />
      <Quiz />

      <Panel>
        <SectionTitle emoji="🔑">まとめ</SectionTitle>
        <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-gray-700">
          <li>・<b>花形</b>：高成長・高シェア → 投資して伸ばす。</li>
          <li>・<b>金のなる木</b>：低成長・高シェア → 安定して稼ぎ、資金源になる。</li>
          <li>・<b>問題児</b>：高成長・低シェア → 育てるか撤退かを判断。</li>
          <li>・<b>負け犬</b>：低成長・低シェア → 撤退・縮小を検討。</li>
        </ul>
      </Panel>
    </div>
  );
}
