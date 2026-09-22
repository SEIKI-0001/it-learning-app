"use client";

import { useState } from "react";
import { DevRace } from "./devprocess/DevRace";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「開発プロセス」専用の体験。
//   ① 仕様変更シミュレータ … 同じプロジェクトをWFとアジャイルの2本の時間軸で同時に進め、
//      同じ瞬間に「⚡変更したい！」が発生。戻る距離・作り直す量・反映までの時間を並べて比べる
//      （devprocess/DevRace）
//   ② くらべて整理（向き・不向き）
//   ③ これはどっち？ クイズ
// ============================================================================

function Simulator() {
  return (
    <Panel>
      <SectionTitle step={1}>仕様変更シミュレータ</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        同じプロジェクトを<b className="text-gray-800">2つの進め方で同時に</b>進めます。途中で
        <b className="text-gray-800">「⚡やっぱり変更したい！」</b>が来たとき、<b className="text-gray-800">どこまで戻り・どれだけ作り直し・いつ届くか</b>を比べよう。
      </p>

      <DevRace />

      <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        💡 アジャイルは<b>「無計画」ではありません</b>——計画を小さく区切って、こまめに見直すだけです。
        早い段階で試作品を見せて要求を固める<b>プロトタイピング</b>も、変更に早く気づくための工夫です。
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
      <SectionTitle step={2}>くらべて整理</SectionTitle>
      <div className="mt-3 overflow-hidden rounded-xl ring-1 ring-gray-300">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100 text-gray-700">
              <th className="px-2 py-2 text-left font-bold"> </th>
              <th className="px-2 py-2 text-center font-bold text-sky-700">🪜 WF</th>
              <th className="px-2 py-2 text-center font-bold text-emerald-700">🔁 アジャイル</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.k} className={i % 2 ? "bg-gray-50" : "bg-white"}>
                <td className="whitespace-nowrap px-2 py-2 font-bold text-gray-700">{r.k}</td>
                <td className="px-2 py-2 text-center text-xs text-gray-700">{r.wf}</td>
                <td className="px-2 py-2 text-center text-xs text-gray-700">{r.agile}</td>
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
      <SectionTitle step={3}>これはどっち？</SectionTitle>
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
      <div className="rounded-xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        🛠️ システム開発は<b>要件定義→設計→製造→テスト→運用</b>の流れ。進め方には
        <b>ウォーターフォール（順番に）</b>と<b>アジャイル（小さく反復）</b>の2つがあります。
      </div>

      <Simulator />
      <Compare />
      <Quiz />
    </div>
  );
}
