"use client";

import { useState } from "react";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「WBSとガントチャート」専用の体験。
//   ① WBS = 作業を分解（文化祭準備のツリー）
//   ② ガントチャート = いつ何をするかの横棒スケジュール
//   ③ これはどっち？ 仕分けクイズ（分解 or 日程）
// ============================================================================

function Wbs() {
  return (
    <Panel>
      <SectionTitle step={1}>WBS ＝ 作業を分解する</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        大きな仕事を<b className="text-gray-800">小さな作業に分けて一覧</b>にしたもの。
        「何をやるか」を漏れなく洗い出します。
      </p>

      {/* ツリー */}
      <div className="mt-4">
        <div className="mx-auto w-fit rounded-lg bg-indigo-600 px-4 py-2 text-center text-sm font-extrabold text-white">
          文化祭の出し物
        </div>
        <div className="my-1 text-center text-gray-300">┃</div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { t: "看板づくり", subs: ["デザイン", "色ぬり"] },
            { t: "買い出し", subs: ["材料リスト", "購入"] },
            { t: "当日係", subs: ["受付", "片づけ"] },
          ].map((c) => (
            <div key={c.t}>
              <div className="rounded-lg bg-indigo-100 px-1 py-1.5 text-center text-[11px] font-bold text-indigo-700">
                {c.t}
              </div>
              <div className="mt-1 space-y-1">
                {c.subs.map((s) => (
                  <div key={s} className="rounded-md bg-gray-50 px-1 py-1 text-center text-[10px] text-gray-500 ring-1 ring-gray-200">
                    {s}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-gray-400">大きな仕事 → 中くらい → 小さな作業へ分解（Work Breakdown Structure）</p>
    </Panel>
  );
}

const TASKS = [
  { t: "看板づくり", start: 0, len: 3, color: "bg-indigo-400" },
  { t: "買い出し", start: 2, len: 2, color: "bg-emerald-400" },
  { t: "リハーサル", start: 4, len: 2, color: "bg-amber-400" },
  { t: "本番準備", start: 5, len: 2, color: "bg-rose-400" },
];
const DAYS = 7;

function Gantt() {
  return (
    <Panel>
      <SectionTitle step={2}>ガントチャート ＝ いつやるか</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        WBSで洗い出した作業を、<b className="text-gray-800">横棒</b>で「いつ始めていつ終えるか」を見える化。
        棒の<b className="text-gray-800">位置＝時期</b>、<b className="text-gray-800">長さ＝期間</b>です。
      </p>

      {/* 日付ヘッダ */}
      <div className="mt-4 flex items-center gap-1">
        <div className="w-16 flex-none" />
        <div className="grid flex-1" style={{ gridTemplateColumns: `repeat(${DAYS}, 1fr)` }}>
          {Array.from({ length: DAYS }, (_, i) => (
            <div key={i} className="text-center text-[10px] text-gray-400">{i + 1}日</div>
          ))}
        </div>
      </div>
      {/* 行 */}
      <div className="mt-1 space-y-1.5">
        {TASKS.map((t) => (
          <div key={t.t} className="flex items-center gap-1">
            <div className="w-16 flex-none truncate text-[11px] font-bold text-gray-600">{t.t}</div>
            <div className="relative grid flex-1" style={{ gridTemplateColumns: `repeat(${DAYS}, 1fr)` }}>
              {Array.from({ length: DAYS }, (_, i) => (
                <div key={i} className="h-5 border-r border-gray-100" />
              ))}
              <div
                className={`absolute top-0.5 h-4 rounded ${t.color}`}
                style={{ left: `${(t.start / DAYS) * 100}%`, width: `${(t.len / DAYS) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        💡 横軸は<b>時間</b>。棒がずれて重なれば「この時期は作業が集中」と進捗・段取りが一目で分かります。
      </div>
    </Panel>
  );
}

const ITEMS: { t: string; ans: "WBS" | "ガント"; why: string }[] = [
  { t: "やる作業を漏れなく細かく分けて一覧にする", ans: "WBS", why: "作業の分解＝WBS。" },
  { t: "各作業の開始日・終了日を横棒で表す", ans: "ガント", why: "日程の見える化＝ガントチャート。" },
  { t: "「何をやるか」を洗い出す", ans: "WBS", why: "やること（作業）の整理＝WBS。" },
  { t: "「いつやるか」をカレンダー上に表す", ans: "ガント", why: "時期の管理＝ガントチャート。" },
];

function Quiz() {
  const [answers, setAnswers] = useState<Record<number, "WBS" | "ガント">>({});
  return (
    <Panel>
      <SectionTitle step={3}>これはどっち？</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        <b className="text-gray-800">WBS＝作業の分解</b>、<b className="text-gray-800">ガント＝日程</b>。混同しやすいので練習しよう。
      </p>
      <ul className="mt-3 space-y-2.5">
        {ITEMS.map((it, i) => {
          const chosen = answers[i];
          const correct = chosen === it.ans;
          return (
            <li key={i} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
              <p className="text-sm font-bold text-gray-800">{it.t}</p>
              <div className="mt-2 flex gap-1.5">
                {(["WBS", "ガント"] as const).map((opt) => {
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
                      className={`flex-1 rounded-lg px-2 py-1.5 text-sm font-bold transition active:scale-95 ${tone}`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
              {chosen && (
                <p className={`mt-2 text-xs font-medium ${correct ? "text-emerald-700" : "text-rose-600"}`}>
                  {correct ? "⭕ 正解！ " : `❌ 正解は ${it.ans}。 `}
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

export default function WbsGanttExperience() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        🗂️ <b>WBS＝作業を分解した一覧（何をやる）</b>、<b>ガントチャート＝横棒のスケジュール（いつやる）</b>。
        セットでプロジェクトの計画と進捗管理に使います。
      </div>

      <Wbs />
      <Gantt />
      <Quiz />
    </div>
  );
}
