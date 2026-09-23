"use client";

import { useState } from "react";
import { GateCircuit, H, SWITCH_Y, W, type Op } from "./logic/GateCircuit";
import styles from "./logic/logic.module.css";
import { useReducedMotion } from "./scene/useReducedMotion";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「論理演算と真理値表」専用の体験。
//   ① A・Bのスイッチ(0/1)と演算(AND/OR/NOT/XOR)を選ぶと、1 の信号が
//      スイッチ → ゲート → ランプ の順に線を流れて出力ランプが点く。
//      すぐ下の真理値表は同じ状態を表し、ハイライトが今の入力の行へ移る（行タップでスイッチも変わる）
//   ② 選んだ演算の真理値表で全パターンを見る（①と同じ入力の行がハイライト）
// ============================================================================

const OPS: { op: Op; label: string; desc: string }[] = [
  { op: "AND", label: "AND（論理積）", desc: "両方1のとき1" },
  { op: "OR", label: "OR（論理和）", desc: "どちらか1なら1" },
  { op: "XOR", label: "XOR（排他的論理和）", desc: "2つが違うとき1" },
  { op: "NOT", label: "NOT（否定）", desc: "0と1を反転（Aのみ）" },
];

function calc(op: Op, a: number, b: number): number {
  switch (op) {
    case "AND":
      return a & b;
    case "OR":
      return a | b;
    case "XOR":
      return a ^ b;
    case "NOT":
      return a === 1 ? 0 : 1;
  }
}

// 今の入力に演算のルールを当てはめた一言（XOR は「違う？」を主役にする）
function ruleText(op: Op, a: number, b: number) {
  switch (op) {
    case "AND":
      return a && b ? "AもBも1 → 1" : "どちらかが0 → 0";
    case "OR":
      return a || b ? "1が1つ以上ある → 1" : "どちらも0 → 0";
    case "XOR":
      return a !== b ? "AとBが違う（片方だけ1） → 1" : a ? "両方1＝同じ → 0" : "両方0＝同じ → 0";
    case "NOT":
      return `Aの${a}を反転 → ${a ? 0 : 1}`;
  }
}

function tableRows(op: Op) {
  return op === "NOT"
    ? [0, 1].map((a) => ({ a, b: 0, out: calc("NOT", a, 0) }))
    : [
        [0, 0],
        [0, 1],
        [1, 0],
        [1, 1],
      ].map(([a, b]) => ({ a, b, out: calc(op, a, b) }));
}

function rowIndex(op: Op, a: number, b: number) {
  return op === "NOT" ? a : a * 2 + b;
}

type State = { op: Op; a: number; b: number };

function Switch({ value, onToggle, label }: { value: number; onToggle: () => void; label: string }) {
  return (
    <button
      onClick={onToggle}
      aria-label={`入力${label}（今は${value}）`}
      className={`flex w-[52px] flex-col items-center rounded-xl py-1.5 ring-2 transition active:scale-95 ${
        value === 1 ? "bg-amber-400 text-amber-950 ring-amber-400" : "bg-white text-gray-500 ring-gray-300"
      }`}
    >
      <span className="text-[11px] font-bold">{label}</span>
      <span className="text-xl font-bold leading-none">{value}</span>
    </button>
  );
}

// 真理値表。ハイライトは行から行へ滑って移る。行をタップすると、その入力になる。
function Table({ state, onPick, compact }: { state: State; onPick?: (a: number, b: number) => void; compact?: boolean }) {
  const { op, a, b } = state;
  const rows = tableRows(op);
  const cur = rowIndex(op, a, b);
  const rowH = compact ? 30 : 36;
  const cols = op === "NOT" ? "grid-cols-2" : "grid-cols-3";
  return (
    <div className="overflow-hidden rounded-xl text-center text-sm ring-1 ring-gray-200" data-testid={compact ? "logic-table-live" : "logic-table"}>
      <div className={`grid ${cols} bg-gray-100 py-1.5 text-xs font-bold text-gray-600`}>
        <span>A</span>
        {op !== "NOT" && <span>B</span>}
        <span className="text-brand-700">{op} の出力</span>
      </div>
      <div className="relative" style={{ height: rows.length * rowH }}>
        <div
          className={`${styles.highlight} absolute inset-x-0 top-0 bg-amber-100 ring-2 ring-inset ring-amber-400`}
          style={{ height: rowH, transform: `translateY(${cur * rowH}px)` }}
          aria-hidden
        />
        {rows.map((r, i) => {
          const content = (
            <>
              <span className="font-mono">{r.a}</span>
              {op !== "NOT" && <span className="font-mono">{r.b}</span>}
              <span className={`font-mono font-bold ${r.out === 1 ? "text-amber-600" : "text-gray-400"}`}>{r.out}</span>
            </>
          );
          const cls = `relative grid ${cols} w-full items-center border-t border-gray-100`;
          return onPick ? (
            <button
              key={i}
              type="button"
              onClick={() => onPick(r.a, r.b)}
              className={cls}
              style={{ height: rowH }}
              aria-current={i === cur ? "true" : undefined}
              aria-label={`A=${r.a}${op !== "NOT" ? ` B=${r.b}` : ""} の行`}
            >
              {content}
            </button>
          ) : (
            <div key={i} className={cls} style={{ height: rowH }} aria-current={i === cur ? "true" : undefined}>
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OpPicker({ op, setOp, cols }: { op: Op; setOp: (op: Op) => void; cols: string }) {
  return (
    <div className={`grid ${cols} gap-1.5`}>
      {OPS.map((o) => (
        <button
          key={o.op}
          onClick={() => setOp(o.op)}
          aria-pressed={op === o.op}
          className={`rounded-lg px-1 py-1.5 text-xs font-bold transition active:scale-95 ${
            op === o.op ? "bg-brand-600 text-white" : "text-gray-600 ring-1 ring-gray-300"
          }`}
        >
          {o.op}
        </button>
      ))}
    </div>
  );
}

function Playground({ state, set }: { state: State; set: (s: Partial<State>) => void }) {
  const reducedMotion = useReducedMotion();
  const { op, a, b } = state;
  const out = calc(op, a, b);
  const usesB = op !== "NOT";

  return (
    <Panel>
      <SectionTitle step={1}>スイッチを入れて結果を見る</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        入力<b className="text-gray-800">A・B</b>をタップで0↔1。<b className="text-amber-700">1の信号</b>が線を通ってゲートへ届き、出力ランプが光るか決まります。
      </p>

      <div className="mt-4">
        <OpPicker op={op} setOp={(o) => set({ op: o })} cols="grid-cols-4" />
      </div>
      <p className="mt-2 text-center text-xs text-gray-500">{OPS.find((o) => o.op === op)!.label}：{OPS.find((o) => o.op === op)!.desc}</p>

      {/* 回路 */}
      <div className="relative mt-2 w-full rounded-xl bg-gray-50 ring-1 ring-gray-200" style={{ aspectRatio: `${W} / ${H}` }}>
        <GateCircuit op={op} a={a} b={b} out={out} runKey={`${op}${a}${b}`} reducedMotion={reducedMotion} />
        <div className="absolute -translate-y-1/2" style={{ left: "3%", top: `${(SWITCH_Y.a / H) * 100}%` }}>
          <Switch value={a} onToggle={() => set({ a: a ? 0 : 1 })} label="A" />
        </div>
        <div className="absolute -translate-y-1/2" style={{ left: "3%", top: `${(SWITCH_Y.b / H) * 100}%` }}>
          {usesB ? (
            <Switch value={b} onToggle={() => set({ b: b ? 0 : 1 })} label="B" />
          ) : (
            <div className="w-[52px] text-center text-[10px] leading-tight text-gray-400">
              Bは
              <br />
              使わない
            </div>
          )}
        </div>
      </div>

      <div
        className={`mt-2 rounded-lg px-3 py-1.5 text-center text-sm font-bold ${out ? "bg-amber-50 text-amber-800" : "bg-gray-100 text-gray-600"}`}
        data-testid="logic-rule"
        aria-live="polite"
      >
        {ruleText(op, a, b)}
      </div>

      <p className="mt-3 text-xs font-bold text-gray-500">↓ 今の回路は、真理値表のこの行（行をタップしても切り替わる）</p>
      <div className="mt-1.5">
        <Table state={state} compact onPick={(na, nb) => set({ a: na, b: nb })} />
      </div>

      <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        💡 <b>AND</b>＝両方1で点灯（宿題も掃除も終わったらOK）／<b>OR</b>＝どちらか1で点灯（電車かバスどちらか）／
        <b>XOR</b>＝片方だけ1で点灯、両方1だと消える。
      </div>
    </Panel>
  );
}

function TruthTable({ state, set }: { state: State; set: (s: Partial<State>) => void }) {
  return (
    <Panel>
      <SectionTitle step={2}>真理値表で全パターンを見る</SectionTitle>
      <div className="mt-3">
        <OpPicker op={state.op} setOp={(o) => set({ op: o })} cols="grid-cols-4" />
      </div>
      <div className="mt-3">
        <Table state={state} />
      </div>
      <p className="mt-2 text-center text-[11px] text-gray-400">
        出力が1の行（オレンジ）に注目すると、その演算の性格が分かります。枠は ① の回路と同じ入力の行です。
      </p>
    </Panel>
  );
}

export default function LogicOperationsExperience() {
  // ①の回路と②の真理値表は同じ入力・演算を共有する
  const [state, setState] = useState<State>({ op: "AND", a: 1, b: 0 });
  const set = (patch: Partial<State>) => setState((s) => ({ ...s, ...patch }));
  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        🔌 <b>論理演算</b>は 0（偽）と 1（真）を組み合わせる計算。
        <b>AND＝両方1で1</b>、<b>OR＝どちらか1で1</b>、<b>NOT＝反転</b>、<b>XOR＝違うとき1</b>。
      </div>

      <Playground state={state} set={set} />
      <TruthTable state={state} set={set} />
    </div>
  );
}
