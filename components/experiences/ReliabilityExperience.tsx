"use client";

import { useState } from "react";
import { BasicCalcStage, DerivationStage, MeaningStage, NamingStage } from "./reliability/BasicsStages";
import styles from "./reliability/reliability.module.css";
import { SystemDiagram, systemUp, type Mode } from "./reliability/SystemDiagram";
import { UptimeTimeline, type Focus } from "./reliability/UptimeTimeline";
import { useReducedMotion } from "./scene/useReducedMotion";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「稼働率とMTBF・MTTR」専用の体験。公式を先に見せず、時間の帯から組み立てる。
//   ① 意味　：100時間のうち90時間動いた → 稼働率＝動いていた時間÷全体（用語はまだ出さない）
//   ② 名前　：正常稼働→故障→修理→復旧→正常稼働 に MTBF / MTTR の名札が付く
//   ③ 導出　：動いていた÷全体 → 全体＝動いていた＋修理 → MTBF÷(MTBF＋MTTR)
//   ④ 実験　：MTBF/MTTR スライダー。600時間の時間軸と稼働率メーターが動き、上がった/下がったを返す
//   ⑤ 1問　：MTBF 90h・MTTR 10h
//   ⑥ 応用　：直列 ⇄ 並列。「このシステムが止まるのはいつ？」を装置の故障で確かめてから計算する
// ============================================================================

type Change = { which: "MTBF" | "MTTR"; from: number; to: number; before: number; after: number };

function AvailabilityCalc() {
  const reducedMotion = useReducedMotion();
  const [mtbf, setMtbf] = useState(90);
  const [mttr, setMttr] = useState(10);
  const [focus, setFocus] = useState<Focus>(null);
  const [change, setChange] = useState<Change | null>(null);
  const availOf = (b: number, r: number) => b / (b + r);
  const avail = availOf(mtbf, mttr);
  const pct = avail * 100;

  const set = (which: Change["which"], v: number) => {
    const [b, r] = which === "MTBF" ? [v, mttr] : [mtbf, v];
    setChange({ which, from: which === "MTBF" ? mtbf : mttr, to: v, before: avail, after: availOf(b, r) });
    if (which === "MTBF") setMtbf(v);
    else setMttr(v);
  };

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

  const up = change ? change.after > change.before + 1e-9 : false;
  const down = change ? change.after < change.before - 1e-9 : false;

  return (
    <Panel>
      <SectionTitle step={4}>実験：MTBF と MTTR を動かす</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        公式ができたので、数字を動かして<b className="text-gray-800">稼働率がどっちに動くか</b>を確かめよう。
      </p>

      <div className="mt-4 space-y-3">
        <div>
          <div className="flex items-baseline justify-between text-xs">
            <span className="font-bold text-emerald-700">
              MTBF（動いている時間）<span className="ml-1 rounded bg-emerald-100 px-1 text-[10px]">大きいほど良い ▶</span>
            </span>
            <span className="text-gray-600">{mtbf} 時間</span>
          </div>
          <input
            type="range"
            min={10}
            max={190}
            step={10}
            value={mtbf}
            onChange={(e) => set("MTBF", Number(e.target.value))}
            className="mt-1 w-full accent-emerald-600"
            aria-label="MTBF"
          />
        </div>
        <div>
          <div className="flex items-baseline justify-between text-xs">
            <span className="font-bold text-rose-700">
              MTTR（修理の時間）<span className="ml-1 rounded bg-rose-100 px-1 text-[10px]">◀ 小さいほど良い</span>
            </span>
            <span className="text-gray-600">{mttr} 時間</span>
          </div>
          <input
            type="range"
            min={10}
            max={100}
            step={10}
            value={mttr}
            onChange={(e) => set("MTTR", Number(e.target.value))}
            className="mt-1 w-full accent-rose-500"
            aria-label="MTTR"
          />
        </div>
      </div>

      {/* 稼働率メーター：さっきの値（薄い線）から今の値へ */}
      <div className="mt-4" data-testid="avail-meter">
        <div className="flex items-baseline justify-between">
          <span className="text-xs font-bold text-gray-600">稼働率</span>
          <span className="text-2xl font-bold text-brand-600">
            {avail.toFixed(3)}（{pct.toFixed(1)}%）
          </span>
        </div>
        <div className="relative mt-1 h-3 overflow-hidden rounded-full bg-gray-100 ring-1 ring-gray-200">
          <div className={`${styles.meter} h-full bg-brand-500`} style={{ width: `${pct}%` }} />
          {change && (up || down) && (
            <div className="absolute inset-y-0 w-0.5 bg-gray-800/60" style={{ left: `${change.before * 100}%` }} aria-hidden />
          )}
        </div>
      </div>

      <div
        className={`mt-2 rounded-lg px-3 py-2 text-xs font-bold leading-relaxed ${
          up ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200" : down ? "bg-rose-50 text-rose-800 ring-1 ring-rose-200" : "bg-gray-50 text-gray-500 ring-1 ring-gray-200"
        }`}
        data-testid="avail-feedback"
        aria-live="polite"
      >
        {!change || !(up || down) ? (
          "スライダーを動かすと、稼働率が上がったか下がったかがここに出ます。"
        ) : (
          <>
            {change.which} を {change.from}h → {change.to}h（{change.to > change.from ? "長く" : "短く"}）すると、稼働率{" "}
            {(change.before * 100).toFixed(1)}% → {(change.after * 100).toFixed(1)}%　{up ? "⬆ 上がった 👍" : "⬇ 下がった"}
            <div className="mt-0.5 font-medium">
              {change.which === "MTBF"
                ? up
                  ? "こわれにくくなる（緑が長くなる）ほど、稼働率は上がります。"
                  : "すぐこわれる（緑が短くなる）と、稼働率は下がります。"
                : up
                  ? "早く直る（赤が短くなる）ほど、稼働率は上がります。"
                  : "修理に時間がかかる（赤が長くなる）と、稼働率は下がります。"}
            </div>
          </>
        )}
      </div>

      {/* 時間軸（式の数字が、実際の時間のどこなのか） */}
      <UptimeTimeline mtbf={mtbf} mttr={mttr} focus={focus} reducedMotion={reducedMotion} />

      {/* 式（項をタップすると、時間軸の該当区間だけが残る） */}
      <div className="mt-3 rounded-xl bg-gray-50 px-4 py-2.5 text-center ring-1 ring-gray-200">
        <div className="text-xs text-gray-500">
          稼働率 ＝ {term("mtbf", "MTBF", "text-emerald-700")} ÷（{term("cycle", "MTBF ＋ MTTR", "text-brand-700")}）
        </div>
        <div className="mt-1 text-sm text-gray-700">
          <span className="font-bold text-emerald-700">{mtbf}</span> ÷（<span className="font-bold text-emerald-700">{mtbf}</span> ＋{" "}
          <span className="font-bold text-rose-700">{mttr}</span>）＝ {mtbf} ÷ {mtbf + mttr}
        </div>
      </div>
      <p className="mt-2 text-center text-[11px] text-gray-500">
        式の <b className="text-emerald-700">MTBF</b>・<b className="text-brand-700">MTBF＋MTTR</b> や {term("mttr", "MTTR", "text-rose-700")} をタップすると、時間軸のその部分だけが残ります。
      </p>
    </Panel>
  );
}

// 「このシステムが止まるのはいつ？」→ 停止条件 → 計算、の順に見せる
const REASONING: Record<Mode, { stop: string; hint: string; lines: { text: string; value?: string }[]; result: string }> = {
  serial: {
    stop: "どれか1台でも止まったとき",
    hint: "装置を1台タップして、止めてみよう。",
    lines: [
      { text: "動いているには「全部動いている」必要がある" },
      { text: "A が動いている確率 × B が動いている確率", value: "0.9 × 0.9" },
    ],
    result: "0.81（81%）",
  },
  parallel: {
    stop: "両方とも止まったときだけ",
    hint: "装置をタップして止めてみよう。1台止めても…？",
    lines: [
      { text: "1台が止まっている確率", value: "1 − 0.9 ＝ 0.1" },
      { text: "両方止まっている確率", value: "0.1 × 0.1 ＝ 0.01" },
      { text: "動いている確率＝止まっていない確率", value: "1 − 0.01" },
    ],
    result: "0.99（99%）",
  },
};

function SerialVsParallel() {
  const reducedMotion = useReducedMotion();
  const [mode, setMode] = useState<Mode>("serial");
  const [aOk, setAOk] = useState(true);
  const [bOk, setBOk] = useState(true);
  const [runKey, setRunKey] = useState(0);
  // 各つなぎ方で「止まる条件」を確かめたか（止めてみる or 答えを見る）
  const [found, setFound] = useState<Record<Mode, boolean>>({ serial: false, parallel: false });
  const up = systemUp(mode, aOk, bOk);
  const broken = [aOk, bOk].filter((ok) => !ok).length;
  const r = REASONING[mode];

  const choose = (m: Mode) => {
    // 故障状態はそのまま＝同じ故障でも直列は止まり、並列は動き続けるのを見比べられる
    setMode(m);
    setRunKey((k) => k + 1);
    if (!systemUp(m, aOk, bOk)) setFound((f) => ({ ...f, [m]: true }));
  };
  const toggle = (which: "a" | "b") => {
    const nextA = which === "a" ? !aOk : aOk;
    const nextB = which === "b" ? !bOk : bOk;
    setAOk(nextA);
    setBOk(nextB);
    setRunKey((k) => k + 1);
    if (!systemUp(mode, nextA, nextB)) setFound((f) => ({ ...f, [mode]: true }));
  };

  return (
    <Panel>
      <div className="mb-3 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 ring-1 ring-emerald-200">
        ✅ ここまでで基本はOK。ここからは応用です。
      </div>
      <SectionTitle step={6}>もう一歩：装置が2台のとき</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        稼働率<b className="text-gray-800">0.9</b>の装置を2台つなぎます。まず考えるのは
        <b className="text-gray-800">「このシステムが止まるのはいつ？」</b>です。
      </p>

      <div className="mt-3 grid grid-cols-2 gap-1.5 rounded-xl bg-gray-100 p-1">
        <button
          type="button"
          onClick={() => choose("serial")}
          aria-pressed={mode === "serial"}
          className={`rounded-lg px-2 py-2 text-sm font-bold transition active:scale-95 ${mode === "serial" ? "bg-rose-500 text-white" : "text-gray-500"}`}
        >
          ➖ 直列
        </button>
        <button
          type="button"
          onClick={() => choose("parallel")}
          aria-pressed={mode === "parallel"}
          className={`rounded-lg px-2 py-2 text-sm font-bold transition active:scale-95 ${mode === "parallel" ? "bg-emerald-500 text-white" : "text-gray-500"}`}
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

      {/* 止まる条件 → 計算 */}
      <div className="mt-3 rounded-xl bg-gray-50 px-3 py-3 ring-1 ring-gray-200" data-testid="reasoning" data-found={found[mode] ? "true" : "false"}>
        <div className="text-xs font-bold text-gray-800">Q. このシステムが止まるのはいつ？</div>
        {!found[mode] ? (
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <span className="text-xs text-gray-500">👆 {mode === "parallel" && broken === 1 ? "まだ動いている。もう1台も止めてみよう。" : r.hint}</span>
            <button
              type="button"
              onClick={() => setFound((f) => ({ ...f, [mode]: true }))}
              className="flex-none rounded-lg px-2 py-1 text-[11px] font-bold text-gray-500 ring-1 ring-gray-300 active:scale-95"
            >
              答えを見る
            </button>
          </div>
        ) : (
          <div className={styles.reveal} key={mode}>
            <div className={`mt-1 text-sm font-bold ${mode === "serial" ? "text-rose-700" : "text-emerald-700"}`}>→ {r.stop}</div>
            <ol className="mt-2 space-y-1 text-xs text-gray-700">
              {r.lines.map((l, i) => (
                <li key={i} className={`flex items-baseline justify-between gap-2 ${styles.reveal}`} style={{ animationDelay: `${(i + 1) * 350}ms` }}>
                  <span>
                    {i + 1}. {l.text}
                  </span>
                  {l.value && <b className="whitespace-nowrap font-mono text-gray-800">{l.value}</b>}
                </li>
              ))}
            </ol>
            <div
              className={`mt-2 text-center text-2xl font-bold ${mode === "serial" ? "text-rose-600" : "text-emerald-600"} ${styles.reveal}`}
              style={{ animationDelay: `${(r.lines.length + 1) * 350}ms` }}
            >
              ＝ {r.result}
            </div>
          </div>
        )}
      </div>

      {found.serial && found.parallel && (
        <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
          💡 <b>直列は1台で止まる → 稼働率は下がる（0.81）</b>。<b>並列は両方止まらないと止まらない → 上がる（0.99）</b>。
          並列は「止まる確率」から考えて 1 から引きます。
        </div>
      )}
    </Panel>
  );
}

export default function ReliabilityExperience() {
  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        ⚙️ <b>稼働率</b>は「どれくらい止まらずに動いていたか」。まず時間の帯で意味をつかみ、そこから計算式を自分で組み立てます。
      </div>

      <MeaningStage />
      <NamingStage />
      <DerivationStage />
      <AvailabilityCalc />
      <BasicCalcStage />
      <SerialVsParallel />
    </div>
  );
}
