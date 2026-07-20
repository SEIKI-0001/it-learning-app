"use client";

import { useState } from "react";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「稼働率とMTBF・MTTR」専用の体験。
//   ① MTBF/MTTR スライダーで 稼働率 = MTBF ÷ (MTBF + MTTR) が動く
//   ② 同じ装置を直列 ⇄ 並列 にすると全体の稼働率が下がる/上がるのを比較
// ============================================================================

function AvailabilityCalc() {
  const [mtbf, setMtbf] = useState(90);
  const [mttr, setMttr] = useState(10);
  const avail = mtbf / (mtbf + mttr);
  const pct = avail * 100;
  return (
    <Panel>
      <SectionTitle step={1}>稼働率を計算してみる</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        <b className="text-gray-800">MTBF</b>（平均で何時間こわれず動くか）と
        <b className="text-gray-800">MTTR</b>（直すのに平均何時間か）を動かそう。
      </p>

      <div className="mt-4 space-y-3">
        <div>
          <div className="flex justify-between text-xs">
            <span className="font-bold text-emerald-700">MTBF（動いている平均時間）</span>
            <span className="text-gray-600">{mtbf} 時間</span>
          </div>
          <input
            type="range"
            min={10}
            max={190}
            step={10}
            value={mtbf}
            onChange={(e) => setMtbf(Number(e.target.value))}
            className="mt-1 w-full accent-emerald-600"
            aria-label="MTBF"
          />
        </div>
        <div>
          <div className="flex justify-between text-xs">
            <span className="font-bold text-rose-700">MTTR（直すのにかかる平均時間）</span>
            <span className="text-gray-600">{mttr} 時間</span>
          </div>
          <input
            type="range"
            min={10}
            max={100}
            step={10}
            value={mttr}
            onChange={(e) => setMttr(Number(e.target.value))}
            className="mt-1 w-full accent-rose-500"
            aria-label="MTTR"
          />
        </div>
      </div>

      {/* 式 */}
      <div className="mt-4 rounded-xl bg-gray-50 px-4 py-3 text-center ring-1 ring-gray-200">
        <div className="text-xs text-gray-500">稼働率 ＝ MTBF ÷（MTBF ＋ MTTR）</div>
        <div className="mt-1 text-sm text-gray-700">
          {mtbf} ÷（{mtbf} ＋ {mttr}）＝ {mtbf} ÷ {mtbf + mttr}
        </div>
        <div className="mt-1 text-2xl font-bold text-brand-600">
          {avail.toFixed(3)}（{pct.toFixed(1)}%）
        </div>
      </div>

      {/* バー */}
      <div className="mt-3 flex h-5 overflow-hidden rounded-md ring-1 ring-gray-200">
        <div className="bg-emerald-400" style={{ width: `${pct}%` }} />
        <div className="bg-rose-300" style={{ width: `${100 - pct}%` }} />
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-gray-400">
        <span>🟩 動いている割合</span>
        <span>止まっている割合 🟥</span>
      </div>

      <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        💡 こわれにくい（MTBF大）・早く直る（MTTR小）ほど稼働率は上がります。
      </div>
    </Panel>
  );
}

function SerialVsParallel() {
  const [mode, setMode] = useState<"serial" | "parallel">("serial");
  const a = 0.9; // 1台あたりの稼働率
  const serial = a * a; // 直列：両方動いて初めてOK
  const parallel = 1 - (1 - a) * (1 - a); // 並列：どちらか動けばOK
  const val = mode === "serial" ? serial : parallel;
  return (
    <Panel>
      <SectionTitle step={2}>直列と並列で変わる</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        稼働率<b className="text-gray-800">0.9</b>の装置を2台つなぐとき、つなぎ方で全体の稼働率が変わります。
      </p>

      <div className="mt-4 grid grid-cols-2 gap-1.5 rounded-xl bg-gray-100 p-1">
        <button
          onClick={() => setMode("serial")}
          className={`rounded-lg px-2 py-2 text-sm font-bold transition active:scale-95 ${
            mode === "serial" ? "bg-rose-500 text-white" : "text-gray-500"
          }`}
        >
          ➖ 直列
        </button>
        <button
          onClick={() => setMode("parallel")}
          className={`rounded-lg px-2 py-2 text-sm font-bold transition active:scale-95 ${
            mode === "parallel" ? "bg-emerald-500 text-white" : "text-gray-500"
          }`}
        >
          ⫴ 並列（冗長化）
        </button>
      </div>

      {/* 図 */}
      <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-gray-50 py-5 ring-1 ring-gray-200">
        {mode === "serial" ? (
          <>
            <span className="text-gray-400">→</span>
            <Box />
            <span className="text-gray-400">→</span>
            <Box />
            <span className="text-gray-400">→</span>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2">
              <span className="text-gray-400">┌</span>
              <Box />
              <span className="text-gray-400">┐</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400">└</span>
              <Box />
              <span className="text-gray-400">┘</span>
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 rounded-xl bg-gray-50 px-4 py-3 text-center ring-1 ring-gray-200">
        {mode === "serial" ? (
          <div className="text-xs text-gray-500">直列：0.9 × 0.9（両方動いて初めてOK）</div>
        ) : (
          <div className="text-xs text-gray-500">並列：1 −（0.1 × 0.1）（どちらか動けばOK）</div>
        )}
        <div className={`mt-1 text-2xl font-bold ${mode === "serial" ? "text-rose-600" : "text-emerald-600"}`}>
          {val.toFixed(2)}（{(val * 100).toFixed(0)}%）
        </div>
      </div>

      <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        💡 <b>直列は稼働率が下がり（0.81）</b>、<b>並列にすると上がる（0.99）</b>。
        大事なシステムは並列（冗長化）で止まりにくくします。
      </div>
    </Panel>
  );
}

function Box() {
  return (
    <span className="grid h-9 w-12 place-items-center rounded-lg bg-white text-[10px] font-bold text-gray-600 ring-1 ring-gray-300">
      装置<br />0.9
    </span>
  );
}

export default function ReliabilityExperience() {
  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        ⚙️ <b>稼働率</b>はシステムが動いている時間の割合。<b>稼働率＝MTBF÷(MTBF＋MTTR)</b>で計算します。
        つなぎ方（直列／並列）でも全体の稼働率は変わります。
      </div>

      <AvailabilityCalc />
      <SerialVsParallel />
    </div>
  );
}
