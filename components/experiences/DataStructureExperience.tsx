"use client";

import { useState } from "react";
import { QueueStage, StackStage } from "./datastructure/StackQueueStage";
import { useReducedMotion } from "./scene/useReducedMotion";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「データ構造（スタック・キュー）」専用の体験。
//   ① スタック：push＝箱が上から落ちて積まれる／pop＝一番上だけが持ち上がって出る → LIFO
//   ② キュー：enqueue＝後ろから列に入る／dequeue＝先頭が抜けて残りが詰める → FIFO
//   用語（LIFO/FIFO）は、実際に取り出してから出す（操作 → 気づき → 名前の順）
// ============================================================================

function StackDemo() {
  const reducedMotion = useReducedMotion();
  const [lastOut, setLastOut] = useState<string | null>(null);
  return (
    <Panel>
      <SectionTitle step={1}>スタック ＝ 後入れ先出し（LIFO）</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        机に積んだ本のように、<b className="text-gray-800">上（最後に入れた所）</b>から出ます。pushで積み、popで取り出そう。
      </p>
      <div className="mt-4">
        <StackStage reducedMotion={reducedMotion} onOut={(t) => setLastOut(t.label)} />
      </div>
      {lastOut ? (
        <div className="mt-2 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200" data-testid="stack-insight">
          💡 いま出たのは<b>最後に積んだ {lastOut}</b>。最後に積んだものが最初に出る＝<b>LIFO（Last In First Out）</b>。
        </div>
      ) : (
        <p className="mt-2 text-center text-xs text-gray-500">まず push と pop を押して、どの箱が出てくるか見てみよう。</p>
      )}
    </Panel>
  );
}

function QueueDemo() {
  const reducedMotion = useReducedMotion();
  const [lastOut, setLastOut] = useState<string | null>(null);
  return (
    <Panel>
      <SectionTitle step={2}>キュー ＝ 先入れ先出し（FIFO）</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        レジの行列のように、<b className="text-gray-800">先頭（最初に並んだ人）</b>から出ます。末尾に並べ、先頭から取り出そう。
      </p>
      <div className="mt-4">
        <QueueStage reducedMotion={reducedMotion} onOut={(t) => setLastOut(t.label)} />
      </div>
      {lastOut ? (
        <div className="mt-2 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200" data-testid="queue-insight">
          💡 いま出たのは<b>先頭で待っていた {lastOut}</b>。最初に並んだものが最初に出る＝<b>FIFO（First In First Out）</b>。
        </div>
      ) : (
        <p className="mt-2 text-center text-xs text-gray-500">enqueue と dequeue を押して、だれが列から出るか見てみよう。</p>
      )}
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
