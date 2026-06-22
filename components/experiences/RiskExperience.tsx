"use client";

import { useState } from "react";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「リスク管理」専用の体験。
//   ① リスクとは（まだ起きてない・起きるかも・影響する）
//   ② 確率 × 影響 で優先度（スライダーで色が変わるマトリクス）
//   ③ リスク対応の4分類（回避・低減・移転・受容）＋クイズ
// ============================================================================

function WhatIsRisk() {
  return (
    <Panel>
      <SectionTitle step={1}>リスクってなに？</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        リスクは、<b className="text-gray-800">まだ起きていないけれど、起きるかもしれない</b>、
        計画に影響する出来事のこと。
      </p>
      <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-gray-50 p-4 ring-1 ring-gray-200">
        <div className="text-center">
          <div className="text-2xl">🎒</div>
          <div className="mt-1 text-[11px] font-bold text-gray-600">遠足の前日</div>
        </div>
        <span className="text-xl text-gray-300">→</span>
        <div className="text-center">
          <div className="text-2xl">🌧️</div>
          <div className="mt-1 text-[11px] font-bold text-gray-600">雨が降るかも</div>
          <div className="text-[10px] text-gray-400">＝リスク</div>
        </div>
        <span className="text-xl text-gray-300">→</span>
        <div className="text-center">
          <div className="text-2xl">☂️</div>
          <div className="mt-1 text-[11px] font-bold text-gray-600">傘を用意</div>
          <div className="text-[10px] text-gray-400">＝備え</div>
        </div>
      </div>
      <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        ⚠️ すでに起きた障害は「リスク」ではありません。リスクは<b>これから起きるかもしれない不確実なこと</b>です。
      </div>
    </Panel>
  );
}

function Matrix() {
  const [prob, setProb] = useState(2); // 1..3 発生確率
  const [impact, setImpact] = useState(2); // 1..3 影響度
  const score = prob * impact;
  const level =
    score >= 6 ? { t: "最優先で対策", tone: "bg-rose-500 text-white", emoji: "🔴" } : score >= 3 ? { t: "対策を検討", tone: "bg-amber-400 text-white", emoji: "🟡" } : { t: "様子見でOK", tone: "bg-emerald-500 text-white", emoji: "🟢" };

  const cellTone = (p: number, im: number) => {
    const s = p * im;
    const here = p === prob && im === impact;
    const base = s >= 6 ? "bg-rose-200" : s >= 3 ? "bg-amber-200" : "bg-emerald-200";
    return `${base} ${here ? "ring-2 ring-indigo-600" : "ring-1 ring-white"}`;
  };

  return (
    <Panel>
      <SectionTitle step={2}>確率 × 影響 で優先度を決める</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        リスクは数が多いので、<b className="text-gray-800">起こりやすさ</b>と<b className="text-gray-800">起きたときの大きさ</b>の
        かけ算で、対策の優先度を決めます。
      </p>

      {/* マトリクス */}
      <div className="mt-4 flex gap-2">
        <div className="flex flex-col items-center justify-center">
          <span className="text-[10px] font-bold text-gray-500 [writing-mode:vertical-rl]">影響度 大 →</span>
        </div>
        <div className="flex-1">
          <div className="grid grid-cols-3 gap-1">
            {[3, 2, 1].map((im) =>
              [1, 2, 3].map((p) => (
                <div
                  key={`${p}-${im}`}
                  className={`grid h-12 place-items-center rounded-md text-xs font-bold text-gray-700 ${cellTone(p, im)}`}
                >
                  {p === prob && im === impact ? "ここ" : ""}
                </div>
              ))
            )}
          </div>
          <div className="mt-1 text-center text-[10px] font-bold text-gray-500">発生確率 大 →</div>
        </div>
      </div>

      {/* スライダー */}
      <div className="mt-4 space-y-3">
        <div>
          <div className="flex justify-between text-xs font-bold text-gray-600">
            <span>発生確率</span>
            <span className="text-indigo-700">{["低", "中", "高"][prob - 1]}</span>
          </div>
          <input type="range" min={1} max={3} value={prob} onChange={(e) => setProb(Number(e.target.value))} className="mt-1 w-full accent-indigo-600" />
        </div>
        <div>
          <div className="flex justify-between text-xs font-bold text-gray-600">
            <span>影響度</span>
            <span className="text-indigo-700">{["小", "中", "大"][impact - 1]}</span>
          </div>
          <input type="range" min={1} max={3} value={impact} onChange={(e) => setImpact(Number(e.target.value))} className="mt-1 w-full accent-indigo-600" />
        </div>
      </div>

      <div className={`mt-3 rounded-xl px-4 py-3 text-center text-sm font-extrabold ${level.tone}`}>
        {level.emoji} このリスクは「{level.t}」
      </div>
      <p className="mt-2 text-center text-xs text-gray-400">確率も影響も大きいほど、優先して対策する</p>
    </Panel>
  );
}

const RESP = [
  { name: "回避", emoji: "🚫", desc: "リスクの原因をやめる", ex: "危ない計画自体を中止する" },
  { name: "低減", emoji: "🛡️", desc: "確率や影響を小さくする", ex: "バックアップを取る・二重チェック" },
  { name: "移転", emoji: "🤝", desc: "他者に肩代わりしてもらう", ex: "保険に入る・外部に委託" },
  { name: "受容", emoji: "🤷", desc: "小さいので受け入れる", ex: "起きても困らない範囲はそのまま" },
];

const ITEMS: { t: string; ans: string; why: string }[] = [
  { t: "火災に備えて保険に入る", ans: "移転", why: "損失を他者（保険会社）に肩代わり＝移転。" },
  { t: "データ消失に備え毎日バックアップ", ans: "低減", why: "影響を小さくする＝低減。" },
  { t: "危険すぎる計画そのものをやめる", ans: "回避", why: "原因をなくす＝回避。" },
  { t: "ごく軽微なので対策せず受け入れる", ans: "受容", why: "受け入れる＝受容。" },
];
const OPTS = ["回避", "低減", "移転", "受容"];

function Responses() {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  return (
    <Panel>
      <SectionTitle step={3}>リスクへの対応は4種類</SectionTitle>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {RESP.map((r) => (
          <div key={r.name} className="rounded-xl bg-gray-50 p-2.5 ring-1 ring-gray-200">
            <div className="flex items-center gap-1.5">
              <span className="text-base">{r.emoji}</span>
              <span className="text-sm font-extrabold text-gray-800">{r.name}</span>
            </div>
            <p className="mt-0.5 text-[11px] leading-relaxed text-gray-600">{r.desc}</p>
            <p className="mt-0.5 text-[10px] text-gray-400">例：{r.ex}</p>
          </div>
        ))}
      </div>

      <p className="mt-4 text-sm font-bold text-gray-700">これはどの対応？</p>
      <ul className="mt-2 space-y-2.5">
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
                      className={`flex-1 rounded-lg px-1 py-1.5 text-xs font-bold transition active:scale-95 ${tone}`}
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

export default function RiskExperience() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        🎲 <b>リスク</b>は「これから起きるかもしれない問題」。<b>発生確率×影響度</b>で優先度を決め、
        <b>回避・低減・移転・受容</b>から対応を選んで備えます。
      </div>

      <WhatIsRisk />
      <Matrix />
      <Responses />
    </div>
  );
}
