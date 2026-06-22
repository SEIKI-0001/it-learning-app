"use client";

import { useState } from "react";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「プログラミング基礎」専用の体験。
//   ① 変数 = 値を入れる箱（入れ替えを実演）
//   ② 条件分岐 = もし〜なら（点数を変えると進む先が変わる）
//   ③ 繰り返し = 同じ処理を続ける（カウンタが回るのを実演）
// ============================================================================

function Variable() {
  const [value, setValue] = useState<number | string>(5);
  const choices: (number | string)[] = [5, 8, 100, "りんご"];
  return (
    <Panel>
      <SectionTitle step={1}>変数 ＝ 値を入れる箱</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        変数は<b className="text-gray-800">名前のついた箱</b>。あとから中身を入れ替えられます。
      </p>

      <div className="mt-4 flex flex-col items-center">
        <code className="rounded-md bg-gray-100 px-2 py-0.5 font-mono text-sm text-indigo-700">x</code>
        <span className="my-1 text-xs text-gray-400">という名前の箱に入れる ↓</span>
        <div className="grid h-24 w-24 place-items-center rounded-2xl border-4 border-dashed border-indigo-300 bg-indigo-50 text-2xl font-extrabold text-indigo-700">
          {value}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-1.5">
        {choices.map((c) => (
          <button
            key={String(c)}
            onClick={() => setValue(c)}
            className={`rounded-lg px-1 py-2 text-sm font-bold transition active:scale-95 ${
              value === c ? "bg-indigo-600 text-white" : "text-gray-600 ring-1 ring-gray-300"
            }`}
          >
            {c}
          </button>
        ))}
      </div>
      <p className="mt-3 text-center font-mono text-sm text-gray-600">
        x ← <b className="text-indigo-700">{typeof value === "string" ? `"${value}"` : value}</b>{" "}
        <span className="text-gray-400">（箱の中身が入れ替わる）</span>
      </p>
    </Panel>
  );
}

function Branch() {
  const [score, setScore] = useState(70);
  const pass = score >= 60;
  return (
    <Panel>
      <SectionTitle step={2}>条件分岐 ＝ もし〜なら</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        条件によって<b className="text-gray-800">進む道が変わる</b>仕組み。点数を動かしてみよう。
      </p>

      <div className="mt-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-bold text-gray-700">点数</span>
          <span className="font-mono text-lg font-extrabold text-indigo-700">{score}</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={score}
          onChange={(e) => setScore(Number(e.target.value))}
          className="mt-1 w-full accent-indigo-600"
        />
      </div>

      <div className="mt-3 rounded-xl bg-gray-900 px-4 py-3 font-mono text-xs leading-relaxed text-gray-100">
        <div>
          もし 点数 <span className="text-amber-300">≧ 60</span> なら
        </div>
        <div className={`pl-4 ${pass ? "text-emerald-300" : "text-gray-500"}`}>
          → 「合格」と表示 {pass && "◀ いま通る"}
        </div>
        <div>そうでなければ</div>
        <div className={`pl-4 ${!pass ? "text-rose-300" : "text-gray-500"}`}>
          → 「不合格」と表示 {!pass && "◀ いま通る"}
        </div>
      </div>

      <div
        className={`mt-3 rounded-xl px-4 py-3 text-center text-sm font-extrabold ring-1 ${
          pass ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-rose-50 text-rose-600 ring-rose-200"
        }`}
      >
        結果：{pass ? "⭕ 合格" : "❌ 不合格"}
      </div>
    </Panel>
  );
}

function Loop() {
  const [count, setCount] = useState(0);
  const TIMES = 3;
  const done = count >= TIMES;
  return (
    <Panel>
      <SectionTitle step={3}>繰り返し ＝ 同じ処理を続ける</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        決めた<b className="text-gray-800">回数や条件</b>のあいだ、同じ処理をくり返します。
      </p>

      <div className="mt-3 rounded-xl bg-gray-900 px-4 py-3 font-mono text-xs leading-relaxed text-gray-100">
        <div>
          i を 1 から <span className="text-amber-300">{TIMES}</span> まで くり返す
        </div>
        <div className="pl-4">→ 「こんにちは」と表示</div>
      </div>

      <div className="mt-3 flex items-center justify-center gap-2">
        <span className="text-xs text-gray-500">カウンタ i =</span>
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-indigo-100 font-mono text-lg font-extrabold text-indigo-700">
          {Math.min(count, TIMES)}
        </span>
      </div>

      <div className="mt-3 min-h-[60px] rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
        {count === 0 ? (
          <p className="text-center text-xs text-gray-400">「次へ」を押すと1回ずつ実行されます</p>
        ) : (
          <ul className="space-y-1">
            {Array.from({ length: Math.min(count, TIMES) }, (_, i) => (
              <li key={i} className="text-sm text-gray-700">
                <span className="text-gray-400">{i + 1}回目：</span>こんにちは 👋
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-gray-400">
          {done ? "終了条件に達したので止まる" : `あと ${TIMES - count} 回`}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setCount(0)}
            className="rounded-lg px-3 py-1.5 text-sm font-bold text-gray-600 ring-1 ring-gray-300 active:scale-95"
          >
            ↺
          </button>
          <button
            onClick={() => setCount((c) => Math.min(TIMES, c + 1))}
            disabled={done}
            className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-bold text-white active:scale-95 disabled:opacity-40"
          >
            {done ? "完了 🎉" : "次へ →"}
          </button>
        </div>
      </div>

      <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        ⚠️ 繰り返しは<b>終了条件</b>が大切。条件を間違えると、いつまでも止まらない（無限ループ）。
      </div>
    </Panel>
  );
}

export default function ProgrammingBasicsExperience() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        💻 プログラムは、コンピュータにしてほしい手順を書いたもの。基本部品は3つ：
        <b>変数（値を入れる箱）</b>・<b>条件分岐（もし〜なら）</b>・<b>繰り返し（同じ処理を続ける）</b>。
      </div>

      <Variable />
      <Branch />
      <Loop />
    </div>
  );
}
