"use client";

import { useState } from "react";
import { ChainSimulator } from "./goal/ChainSimulator";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「目標設定と評価指標（KGI・CSF・KPI・BSC）」専用の体験。
//   ① KGI → CSF → KPI の上下関係（静的な図＋クレープ屋の具体例）
//   ② 店長シミュレータ … 施策 → KPI（リピート率）→ CSF（顧客定着）→ KGI（年間売上）の
//      因果の鎖を、矢印と数字が順番に伝わっていく形で見せる。CSFに効かない施策
//      （広告・SNSフォロワー）は数字だけ動いて、CSFへの矢印が✕で切れる（goal/ChainSimulator）
//   ③ BSC：財務だけでは将来が分からない → 4つの視点（同じクレープ屋で具体例）
//   ④ KGI/KPI 取り違えクイズ
// ============================================================================

// ① KGI → CSF → KPI を上から下へ。操作の前に、静的な図＋具体例で上下関係をつかむ。
const TIERS: { tag: string; full: string; ja: string; what: string; ex: string; strong?: boolean }[] = [
  { tag: "KGI", full: "Key Goal Indicator", ja: "重要目標達成指標", what: "最終的に達成したいゴールを数値で表したもの", ex: "年間売上を 100 → 150 にする", strong: true },
  { tag: "CSF", full: "Critical Success Factor", ja: "重要成功要因", what: "ゴール達成のために、いちばん効くカギ（数字ではなく“要因”）", ex: "リピート客を増やす（顧客の定着）" },
  { tag: "KPI", full: "Key Performance Indicator", ja: "重要業績評価指標", what: "CSFが進んでいるかを、途中で測る数字", ex: "リピート率を 20% → 30% にする" },
];
const LINKS = ["達成するためのカギは？", "カギが進んでいるか、何で測る？"];

function Hierarchy() {
  return (
    <Panel>
      <SectionTitle step={1}>KGI → CSF → KPI：ゴールから順に決める</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        いちばん上が<b className="text-gray-800">最終ゴール（KGI）</b>。そこから「カギ（CSF）」→「測る数字（KPI）」へと下に分解します。
        例：<b className="text-gray-800">クレープ屋</b>。
      </p>
      <ol className="mt-4" data-testid="goal-hierarchy">
        {TIERS.map((t, i) => (
          <li key={t.tag}>
            <div className={`rounded-xl p-3.5 ring-1 ${t.strong ? "bg-brand-50 ring-2 ring-brand-400" : "bg-white ring-gray-300"}`} data-testid={`goal-tier-${t.tag}`}>
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className={`font-mono text-xl font-bold leading-none ${t.strong ? "text-brand-700" : ""}`}>{t.tag}</span>
                <span className={`text-sm font-bold ${t.strong ? "text-brand-900" : "text-gray-900"}`}>{t.ja}</span>
                <span className={`text-[11px] ${t.strong ? "text-brand-700/80" : "text-gray-500"}`}>{t.full}</span>
              </div>
              <p className={`mt-2 text-[15px] font-bold leading-snug text-balance [word-break:auto-phrase] ${t.strong ? "text-brand-900" : "text-gray-900"}`}>{t.what}</p>
              <p className={`mt-1.5 text-sm ${t.strong ? "text-brand-900/90" : "text-gray-700"}`}>
                <span className={`mr-1.5 rounded px-1.5 py-0.5 text-xs font-bold ${t.strong ? "bg-white text-brand-800 ring-1 ring-brand-200" : "bg-brand-50 text-brand-800"}`}>例</span>
                {t.ex}
              </p>
            </div>
            {i < LINKS.length && (
              <div className="flex items-center gap-2 py-1.5 pl-6" aria-hidden>
                <span className="text-lg font-bold leading-none text-gray-900">↓</span>
                <span className="text-xs font-bold text-gray-600">{LINKS[i]}</span>
              </div>
            )}
          </li>
        ))}
      </ol>
      <p className="mt-3 text-sm leading-relaxed text-gray-700">
        定番のひっかけは<b className="text-gray-900">KGI（最終ゴール）とKPI（途中の数字）の取り違え</b>。
        CSFは指標ではなく「重要な要因」です。
      </p>
    </Panel>
  );
}

// ③ BSC：財務だけでは「これからも稼げるか」が分からない → 4つの視点で見る
const BSC: { name: string; q: string; ex: string }[] = [
  { name: "財務", q: "お金の成果は出ている？", ex: "年間売上 100 → 150" },
  { name: "顧客", q: "お客さまに選ばれ続けている？", ex: "リピート率 20% → 30%" },
  { name: "業務プロセス", q: "仕事のやり方は良くなっている？", ex: "注文から提供まで 5分 → 3分" },
  { name: "学習と成長", q: "人や組織は育っている？", ex: "接客研修の受講率 100%" },
];

function Bsc() {
  return (
    <Panel>
      <SectionTitle step={3}>BSC ― 財務だけでは見えないものを見る</SectionTitle>

      <div className="mt-3 rounded-xl bg-gray-50 p-3.5 ring-1 ring-gray-200">
        <p className="text-xs font-bold text-gray-500">問題</p>
        <p className="mt-0.5 text-[15px] font-bold leading-snug text-gray-900">
          財務指標（売上・利益）だけでは、会社が<span className="text-brand-700">これからも</span>成果を出せる状態か判断できない
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-gray-700">
          今期の利益が好調でも、研修をやめて接客が雑になり、常連が離れ始めていたら、来期の売上は落ちます。財務の数字は<b className="text-gray-900">過去の結果</b>だからです。
        </p>
      </div>
      <p className="my-2 text-center text-sm font-bold text-gray-900" aria-hidden>↓ そこで</p>
      <div className="rounded-xl p-3.5 ring-1 ring-brand-300">
        <p className="text-xs font-bold text-brand-700">解決</p>
        <p className="mt-0.5 text-[15px] font-bold leading-snug text-gray-900">
          <b>BSC（バランススコアカード）</b>＝ 財務に<b>顧客・業務プロセス・学習と成長</b>を加えた4つの視点で、バランスよく評価する
        </p>
      </div>

      <h4 className="mt-5 text-base font-bold text-gray-900">同じ目標を4視点で見ると（クレープ屋）</h4>
      <p className="mt-0.5 text-xs text-gray-600">下の視点が良くなると、上の視点の成果につながる</p>
      <ol className="mt-2 divide-y divide-gray-200 overflow-hidden rounded-xl ring-1 ring-gray-300" data-testid="goal-bsc">
        {BSC.map((b, i) => (
          <li key={b.name} className={`grid grid-cols-[6.5rem_1fr] gap-x-3 px-3 py-2.5 ${i === 0 ? "bg-gray-50" : "bg-white"}`}>
            <div className="text-[15px] font-bold leading-snug text-gray-900">{b.name}</div>
            <div>
              <div className="text-sm text-gray-700">{b.q}</div>
              <div className="mt-0.5 text-sm font-bold tabular-nums text-brand-800">{b.ex}</div>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-xs leading-relaxed text-gray-600">
        研修で人が育つ（学習と成長）→ 提供が速く丁寧になる（業務プロセス）→ 常連が増える（顧客）→ 売上が伸びる（財務）。
        試験では「財務・顧客・業務プロセス・学習と成長」の4つを問われます。
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
      <SectionTitle step={4}>どの指標？</SectionTitle>
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
                  {correct ? "正解！ " : `正解は「${q.ans}」。 `}
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
      <div className="border-l-[3px] border-gray-900 py-0.5 pl-4 text-[15px] leading-[1.8] text-gray-700 [&_b]:font-bold [&_b]:text-gray-900">
        目標は<b>「ゴール（KGI）→ 成功のカギ（CSF）→ 測る数字（KPI）」</b>の順で決めます。
        まず関係を図と具体例でつかみ、次に動かして確かめます。
      </div>

      <Hierarchy />
      <ChainSimulator />
      <Bsc />
      <Quiz />
    </div>
  );
}
