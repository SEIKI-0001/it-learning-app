"use client";

import { useState } from "react";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「見積り（FP法・人月）」専用の体験。
//   ① FP法＝機能の数と複雑さから規模を出す（機能を増やすとFPが増える）
//   ② 工数＝人月（人数 × 期間）
//   ③ 見積り手法クイズ
// ============================================================================

const FUNCS = [
  { key: "input", emo: "⌨️", name: "入力（画面）", w: 4 },
  { key: "output", emo: "🧾", name: "出力（帳票）", w: 5 },
  { key: "query", emo: "🔍", name: "照会（検索）", w: 4 },
  { key: "file", emo: "🗄️", name: "ファイル（データ）", w: 7 },
];

function FpCounter() {
  const [counts, setCounts] = useState<Record<string, number>>({
    input: 1,
    output: 1,
    query: 0,
    file: 1,
  });
  const fp = FUNCS.reduce((sum, f) => sum + counts[f.key] * f.w, 0);

  const set = (k: string, delta: number) =>
    setCounts((p) => ({ ...p, [k]: Math.max(0, Math.min(9, p[k] + delta)) }));

  return (
    <Panel>
      <SectionTitle step={1}>FP法 ― 機能の数で規模を見積もる</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        <b className="text-gray-800">FP法（ファンクションポイント法）</b>は、
        画面・帳票・データなど<b className="text-gray-800">「機能の数と複雑さ」</b>から開発規模を見積もります。
        機能を増減すると合計（FP）が変わります。
      </p>

      <div className="mt-3 space-y-2">
        {FUNCS.map((f) => (
          <div
            key={f.key}
            className="flex items-center gap-2 rounded-xl bg-gray-50 p-2.5 ring-1 ring-gray-200"
          >
            <span className="text-lg">{f.emo}</span>
            <span className="text-sm font-bold text-gray-800">{f.name}</span>
            <span className="text-[10px] font-bold text-gray-400">×{f.w}点</span>
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => set(f.key, -1)}
                className="grid h-7 w-7 place-items-center rounded-lg bg-white text-base font-bold text-gray-600 ring-1 ring-gray-300 active:scale-95"
              >
                −
              </button>
              <span className="w-5 text-center font-mono text-sm font-extrabold text-gray-800">
                {counts[f.key]}
              </span>
              <button
                onClick={() => set(f.key, 1)}
                className="grid h-7 w-7 place-items-center rounded-lg bg-indigo-600 text-base font-bold text-white active:scale-95"
              >
                ＋
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 rounded-xl bg-indigo-50 px-4 py-3 text-center ring-1 ring-indigo-200">
        <div className="text-xs font-bold text-indigo-500">合計ファンクションポイント</div>
        <div className="mt-0.5 text-2xl font-extrabold text-indigo-700">{fp} FP</div>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-gray-500">
        ※ ポイントは「<b>利用者から見た機能</b>」で測ること。
        プログラムの<b>行数で測るのではない</b>のがFP法の特徴です。
      </p>
    </Panel>
  );
}

function PersonMonth() {
  return (
    <Panel>
      <SectionTitle step={2}>工数 ― 人月（人数 × 期間）</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        手間の大きさは<b className="text-gray-800">工数</b>で表し、よく
        <b className="text-gray-800">人月（にんげつ）</b>を使います。
        1人月＝1人が1か月でできる作業量です。
      </p>
      <div className="mt-3 rounded-xl bg-gray-50 p-4 text-center ring-1 ring-gray-200">
        <div className="text-sm font-bold text-gray-700">
          👥 3人 × 📅 4か月 ＝ <span className="text-indigo-700">12人月</span>
        </div>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-gray-500">
        ※ ただし<b>人を増やせば必ず早く終わるわけではない</b>（連携の手間が増える）点も問われます。
      </p>
    </Panel>
  );
}

const QUIZ: { t: string; ans: string; opts: string[]; why: string }[] = [
  {
    t: "画面・帳票・データなど、利用者から見た機能の数と複雑さから開発規模を見積もる方法は？",
    ans: "FP法",
    opts: ["FP法", "クリティカルパス法", "PDCA"],
    why: "機能から規模を見積もる＝FP法（ファンクションポイント法）。",
  },
  {
    t: "「3人で4か月かかる」のように、人数と期間で手間を表す単位は？",
    ans: "人月",
    opts: ["人月", "FP", "稼働率"],
    why: "工数を人数×期間で表す単位＝人月。",
  },
];

function Quiz() {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  return (
    <Panel>
      <SectionTitle step={3}>確認クイズ</SectionTitle>
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

export default function EstimationExperience() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        📐 見積りは、開発の<b>規模や手間を前もって数値化</b>すること。
        <b>FP法＝機能の数から規模／人月＝人数×期間で工数</b>を表します。
      </div>

      <FpCounter />
      <PersonMonth />
      <Quiz />
    </div>
  );
}
