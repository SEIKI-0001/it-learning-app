"use client";

import { useState } from "react";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「目標設定と評価指標（KGI・CSF・KPI・BSC）」専用の体験。
//   ① 店長シミュレータ … 施策を打つ→KPIメーター（リピート率）が動く→
//      KGIゴール（年間売上）が連動して近づく。CSFに効かない施策は空振り
//   ② BSCの4つの視点
//   ③ KGI/KPI 取り違えクイズ
// ============================================================================

type Action = {
  id: string;
  emo: string;
  t: string;
  kpiUp: number; // リピート率の上昇(pt)
  hitsCsf: boolean;
  note: string;
};

const ACTIONS: Action[] = [
  {
    id: "point",
    emo: "🎫",
    t: "ポイントカードを配る",
    kpiUp: 4,
    hitsCsf: true,
    note: "「また来る理由」ができてリピート率アップ！",
  },
  {
    id: "line",
    emo: "📱",
    t: "LINEで新作を知らせる",
    kpiUp: 4,
    hitsCsf: true,
    note: "来たことのある人が戻ってくるきっかけに。リピート率アップ！",
  },
  {
    id: "name",
    emo: "🙋",
    t: "常連さんの名前を覚えて接客",
    kpiUp: 3,
    hitsCsf: true,
    note: "「自分の店」と感じてもらえてリピート率アップ！",
  },
  {
    id: "ad",
    emo: "📢",
    t: "とにかく広告で新規客を集める",
    kpiUp: 0,
    hitsCsf: false,
    note: "新規は来たけど一回きり…。成功のカギ（リピート）には効いていない。",
  },
];

const KPI_START = 20; // リピート率(%)
const KPI_GOAL = 30;
const KGI_START = 100; // 年間売上(万円換算のイメージ)
const KGI_GOAL = 150;

function Meter({
  label,
  tag,
  value,
  goal,
  unit,
  tone,
  max,
}: {
  label: string;
  tag: string;
  value: number;
  goal: number;
  unit: string;
  tone: "emerald" | "indigo";
  max: number;
}) {
  const reached = value >= goal;
  const pct = Math.min(100, Math.round((value / max) * 100));
  const goalPct = Math.round((goal / max) * 100);
  const bar = tone === "emerald" ? "bg-emerald-500" : "bg-brand-500";
  return (
    <div className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-gray-700">
          <span
            className={`mr-1.5 rounded px-1.5 py-0.5 font-mono text-[10px] font-bold text-white ${
              tone === "emerald" ? "bg-emerald-500" : "bg-brand-500"
            }`}
          >
            {tag}
          </span>
          {label}
        </span>
        <span className={`font-mono text-sm font-bold ${reached ? "text-emerald-600" : "text-gray-800"}`}>
          {value}
          {unit}
          {reached && " 🎉"}
        </span>
      </div>
      <div className="relative mt-2 h-3 overflow-hidden rounded-full bg-gray-200">
        <div className={`h-full rounded-full transition-all duration-700 ${bar}`} style={{ width: `${pct}%` }} />
        <div className="absolute top-0 h-full w-0.5 bg-gray-500" style={{ left: `${goalPct}%` }} />
      </div>
      <div className="mt-1 text-right text-[10px] font-bold text-gray-400">
        目標 {goal}
        {unit}
        {reached ? "（達成！）" : ""}
      </div>
    </div>
  );
}

function Simulator() {
  const [used, setUsed] = useState<Set<string>>(new Set());
  const [last, setLast] = useState<Action | null>(null);

  const kpi = ACTIONS.reduce((v, a) => (used.has(a.id) ? v + a.kpiUp : v), KPI_START);
  // KPI(リピート率)が上がるほど、KGI(売上)が後からついてくる
  const kgi = KGI_START + (kpi - KPI_START) * 5 + (used.has("ad") ? 2 : 0);
  const csfHits = ACTIONS.filter((a) => a.hitsCsf && used.has(a.id)).length;
  const showInsight = csfHits >= 2 && used.has("ad");

  const doAction = (a: Action) => {
    setUsed((p) => new Set(p).add(a.id));
    setLast(a);
  };

  const reset = () => {
    setUsed(new Set());
    setLast(null);
  };

  return (
    <Panel>
      <SectionTitle step={1}>店長になって、ゴールまでの数字をつなげよう</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        あなたはクレープ屋の店長。<b className="text-gray-800">ゴール（KGI）＝年間売上150</b>。
        分析の結果、<b className="text-gray-800">成功のカギ（CSF）＝リピート客を増やすこと</b>と分かりました。
        施策を打って、メーターの動きを見てみよう。
      </p>

      {/* CSFバッジ */}
      <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-center text-xs font-bold text-amber-800 ring-1 ring-amber-200">
        🗝️ CSF（成功のカギ）＝リピート客を増やすこと
      </div>

      {/* KPI → KGI メーター */}
      <div className="mt-3 space-y-2">
        <Meter label="リピート率（途中で測る数字）" tag="KPI" value={kpi} goal={KPI_GOAL} unit="%" tone="emerald" max={40} />
        <div className="text-center text-xs font-bold text-gray-400">↓ KPIが動くと、ゴールが近づく ↓</div>
        <Meter label="年間売上（最終ゴール）" tag="KGI" value={kgi} goal={KGI_GOAL} unit="" tone="indigo" max={170} />
      </div>

      {/* 施策ボタン */}
      <p className="mt-4 text-xs font-bold text-gray-500">打てる施策（それぞれ1回）：</p>
      <div className="mt-1.5 grid grid-cols-2 gap-1.5">
        {ACTIONS.map((a) => {
          const done = used.has(a.id);
          return (
            <button
              key={a.id}
              onClick={() => doAction(a)}
              disabled={done}
              className={`rounded-xl p-2.5 text-left text-xs font-bold transition active:scale-95 ${
                done
                  ? "bg-gray-100 text-gray-400 ring-1 ring-gray-200"
                  : "bg-white text-gray-700 ring-1 ring-gray-300"
              }`}
            >
              <span className="text-base">{a.emo}</span> {a.t}
              {done && " ✓"}
            </button>
          );
        })}
      </div>

      {/* 直前の施策の結果 */}
      {last && (
        <div
          className={`mt-3 rounded-xl px-3 py-2.5 text-xs leading-relaxed ring-1 ${
            last.hitsCsf
              ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
              : "bg-rose-50 text-rose-800 ring-rose-200"
          }`}
        >
          {last.emo} <b>{last.t}</b> → {last.hitsCsf ? `リピート率 +${last.kpiUp}pt。` : "リピート率 ±0。"}
          {last.note}
        </div>
      )}

      {/* 気づき */}
      {showInsight && (
        <div className="mt-3 rounded-xl bg-brand-50 px-4 py-3 text-sm leading-relaxed text-brand-900 ring-1 ring-brand-200">
          💡 <b>気づいた？</b>　<b>CSFに効く施策だけがKPIを動かし、KPIが動くとKGIがついてくる</b>。
          広告のようにカギに効かない施策は、がんばってもゴールが遠いまま。
          だから<b>KGI（ゴール）→ CSF（カギ）→ KPI（途中の数字）</b>の順で決めるのです。
        </div>
      )}

      {used.size > 0 && (
        <button
          onClick={reset}
          className="mt-2 w-full rounded-lg py-1.5 text-xs font-bold text-gray-500 ring-1 ring-gray-300 active:scale-95"
        >
          ↺ 最初からやり直す
        </button>
      )}

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
              <span className="text-sm font-bold text-gray-800">{b.name}</span>
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
      <div className="rounded-xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        🎯 目標は<b>「ゴール（KGI）→ 成功のカギ（CSF）→ 測る数字（KPI）」</b>の順で決めます。
        <b>KGI＝最終ゴール／KPI＝途中の進み具合</b>の違いが何より大事。
      </div>

      <Simulator />
      <Bsc />
      <Quiz />
    </div>
  );
}
