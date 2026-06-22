"use client";

import { useState } from "react";
import { Panel, SectionTitle, StepNav } from "./ui";

// ============================================================================
// 「目標設定と評価指標（KGI・CSF・KPI・BSC）」専用の体験。
//   ① 最終ゴール(KGI) → 成功のカギ(CSF) → 中間指標(KPI) を1歩ずつ
//   ② BSCの4つの視点
//   ③ KGI/KPI 取り違えクイズ
// ============================================================================

const STEPS = [
  {
    tag: "KGI",
    name: "最終ゴールを決める",
    full: "重要目標達成指標",
    emo: "🏁",
    body: "まず「最終的に何を達成したいか」をはっきりさせます。これがKGI。数字で表せるゴールにします。",
    ex: "例：1年で売上を1.5倍にする",
    tone: "bg-indigo-50 ring-indigo-300 text-indigo-900",
  },
  {
    tag: "CSF",
    name: "成功のカギを見つける",
    full: "重要成功要因",
    emo: "🗝️",
    body: "ゴール達成のために「特に重要なこと」を見つけます。これがCSF。指標ではなく“やるべき肝心なこと”。",
    ex: "例：リピート客を増やすことが何より大事",
    tone: "bg-amber-50 ring-amber-300 text-amber-900",
  },
  {
    tag: "KPI",
    name: "進み具合を数字で測る",
    full: "重要業績評価指標",
    emo: "📈",
    body: "CSFがうまくいっているかを、途中で測れる数字にします。これがKPI。ゴールへの“進捗メーター”。",
    ex: "例：毎月のリピート率を30%以上に保つ",
    tone: "bg-emerald-50 ring-emerald-300 text-emerald-900",
  },
];

function Flow() {
  const [i, setI] = useState(0);
  const total = STEPS.length;
  const shown = STEPS.slice(0, i + 1);
  return (
    <Panel>
      <SectionTitle step={1}>ゴールから逆算して指標を決める</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        <b className="text-gray-800">KGI（ゴール）→ CSF（成功のカギ）→ KPI（測る数字）</b> の順で考えます。
        「次へ」で1歩ずつ。
      </p>

      <div className="mt-3 space-y-1.5">
        {shown.map((s, idx) => (
          <div key={s.tag}>
            <div className={`rounded-xl px-4 py-3 ring-1 ${s.tone}`}>
              <div className="flex items-center gap-2">
                <span className="text-lg">{s.emo}</span>
                <span className="rounded-md bg-white/70 px-2 py-0.5 font-mono text-xs font-extrabold">
                  {s.tag}
                </span>
                <span className="text-sm font-extrabold">{s.name}</span>
              </div>
              <div className="mt-0.5 text-[11px] font-bold opacity-60">{s.full}</div>
              <p className="mt-1.5 text-[13px] leading-relaxed">{s.body}</p>
              <p className="mt-1 text-xs font-medium opacity-80">{s.ex}</p>
            </div>
            {idx < shown.length - 1 && (
              <div className="py-0.5 text-center text-xs text-gray-300">↓</div>
            )}
          </div>
        ))}
      </div>

      <StepNav
        index={i}
        total={total}
        onPrev={() => setI((v) => Math.max(0, v - 1))}
        onNext={() => setI((v) => Math.min(total - 1, v + 1))}
        onReset={() => setI(0)}
        doneLabel="そろった 🎯"
      />
      <p className="mt-3 text-xs leading-relaxed text-gray-500">
        ※ <b>KGI＝最終ゴール</b>、<b>KPI＝途中の進み具合</b>。この2つの取り違えが定番のひっかけ。
        CSFは「指標」ではなく「重要な要因」である点も注意。
      </p>
    </Panel>
  );
}

const BSC = [
  { emo: "💰", name: "財務", d: "売上・利益など、お金の成果" },
  { emo: "🙋", name: "顧客", d: "顧客満足・市場シェアなど" },
  { emo: "⚙️", name: "業務プロセス", d: "社内の仕事の効率・品質" },
  { emo: "🌱", name: "学習と成長", d: "社員の育成・改善する力" },
];

function Bsc() {
  return (
    <Panel>
      <SectionTitle step={2}>BSC ― 4つの視点でバランスよく</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        <b className="text-gray-800">BSC（バランススコアカード）</b>は、お金（財務）だけに偏らず、
        <b className="text-gray-800">4つの視点</b>で会社をバランスよく評価する方法です。
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        {BSC.map((b) => (
          <div key={b.name} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
            <div className="flex items-center gap-1.5">
              <span className="text-lg">{b.emo}</span>
              <span className="text-sm font-extrabold text-gray-800">{b.name}</span>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-gray-500">{b.d}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-gray-500">
        ※ 「財務・顧客・業務プロセス・学習と成長」の4つ。財務<b>だけ</b>を見るのではない点がポイント。
      </p>
    </Panel>
  );
}

const QUIZ: { t: string; ans: string; opts: string[]; why: string }[] = [
  {
    t: "「年間売上10億円を達成する」という、最終的に目指すゴールを表すのは？",
    ans: "KGI",
    opts: ["KGI", "KPI", "CSF"],
    why: "最終ゴールを数値化したもの＝KGI（重要目標達成指標）。",
  },
  {
    t: "「月間の新規問い合わせ件数200件」という、途中の進み具合を測る数字は？",
    ans: "KPI",
    opts: ["KPI", "KGI", "BSC"],
    why: "ゴールへの進捗を測る中間指標＝KPI（重要業績評価指標）。",
  },
  {
    t: "財務・顧客・業務プロセス・学習と成長の4つの視点で評価する手法は？",
    ans: "BSC",
    opts: ["BSC", "KGI", "CSF"],
    why: "4視点でバランスよく評価＝BSC（バランススコアカード）。",
  },
];

function Quiz() {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  return (
    <Panel>
      <SectionTitle step={3}>どの指標？</SectionTitle>
      <ul className="mt-3 space-y-3">
        {QUIZ.map((q, i) => {
          const chosen = answers[i];
          const correct = chosen === q.ans;
          return (
            <li key={i} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
              <div className="text-sm font-bold text-gray-800">{q.t}</div>
              <div className="mt-2 flex gap-1.5">
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
                      className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-bold transition active:scale-95 ${tone}`}
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

export default function GoalEvaluationExperience() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        🎯 目標は<b>「ゴール（KGI）→ 成功のカギ（CSF）→ 測る数字（KPI）」</b>の順で決めます。
        <b>KGI＝最終ゴール／KPI＝途中の進み具合</b>の違いが何より大事。
      </div>

      <Flow />
      <Bsc />
      <Quiz />
    </div>
  );
}
