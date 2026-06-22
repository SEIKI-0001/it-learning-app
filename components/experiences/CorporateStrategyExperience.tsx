"use client";

import { useState } from "react";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「成長戦略（コアコンピタンス・M&A・アライアンス・アウトソーシング）」専用の体験。
//   ① 成長の手段を「自前 / 提携 / 買収 / 外注」で対比（タップ）
//   ② 「この手はどれ？」仕分けクイズ
// ============================================================================

type Way = {
  key: string;
  emo: string;
  name: string;
  tag: string;
  d: string;
  tone: string;
};

const WAYS: Way[] = [
  {
    key: "core",
    emo: "💪",
    name: "コアコンピタンス",
    tag: "自前で強みを磨く",
    d: "他社にまねできない自社ならではの中核的な強み。これを軸に勝負する。",
    tone: "bg-emerald-50 ring-emerald-300 text-emerald-900",
  },
  {
    key: "alliance",
    emo: "🤝",
    name: "アライアンス",
    tag: "他社と提携・協力",
    d: "資本を一つにせず、他社と手を組んで弱みを補い合う。独立は保ったまま協力する。",
    tone: "bg-sky-50 ring-sky-300 text-sky-900",
  },
  {
    key: "ma",
    emo: "🏢",
    name: "M&A",
    tag: "他社を買収・合併",
    d: "他社を買い取ったり一つになったりして、技術や市場を一気に取り込む。",
    tone: "bg-amber-50 ring-amber-300 text-amber-900",
  },
  {
    key: "out",
    emo: "📤",
    name: "アウトソーシング",
    tag: "外部に外注",
    d: "自社で苦手・非効率な業務を、得意な会社に任せる。自社は強みに集中できる。",
    tone: "bg-violet-50 ring-violet-300 text-violet-900",
  },
];

function Ways() {
  const [open, setOpen] = useState<string | null>("core");
  const active = WAYS.find((w) => w.key === open) ?? null;
  return (
    <Panel>
      <SectionTitle step={1}>成長の「手段」を見比べる</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        会社が大きくなる方法は、大きく
        <b className="text-gray-800">「自前で磨く・他社と組む・買い取る・外に出す」</b>に分かれます。
        タップして特徴を見ましょう。
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        {WAYS.map((w) => {
          const picked = open === w.key;
          return (
            <button
              key={w.key}
              onClick={() => setOpen(picked ? null : w.key)}
              className={`rounded-xl p-3 text-left ring-1 transition active:scale-[0.98] ${
                picked ? w.tone + " ring-2" : "bg-gray-50 ring-gray-200"
              }`}
            >
              <div className="text-lg">{w.emo}</div>
              <div className="mt-0.5 text-[13px] font-extrabold text-gray-800">{w.name}</div>
              <div className="mt-0.5 text-[10px] font-bold text-gray-400">{w.tag}</div>
            </button>
          );
        })}
      </div>
      {active && (
        <div className={`mt-3 rounded-xl px-4 py-3 ring-1 ${active.tone}`}>
          <div className="text-sm font-extrabold">
            {active.emo} {active.name}
          </div>
          <p className="mt-1 text-[13px] leading-relaxed">{active.d}</p>
        </div>
      )}
      <p className="mt-3 text-xs leading-relaxed text-gray-500">
        ※ <b>M&A＝買収・合併（一つになる）</b>と<b>アライアンス＝提携（独立のまま協力）</b>の
        取り違えが定番のひっかけ。
      </p>
    </Panel>
  );
}

const QUIZ: { t: string; ans: string; opts: string[]; why: string }[] = [
  {
    t: "ライバル企業を買収し、その技術と顧客を自社に取り込んで一気に拡大した。",
    ans: "M&A",
    opts: ["M&A", "アライアンス", "アウトソーシング"],
    why: "買収・合併で取り込む＝M&A。",
  },
  {
    t: "他社と資本関係を持たず、対等な立場でお互いの強みを持ち寄って共同開発した。",
    ans: "アライアンス",
    opts: ["アライアンス", "M&A", "コアコンピタンス"],
    why: "独立のまま提携・協力＝アライアンス。",
  },
  {
    t: "自社の苦手な経理業務を、専門の会社にまとめて任せた。",
    ans: "アウトソーシング",
    opts: ["アウトソーシング", "M&A", "コアコンピタンス"],
    why: "業務を外部に任せる＝アウトソーシング。",
  },
  {
    t: "他社にまねできない独自の精密加工技術を軸に勝負している。",
    ans: "コアコンピタンス",
    opts: ["コアコンピタンス", "アライアンス", "アウトソーシング"],
    why: "まねされない自社の中核の強み＝コアコンピタンス。",
  },
];

function Quiz() {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  return (
    <Panel>
      <SectionTitle step={2}>この手はどれ？</SectionTitle>
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

export default function CorporateStrategyExperience() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        🚀 会社が成長する手は<b>「自前で磨く（コアコンピタンス）／他社と組む（アライアンス）／買い取る（M&A）／外に出す（アウトソーシング）」</b>。
        どれも“どう力を得るか”の違いです。
      </div>

      <Ways />
      <Quiz />
    </div>
  );
}
