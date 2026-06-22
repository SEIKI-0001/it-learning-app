"use client";

import { useState } from "react";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「ITIL」専用の体験。
//   ① ITIL = ITサービス管理の「うまいやり方集」（ベストプラクティス）
//   ② 代表的な管理（インシデント/問題/変更）の役割をタップで見る
//   ③ どの管理？ 仕分けクイズ
// ============================================================================

function WhatIs() {
  return (
    <Panel>
      <SectionTitle step={1}>ITILってなに？</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        ITILは、ITサービスを<b className="text-gray-800">うまく運用・改善するやり方をまとめた知識集</b>。
        各社がゼロから悩まず、先人の<b className="text-gray-800">成功パターン（ベストプラクティス）</b>を真似できます。
      </p>
      <div className="mt-4 flex items-center justify-center gap-3">
        <div className="rounded-xl bg-gray-50 px-3 py-3 text-center ring-1 ring-gray-200">
          <div className="text-2xl">📚</div>
          <div className="mt-1 text-[11px] font-bold text-gray-700">ITIL</div>
          <div className="text-[10px] text-gray-500">うまいやり方集</div>
        </div>
        <span className="text-lg text-gray-300">→</span>
        <div className="rounded-xl bg-emerald-50 px-3 py-3 text-center ring-1 ring-emerald-200">
          <div className="text-2xl">🏢</div>
          <div className="mt-1 text-[11px] font-bold text-emerald-700">自社の運用</div>
          <div className="text-[10px] text-gray-500">真似して改善</div>
        </div>
      </div>
      <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        💡 部活運営の「うまいやり方集」のように、困ったときの対応や改善の進め方がまとまっています。
        ⚠️ プログラミング言語でも、監査そのものでもありません。
      </div>
    </Panel>
  );
}

const MGMTS = [
  {
    id: "incident",
    name: "インシデント管理",
    emoji: "🚑",
    short: "まず復旧",
    desc: "障害が起きたとき、原因究明より先に「とにかく早くサービスを元に戻す」ことを優先する。",
    ex: "メールが落ちた → 予備サーバに切り替えてすぐ復旧",
  },
  {
    id: "problem",
    name: "問題管理",
    emoji: "🔬",
    short: "根本原因",
    desc: "障害がくり返さないよう、根本の原因を突き止めて取り除く。",
    ex: "なぜメールが落ちたのか調べ、再発しない対策をする",
  },
  {
    id: "change",
    name: "変更管理",
    emoji: "🔧",
    short: "安全に変更",
    desc: "システムへの変更を、影響を確認しながら安全に行う。",
    ex: "サーバ更新の前に影響範囲を審査して計画的に実施",
  },
];

function Managements() {
  const [sel, setSel] = useState<string>("incident");
  const cur = MGMTS.find((m) => m.id === sel)!;
  return (
    <Panel>
      <SectionTitle step={2}>代表的な管理を見てみる</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        ITILにはいろいろな管理があります。よく出る3つをタップして役割を確かめよう。
      </p>
      <div className="mt-3 grid grid-cols-3 gap-1.5">
        {MGMTS.map((m) => (
          <button
            key={m.id}
            onClick={() => setSel(m.id)}
            className={`rounded-lg px-1 py-2 text-center transition active:scale-95 ${
              sel === m.id ? "bg-indigo-600 text-white" : "bg-gray-50 text-gray-600 ring-1 ring-gray-200"
            }`}
          >
            <div className="text-lg leading-none">{m.emoji}</div>
            <div className="mt-1 text-[10px] font-bold leading-tight">{m.name}</div>
          </button>
        ))}
      </div>
      <div className="mt-3 rounded-xl bg-sky-50 px-4 py-3 ring-1 ring-sky-200">
        <div className="text-sm font-extrabold text-gray-800">
          {cur.emoji} {cur.name}（{cur.short}）
        </div>
        <p className="mt-1 text-sm leading-relaxed text-gray-700">{cur.desc}</p>
        <p className="mt-1.5 text-xs text-gray-500">例：{cur.ex}</p>
      </div>
      <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        ⚠️ <b>インシデント管理＝早く復旧</b>、<b>問題管理＝原因を断つ</b>。ここが混同されやすい！
      </div>
    </Panel>
  );
}

const ITEMS: { t: string; ans: string; why: string }[] = [
  { t: "サービス停止中。まず使えるよう急いで戻す", ans: "インシデント管理", why: "復旧優先＝インシデント管理。" },
  { t: "同じ障害が再発しないよう根本原因を除く", ans: "問題管理", why: "根本対策＝問題管理。" },
  { t: "サーバ更新の影響を審査し安全に変える", ans: "変更管理", why: "変更を安全に＝変更管理。" },
];
const OPTS = ["インシデント管理", "問題管理", "変更管理"];

function Quiz() {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  return (
    <Panel>
      <SectionTitle step={3}>これはどの管理？</SectionTitle>
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
                      {opt.replace("管理", "")}
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

export default function ItilExperience() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        📚 <b>ITIL</b>は、ITサービス管理の<b>ベストプラクティス（うまいやり方）をまとめた知識体系</b>。
        障害対応・変更・改善などの進め方が整理されています。
      </div>

      <WhatIs />
      <Managements />
      <Quiz />
    </div>
  );
}
