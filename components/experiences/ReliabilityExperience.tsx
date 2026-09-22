"use client";

import { useState } from "react";
import { SystemDiagram, systemUp, type Mode } from "./reliability/SystemDiagram";
import { UptimeTimeline, type Focus } from "./reliability/UptimeTimeline";
import { useReducedMotion } from "./scene/useReducedMotion";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「稼働率とMTBF・MTTR」専用の体験。
//   ① MTBF/MTTR スライダーで 稼働率 = MTBF ÷ (MTBF + MTTR) が動く。同じ縮尺の600時間の時間軸で
//      稼働（緑）⚡故障 修理（赤）✅復旧 が並び、スライダーに合わせて区間が伸び縮みする。
//      ▶ で時計を進めると稼働・停止時間が積み上がり、実際の割合が式の答えと一致していく
//   ② 直列 ⇄ 並列。装置をタップして故障させると、リクエストが止まる（直列）／迂回して届く（並列）
// ============================================================================

function AvailabilityCalc() {
  const reducedMotion = useReducedMotion();
  const [mtbf, setMtbf] = useState(90);
  const [mttr, setMttr] = useState(10);
  const [focus, setFocus] = useState<Focus>(null);
  const term = (f: Exclude<Focus, null>, label: string, tone: string) => (
    <button
      type="button"
      onClick={() => setFocus(focus === f ? null : f)}
      aria-pressed={focus === f}
      className={`rounded px-1 font-bold underline decoration-dotted underline-offset-2 ${tone} ${focus === f ? "ring-2 ring-current" : ""}`}
    >
      {label}
    </button>
  );
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

      {/* 時間軸（式の数字が、実際の時間のどこなのか） */}
      <UptimeTimeline mtbf={mtbf} mttr={mttr} focus={focus} reducedMotion={reducedMotion} />

      {/* 式（項をタップすると、時間軸の該当区間だけが残る） */}
      <div className="mt-3 rounded-xl bg-gray-50 px-4 py-3 text-center ring-1 ring-gray-200">
        <div className="text-xs text-gray-500">
          稼働率 ＝ {term("mtbf", "MTBF", "text-emerald-700")} ÷（{term("cycle", "MTBF ＋ MTTR", "text-brand-700")}）
        </div>
        <div className="mt-1 text-sm text-gray-700">
          <span className="font-bold text-emerald-700">{mtbf}</span> ÷（<span className="font-bold text-emerald-700">{mtbf}</span> ＋{" "}
          <span className="font-bold text-rose-700">{mttr}</span>）＝ {mtbf} ÷ {mtbf + mttr}
        </div>
        <div className="mt-1 text-2xl font-bold text-brand-600">
          {avail.toFixed(3)}（{pct.toFixed(1)}%）
        </div>
      </div>

      <p className="mt-2 text-center text-[11px] text-gray-500">
        式の <b className="text-emerald-700">MTBF</b>・<b className="text-brand-700">MTBF＋MTTR</b> や下の {term("mttr", "MTTR", "text-rose-700")} をタップすると、時間軸のその部分だけが残ります。
      </p>

      <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        💡 こわれにくい（MTBF大）＝緑が長い、早く直る（MTTR小）＝赤が短いほど稼働率は上がります。
        稼働率は「1サイクルのうち緑が占める割合」です。
      </div>
    </Panel>
  );
}

function SerialVsParallel() {
  const reducedMotion = useReducedMotion();
  const [mode, setMode] = useState<Mode>("serial");
  const [aOk, setAOk] = useState(true);
  const [bOk, setBOk] = useState(true);
  const [runKey, setRunKey] = useState(0);
  const a = 0.9; // 1台あたりの稼働率
  const serial = a * a; // 直列：両方動いて初めてOK
  const parallel = 1 - (1 - a) * (1 - a); // 並列：どちらか動けばOK
  const val = mode === "serial" ? serial : parallel;
  const up = systemUp(mode, aOk, bOk);
  const broken = [aOk, bOk].filter((ok) => !ok).length;

  const choose = (m: Mode) => {
    setMode(m);
    setRunKey((k) => k + 1);
  };
  const toggle = (which: "a" | "b") => {
    if (which === "a") setAOk((v) => !v);
    else setBOk((v) => !v);
    setRunKey((k) => k + 1);
  };

  return (
    <Panel>
      <SectionTitle step={2}>直列と並列で変わる</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        稼働率<b className="text-gray-800">0.9</b>の装置を2台つなぎます。<b className="text-gray-800">装置をタップして故障させる</b>と、
        入口からのリクエストが出口まで届くかどうかが変わります。
      </p>

      <div className="mt-4 grid grid-cols-2 gap-1.5 rounded-xl bg-gray-100 p-1">
        <button
          onClick={() => choose("serial")}
          aria-pressed={mode === "serial"}
          className={`rounded-lg px-2 py-2 text-sm font-bold transition active:scale-95 ${
            mode === "serial" ? "bg-rose-500 text-white" : "text-gray-500"
          }`}
        >
          ➖ 直列
        </button>
        <button
          onClick={() => choose("parallel")}
          aria-pressed={mode === "parallel"}
          className={`rounded-lg px-2 py-2 text-sm font-bold transition active:scale-95 ${
            mode === "parallel" ? "bg-emerald-500 text-white" : "text-gray-500"
          }`}
        >
          ⫴ 並列（冗長化）
        </button>
      </div>

      <SystemDiagram mode={mode} aOk={aOk} bOk={bOk} runKey={runKey} reducedMotion={reducedMotion} onToggle={toggle} />

      <div
        className={`mt-2 rounded-lg px-3 py-1.5 text-center text-sm font-bold ${up ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}
        data-testid="system-status"
        aria-live="polite"
      >
        {up
          ? broken === 0
            ? "✅ システム稼働中"
            : "✅ 1台止まっても、もう1台で継続中"
          : mode === "serial" && broken === 1
            ? "🛑 1台止まっただけで、システム全体が停止"
            : "🛑 システム停止"}
      </div>

      <div className="mt-3 rounded-xl bg-gray-50 px-4 py-3 text-center ring-1 ring-gray-200">
        {mode === "serial" ? (
          <div className="text-xs text-gray-500">直列：0.9 × 0.9（両方動いて初めてOK）</div>
        ) : (
          <div className="text-xs text-gray-500">並列：1 −（0.1 × 0.1）（両方同時に止まらなければOK）</div>
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
