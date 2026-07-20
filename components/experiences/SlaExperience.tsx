"use client";

import { useState } from "react";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「サービスマネジメントとSLA」専用の体験。
//   ① サービスマネジメント = ITサービスを安定して届ける運用管理
//   ② SLA = 提供者と利用者で決める「品質の約束」（稼働率を体験）
//   ③ SLAに書く / 書かない？ 仕分けクイズ
// ============================================================================

function WhatIs() {
  return (
    <Panel>
      <SectionTitle step={1}>サービスマネジメントとは</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        ITサービス（メール・社内システムなど）を、利用者に<b className="text-gray-800">止めずに安定して届ける</b>ための運用管理です。
      </p>
      <div className="mt-4 flex items-center justify-center gap-2">
        <div className="rounded-xl bg-brand-50 px-3 py-3 text-center ring-1 ring-brand-200">
          <div className="text-2xl">🏢</div>
          <div className="mt-1 text-[11px] font-bold text-brand-700">提供者</div>
          <div className="text-[10px] text-gray-500">運用・サポート</div>
        </div>
        <div className="flex flex-col items-center">
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">約束（SLA）</span>
          <span className="text-lg text-gray-300">⇄</span>
          <span className="text-[10px] text-gray-400">サービス提供</span>
        </div>
        <div className="rounded-xl bg-gray-50 px-3 py-3 text-center ring-1 ring-gray-200">
          <div className="text-2xl">🙋</div>
          <div className="mt-1 text-[11px] font-bold text-gray-700">利用者</div>
          <div className="text-[10px] text-gray-500">サービスを使う</div>
        </div>
      </div>
      <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        💡 提供者と利用者の間で品質の目標を<b>文書で約束</b>したものが <b>SLA</b>（サービスレベル合意書）。
      </div>
    </Panel>
  );
}

// 稼働率の体験：年間でどれくらい止まってよいか
function Availability() {
  const LEVELS = [
    { rate: "99%", downMin: 5256, label: "ゆるめ" },
    { rate: "99.9%", downMin: 526, label: "ふつう" },
    { rate: "99.99%", downMin: 53, label: "きびしい" },
  ];
  const [idx, setIdx] = useState(1);
  const cur = LEVELS[idx];
  const h = Math.floor(cur.downMin / 60);
  const m = cur.downMin % 60;
  return (
    <Panel>
      <SectionTitle step={2}>SLAで決める「稼働率」</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        代表的な約束が<b className="text-gray-800">稼働率</b>（どれだけ動いているか）。
        数字を上げるほど「ほぼ止まらない」約束になります。
      </p>

      <div className="mt-4 grid grid-cols-3 gap-1.5">
        {LEVELS.map((l, i) => (
          <button
            key={l.rate}
            onClick={() => setIdx(i)}
            className={`rounded-lg px-1 py-2 text-sm font-bold transition active:scale-95 ${
              idx === i ? "bg-brand-600 text-white" : "text-gray-600 ring-1 ring-gray-300"
            }`}
          >
            {l.rate}
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-xl bg-gray-50 p-4 text-center ring-1 ring-gray-200">
        <div className="text-xs text-gray-500">稼働率 {cur.rate}（{cur.label}）なら、1年で止まってよいのは…</div>
        <div className="mt-1 text-2xl font-bold text-brand-700">
          約 {h > 0 ? `${h}時間` : ""}{m > 0 ? `${m}分` : ""}
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200">
          <div className="h-full rounded-full bg-emerald-500" style={{ width: cur.rate }} />
        </div>
        <div className="mt-1 text-[10px] text-gray-400">緑＝動いている割合（実際はごくわずかの停止）</div>
      </div>
      <p className="mt-3 text-center text-xs text-gray-400">高い稼働率ほど安心だが、設備や費用も増える</p>
    </Panel>
  );
}

const ITEMS: { t: string; ok: boolean; why: string }[] = [
  { t: "月間の稼働率は99.9%以上にする", ok: true, why: "測れる品質目標。SLAの代表例。" },
  { t: "障害の問い合わせには30分以内に応答する", ok: true, why: "応答時間も約束に向く、測れる指標。" },
  { t: "とにかく頑張って良い感じにする", ok: false, why: "数値で測れず約束にならない。あいまいすぎる。" },
  { t: "提供者が一人で勝手に内容を決める", ok: false, why: "SLAは提供者と利用者が合意して決めるもの。" },
];

function Quiz() {
  const [answers, setAnswers] = useState<Record<number, boolean>>({});
  return (
    <Panel>
      <SectionTitle step={3}>SLAにふさわしい？</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        SLAは<b className="text-gray-800">数値で測れて、両者が合意できる</b>約束。次はSLAにふさわしい？
      </p>
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
                  { v: true, label: "⭕ ふさわしい" },
                  { v: false, label: "❌ ダメ" },
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

export default function SlaExperience() {
  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        🤝 <b>サービスマネジメント</b>はITサービスを安定して届ける運用管理。
        <b>SLA</b>は提供者と利用者で決める<b>品質の約束</b>（稼働率や応答時間など）。スマホ回線の契約で通信範囲やサポート時間を約束するのと同じです。
      </div>

      <WhatIs />
      <Availability />
      <Quiz />
    </div>
  );
}
