"use client";

import { useState } from "react";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「表計算と相対参照・絶対参照」専用の体験。
//   ① 税込価格を出す式を下にコピー。税率セルの参照を「相対」か「絶対」で切替。
//      相対だと参照がズレて結果が壊れ、絶対($)だと固定されて正しく出るのを体感。
// ============================================================================

const PRICES = [100, 250, 400]; // B2, B3, B4
const RATE = 1.1; // E1 に入っている税率（×1.1）

function CopyDemo() {
  const [abs, setAbs] = useState(false); // 絶対参照か
  const [copied, setCopied] = useState(false);

  // 1行目(先頭セル C2)は常に正しい。コピーで C3,C4 を埋める。
  // 相対参照: 税率の参照が E1→E2→E3 とズレる（中身は空=0扱い）。
  // 絶対参照: $E$1 で固定され、どの行も ×1.1。
  const rows = PRICES.map((price, i) => {
    const first = i === 0;
    const filled = first || copied;
    const rateRef = abs ? "$E$1" : `E${1 + i}`; // 相対は行が下がるとズレる
    const rateUsed = first ? RATE : abs ? RATE : 0; // 相対コピーは空セル参照=0
    const formula = `=B${2 + i}*${rateRef}`;
    const result = filled ? Math.round(price * rateUsed) : null;
    const broken = filled && !first && !abs;
    return { price, formula, result, filled, broken, row: 2 + i };
  });

  return (
    <Panel>
      <SectionTitle step={1}>式を下にコピーしてみる</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        税込価格＝価格×税率。先頭セルに式を入れ、<b className="text-gray-800">下にコピー</b>して全部埋めます。
        税率（E1＝×1.1）の参照を切り替えて結果を見よう。
      </p>

      {/* 税率セル */}
      <div className="mt-4 flex items-center gap-2 rounded-xl bg-sky-50 px-4 py-2.5 ring-1 ring-sky-200">
        <span className="rounded bg-white px-1.5 py-0.5 font-mono text-xs font-bold text-sky-700 ring-1 ring-sky-200">E1</span>
        <span className="text-sm text-gray-700">税率 ＝ <b>×1.1</b></span>
      </div>

      {/* 参照モード切替 */}
      <div className="mt-3 grid grid-cols-2 gap-1.5 rounded-xl bg-gray-100 p-1">
        <button
          onClick={() => setAbs(false)}
          className={`rounded-lg px-1 py-2 text-xs font-bold transition active:scale-95 ${
            !abs ? "bg-rose-500 text-white" : "text-gray-500"
          }`}
        >
          相対参照 E1
        </button>
        <button
          onClick={() => setAbs(true)}
          className={`rounded-lg px-1 py-2 text-xs font-bold transition active:scale-95 ${
            abs ? "bg-emerald-500 text-white" : "text-gray-500"
          }`}
        >
          絶対参照 $E$1
        </button>
      </div>

      {/* 表 */}
      <table className="mt-3 w-full overflow-hidden rounded-xl text-center text-sm ring-1 ring-gray-200">
        <thead>
          <tr className="bg-gray-100 text-[11px] font-extrabold text-gray-600">
            <th className="py-2">セル</th>
            <th className="py-2">価格(B)</th>
            <th className="py-2">入っている式</th>
            <th className="py-2">税込</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.row} className="border-t border-gray-100">
              <td className="py-2 font-mono text-xs text-gray-400">C{r.row}</td>
              <td className="py-2 font-mono">{r.price}</td>
              <td className={`py-2 font-mono text-xs ${r.broken ? "text-rose-600" : "text-gray-700"}`}>
                {r.filled ? r.formula : "—"}
              </td>
              <td className="py-2 font-mono font-extrabold">
                {r.result === null ? (
                  <span className="text-gray-300">—</span>
                ) : r.broken ? (
                  <span className="text-rose-600">{r.result} ✗</span>
                ) : (
                  <span className="text-emerald-600">{r.result}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-3 flex gap-2">
        <button
          onClick={() => setCopied(true)}
          disabled={copied}
          className="flex-1 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-bold text-white active:scale-95 disabled:opacity-40"
        >
          ⬇ 下にコピーして埋める
        </button>
        <button
          onClick={() => setCopied(false)}
          className="rounded-lg px-3 py-2 text-sm font-bold text-gray-600 ring-1 ring-gray-300 active:scale-95"
        >
          ↺
        </button>
      </div>

      <div
        className={`mt-3 rounded-xl px-4 py-3 text-sm leading-relaxed ring-1 ${
          copied
            ? abs
              ? "bg-emerald-50 text-emerald-900 ring-emerald-200"
              : "bg-rose-50 text-rose-900 ring-rose-200"
            : "bg-gray-50 text-gray-500 ring-gray-200"
        }`}
      >
        {!copied ? (
          <>まず参照モードを選び、「下にコピー」を押してみよう。</>
        ) : abs ? (
          <>✅ <b>絶対参照 $E$1</b>：コピーしても税率の参照が固定され、どの行も正しく ×1.1 になりました。</>
        ) : (
          <>❌ <b>相対参照 E1</b>：コピーで参照が E2・E3 へズレ、<b>空セル(=0)</b>を見て結果が0に。固定したいセルには <b>$</b> が必要！</>
        )}
      </div>
    </Panel>
  );
}

function Summary() {
  return (
    <Panel>
      <SectionTitle step={2}>$ の意味をまとめる</SectionTitle>
      <div className="mt-3 space-y-2">
        <div className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
          <span className="font-mono text-sm font-extrabold text-gray-800">A1</span>
          <span className="ml-2 text-sm text-gray-600">相対参照：コピーで列も行もズレる</span>
        </div>
        <div className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
          <span className="font-mono text-sm font-extrabold text-emerald-700">$A$1</span>
          <span className="ml-2 text-sm text-gray-600">絶対参照：コピーしてもズレない（完全固定）</span>
        </div>
        <div className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
          <span className="font-mono text-sm font-extrabold text-indigo-700">$A1 / A$1</span>
          <span className="ml-2 text-sm text-gray-600">複合参照：$の付いた側だけ固定</span>
        </div>
      </div>
      <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        💡 「<b>$ が付いた方向は動かない</b>」と覚える。税率や定数など、全行で同じセルを見たいときは絶対参照。
      </div>
    </Panel>
  );
}

export default function SpreadsheetExperience() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        📊 表計算で式をコピーすると、参照するセルが自動でズレるのが<b>相対参照</b>。
        ズラしたくないセルは <b>$</b> で固定する<b>絶対参照</b>を使います。
      </div>

      <CopyDemo />
      <Summary />
    </div>
  );
}
