"use client";

import { useState } from "react";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「開発プロセス」専用の体験。
//   ① 成果物のつながり … 要件定義書 → 設計書 → プログラム → テスト。後の成果物は前の成果物をもとに作る
//   ② 仕様変更はどこまで波及する？ … 同じ変更に「要件定義中」と「テスト中」に気づいた場合を静的に並べる
//      （後で気づくほど、前工程の成果物までさかのぼって直す）
//   ③ くらべて整理（ウォーターフォール／アジャイル）
//   ④ これはどっち？ クイズ
// 旧「仕様変更シミュレータ」（2本の時間軸を再生して比べる）は、操作・再生しないと要点が見えなかったため廃止。
// ============================================================================

const PHASES: { phase: string; artifact: string; what: string }[] = [
  { phase: "要件定義", artifact: "要件定義書", what: "何を作るか" },
  { phase: "設計", artifact: "設計書", what: "どう作るか" },
  { phase: "実装", artifact: "プログラム", what: "実際に作る" },
  { phase: "テスト", artifact: "テスト結果", what: "正しく動くか確かめる" },
];

function ArtifactChain() {
  return (
    <Panel>
      <SectionTitle step={1}>工程は「成果物」でつながっている</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        各工程は、<b className="text-gray-800">前の工程の成果物をもとに</b>次の成果物を作ります。
        設計書は要件定義書を、プログラムは設計書を土台にしています。
      </p>
      <ol className="mt-4 grid gap-1 sm:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] sm:items-stretch sm:gap-1.5" data-testid="dev-chain">
        {PHASES.map((p, i) => (
          <li key={p.phase} className="contents">
            <div className="rounded-xl bg-white p-3 ring-1 ring-gray-300">
              <div className="text-xs font-bold text-gray-500">{p.phase}</div>
              <div className="mt-0.5 text-base font-bold leading-snug text-gray-900">{p.artifact}</div>
              <div className="mt-0.5 text-xs text-gray-600">{p.what}</div>
            </div>
            {i < PHASES.length - 1 && (
              <div className="flex items-center justify-center gap-1.5 py-0.5 text-xs font-bold text-gray-600 sm:flex-col sm:py-0" aria-hidden>
                <span className="text-lg leading-none text-gray-900 sm:hidden">↓</span>
                <span className="hidden text-lg leading-none text-gray-900 sm:inline">→</span>
                <span className="sm:hidden">これをもとに作る</span>
              </div>
            )}
          </li>
        ))}
      </ol>
    </Panel>
  );
}

// 同じ仕様変更「会員ランク機能を追加したい」に、いつ気づいたか
const WHEN: { when: string; sub: string; status: ("fix" | "none" | "redo")[]; cost: string }[] = [
  {
    when: "要件定義中に気づいた",
    sub: "まだ要件定義書しかない",
    status: ["fix", "none", "none", "none"],
    cost: "直すのは 1つ",
  },
  {
    when: "テスト中に気づいた",
    sub: "すべての成果物ができている",
    status: ["fix", "fix", "fix", "redo"],
    cost: "直すのは 4つすべて",
  },
];
const STATUS_LABEL = { fix: "修正", none: "まだない", redo: "やり直し" } as const;

function ChangeRipple() {
  return (
    <Panel>
      <SectionTitle step={2}>仕様変更は、前の工程まで波及する</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        例：<b className="text-gray-800">「会員ランク機能を追加したい」</b>という同じ変更。気づいたタイミングで、直す量がこれだけ変わります。
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2" data-testid="dev-ripple">
        {WHEN.map((w, wi) => (
          <div key={w.when} className={`rounded-xl p-3 ring-1 ${wi === 1 ? "ring-rose-300" : "ring-gray-300"}`} data-testid={`dev-ripple-${wi}`}>
            <div className="text-base font-bold text-gray-900">{w.when}</div>
            <div className="text-xs text-gray-600">{w.sub}</div>
            <ul className="mt-2.5 space-y-1">
              {PHASES.map((p, i) => {
                const st = w.status[i];
                return (
                  <li
                    key={p.artifact}
                    className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-sm ${
                      st === "none" ? "bg-gray-50 text-gray-500" : "bg-rose-50 font-bold text-rose-800 ring-1 ring-rose-200"
                    }`}
                    data-status={st}
                  >
                    <span>{p.artifact}</span>
                    <span className="text-xs font-bold">{STATUS_LABEL[st]}</span>
                  </li>
                );
              })}
            </ul>
            <div className={`mt-2.5 text-center text-[15px] font-bold ${wi === 1 ? "text-rose-700" : "text-gray-900"}`}>{w.cost}</div>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-xl bg-gray-50 px-4 py-3 text-sm leading-relaxed text-gray-800 ring-1 ring-gray-200">
        <b className="text-gray-900">後の工程で仕様を変えるほど、前の工程の成果物までさかのぼって直す（手戻り）</b>ので、時間と費用がふくらみます。
        工程を順番に進める<b className="text-gray-900">ウォーターフォール</b>はこの手戻りに弱く、
        <b className="text-gray-900">アジャイル</b>や<b className="text-gray-900">プロトタイピング</b>は、早く作って見せることで変更に早く気づく工夫です。
      </div>
    </Panel>
  );
}

function Compare() {
  const rows = [
    { k: "進め方", wf: "工程を順番に下る", agile: "小さく作って反復" },
    { k: "計画", wf: "最初に全部決める", agile: "区切りごとに見直す" },
    { k: "変更", wf: "弱い（後戻りが大変）", agile: "強い（次の反復で対応）" },
    { k: "向く開発", wf: "仕様が固まっている", agile: "要望が変わりやすい" },
  ];
  return (
    <Panel>
      <SectionTitle step={3}>ウォーターフォールとアジャイルをくらべる</SectionTitle>
      <div className="mt-3 overflow-hidden rounded-xl ring-1 ring-gray-300">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100 text-gray-700">
              <th className="px-2 py-2 text-left font-bold"> </th>
              <th className="px-2 py-2 text-center font-bold text-gray-900">ウォーターフォール</th>
              <th className="px-2 py-2 text-center font-bold text-gray-900">アジャイル</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.k} className={i % 2 ? "bg-gray-50" : "bg-white"}>
                <td className="whitespace-nowrap px-2 py-2 font-bold text-gray-700">{r.k}</td>
                <td className="px-2 py-2 text-center text-sm text-gray-700">{r.wf}</td>
                <td className="px-2 py-2 text-center text-sm text-gray-700">{r.agile}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-gray-500">
        ※ 開発の工程そのもの（要件定義→設計→製造→テスト→運用）はどちらも同じ。<b>進め方</b>が違うだけです。
      </p>
    </Panel>
  );
}

const ITEMS: { t: string; ans: "WF" | "Agile"; why: string }[] = [
  { t: "最初に全体を決め、工程を順番に進めて完成させる", ans: "WF", why: "順番に下る＝ウォーターフォール。" },
  { t: "小さく作って利用者に見せ、反応を見て改善する", ans: "Agile", why: "小さく反復＝アジャイル。" },
  { t: "仕様が固まっていて、後から大きく変わらない開発", ans: "WF", why: "計画重視ならウォーターフォールが向く。" },
  { t: "要望が変わりやすく、早く形にして試したい開発", ans: "Agile", why: "変化に強いアジャイルが向く。" },
];

function Quiz() {
  const [answers, setAnswers] = useState<Record<number, "WF" | "Agile">>({});
  const label = (k: "WF" | "Agile") => (k === "WF" ? "ウォーターフォール" : "アジャイル");
  return (
    <Panel>
      <SectionTitle step={4}>これはどっち？</SectionTitle>
      <ul className="mt-3 space-y-2.5">
        {ITEMS.map((it, i) => {
          const chosen = answers[i];
          const correct = chosen === it.ans;
          return (
            <li key={i} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
              <p className="text-sm font-bold text-gray-800">{it.t}</p>
              <div className="mt-2 flex gap-1.5">
                {(["WF", "Agile"] as const).map((opt) => {
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
                      className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-bold transition active:scale-95 ${tone}`}
                    >
                      {label(opt)}
                    </button>
                  );
                })}
              </div>
              {chosen && (
                <p className={`mt-2 text-xs font-medium ${correct ? "text-emerald-700" : "text-rose-600"}`}>
                  {correct ? "⭕ 正解！ " : `❌ 正解は ${label(it.ans)}。 `}
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

export default function DevProcessExperience() {
  return (
    <div className="space-y-5">
      <div className="border-l-[3px] border-gray-900 py-0.5 pl-4 text-[15px] leading-[1.8] text-gray-700 [&_b]:font-bold [&_b]:text-gray-900">
        システム開発は<b>要件定義→設計→製造→テスト→運用</b>の流れ。進め方には
        <b>ウォーターフォール（順番に）</b>と<b>アジャイル（小さく反復）</b>の2つがあります。
      </div>

      <ArtifactChain />
      <ChangeRipple />
      <Compare />
      <Quiz />
    </div>
  );
}
