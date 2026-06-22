"use client";

import { useState } from "react";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「開発プロセス」専用の体験。
//   ① システム開発の流れ（要件定義→設計→製造→テスト→運用）
//   ② ウォーターフォール（順番に下る）⇄ アジャイル（小さく反復）
//   ③ これはどっち？ クイズ
// ============================================================================

const PHASES = [
  { t: "要件定義", emoji: "📝", d: "何を作るか決める" },
  { t: "設計", emoji: "📐", d: "作り方を決める" },
  { t: "製造", emoji: "🔨", d: "プログラムを作る" },
  { t: "テスト", emoji: "✅", d: "正しく動くか確認" },
  { t: "運用", emoji: "🚀", d: "使い始めて保守" },
];

function Flow() {
  return (
    <Panel>
      <SectionTitle step={1}>システム開発の流れ</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        システムは、おおまかに<b className="text-gray-800">この順</b>で作られます。
      </p>
      <div className="mt-4 space-y-1.5">
        {PHASES.map((p, i) => (
          <div key={p.t} className="flex items-center gap-2">
            <div className="flex flex-1 items-center gap-3 rounded-xl bg-gray-50 px-3 py-2 ring-1 ring-gray-200">
              <span className="text-lg">{p.emoji}</span>
              <span className="text-sm font-extrabold text-gray-800">{p.t}</span>
              <span className="ml-auto text-xs text-gray-500">{p.d}</span>
            </div>
            {i < PHASES.length - 1 && <span className="w-4 flex-none text-center text-gray-300">↓</span>}
          </div>
        ))}
      </div>
    </Panel>
  );
}

function Compare() {
  return (
    <Panel>
      <SectionTitle step={2}>2つの進め方</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        同じ工程でも<b className="text-gray-800">進め方</b>がちがいます。代表が2つ。
      </p>

      {/* ウォーターフォール */}
      <div className="mt-4 rounded-xl bg-sky-50 p-3.5 ring-1 ring-sky-200">
        <div className="flex items-center gap-2">
          <span className="text-lg">🪜</span>
          <span className="text-sm font-extrabold text-sky-800">ウォーターフォール</span>
          <span className="rounded-full bg-sky-200 px-2 py-0.5 text-[10px] font-bold text-sky-800">順番に下る</span>
        </div>
        <p className="mt-1.5 text-sm leading-relaxed text-gray-700">
          滝が上から下に流れるように、<b>工程を1つずつ順番に</b>進めて完成させる。設計図どおりに一気に家を建てるイメージ。
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-1 text-[11px] font-bold text-sky-700">
          {["要件", "設計", "製造", "テスト"].map((s, i, a) => (
            <span key={s} className="flex items-center gap-1">
              <span className="rounded bg-white px-1.5 py-0.5 ring-1 ring-sky-200">{s}</span>
              {i < a.length - 1 && <span className="text-sky-300">▶</span>}
            </span>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-gray-500">⭕ 計画が立てやすい　⚠️ 後戻りが大変</p>
      </div>

      {/* アジャイル */}
      <div className="mt-3 rounded-xl bg-emerald-50 p-3.5 ring-1 ring-emerald-200">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔁</span>
          <span className="text-sm font-extrabold text-emerald-800">アジャイル</span>
          <span className="rounded-full bg-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-800">小さく反復</span>
        </div>
        <p className="mt-1.5 text-sm leading-relaxed text-gray-700">
          <b>小さく作って確認</b>し、改善をくり返す。試作品を少しずつ試して直すイメージ。短い反復（スプリント）を回す。
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-1 text-[11px] font-bold text-emerald-700">
          {["作る", "確認", "改善"].map((s) => (
            <span key={s} className="rounded bg-white px-1.5 py-0.5 ring-1 ring-emerald-200">{s}</span>
          ))}
          <span className="text-emerald-400">↻ くり返す</span>
        </div>
        <p className="mt-2 text-[11px] text-gray-500">⭕ 変更に強い　⚠️ 全体像が見えにくいことも</p>
      </div>

      <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        ⚠️ アジャイルは<b>「無計画」ではありません</b>。計画を小さく区切って、こまめに見直すだけです。
      </div>
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
      <div className="rounded-2xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        🛠️ システム開発は<b>要件定義→設計→製造→テスト→運用</b>の流れ。進め方には
        <b>ウォーターフォール（順番に）</b>と<b>アジャイル（小さく反復）</b>の2つがあります。
      </div>

      <Flow />
      <Compare />
      <Quiz />
    </div>
  );
}
