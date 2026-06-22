"use client";

import { useState } from "react";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「PPM（プロダクトポートフォリオマネジメント）」専用の体験。
//   ① 市場成長率 × 市場占有率 の2×2をタップして4タイプをつかむ
//   ② 「この事業はどのタイプ？」仕分けクイズ
// ============================================================================

type Cell = {
  key: string;
  emo: string;
  name: string;
  growth: "高" | "低";
  share: "高" | "低";
  d: string;
  action: string;
  tone: string;
};

const CELLS: Cell[] = [
  {
    key: "star",
    emo: "⭐",
    name: "花形",
    growth: "高",
    share: "高",
    d: "成長中の市場で高いシェアを持つ主力。売上は大きいが、競争に勝ち続けるため投資も必要。",
    action: "積極的に投資して伸ばす",
    tone: "bg-amber-50 ring-amber-300 text-amber-900",
  },
  {
    key: "question",
    emo: "❓",
    name: "問題児",
    growth: "高",
    share: "低",
    d: "市場は伸びているのにシェアが低い。投資して花形に育てるか、見切るかの判断が必要。",
    action: "育てるか撤退かを見極める",
    tone: "bg-sky-50 ring-sky-300 text-sky-900",
  },
  {
    key: "cow",
    emo: "🐄",
    name: "金のなる木",
    growth: "低",
    share: "高",
    d: "成長は止まったが高シェアで安定的に稼ぐ。大きな投資なしに利益を生み、その資金を他へ回す。",
    action: "資金を生み、他に回す",
    tone: "bg-emerald-50 ring-emerald-300 text-emerald-900",
  },
  {
    key: "dog",
    emo: "🐕",
    name: "負け犬",
    growth: "低",
    share: "低",
    d: "成長もシェアも低い。将来性が乏しければ撤退・縮小も検討する。",
    action: "撤退・縮小を検討",
    tone: "bg-gray-50 ring-gray-300 text-gray-700",
  },
];

// 表示位置: 左上=花形(高成長/高シェア) 右上=問題児(高成長/低シェア)
//          左下=金のなる木(低成長/高シェア) 右下=負け犬(低成長/低シェア)
const GRID: Cell[] = [
  CELLS[0], // 花形
  CELLS[1], // 問題児
  CELLS[2], // 金のなる木
  CELLS[3], // 負け犬
];

function Matrix() {
  const [open, setOpen] = useState<string | null>("cow");
  const active = CELLS.find((c) => c.key === open) ?? null;
  return (
    <Panel>
      <SectionTitle step={1}>2つのモノサシで4タイプに分ける</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        PPMは事業や製品を <b className="text-gray-800">市場成長率（これから伸びるか）</b> と
        <b className="text-gray-800"> 市場占有率（自社がどれだけ強いか）</b> の2軸で分けます。
        マスをタップして特徴を見てみましょう。
      </p>

      <div className="mt-4 flex gap-2">
        {/* 縦軸ラベル */}
        <div className="flex flex-col items-center justify-center">
          <span className="text-[10px] font-bold text-gray-400">成長率</span>
          <span className="text-[11px] font-bold text-gray-500">高 ↑</span>
          <span className="my-1 text-[11px] text-gray-300">｜</span>
          <span className="text-[11px] font-bold text-gray-500">低 ↓</span>
        </div>
        <div className="flex-1">
          <div className="grid grid-cols-2 gap-2">
            {GRID.map((c) => {
              const picked = open === c.key;
              return (
                <button
                  key={c.key}
                  onClick={() => setOpen(picked ? null : c.key)}
                  className={`rounded-xl p-3 text-left ring-1 transition active:scale-[0.98] ${
                    picked ? c.tone + " ring-2" : "bg-white ring-gray-200"
                  }`}
                >
                  <div className="text-lg">{c.emo}</div>
                  <div className="mt-0.5 text-sm font-extrabold text-gray-800">{c.name}</div>
                  <div className="mt-0.5 text-[10px] font-bold text-gray-400">
                    成長{c.growth}・シェア{c.share}
                  </div>
                </button>
              );
            })}
          </div>
          {/* 横軸ラベル */}
          <div className="mt-1 flex items-center justify-between px-1 text-[11px] font-bold text-gray-500">
            <span>← 占有率 高</span>
            <span>占有率 低 →</span>
          </div>
        </div>
      </div>

      {active && (
        <div className={`mt-4 rounded-xl px-4 py-3 ring-1 ${active.tone}`}>
          <div className="text-sm font-extrabold">
            {active.emo} {active.name}（成長率{active.growth}・占有率{active.share}）
          </div>
          <p className="mt-1 text-[13px] leading-relaxed">{active.d}</p>
          <p className="mt-1.5 text-xs font-bold">→ 戦略：{active.action}</p>
        </div>
      )}

      <p className="mt-3 text-xs leading-relaxed text-gray-500">
        ※ お金の流れは <b>金のなる木で稼ぐ → 花形や問題児へ投資</b> が基本。
        <b>花形（高シェア）</b>と<b>金のなる木（成長は低い）</b>の取り違えに注意。
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

      <Matrix />
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
