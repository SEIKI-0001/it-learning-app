"use client";

import { useState } from "react";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「ソリューションビジネス」専用の体験。
//   ① モノ売り ⇄ 課題解決（ソリューション）をトグルで比較
//   ② 課題を聞く → 組み合わせて提案 の流れ
//   ③ ソリューションビジネスらしいのはどれ？ クイズ
// ============================================================================

function ProductVsSolution() {
  const [solution, setSolution] = useState(true);
  return (
    <Panel>
      <SectionTitle step={1}>「モノを売る」と「課題を解く」</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        同じお客でも、売り方が違います。切り替えて比べてみよう。
      </p>

      <div className="mt-4 grid grid-cols-2 gap-1.5 rounded-xl bg-gray-100 p-1">
        <button
          onClick={() => setSolution(false)}
          className={`rounded-lg px-2 py-2 text-sm font-bold transition active:scale-95 ${
            !solution ? "bg-gray-500 text-white" : "text-gray-500"
          }`}
        >
          📦 モノ売り
        </button>
        <button
          onClick={() => setSolution(true)}
          className={`rounded-lg px-2 py-2 text-sm font-bold transition active:scale-95 ${
            solution ? "bg-emerald-500 text-white" : "text-gray-500"
          }`}
        >
          🧩 課題解決
        </button>
      </div>

      <div
        className={`mt-3 rounded-xl px-4 py-4 ring-1 ${
          solution ? "bg-emerald-50 ring-emerald-200" : "bg-gray-50 ring-gray-200"
        }`}
      >
        {solution ? (
          <>
            <p className="text-sm font-extrabold text-emerald-700">🧩 ソリューションビジネス</p>
            <p className="mt-2 text-sm leading-relaxed text-gray-700">
              「勉強時間を管理したい」という<b>悩み</b>を聞き、手帳・アプリ・使い方までセットで提案する。
            </p>
            <p className="mt-2 text-xs text-emerald-700">→ 顧客の<b>課題そのもの</b>を解決する</p>
          </>
        ) : (
          <>
            <p className="text-sm font-extrabold text-gray-600">📦 モノ売り（製品販売）</p>
            <p className="mt-2 text-sm leading-relaxed text-gray-700">
              「この手帳どうですか？」と<b>商品単体</b>をすすめる。
            </p>
            <p className="mt-2 text-xs text-gray-500">→ 製品は渡せるが、悩みが解けるとは限らない</p>
          </>
        )}
      </div>

      <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        💡 <b>ソリューションビジネス</b>は、製品を売るのではなく
        <b>顧客の課題を、ITやサービスを組み合わせて解決</b>するビジネスです。
      </div>
    </Panel>
  );
}

function Flow() {
  const steps = [
    { emoji: "👂", t: "課題を聞く", d: "何に困っているかをヒアリング" },
    { emoji: "🧩", t: "組み合わせる", d: "IT・サービスを組み合わせて解決策を作る" },
    { emoji: "📝", t: "提案する", d: "課題が解ける形で提案する" },
  ];
  return (
    <Panel>
      <SectionTitle step={2}>聞く → 組み合わせる → 提案する</SectionTitle>
      <div className="mt-3 flex items-stretch gap-1">
        {steps.map((s, i) => (
          <div key={s.t} className="flex flex-1 items-center gap-1">
            <div className="flex-1 rounded-xl bg-indigo-50 p-3 text-center ring-1 ring-indigo-200">
              <div className="text-xl">{s.emoji}</div>
              <div className="mt-1 text-xs font-extrabold text-indigo-700">{s.t}</div>
              <p className="mt-0.5 text-[10px] leading-tight text-gray-500">{s.d}</p>
            </div>
            {i < steps.length - 1 && <span className="text-lg text-gray-300">→</span>}
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-xl bg-sky-50 px-4 py-3 text-sm leading-relaxed text-sky-900 ring-1 ring-sky-200">
        📌 システム構築を請け負う <b>SI（システムインテグレーション）</b> や、業務を外部に任せる
        <b>アウトソーシング</b> も、課題解決を支える形態です。
      </div>
    </Panel>
  );
}

const ITEMS: { t: string; ok: boolean; why: string }[] = [
  { t: "顧客の悩みを聞き、最適な仕組みを組んで提案する", ok: true, why: "課題解決＝ソリューションビジネスそのもの。" },
  { t: "とにかく一番高い製品をすすめて売る", ok: false, why: "課題を聞かず製品を押し付けるのはモノ売り。" },
  { t: "顧客の課題を聞かずに、自社製品だけを案内する", ok: false, why: "ヒアリングと課題解決が抜けている。" },
  { t: "複数のITやサービスを組み合わせて課題を解決する", ok: true, why: "組み合わせて解くのがソリューションの特徴。" },
];

function Quiz() {
  const [answers, setAnswers] = useState<Record<number, boolean>>({});
  return (
    <Panel>
      <SectionTitle step={3}>ソリューションビジネスらしいのは？</SectionTitle>
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
                  { v: true, label: "🧩 らしい" },
                  { v: false, label: "📦 ちがう" },
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
    </Panel>
  );
}

export default function SolutionBusinessExperience() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        🧩 <b>ソリューションビジネス</b>は、製品を売るのではなく<b>顧客の課題を解決</b>するビジネス。
        悩みを聞き、ITやサービスを組み合わせて提案します。
      </div>

      <ProductVsSolution />
      <Flow />
      <Quiz />
    </div>
  );
}
