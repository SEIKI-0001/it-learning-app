"use client";

import { useState } from "react";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「リスク管理」専用の体験。
//   ① リスクとは（まだ起きてない・起きるかも・影響する）
//   ② 発生確率 × 影響度 で優先度（代表的なリスクを最初から配置した静的マトリクス。軸を大きく）
//   ③ リスク対応の4分類（回避・低減・移転・受容）をカード（名称／一言の意味／具体例）で＋クイズ
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
      <div className="mt-3 rounded-xl bg-gray-50 px-4 py-3 text-sm leading-relaxed text-gray-800 ring-1 ring-gray-200">
        すでに起きた障害は「リスク」ではありません。リスクは<b>これから起きるかもしれない不確実なこと</b>です。
      </div>
    </Panel>
  );
}

// 代表的なリスクを最初からマトリクスに置いておく（操作なしで「確率×影響度で優先順位」が読める）
// p＝発生確率 1..3（低→高）、im＝影響度 1..3（小→大）
const RISKS: { p: number; im: number; t: string }[] = [
  { p: 3, im: 3, t: "仕様変更が続き、納期に間に合わない" },
  { p: 1, im: 3, t: "大地震でデータセンターが止まる" },
  { p: 2, im: 2, t: "外注先の納品が数日遅れる" },
  { p: 3, im: 1, t: "会議室が取れず打合せがずれる" },
  { p: 1, im: 1, t: "予備のあるテスト用PCが故障" },
];

const priority = (p: number, im: number) => {
  const sc = p * im;
  return sc >= 6 ? "high" : sc >= 3 ? "mid" : "low";
};
const PRIORITY = {
  high: { label: "優先度 高", cell: "bg-rose-50 ring-rose-300", tag: "text-rose-700" },
  mid: { label: "優先度 中", cell: "bg-gray-100 ring-gray-300", tag: "text-gray-700" },
  low: { label: "優先度 低", cell: "bg-white ring-gray-200", tag: "text-gray-500" },
} as const;

function Matrix() {
  return (
    <Panel>
      <SectionTitle step={2}>発生確率 × 影響度 で優先順位を決める</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        リスクは数が多いので、<b className="text-gray-800">起こりやすさ（発生確率）</b>と<b className="text-gray-800">起きたときの大きさ（影響度）</b>の2軸で並べ、
        <b className="text-gray-800">右上ほど先に対策</b>します。システム開発プロジェクトの例です。
      </p>

      <div className="mt-4 grid grid-cols-[2.25rem_1fr] gap-x-1.5" data-testid="risk-matrix">
        {/* 縦軸：影響度（上ほど大） */}
        <div className="flex flex-col items-center">
          <span className="text-sm font-bold text-gray-900">大</span>
          <div className="relative my-1 flex w-full flex-1 justify-center">
            <span aria-hidden className="absolute inset-y-0 left-1/2 w-[3px] -translate-x-1/2 bg-gray-900" />
            <span aria-hidden className="absolute -top-1 left-1/2 h-0 w-0 -translate-x-1/2 border-x-[7px] border-b-[10px] border-x-transparent border-b-gray-900" />
            <span className="relative z-10 self-center bg-white py-1 text-base font-bold leading-tight tracking-wider text-gray-900 [writing-mode:vertical-rl]">影響度</span>
          </div>
          <span className="text-sm font-bold text-gray-900">小</span>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {[3, 2, 1].map((im) =>
            [1, 2, 3].map((p) => {
              const pr = PRIORITY[priority(p, im)];
              const risk = RISKS.find((r) => r.p === p && r.im === im);
              return (
                <div key={`${p}-${im}`} className={`flex min-h-[5.25rem] flex-col rounded-md p-1.5 ring-1 ${pr.cell}`} data-priority={priority(p, im)}>
                  <span className={`text-[11px] font-bold ${pr.tag}`}>{pr.label}</span>
                  {risk && <span className="mt-0.5 text-xs font-bold leading-snug text-gray-900" data-testid="risk-item">{risk.t}</span>}
                </div>
              );
            }),
          )}
        </div>
        {/* 横軸：発生確率（右ほど高） */}
        <div />
        <div className="mt-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-gray-900">低</span>
            <div className="relative h-[3px] flex-1 bg-gray-900" aria-hidden>
              <span className="absolute -right-1 top-1/2 h-0 w-0 -translate-y-1/2 border-y-[7px] border-l-[10px] border-y-transparent border-l-gray-900" />
            </div>
            <span className="text-sm font-bold text-gray-900">高</span>
          </div>
          <div className="mt-1 text-center text-base font-bold text-gray-900">発生確率</div>
        </div>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-gray-700">
        「仕様変更が続く」は起こりやすく影響も大きい＝<b className="text-rose-700">最優先</b>。
        「大地震」は影響は大きいが起こりにくいので、<b className="text-gray-900">確率と影響の両方</b>を見て順番を決めます。
      </p>
    </Panel>
  );
}

const RESP = [
  { name: "回避", alias: "", desc: "リスクの原因そのものをなくす", ex: "危険すぎる機能の開発をやめる" },
  { name: "低減", alias: "軽減", desc: "起きる確率や、起きたときの影響を小さくする", ex: "毎日バックアップを取る・二重チェックする" },
  { name: "移転", alias: "転嫁", desc: "損失を他者に肩代わりしてもらう", ex: "保険に入る・専門業者に委託する" },
  { name: "受容", alias: "保有", desc: "影響が小さいので、対策せずに受け入れる", ex: "起きても困らない範囲はそのままにする" },
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
      <ul className="mt-3 grid gap-2 sm:grid-cols-2" data-testid="risk-responses">
        {RESP.map((r) => (
          <li key={r.name} className="rounded-xl bg-white p-3 ring-1 ring-gray-300">
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-gray-900">{r.name}</span>
              {r.alias && <span className="text-xs text-gray-500">（{r.alias}ともいう）</span>}
            </div>
            <p className="mt-0.5 text-[15px] font-bold leading-snug text-brand-800">{r.desc}</p>
            <p className="mt-1 text-sm text-gray-700">
              <span className="mr-1 text-xs font-bold text-gray-500">例</span>
              {r.ex}
            </p>
          </li>
        ))}
      </ul>

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
      <div className="border-l-[3px] border-gray-900 py-0.5 pl-4 text-[15px] leading-[1.8] text-gray-700 [&_b]:font-bold [&_b]:text-gray-900">
        <b>リスク</b>は「これから起きるかもしれない問題」。<b>発生確率×影響度</b>で優先度を決め、
        <b>回避・低減・移転・受容</b>から対応を選んで備えます。
      </div>

      <WhatIsRisk />
      <Matrix />
      <Responses />
    </div>
  );
}
