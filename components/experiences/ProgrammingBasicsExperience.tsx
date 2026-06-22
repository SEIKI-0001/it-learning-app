"use client";

import { useState } from "react";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「プログラミング基礎」専用の体験。
//   ① 変数 = 名前をつけた箱（代入＝入れる／名前で呼び出して再利用）
//   ② 条件分岐 = もし〜なら（雨なら傘。分かれ道をたどる）
//   ③ 繰り返し = 同じ作業を自動で何度も（手作業の大変さ→自動化）
//
// 方針: 黒いコード画面をやめ「身近なたとえ → プログラムだとこう → 操作」で
//       やさしく。初心者がつまずく点（= は"入れる"の意味 等）を明示する。
// ============================================================================

// やさしい擬似コード行（白背景・読みやすい等幅）
function CodeLine({ children }: { children: React.ReactNode }) {
  return (
    <code className="font-mono text-[13px] leading-relaxed text-gray-800 [&_b]:text-indigo-700">
      {children}
    </code>
  );
}

function Variable() {
  const [count, setCount] = useState(3);
  const PRICE = 100;
  const choices = [1, 3, 5, 10];
  return (
    <Panel>
      <SectionTitle step={1}>変数 ＝ 名前をつけた箱</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        変数は、数や文字を<b className="text-gray-800">入れておく箱</b>。箱に<b className="text-gray-800">名前</b>をつけ、
        あとからその名前で<b className="text-gray-800">中身を呼び出して使えます</b>。
      </p>

      {/* 名前つきの箱 */}
      <div className="mt-4 flex flex-col items-center">
        <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-700">
          箱の名前：りんごの数
        </span>
        <span className="my-1 text-lg text-gray-300">↓</span>
        <div className="grid h-20 w-20 place-items-center rounded-2xl border-4 border-dashed border-indigo-300 bg-indigo-50 text-3xl font-extrabold text-indigo-700">
          {count}
        </div>
        <span className="mt-1 text-xs text-gray-400">中に入っている値</span>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-1.5">
        {choices.map((c) => (
          <button
            key={c}
            onClick={() => setCount(c)}
            className={`rounded-lg px-1 py-2 text-sm font-bold transition active:scale-95 ${
              count === c ? "bg-indigo-600 text-white" : "text-gray-600 ring-1 ring-gray-300"
            }`}
          >
            {c}個
          </button>
        ))}
      </div>

      {/* 呼び出して計算に使える */}
      <div className="mt-4 rounded-xl bg-gray-50 p-3.5 ring-1 ring-gray-200">
        <p className="text-xs font-bold text-gray-500">名前で呼び出して計算に使う</p>
        <div className="mt-1.5 space-y-1">
          <CodeLine>
            りんごの数 <b className="text-indigo-700">←</b> {count}
            <span className="ml-2 text-gray-400">（箱に {count} を入れる）</span>
          </CodeLine>
          <br />
          <CodeLine>
            りんごの数 × {PRICE}円 ＝{" "}
            <b className="rounded bg-emerald-100 px-1 text-emerald-700">{count * PRICE}円</b>
          </CodeLine>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-gray-500">
          箱の中身を変えるだけで、計算の答えも<b className="text-gray-700">自動で変わります</b>。
          上のボタンを押して試してみよう。
        </p>
      </div>

      <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        ⚠️ 「<b>←</b>」や「<b>=</b>」は算数の<b>「等しい」ではありません</b>。
        「<b>右の値を箱に入れる</b>」という意味で、これを<b>代入</b>といいます。
      </div>
    </Panel>
  );
}

function Branch() {
  const [score, setScore] = useState(75);
  const pass = score >= 60;
  return (
    <Panel>
      <SectionTitle step={2}>条件分岐 ＝ もし〜なら</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        条件によって<b className="text-gray-800">やることを変える</b>仕組み。たとえば
        <b className="text-gray-800">「雨なら傘を持つ／降ってなければ持たない」</b>——これが条件分岐です。
      </p>

      <div className="mt-3 rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
        <p className="text-xs font-bold text-gray-500">プログラムだとこう書く</p>
        <div className="mt-1.5 space-y-0.5">
          <CodeLine>もし テストの点数が <b>60点以上</b> なら</CodeLine>
          <div className="pl-4"><CodeLine>「合格」と表示する</CodeLine></div>
          <CodeLine>そうでなければ</CodeLine>
          <div className="pl-4"><CodeLine>「不合格」と表示する</CodeLine></div>
        </div>
      </div>

      {/* 点数スライダー */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-bold text-gray-700">テストの点数を動かす</span>
          <span className="font-mono text-lg font-extrabold text-indigo-700">{score}点</span>
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

      {/* 分かれ道の図 */}
      <div className="mt-4 flex flex-col items-center">
        <div className="rounded-xl bg-indigo-50 px-4 py-2 text-center text-sm font-bold text-indigo-800 ring-1 ring-indigo-200">
          点数は 60点以上？
          <span className="ml-1 text-indigo-500">→ {pass ? "はい" : "いいえ"}</span>
        </div>
        <div className="mt-1 flex w-full items-stretch justify-center gap-3">
          <div className="text-2xl text-gray-300">↙</div>
          <div className="text-2xl text-gray-300">↘</div>
        </div>
        <div className="grid w-full grid-cols-2 gap-3">
          <div
            className={`rounded-xl px-2 py-3 text-center text-sm font-extrabold ring-1 transition ${
              pass ? "bg-emerald-500 text-white ring-emerald-500" : "bg-gray-50 text-gray-300 ring-gray-200"
            }`}
          >
            ⭕ 合格
            <div className="mt-0.5 text-[10px] font-medium opacity-80">はい の道</div>
          </div>
          <div
            className={`rounded-xl px-2 py-3 text-center text-sm font-extrabold ring-1 transition ${
              !pass ? "bg-rose-500 text-white ring-rose-500" : "bg-gray-50 text-gray-300 ring-gray-200"
            }`}
          >
            ❌ 不合格
            <div className="mt-0.5 text-[10px] font-medium opacity-80">いいえ の道</div>
          </div>
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-gray-400">
        点数によって、通る道（実行される処理）が切り替わる
      </p>
    </Panel>
  );
}

function Loop() {
  const [count, setCount] = useState(0);
  const TIMES = 3;
  const done = count >= TIMES;
  return (
    <Panel>
      <SectionTitle step={3}>繰り返し ＝ 同じ作業を自動で</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        同じことを<b className="text-gray-800">何度も手作業</b>するのは大変。
        たとえば封筒100枚に同じ住所を書くような作業を、<b className="text-gray-800">自動でくり返す</b>のが繰り返しです。
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <div className="rounded-xl bg-gray-50 p-3 text-center ring-1 ring-gray-200">
          <div className="text-xl">😩</div>
          <div className="mt-1 text-xs font-extrabold text-gray-600">手作業</div>
          <p className="mt-0.5 text-[11px] leading-relaxed text-gray-500">同じ命令を100回書く</p>
        </div>
        <div className="rounded-xl bg-emerald-50 p-3 text-center ring-1 ring-emerald-200">
          <div className="text-xl">😄</div>
          <div className="mt-1 text-xs font-extrabold text-emerald-700">繰り返し</div>
          <p className="mt-0.5 text-[11px] leading-relaxed text-gray-600">「100回くり返す」の1行でOK</p>
        </div>
      </div>

      <div className="mt-3 rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
        <p className="text-xs font-bold text-gray-500">プログラムだとこう書く</p>
        <div className="mt-1.5 space-y-0.5">
          <CodeLine>
            <b>{TIMES}回</b> くり返す
          </CodeLine>
          <div className="pl-4"><CodeLine>「こんにちは」と表示する</CodeLine></div>
        </div>
      </div>

      {/* 実行の様子 */}
      <div className="mt-3 flex items-center justify-center gap-2">
        <span className="text-xs text-gray-500">いま何回目？</span>
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-indigo-100 font-mono text-base font-extrabold text-indigo-700">
          {Math.min(count, TIMES)}
        </span>
        <span className="text-xs text-gray-400">/ {TIMES} 回</span>
      </div>

      <div className="mt-2 min-h-[64px] rounded-xl bg-white p-3 ring-1 ring-gray-200">
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
          {done ? "決めた回数に達したので止まる" : `あと ${TIMES - count} 回`}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setCount(0)}
            className="rounded-lg px-3 py-1.5 text-sm font-bold text-gray-600 ring-1 ring-gray-300 active:scale-95"
            aria-label="最初から"
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
        ⚠️ 「<b>いつ止めるか（終了条件）</b>」が大切。決め忘れると、いつまでも止まりません（無限ループ）。
      </div>
    </Panel>
  );
}

export default function ProgrammingBasicsExperience() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        💻 プログラムは、コンピュータへの<b>作業手順書</b>。むずかしく見えても、組み合わせる部品は基本この3つだけ：
        <b>変数（値を入れる箱）</b>・<b>条件分岐（もし〜なら）</b>・<b>繰り返し（同じ処理を続ける）</b>。
        どれも<b>日常でやっていること</b>です。
      </div>

      <Variable />
      <Branch />
      <Loop />
    </div>
  );
}
