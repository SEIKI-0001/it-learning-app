"use client";

import { useState } from "react";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「財務諸表（貸借対照表BS・損益計算書PL）」専用の体験。
//   ① BS=ある時点の状態（左の資産=右の負債+純資産でつり合う）
//   ② PL=一定期間のもうけ（収益-費用=利益）
//   ③ 「BS？ PL？」仕分けクイズ
// ============================================================================

function BsView() {
  return (
    <Panel>
      <SectionTitle step={1}>貸借対照表（BS）― 今の「持ち物」のつり合い</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        <b className="text-gray-800">貸借対照表（BS）</b>は、ある時点で
        <b className="text-gray-800">「何を持ち、どう用意したか」</b>を表します。
        左右は必ず同じ金額でつり合います。
      </p>

      <div className="mt-4 overflow-hidden rounded-xl ring-1 ring-gray-300">
        <div className="grid grid-cols-2 text-center text-[11px] font-bold text-gray-500">
          <div className="border-r border-gray-200 bg-gray-50 py-1.5">使い道（左）</div>
          <div className="bg-gray-50 py-1.5">集め方（右）</div>
        </div>
        <div className="grid grid-cols-2">
          {/* 左：資産 */}
          <div className="border-r border-gray-200 bg-sky-50 p-3">
            <div className="text-xs font-extrabold text-sky-800">資産</div>
            <div className="mt-1.5 text-[11px] leading-relaxed text-sky-700">
              現金・建物・商品など<br />会社が持っているもの
            </div>
            <div className="mt-2 rounded-lg bg-white/70 px-2 py-1 text-center text-sm font-extrabold text-sky-800">
              100
            </div>
          </div>
          {/* 右：負債＋純資産 */}
          <div className="bg-amber-50 p-3">
            <div className="text-xs font-extrabold text-amber-800">負債</div>
            <div className="text-[11px] leading-relaxed text-amber-700">借入金など返すお金</div>
            <div className="mt-1 rounded-lg bg-white/70 px-2 py-0.5 text-center text-sm font-extrabold text-amber-800">
              60
            </div>
            <div className="mt-2 text-xs font-extrabold text-emerald-800">純資産</div>
            <div className="text-[11px] leading-relaxed text-emerald-700">自分のお金（返さない）</div>
            <div className="mt-1 rounded-lg bg-white/70 px-2 py-0.5 text-center text-sm font-extrabold text-emerald-800">
              40
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 border-t border-gray-200 text-center text-sm font-extrabold">
          <div className="border-r border-gray-200 bg-sky-100 py-1.5 text-sky-800">資産 100</div>
          <div className="bg-amber-100 py-1.5 text-amber-800">負債+純資産 100</div>
        </div>
      </div>

      <div className="mt-3 rounded-xl bg-indigo-50 px-4 py-2.5 text-sm font-bold text-indigo-900 ring-1 ring-indigo-200">
        ⚖️ 資産 ＝ 負債 ＋ 純資産（左右が必ずつり合う）
      </div>
      <p className="mt-2 text-xs leading-relaxed text-gray-500">
        ※ BSは「ある時点」のスナップ写真。<b>純資産＝資産−負債</b>（自分の正味の取り分）。
      </p>
    </Panel>
  );
}

function PlView() {
  const [sales, setSales] = useState(120);
  const cost = 80; // 固定の費用
  const profit = sales - cost;
  const black = profit >= 0;
  return (
    <Panel>
      <SectionTitle step={2}>損益計算書（PL）― 期間中の「もうけ」</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        <b className="text-gray-800">損益計算書（PL）</b>は、1年などの期間で
        <b className="text-gray-800">「いくら稼ぎ、いくら使い、いくら残ったか」</b>を表します。
        売上（収益）を動かしてみましょう。
      </p>

      <div className="mt-4">
        <div className="flex items-center justify-between text-xs font-bold text-gray-500">
          <span>収益（売上）</span>
          <span className="font-mono text-sm text-gray-800">{sales}</span>
        </div>
        <input
          type="range"
          min={40}
          max={160}
          step={10}
          value={sales}
          onChange={(e) => setSales(Number(e.target.value))}
          className="mt-1 w-full accent-indigo-600"
        />
      </div>

      <div className="mt-3 space-y-1.5 text-sm">
        <div className="flex justify-between rounded-lg bg-sky-50 px-3 py-2 ring-1 ring-sky-200">
          <span className="font-bold text-sky-800">収益（売上）</span>
          <span className="font-mono font-extrabold text-sky-800">{sales}</span>
        </div>
        <div className="flex justify-between rounded-lg bg-amber-50 px-3 py-2 ring-1 ring-amber-200">
          <span className="font-bold text-amber-800">− 費用</span>
          <span className="font-mono font-extrabold text-amber-800">{cost}</span>
        </div>
        <div
          className={`flex justify-between rounded-lg px-3 py-2 ring-1 ${
            black
              ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
              : "bg-rose-50 text-rose-800 ring-rose-200"
          }`}
        >
          <span className="font-extrabold">＝ 利益</span>
          <span className="font-mono font-extrabold">
            {profit >= 0 ? `+${profit}` : profit}（{black ? "黒字" : "赤字"}）
          </span>
        </div>
      </div>

      <div className="mt-3 rounded-xl bg-indigo-50 px-4 py-2.5 text-sm font-bold text-indigo-900 ring-1 ring-indigo-200">
        🧮 利益 ＝ 収益 − 費用
      </div>
      <p className="mt-2 text-xs leading-relaxed text-gray-500">
        ※ PLは「一定期間」のもうけの記録。BSの“ある時点の状態”とは見ているものが違います。
      </p>
    </Panel>
  );
}

const QUIZ: { t: string; ans: "BS" | "PL"; why: string }[] = [
  { t: "3月31日時点で、会社が持つ資産と借金の状態を示す表", ans: "BS", why: "ある時点の財政状態＝貸借対照表(BS)。" },
  { t: "4月〜翌3月の1年間で、いくら稼いでいくら利益が出たかを示す表", ans: "PL", why: "期間のもうけ＝損益計算書(PL)。" },
  { t: "「資産＝負債＋純資産」で左右がつり合う表", ans: "BS", why: "左右がつり合うのはBSの特徴。" },
  { t: "「収益−費用＝利益」を計算して示す表", ans: "PL", why: "利益を計算するのはPL。" },
];

function Quiz() {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  return (
    <Panel>
      <SectionTitle step={3}>これは BS？　PL？</SectionTitle>
      <ul className="mt-3 space-y-2.5">
        {QUIZ.map((q, i) => {
          const chosen = answers[i];
          const correct = chosen === q.ans;
          return (
            <li key={i} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
              <div className="text-sm font-bold text-gray-800">{q.t}</div>
              <div className="mt-2 flex gap-1.5">
                {(["BS", "PL"] as const).map((opt) => {
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
                      className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-bold transition active:scale-95 ${tone}`}
                    >
                      {opt}（{opt === "BS" ? "貸借対照表" : "損益計算書"}）
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

export default function FinancialStatementsExperience() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        📑 財務諸表には2つの主役。<b>BS＝ある時点の「持ち物のつり合い」</b>、
        <b>PL＝期間中の「もうけ」</b>。何を見ている表かで区別しましょう。
      </div>

      <BsView />
      <PlView />
      <Quiz />
    </div>
  );
}
