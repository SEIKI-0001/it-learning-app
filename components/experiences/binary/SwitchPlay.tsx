"use client";

import { useState } from "react";
import { Pow } from "./BitBoxes";

// 「スイッチで数を作る」小さな遊び。
//   32・16・8・4・2・1 のスイッチを押して、お題の数ちょうどにする。
//   押すたびに合計が変わるので「1 の箱の数字を足す」「大きい箱から入れる」を手で覚えられる。

const WEIGHTS = [32, 16, 8, 4, 2, 1];

type Mission = { target: number; title: string; done: string };

const MISSIONS: Mission[] = [
  { target: 5, title: "まずは 5 を作ろう", done: "4 と 1 で 5。2進数で 101" },
  { target: 44, title: "次は 44 を作ろう", done: "32＋8＋4＝44。2進数で 101100" },
  { target: 63, title: "全部つけると？", done: "63（＝64−1）。6個の箱で 0〜63 の 64通り" },
];

export function SwitchPlay() {
  const [on, setOn] = useState<boolean[]>(() => WEIGHTS.map(() => false));
  const [m, setM] = useState(0);
  const mission = MISSIONS[m];
  const total = WEIGHTS.reduce((s, w, i) => s + (on[i] ? w : 0), 0);
  const picked = WEIGHTS.filter((_, i) => on[i]);
  const cleared = total === mission.target;
  const last = m === MISSIONS.length - 1;
  const bits = on.map((b) => (b ? "1" : "0")).join("");

  return (
    <div data-testid="binary-switch-play" data-total={total} data-bits={bits} data-mission={mission.target}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-base font-bold text-gray-900" data-testid="binary-mission">
          お題 {m + 1}/{MISSIONS.length}：{mission.title}
        </p>
        <span className="flex gap-1" aria-hidden>
          {MISSIONS.map((_, i) => (
            <span key={i} className={`h-2 w-2 rounded-full ${i < m || (i === m && cleared) ? "bg-brand-600" : "bg-gray-200"}`} />
          ))}
        </span>
      </div>

      <ol className="mx-auto mt-4 grid max-w-sm grid-cols-6 gap-1.5">
        {WEIGHTS.map((w, i) => (
          <li key={w} className="flex flex-col items-stretch text-center">
            <span className="whitespace-nowrap pb-1 font-mono text-lg font-bold tabular-nums text-gray-800">
              {w}
              <span className="font-sans text-[11px] text-gray-400">
                (<Pow n={WEIGHTS.length - 1 - i} />)
              </span>
            </span>
            <button
              type="button"
              aria-pressed={on[i]}
              aria-label={`${w} のスイッチ`}
              onClick={() => setOn((prev) => prev.map((b, j) => (j === i ? !b : b)))}
              className={`grid h-14 place-items-center rounded-lg font-mono text-2xl font-bold transition active:scale-95 ${
                on[i]
                  ? "bg-brand-600 text-white shadow-[0_0_0_4px] shadow-brand-200"
                  : "bg-white text-gray-300 ring-1 ring-inset ring-gray-300 hover:ring-brand-300"
              }`}
            >
              {on[i] ? "1" : "0"}
            </button>
          </li>
        ))}
      </ol>
      <p className="mt-1.5 text-center text-xs font-bold text-gray-500">箱をタップすると 0 ⇄ 1</p>

      <p className="mt-3 text-center font-mono text-gray-900" data-testid="binary-switch-total" aria-live="polite">
        <span className="text-sm text-gray-500">{picked.length ? picked.join("＋") + " ＝ " : "合計 "}</span>
        <span className={`text-4xl font-bold tabular-nums ${cleared ? "text-brand-700" : total > mission.target ? "text-red-600" : ""}`}>{total}</span>
        <span className="ml-1 text-sm text-gray-500">/ {mission.target}</span>
      </p>

      {cleared ? (
        <div className="mt-3 rounded-xl bg-gray-900 px-4 py-3 text-center text-white" data-testid="binary-switch-clear">
          <p className="text-lg font-bold leading-snug">できた！ {mission.done}</p>
          {!last && (
            <button
              type="button"
              onClick={() => {
                setM(m + 1);
                setOn(WEIGHTS.map(() => false));
              }}
              className="mt-2 rounded-lg bg-white px-4 py-1.5 text-sm font-bold text-gray-900 active:scale-95"
            >
              次のお題 →
            </button>
          )}
        </div>
      ) : (
        <p className="mt-3 text-center text-xs leading-relaxed text-gray-600">
          {total > mission.target ? "多すぎ！ どれかを 0 に戻そう。" : "コツ：大きい箱から「入るかな？」と試す。"}
        </p>
      )}
    </div>
  );
}
