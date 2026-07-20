"use client";

import { useState } from "react";
import { Panel, SectionTitle, StepNav } from "./ui";

// ============================================================================
// 「データ活用」専用の体験。
//   ① 成績アップ大作戦 … 実データ（科目別の点数）が「数字の山→グラフ→気づき→改善」
//      と変化していく様子をStepで体感（見える化すると苦手が浮かぶ）
//   ② ためるだけ ⇄ 活用する の対比＋よく出る道具
//   ③ 役割クイズ（BI・データ品質などの考え方）
// ============================================================================

// ① 成績アップ大作戦 --------------------------------------------------------
const SUBJECTS = [
  { name: "国語", score: 70 },
  { name: "数学", score: 40 },
  { name: "英語", score: 65 },
  { name: "理科", score: 75 },
  { name: "社会", score: 60 },
];
const WEAK = "数学";
const IMPROVED = 65;

const STEPS = [
  { badge: "🎯 目的", html: "まず<b>目的</b>を決める：「テストの成績を上げたい」。目的がないと、何のデータを集めて何を見ればいいか分かりません。" },
  { badge: "📥 集める", html: "目的に必要なデータ＝<b>各科目の点数</b>を集めました。でも数字の山のままでは、パッと見て何も分かりません…。" },
  { badge: "📊 見える化", html: "同じ数字を<b>棒グラフに整理</b>。高い・低いがひと目で分かるようになりました。これが「見える化」の力。" },
  { badge: "💡 気づく", html: "グラフを読むと…<b>数学だけ極端に低い</b>！ 数字の山では埋もれていた傾向が、見える化で浮かび上がりました。" },
  { badge: "🔧 改善", html: "気づきを<b>行動に変える</b>：数学の勉強時間を増やした結果、40点→65点にアップ！ ここまでやって初めて「データ活用」です。" },
];

function Chart({ idx }: { idx: number }) {
  // idx: 0=まだ何もない 1=数字の山 2=グラフ化 3=苦手が浮かぶ 4=改善後
  if (idx === 0) {
    return (
      <div className="grid h-40 place-items-center rounded-xl bg-gray-50 ring-1 ring-gray-200">
        <div className="text-center">
          <div className="text-3xl">🎯</div>
          <div className="mt-1 text-sm font-bold text-gray-700">成績を上げたい！</div>
          <div className="mt-0.5 text-xs text-gray-400">→ まずは点数のデータを集めよう</div>
        </div>
      </div>
    );
  }
  if (idx === 1) {
    // 数字の山（バラバラに置かれたメモ）
    const tilts = ["-rotate-3", "rotate-2", "rotate-6", "-rotate-2", "rotate-3"];
    return (
      <div className="flex h-40 flex-wrap content-center items-center justify-center gap-2 rounded-xl bg-gray-50 ring-1 ring-gray-200">
        {SUBJECTS.map((s, i) => (
          <span
            key={s.name}
            className={`rounded-lg bg-white px-2.5 py-1.5 text-sm font-bold text-gray-700 shadow-sm ring-1 ring-gray-300 ${tilts[i]}`}
          >
            {s.name} {s.score}点
          </span>
        ))}
        <span className="w-full text-center text-xs text-gray-400">📥 集めた数字の山…このままでは読みにくい</span>
      </div>
    );
  }
  // 2以降: 棒グラフ
  return (
    <div className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
      <div className="flex h-32 items-end justify-around gap-2">
        {SUBJECTS.map((s) => {
          const isWeak = s.name === WEAK;
          const score = idx >= 4 && isWeak ? IMPROVED : s.score;
          const tone =
            idx >= 4 && isWeak
              ? "bg-emerald-500"
              : idx === 3
                ? isWeak
                  ? "bg-rose-500"
                  : "bg-brand-200"
                : "bg-brand-500";
          return (
            <div key={s.name} className="flex w-10 flex-col items-center justify-end self-stretch">
              <span
                className={`text-[11px] font-bold ${
                  idx >= 4 && isWeak ? "text-emerald-600" : idx === 3 && isWeak ? "text-rose-600" : "text-gray-500"
                }`}
              >
                {score}
                {idx >= 4 && isWeak && <span className="ml-0.5 text-[10px]">↑</span>}
              </span>
              <div
                className={`w-7 rounded-t-md transition-all duration-500 ${tone}`}
                style={{ height: `${score}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex justify-around gap-2">
        {SUBJECTS.map((s) => (
          <span
            key={s.name}
            className={`w-10 text-center text-[11px] font-bold ${
              s.name === WEAK && idx >= 3 ? (idx >= 4 ? "text-emerald-700" : "text-rose-600") : "text-gray-500"
            }`}
          >
            {s.name}
          </span>
        ))}
      </div>
    </div>
  );
}

function Flow() {
  const [idx, setIdx] = useState(0);
  const step = STEPS[idx];
  return (
    <Panel>
      <SectionTitle step={1}>成績アップ大作戦 ― データ活用の流れ</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        データは<b className="text-gray-800">集めて終わりではありません</b>。「次へ」で1歩ずつ、
        数字の山が<b className="text-gray-800">行動</b>に変わるまでを見てみよう。
      </p>

      <div className="mt-3 flex gap-1">
        {STEPS.map((s, i) => (
          <div
            key={i}
            className={`flex-1 rounded-md px-0.5 py-1.5 text-center text-[10px] font-bold transition ${
              i === idx ? "bg-brand-600 text-white" : i < idx ? "bg-brand-100 text-brand-600" : "bg-gray-100 text-gray-400"
            }`}
          >
            {s.badge}
          </div>
        ))}
      </div>

      <div className="mt-3">
        <Chart idx={idx} />
      </div>

      <p
        className="mt-3 min-h-[4.5em] rounded-xl bg-sky-50 px-4 py-3 text-sm leading-relaxed text-gray-700 ring-1 ring-sky-200 [&_b]:text-gray-900"
        dangerouslySetInnerHTML={{ __html: `<b>${step.badge}</b>：${step.html}` }}
      />

      <StepNav
        index={idx}
        total={STEPS.length}
        onPrev={() => setIdx((i) => Math.max(0, i - 1))}
        onNext={() => setIdx((i) => Math.min(STEPS.length - 1, i + 1))}
        onReset={() => setIdx(0)}
        doneLabel="改善まで到達 🎉"
      />
    </Panel>
  );
}

function Contrast() {
  return (
    <Panel>
      <SectionTitle step={2}>ためるだけ ⇄ 活用する</SectionTitle>
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <div className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
          <div className="text-sm font-bold text-gray-600">📦 ためるだけ</div>
          <p className="mt-1 text-xs leading-relaxed text-gray-500">
            点数をただ保存。眺めるだけで<b>何も変わらない</b>。
          </p>
        </div>
        <div className="rounded-xl bg-emerald-50 p-3 ring-1 ring-emerald-200">
          <div className="text-sm font-bold text-emerald-700">🚀 活用する</div>
          <p className="mt-1 text-xs leading-relaxed text-gray-600">
            傾向を読み、苦手を見つけ、<b>勉強計画を変える</b>。結果につながる。
          </p>
        </div>
      </div>
      <div className="mt-3 rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
        <div className="text-sm font-bold text-gray-800">🛠️ よく出る道具・言葉</div>
        <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-gray-600">
          <li>📈 <b>BI</b>：データを集計・可視化し、経営判断を助ける道具。</li>
          <li>⛏️ <b>データマイニング</b>：大量データから隠れた規則を掘り出すこと。</li>
          <li>✅ <b>データ品質</b>：元データが汚いと結論も間違う（ゴミからはゴミ）。</li>
        </ul>
      </div>
    </Panel>
  );
}

const ITEMS: { t: string; ok: boolean; why: string }[] = [
  { t: "目的を決めずに、とにかくデータを大量に集める", ok: false, why: "目的がないと、どのデータが必要かも、何を読むかも定まらない。" },
  { t: "集計結果をグラフにして傾向を確認する", ok: true, why: "見える化は気づきを生む大事なステップ。" },
  { t: "分析で気づいたことを、次の行動に反映する", ok: true, why: "行動に変えてこそ“活用”。ここがゴール。" },
  { t: "データが多ければ、中身が間違っていても結論は正しい", ok: false, why: "量より前に品質。汚いデータからは正しい結論は出ない。" },
];

function Quiz() {
  const [answers, setAnswers] = useState<Record<number, boolean>>({});
  return (
    <Panel>
      <SectionTitle step={3}>どっちが正しい使い方？</SectionTitle>
      <ul className="mt-3 space-y-2.5">
        {ITEMS.map((it, i) => {
          const chosen = answers[i];
          const has = chosen !== undefined;
          const correct = chosen === it.ok;
          return (
            <li key={i} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
              <p className="text-sm font-bold text-gray-800">{it.t}</p>
              <div className="mt-2 flex gap-1.5">
                {[
                  { v: true, label: "⭕ 適切" },
                  { v: false, label: "❌ 不適切" },
                ].map((o) => {
                  const picked = chosen === o.v;
                  const tone = !has
                    ? "text-gray-600 ring-1 ring-gray-300"
                    : picked
                      ? o.v === it.ok
                        ? "bg-emerald-500 text-white"
                        : "bg-rose-500 text-white"
                      : o.v === it.ok
                        ? "ring-2 ring-emerald-400 text-emerald-700"
                        : "text-gray-400 ring-1 ring-gray-200";
                  return (
                    <button
                      key={String(o.v)}
                      onClick={() => setAnswers((p) => ({ ...p, [i]: o.v }))}
                      className={`flex-1 rounded-lg px-2 py-1.5 text-sm font-bold transition active:scale-95 ${tone}`}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
              {has && (
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

export default function DataUtilizationExperience() {
  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        📊 <b>データ活用</b>は、集めて終わりではありません。テストの点数をただ保存するのではなく、
        <b>苦手科目を見つけて勉強計画を変える</b>——判断や改善につなげるまでが活用です。
      </div>

      <Flow />
      <Contrast />
      <Quiz />
    </div>
  );
}
