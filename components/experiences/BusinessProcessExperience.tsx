"use client";

import { useState } from "react";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「業務プロセス改善」専用の体験。
//   ① 業務フローを見える化し、時間のかかる工程（ボトルネック）を見つける
//   ② 見つけた工程を改善 → 全体の時間が短くなるのを体感
//   ③ そのままシステム化の罠（まず見直す）クイズ
// ============================================================================

type Step = { name: string; emoji: string; base: number; improved: number; fix: string };

const STEPS: Step[] = [
  { name: "受付", emoji: "📥", base: 5, improved: 5, fix: "" },
  { name: "手書き転記", emoji: "✍️", base: 30, improved: 5, fix: "手入力をやめてデータ自動連携にする" },
  { name: "承認待ち", emoji: "⏳", base: 20, improved: 5, fix: "オンライン承認で待ち時間を減らす" },
  { name: "発送", emoji: "📦", base: 5, improved: 5, fix: "" },
];

const yen = (n: number) => `${n}分`;

function Flow() {
  const [fixed, setFixed] = useState<Set<number>>(new Set());
  const improvable = STEPS.map((s, i) => i).filter((i) => STEPS[i].base !== STEPS[i].improved);
  const total = STEPS.reduce((sum, s, i) => sum + (fixed.has(i) ? s.improved : s.base), 0);
  const baseTotal = STEPS.reduce((sum, s) => sum + s.base, 0);
  const maxBase = Math.max(...STEPS.map((s) => s.base));
  const allFixed = improvable.every((i) => fixed.has(i));

  const toggle = (i: number) => {
    if (STEPS[i].base === STEPS[i].improved) return; // 改善余地なし
    setFixed((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  return (
    <Panel>
      <SectionTitle step={1}>仕事の流れを「見える化」する</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        注文を処理する流れです。<b className="text-gray-800">時間がかかる工程（長い棒）</b>が改善のねらい目。
        オレンジの工程をタップして直してみよう。
      </p>

      <div className="mt-4 space-y-2">
        {STEPS.map((s, i) => {
          const cur = fixed.has(i) ? s.improved : s.base;
          const canFix = s.base !== s.improved;
          const isFixed = fixed.has(i);
          const pct = (cur / maxBase) * 100;
          return (
            <button
              key={s.name}
              onClick={() => toggle(i)}
              disabled={!canFix}
              className={`block w-full rounded-xl p-2.5 text-left ring-1 transition active:scale-[0.99] ${
                canFix
                  ? isFixed
                    ? "bg-emerald-50 ring-emerald-200"
                    : "bg-amber-50 ring-amber-300"
                  : "bg-gray-50 ring-gray-200"
              }`}
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-gray-700">
                  {s.emoji} {s.name}
                  {canFix && !isFixed && <span className="ml-1.5 text-amber-600">← 時間がかかる</span>}
                  {isFixed && <span className="ml-1.5 text-emerald-600">✓ 改善した</span>}
                </span>
                <span className="text-gray-500">{yen(cur)}</span>
              </div>
              <div className="mt-1 h-3 overflow-hidden rounded bg-white/70">
                <div
                  className={`h-full transition-all ${isFixed ? "bg-emerald-400" : canFix ? "bg-amber-400" : "bg-gray-300"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 ring-1 ring-gray-200">
        <span className="text-sm font-bold text-gray-600">かかる合計時間</span>
        <span className="text-sm">
          <b className={total < baseTotal ? "text-emerald-600" : "text-gray-800"}>{yen(total)}</b>
          {total < baseTotal && <span className="ml-1 text-gray-400 line-through">{yen(baseTotal)}</span>}
        </span>
      </div>

      <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        {allFixed ? (
          <>🎉 ボトルネック（手書き転記・承認待ち）を直して <b>{baseTotal}分 → {total}分</b> に短縮！これが業務プロセス改善です。</>
        ) : (
          <>💡 まず<b>どこで時間がかかるか・ミスが起きるか</b>を見つけ、その工程を直すのがコツ。</>
        )}
      </div>
    </Panel>
  );
}

const ITEMS: { t: string; ok: boolean; why: string }[] = [
  { t: "今のムダな手作業をそのままシステム化する", ok: false, why: "ムダごとIT化すると非効率が固定される。まず流れを見直す。" },
  { t: "どこで時間やミスが起きるかを先に調べる", ok: true, why: "見える化して問題を見つけるのが第一歩。" },
  { t: "手順を見直してから、必要な所だけIT化する", ok: true, why: "改善が先、IT化は手段。正しい順番。" },
  { t: "改善は現場の根性だけに任せる", ok: false, why: "仕組み・流れの見直しが必要。根性論では続かない。" },
];

function Quiz() {
  const [answers, setAnswers] = useState<Record<number, boolean>>({});
  return (
    <Panel>
      <SectionTitle step={2}>改善の進め方として正しい？</SectionTitle>
      <ul className="mt-3 space-y-2.5">
        {ITEMS.map((it, i) => {
          const chosen = answers[i];
          const answered = chosen !== undefined;
          const correct = chosen === it.ok;
          return (
            <li key={i} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
              <p className="text-sm font-bold text-gray-800">{it.t}</p>
              <div className="mt-2 flex gap-2">
                {[
                  { v: true, label: "⭕ 正しい" },
                  { v: false, label: "🙅 ちがう" },
                ].map((opt) => {
                  const picked = chosen === opt.v;
                  const tone = !answered
                    ? "text-gray-600 ring-1 ring-gray-300"
                    : picked
                      ? opt.v === it.ok
                        ? "bg-emerald-500 text-white"
                        : "bg-rose-500 text-white"
                      : opt.v === it.ok
                        ? "ring-2 ring-emerald-400 text-emerald-700"
                        : "text-gray-400 ring-1 ring-gray-200";
                  return (
                    <button
                      key={String(opt.v)}
                      onClick={() => setAnswers((p) => ({ ...p, [i]: opt.v }))}
                      className={`flex-1 rounded-lg px-2 py-1.5 text-sm font-bold transition active:scale-95 ${tone}`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              {answered && (
                <p className={`mt-2 text-xs font-medium ${correct ? "text-emerald-700" : "text-rose-600"}`}>
                  {correct ? "⭕ 正解！ " : "❌ 残念。 "}
                  {it.why}
                </p>
              )}
            </li>
          );
        })}
      </ul>
      <div className="mt-3 rounded-xl bg-sky-50 px-4 py-3 text-sm leading-relaxed text-sky-900 ring-1 ring-sky-200">
        📌 業務の流れを根本から見直すのが <b>BPR</b>、継続的に管理・改善するのが <b>BPM</b>。
      </div>
    </Panel>
  );
}

export default function BusinessProcessExperience() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        🔧 <b>業務プロセス改善</b>は、仕事の流れを<b>見える化</b>して、時間のかかる所やミスの起きる所を見つけ、
        手順の見直しやIT化でよくする活動です。
      </div>

      <Flow />
      <Quiz />
    </div>
  );
}
