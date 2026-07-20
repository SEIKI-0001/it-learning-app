"use client";

import { useState } from "react";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「データ構造（スタック・キュー）」専用の体験。
//   ① スタック：push/popで「後入れ先出し(LIFO)」を体感（上から出る）
//   ② キュー：enqueue/dequeueで「先入れ先出し(FIFO)」を体感（先頭から出る）
// ============================================================================

let seq = 1;

function StackDemo() {
  const [items, setItems] = useState<number[]>([1, 2]);
  const [last, setLast] = useState<string>("");
  const push = () => {
    const v = ++seq;
    setItems((p) => [...p, v]);
    setLast(`push ${v}（上に積む）`);
  };
  const pop = () => {
    if (items.length === 0) return;
    const v = items[items.length - 1];
    setItems((p) => p.slice(0, -1));
    setLast(`pop ${v}（一番上から取る）`);
  };
  return (
    <Panel>
      <SectionTitle step={1}>スタック ＝ 後入れ先出し（LIFO）</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        机に積んだ本のように、<b className="text-gray-800">上（最後に入れた所）</b>から出ます。pushで積み、popで取り出そう。
      </p>

      {/* 縦に積む。上が末尾 */}
      <div className="mt-4 flex flex-col items-center">
        <span className="text-[11px] font-bold text-gray-400">⬆ ここから出入りする（上＝最後）</span>
        <div className="mt-1 flex w-32 flex-col-reverse gap-1 rounded-xl bg-gray-50 p-2 ring-1 ring-gray-200" style={{ minHeight: "8rem" }}>
          {items.length === 0 && <span className="py-6 text-center text-xs text-gray-300">空</span>}
          {items.map((v, i) => (
            <div
              key={`${v}-${i}`}
              className={`grid place-items-center rounded-lg py-2 text-sm font-bold ${
                i === items.length - 1 ? "bg-brand-600 text-white" : "bg-white text-gray-600 ring-1 ring-gray-300"
              }`}
            >
              {v}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <button onClick={push} className="flex-1 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-bold text-white active:scale-95">
          push（積む）
        </button>
        <button onClick={pop} className="flex-1 rounded-lg bg-rose-500 px-3 py-2 text-sm font-bold text-white active:scale-95">
          pop（取り出す）
        </button>
      </div>
      <p className="mt-2 min-h-[1.2em] text-center text-xs font-bold text-gray-600">{last}</p>

      <div className="mt-2 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        💡 最後に積んだものが最初に出る＝<b>LIFO（Last In First Out）</b>。
      </div>
    </Panel>
  );
}

function QueueDemo() {
  const [items, setItems] = useState<number[]>([1, 2]);
  const [last, setLast] = useState<string>("");
  const enq = () => {
    const v = ++seq;
    setItems((p) => [...p, v]);
    setLast(`enqueue ${v}（末尾に並ぶ）`);
  };
  const deq = () => {
    if (items.length === 0) return;
    const v = items[0];
    setItems((p) => p.slice(1));
    setLast(`dequeue ${v}（先頭から出る）`);
  };
  return (
    <Panel>
      <SectionTitle step={2}>キュー ＝ 先入れ先出し（FIFO）</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        レジの行列のように、<b className="text-gray-800">先頭（最初に並んだ人）</b>から出ます。末尾に並べ、先頭から取り出そう。
      </p>

      {/* 横に並ぶ */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-[11px] font-bold text-gray-400">
          <span>← 先頭から出る</span>
          <span>末尾に並ぶ →</span>
        </div>
        <div className="mt-1 flex min-h-[3.5rem] items-center gap-1 overflow-x-auto rounded-xl bg-gray-50 p-2 ring-1 ring-gray-200">
          {items.length === 0 && <span className="px-4 text-xs text-gray-300">空</span>}
          {items.map((v, i) => (
            <div
              key={`${v}-${i}`}
              className={`grid h-10 w-10 flex-none place-items-center rounded-lg text-sm font-bold ${
                i === 0 ? "bg-brand-600 text-white" : "bg-white text-gray-600 ring-1 ring-gray-300"
              }`}
            >
              {v}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <button onClick={enq} className="flex-1 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-bold text-white active:scale-95">
          enqueue（並ぶ）
        </button>
        <button onClick={deq} className="flex-1 rounded-lg bg-rose-500 px-3 py-2 text-sm font-bold text-white active:scale-95">
          dequeue（取り出す）
        </button>
      </div>
      <p className="mt-2 min-h-[1.2em] text-center text-xs font-bold text-gray-600">{last}</p>

      <div className="mt-2 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        💡 最初に並んだものが最初に出る＝<b>FIFO（First In First Out）</b>。
      </div>
    </Panel>
  );
}

function Others() {
  const list = [
    { emoji: "🔢", t: "配列", d: "番号（添字）で位置を指定して並べる" },
    { emoji: "🔗", t: "リスト", d: "各データが次のデータの場所を指してつながる" },
    { emoji: "🌳", t: "木構造", d: "枝分かれして階層を表す（フォルダなど）" },
  ];
  return (
    <Panel>
      <SectionTitle step={3}>ほかのデータ構造</SectionTitle>
      <div className="mt-3 space-y-2">
        {list.map((l) => (
          <div key={l.t} className="flex items-center gap-3 rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
            <span className="grid h-9 w-9 flex-none place-items-center rounded-lg bg-white text-lg ring-1 ring-gray-200">{l.emoji}</span>
            <div>
              <div className="text-sm font-bold text-gray-800">{l.t}</div>
              <div className="text-xs text-gray-500">{l.d}</div>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

export default function DataStructureExperience() {
  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        🗂️ <b>データ構造</b>はデータの並べ方・取り出し方。代表が<b>スタック（後入れ先出し・LIFO）</b>と
        <b>キュー（先入れ先出し・FIFO）</b>。出入りの順番が逆なのがポイント。
      </div>

      <StackDemo />
      <QueueDemo />
      <Others />
    </div>
  );
}
