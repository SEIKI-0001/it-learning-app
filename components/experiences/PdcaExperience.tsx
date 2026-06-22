"use client";

import { useState } from "react";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「PDCA」専用の体験。
//   ① PDCAサイクルを1歩ずつ回す（テスト勉強のたとえで具体化）
//   ② Checkで終わらせず、Actが次のPlanにつながる＝ぐるぐる回す
//   ③ どの段階？ ミニクイズ
// ============================================================================

const CYCLE = [
  { k: "P", name: "Plan（計画）", emoji: "🗒️", ex: "テストに向けて勉強計画を立てる", color: "indigo" },
  { k: "D", name: "Do（実行）", emoji: "✏️", ex: "計画どおりに問題を解く", color: "emerald" },
  { k: "C", name: "Check（評価）", emoji: "🔍", ex: "点数を見て、できた所・苦手を確認する", color: "amber" },
  { k: "A", name: "Act（改善）", emoji: "🔧", ex: "苦手に合わせて、次の計画を直す", color: "rose" },
];

const RING: Record<string, { on: string; off: string }> = {
  indigo: { on: "bg-indigo-600 text-white ring-indigo-600", off: "bg-indigo-50 text-indigo-400 ring-indigo-200" },
  emerald: { on: "bg-emerald-600 text-white ring-emerald-600", off: "bg-emerald-50 text-emerald-400 ring-emerald-200" },
  amber: { on: "bg-amber-500 text-white ring-amber-500", off: "bg-amber-50 text-amber-500 ring-amber-200" },
  rose: { on: "bg-rose-500 text-white ring-rose-500", off: "bg-rose-50 text-rose-400 ring-rose-200" },
};

function Cycle() {
  const [step, setStep] = useState(0);
  const cur = CYCLE[step % 4];
  const laps = Math.floor(step / 4);
  return (
    <Panel>
      <SectionTitle step={1}>PDCAを回してみる</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        <b className="text-gray-800">計画→実行→評価→改善</b>をくり返す改善サイクル。テスト勉強を例に1歩ずつ進めよう。
      </p>

      {/* 4つのリング（2x2で円配置っぽく） */}
      <div className="mx-auto mt-4 grid w-fit grid-cols-2 gap-2">
        {[CYCLE[0], CYCLE[1], CYCLE[3], CYCLE[2]].map((c) => {
          // 表示順を P D / A C にして時計回り（P→D→C→A）の見た目に
          const on = cur.k === c.k;
          const ring = RING[c.color];
          return (
            <div
              key={c.k}
              className={`grid h-20 w-20 place-items-center rounded-2xl text-center ring-2 transition ${
                on ? `${ring.on} scale-105` : ring.off
              }`}
            >
              <div>
                <div className="text-xl leading-none">{c.emoji}</div>
                <div className="mt-1 text-lg font-extrabold leading-none">{c.k}</div>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-1 text-center text-[11px] text-gray-400">時計回りに P → D → C → A、そしてまた P へ</p>

      <div className="mt-3 rounded-xl bg-sky-50 px-4 py-3 ring-1 ring-sky-200">
        <div className="text-sm font-extrabold text-gray-800">
          {cur.emoji} {cur.name}
        </div>
        <p className="mt-1 text-sm leading-relaxed text-gray-700">例：{cur.ex}</p>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-gray-400">{laps > 0 ? `${laps}周まわった` : "1周目"}</span>
        <div className="flex gap-2">
          <button
            onClick={() => setStep(0)}
            className="rounded-lg px-3 py-1.5 text-sm font-bold text-gray-600 ring-1 ring-gray-300 active:scale-95"
            aria-label="最初から"
          >
            ↺
          </button>
          <button
            onClick={() => setStep((s) => s + 1)}
            className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-bold text-white active:scale-95"
          >
            次へ →
          </button>
        </div>
      </div>
    </Panel>
  );
}

function KeyPoint() {
  return (
    <Panel>
      <SectionTitle step={2}>大事なのは「回し続ける」こと</SectionTitle>
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <div className="rounded-xl bg-gray-50 p-3 text-center ring-1 ring-gray-200">
          <div className="text-xl">🛑</div>
          <div className="mt-1 text-xs font-extrabold text-gray-600">やりがちなミス</div>
          <p className="mt-1 text-[11px] leading-relaxed text-gray-500">
            Check（評価）で「確認した」だけで終わり、次に活かさない。
          </p>
        </div>
        <div className="rounded-xl bg-emerald-50 p-3 text-center ring-1 ring-emerald-200">
          <div className="text-xl">🔄</div>
          <div className="mt-1 text-xs font-extrabold text-emerald-700">正しい使い方</div>
          <p className="mt-1 text-[11px] leading-relaxed text-gray-600">
            Act（改善）で直し、それを<b>次のPlan</b>に反映してまた回す。
          </p>
        </div>
      </div>
      <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        💡 <b>Check</b> は「評価・確認」、<b>Act</b> は「改善」。やりっぱなしにせず、回すほど良くなります。
      </div>
    </Panel>
  );
}

const ITEMS: { t: string; ans: string; why: string }[] = [
  { t: "勉強計画を立てる", ans: "Plan", why: "計画＝Plan。" },
  { t: "計画どおり問題を解く", ans: "Do", why: "実行＝Do。" },
  { t: "点数を見て苦手を確認する", ans: "Check", why: "評価・確認＝Check。" },
  { t: "苦手に合わせて次の計画を直す", ans: "Act", why: "改善＝Act。" },
];
const OPTS = ["Plan", "Do", "Check", "Act"];

function Quiz() {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  return (
    <Panel>
      <SectionTitle step={3}>これはどの段階？</SectionTitle>
      <ul className="mt-3 space-y-2.5">
        {ITEMS.map((it, i) => {
          const chosen = answers[i];
          const correct = chosen === it.ans;
          return (
            <li key={i} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
              <p className="text-sm font-bold text-gray-800">{it.t}</p>
              <div className="mt-2 flex gap-1.5">
                {OPTS.map((opt) => {
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
                      className={`flex-1 rounded-lg px-1 py-1.5 text-[11px] font-bold transition active:scale-95 ${tone}`}
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

export default function PdcaExperience() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        🔄 <b>PDCA</b> は <b>Plan(計画)→Do(実行)→Check(評価)→Act(改善)</b> をくり返す改善サイクル。
        やりっぱなしにせず、結果を見て次の行動を直すのがコツです。
      </div>

      <Cycle />
      <KeyPoint />
      <Quiz />
    </div>
  );
}
