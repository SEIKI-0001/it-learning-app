"use client";

import { useState } from "react";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「論理演算と真理値表」専用の体験。
//   ① A・Bのスイッチ(0/1)と演算(AND/OR/NOT/XOR)を選ぶと、出力ランプが光る
//   ② 選んだ演算の真理値表が表示され、今の入力の行がハイライト
// ============================================================================

type Op = "AND" | "OR" | "NOT" | "XOR";

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

function Lamp({ on }: { on: boolean }) {
  return (
    <div
      className={`grid h-16 w-16 place-items-center rounded-full text-2xl font-extrabold ring-4 transition ${
        on ? "bg-amber-300 text-amber-900 ring-amber-200" : "bg-gray-200 text-gray-400 ring-gray-100"
      }`}
    >
      {on ? "💡" : "○"}
    </div>
  );
}

function Switch({ value, onToggle, label }: { value: number; onToggle: () => void; label: string }) {
  return (
    <button
      onClick={onToggle}
      className={`flex flex-col items-center rounded-xl px-4 py-2.5 ring-2 transition active:scale-95 ${
        value === 1 ? "bg-indigo-600 text-white ring-indigo-600" : "bg-white text-gray-500 ring-gray-300"
      }`}
    >
      <span className="text-[11px] font-bold">{label}</span>
      <span className="text-2xl font-extrabold leading-none">{value}</span>
    </button>
  );
}

function Playground() {
  const [a, setA] = useState(1);
  const [b, setB] = useState(0);
  const [op, setOp] = useState<Op>("AND");
  const out = calc(op, a, b);
  const usesB = op !== "NOT";

  return (
    <Panel>
      <SectionTitle step={1}>スイッチを入れて結果を見る</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        入力<b className="text-gray-800">A・B</b>をタップで0↔1。演算を選ぶと、出力ランプが光るか消えます。
      </p>

      {/* 演算選択 */}
      <div className="mt-4 grid grid-cols-2 gap-1.5">
        {OPS.map((o) => (
          <button
            key={o.op}
            onClick={() => setOp(o.op)}
            className={`rounded-lg px-2 py-1.5 text-xs font-bold transition active:scale-95 ${
              op === o.op ? "bg-indigo-600 text-white" : "text-gray-600 ring-1 ring-gray-300"
            }`}
          >
            {o.op}
          </button>
        ))}
      </div>
      <p className="mt-2 text-center text-xs text-gray-500">{OPS.find((o) => o.op === op)!.desc}</p>

      {/* 回路 */}
      <div className="mt-3 flex items-center justify-between rounded-xl bg-gray-50 px-4 py-4 ring-1 ring-gray-200">
        <div className="flex gap-2">
          <Switch value={a} onToggle={() => setA(a === 1 ? 0 : 1)} label="A" />
          {usesB ? (
            <Switch value={b} onToggle={() => setB(b === 1 ? 0 : 1)} label="B" />
          ) : (
            <div className="grid place-items-center px-4 text-[10px] text-gray-300">Bは<br />使わない</div>
          )}
        </div>
        <span className="text-xl text-gray-300">→</span>
        <div className="flex flex-col items-center">
          <Lamp on={out === 1} />
          <span className="mt-1 text-xs font-extrabold text-gray-700">出力 = {out}</span>
        </div>
      </div>

      <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        💡 <b>AND</b>＝両方1で点灯（宿題も掃除も終わったらOK）／<b>OR</b>＝どちらか1で点灯（電車かバスどちらか）。
      </div>
    </Panel>
  );
}

function TruthTable() {
  const [op, setOp] = useState<Op>("AND");
  const rows =
    op === "NOT"
      ? [
          [0, calc("NOT", 0, 0)],
          [1, calc("NOT", 1, 0)],
        ]
      : [
          [0, 0],
          [0, 1],
          [1, 0],
          [1, 1],
        ].map(([a, b]) => [a, b, calc(op, a, b)]);

  return (
    <Panel>
      <SectionTitle step={2}>真理値表で全パターンを見る</SectionTitle>
      <div className="mt-3 grid grid-cols-4 gap-1.5">
        {OPS.map((o) => (
          <button
            key={o.op}
            onClick={() => setOp(o.op)}
            className={`rounded-lg px-1 py-1.5 text-xs font-bold transition active:scale-95 ${
              op === o.op ? "bg-indigo-600 text-white" : "text-gray-600 ring-1 ring-gray-300"
            }`}
          >
            {o.op}
          </button>
        ))}
      </div>

      <table className="mt-3 w-full overflow-hidden rounded-xl text-center text-sm ring-1 ring-gray-200">
        <thead>
          <tr className="bg-gray-100 text-xs font-extrabold text-gray-600">
            <th className="py-2">A</th>
            {op !== "NOT" && <th className="py-2">B</th>}
            <th className="py-2 text-indigo-700">{op} の出力</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-gray-100">
              <td className="py-2 font-mono">{r[0]}</td>
              {op !== "NOT" && <td className="py-2 font-mono">{r[1]}</td>}
              <td className={`py-2 font-mono font-extrabold ${r[r.length - 1] === 1 ? "text-amber-600" : "text-gray-400"}`}>
                {r[r.length - 1]}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-center text-[11px] text-gray-400">
        出力が1の行（オレンジ）に注目すると、その演算の性格が分かります。
      </p>
    </Panel>
  );
}

export default function LogicOperationsExperience() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        🔌 <b>論理演算</b>は 0（偽）と 1（真）を組み合わせる計算。
        <b>AND＝両方1で1</b>、<b>OR＝どちらか1で1</b>、<b>NOT＝反転</b>、<b>XOR＝違うとき1</b>。
      </div>

      <Playground />
      <TruthTable />
    </div>
  );
}
