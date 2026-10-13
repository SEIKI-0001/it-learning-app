"use client";

import { useState } from "react";
import styles from "./calc/calc.module.css";
import { Note } from "./calc/CalcParts";
import { Lead, PointsPanel, Seg } from "./diagram/DiagramParts";
import { Panel, SectionTitle } from "./ui";
import { InlineIcon } from "@/components/ui/Pictogram";

// 「データ構造（配列・リスト・木構造）」。
//   ① 配列：添字を押すと、その箱へ直接行ける（読み出しが得意）
//   ② 途中に入れる：配列は後ろをずらす／リストはポインタを2本付け替えるだけ（同じ操作で比べる）
//   ③ 木構造：フォルダの木で根・節・葉と2分木（静的）
//   ④ 試験ポイント

const ITEMS = ["A", "B", "C", "D", "E", "F"];

export default function DataStructureListTreeExperience() {
  return (
    <div className="space-y-5">
      <Lead>
        データの並べ方で、得意な操作が変わります。<b>配列</b>は「番号ですぐ読める」、<b>リスト</b>は「つなぎ替えで入れやすい」、<b>木構造</b>は「階層を表せる」のが持ち味です。
      </Lead>
      <ArrayPanel />
      <InsertPanel />
      <TreePanel />
      <PointsPanel
        step={4}
        points={[
          <>配列＝<b>添字（要素番号）</b>で直接読み書き。途中に入れると<b>後ろをずらす</b></>,
          <>リスト＝<b>ポインタ</b>で次をたどる。挿入・削除は<b>ポインタの付け替え</b>だけ。n番目は先頭からたどる</>,
          <>木構造＝<b>根</b>（一番上）・<b>節</b>（途中）・<b>葉</b>（末端）。子が最大2つなら<b>2分木</b></>,
        ]}
        traps={[
          ["リストも添字でn番目を直接読める", "リストは先頭からポインタを順にたどる。直接読めるのは配列"],
          ["配列の途中への挿入は1か所の書き換えで済む", "挿入位置より後ろの要素を1つずつずらす必要がある"],
        ]}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// ① 配列：添字で直接
// ---------------------------------------------------------------------------

function ArrayPanel() {
  const [pick, setPick] = useState<number | null>(null);
  return (
    <Panel>
      <SectionTitle step={1}>配列 ＝ 番号付きのロッカー</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        データが連続して並び、1つずつに<b className="text-gray-800">添字（要素番号）</b>が付いています。番号を押してみよう。
      </p>
      <div className="mt-4 grid grid-cols-6 gap-1" data-testid="dsl-array" data-pick={pick ?? ""}>
        {ITEMS.map((v, i) => (
          <button
            key={v}
            type="button"
            onClick={() => setPick(i)}
            aria-pressed={pick === i}
            className="flex flex-col items-center gap-1 active:scale-95"
          >
            <span className={`grid h-11 w-full place-items-center rounded-lg text-base font-bold ring-1 transition-colors ${pick === i ? "bg-brand-600 text-white ring-brand-600" : "bg-white text-gray-800 ring-gray-300"}`}>{v}</span>
            <span className={`text-[12px] font-bold ${pick === i ? "text-brand-700" : "text-gray-500"}`}>[{i + 1}]</span>
          </button>
        ))}
      </div>
      {pick !== null ? (
        <Note>
          添字 <b>{pick + 1}</b> を指定すると、<b>{ITEMS[pick]}</b> に<b>直接</b>たどり着きます。手前の箱を順に見ていく必要はありません。
        </Note>
      ) : (
        <p className="mt-3 text-center text-xs text-gray-500">下の番号（添字）を押すと、その箱がすぐ開きます。</p>
      )}
      <p className="mt-3 text-[12px] leading-relaxed text-gray-500">※ 添字を1から数えるか0から数えるかは決まりごとです。擬似言語の問題では問題文の指示に従います。</p>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ② 途中に入れる：配列とリストを同じ操作で比べる
// ---------------------------------------------------------------------------

type Kind = "array" | "list";

function InsertPanel() {
  const [kind, setKind] = useState<Kind>("array");
  const [done, setDone] = useState(false);
  const choose = (k: Kind) => {
    setKind(k);
    setDone(false);
  };
  return (
    <Panel>
      <SectionTitle step={2}>3番目に「新」を入れると？</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        同じ「途中に1つ入れる」でも、配列とリストでは手間がまったく違います。
      </p>
      <div className="mt-3">
        <Seg
          testId="dsl-kind"
          value={kind}
          onChange={choose}
          options={[
            { value: "array", label: "配列" },
            { value: "list", label: "リスト" },
          ]}
        />
      </div>

      <div className="mt-4 min-h-[8.5rem]" data-testid="dsl-insert" data-kind={kind} data-done={done ? "1" : "0"}>
        {kind === "array" ? <ArrayInsert done={done} /> : <ListInsert done={done} />}
      </div>

      <div className="mt-2 flex justify-center">
        <button
          type="button"
          onClick={() => setDone((v) => !v)}
          className={`rounded-lg px-4 py-2 text-sm font-bold active:scale-95 ${done ? "text-gray-600 ring-1 ring-gray-300" : "bg-brand-600 text-white"}`}
        >
          {done ? "↺ 入れる前に戻す" : "3番目に「新」を入れる"}
        </button>
      </div>

      {done && (
        <Note>
          {kind === "array" ? (
            <>
              <InlineIcon name="lightbulb" />配列は並びがつながっているので、C〜Fの<b>4個を1つずつ後ろへずらして</b>から入れます。データが1万個あれば、ずらす数も膨大です。
            </>
          ) : (
            <>
              <InlineIcon name="lightbulb" />リストは<b>ポインタを2本付け替えるだけ</b>（Bの次＝新、新の次＝C）。他の要素は動きません。ただし「5番目を読む」ときは、先頭から順にたどる必要があります。
            </>
          )}
        </Note>
      )}
    </Panel>
  );
}

function Cell({ v, tone }: { v: string; tone: "plain" | "new" | "moved" }) {
  const cls =
    tone === "new"
      ? "bg-brand-600 text-white ring-brand-600"
      : tone === "moved"
        ? "bg-amber-50 text-amber-900 ring-amber-300"
        : "bg-white text-gray-800 ring-gray-300";
  return <span className={`grid h-10 w-full place-items-center rounded-lg text-[15px] font-bold ring-1 ${cls}`}>{v}</span>;
}

function ArrayInsert({ done }: { done: boolean }) {
  const row = done ? ["A", "B", "新", "C", "D", "E", "F"] : [...ITEMS, ""];
  return (
    <div>
      <div className="grid grid-cols-7 gap-1">
        {row.map((v, i) => (
          <div key={`${done}-${i}`} className={`flex flex-col items-center gap-1 ${done && i >= 2 ? styles.reveal : ""}`} style={done ? { animationDelay: `${Math.max(0, 6 - i) * 90}ms` } : undefined}>
            {v ? <Cell v={v} tone={done && i === 2 ? "new" : done && i > 2 ? "moved" : "plain"} /> : <span className="h-10 w-full rounded-lg border border-dashed border-gray-300" />}
            <span className="text-[11px] font-bold text-gray-500">[{i + 1}]</span>
          </div>
        ))}
      </div>
      <div className="mt-2 text-center text-[13px] font-bold text-gray-700">
        {done ? (
          <>ずらした要素：<span className="text-amber-700">4個</span>（C・D・E・F）</>
        ) : (
          <>このままでは3番目に空きがない</>
        )}
      </div>
    </div>
  );
}

function ListInsert({ done }: { done: boolean }) {
  // 上段：A → B → C → D（以降省略）。done のときは B→C の矢印を薄くし、下段の「新」を経由させる
  return (
    <div>
      <svg viewBox="0 0 300 120" className="mx-auto w-full max-w-md" role="img" aria-label={done ? "Bの次を新に、新の次をCに付け替えたリスト" : "A、B、C、Dがポインタでつながったリスト"}>
        <defs>
          <marker id="dsl-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" className="fill-gray-500" />
          </marker>
          <marker id="dsl-arrow-brand" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" className="fill-brand-600" />
          </marker>
        </defs>
        {["A", "B", "C", "D"].map((v, i) => {
          const x = 8 + i * 74;
          return (
            <g key={v}>
              <rect x={x} y="8" width="34" height="30" rx="6" className="fill-white stroke-gray-300" />
              <text x={x + 17} y="28" textAnchor="middle" fontSize="15" className="fill-gray-800 font-bold">{v}</text>
              {/* ポインタ欄 */}
              <rect x={x + 34} y="8" width="14" height="30" rx="3" className="fill-gray-100 stroke-gray-300" />
              <circle cx={x + 41} cy="23" r="2.5" className="fill-gray-500" />
            </g>
          );
        })}
        {/* A→B, C→D */}
        <line x1="49" y1="23" x2="80" y2="23" className="stroke-gray-500" strokeWidth="1.6" markerEnd="url(#dsl-arrow)" />
        <line x1="197" y1="23" x2="228" y2="23" className="stroke-gray-500" strokeWidth="1.6" markerEnd="url(#dsl-arrow)" />
        <text x="286" y="28" textAnchor="middle" fontSize="12" className="fill-gray-400">…</text>
        {/* B→C（done のときは使われなくなる） */}
        <line x1="123" y1="23" x2="154" y2="23" className={done ? "stroke-gray-300" : "stroke-gray-500"} strokeWidth="1.6" strokeDasharray={done ? "3 3" : undefined} markerEnd={done ? undefined : "url(#dsl-arrow)"} />
        {done && (
          <g className={styles.reveal}>
            <rect x="105" y="78" width="34" height="30" rx="6" className="fill-brand-600" />
            <text x="122" y="98" textAnchor="middle" fontSize="14" className="fill-white font-bold">新</text>
            <rect x="139" y="78" width="14" height="30" rx="3" className="fill-brand-50 stroke-brand-300" />
            <circle cx="146" cy="93" r="2.5" className="fill-brand-600" />
            {/* B → 新 */}
            <path d="M123 38 Q 120 58 120 76" className="fill-none stroke-brand-600" strokeWidth="2" markerEnd="url(#dsl-arrow-brand)" />
            {/* 新 → C */}
            <path d="M150 80 Q 162 58 165 40" className="fill-none stroke-brand-600" strokeWidth="2" markerEnd="url(#dsl-arrow-brand)" />
            <text x="96" y="60" textAnchor="end" fontSize="11" className="fill-brand-700 font-bold">①Bの次＝新</text>
            <text x="174" y="66" fontSize="11" className="fill-brand-700 font-bold">②新の次＝C</text>
          </g>
        )}
      </svg>
      <div className="mt-1 text-center text-[13px] font-bold text-gray-700">
        {done ? (
          <>付け替えたポインタ：<span className="text-brand-700">2本</span>／動いた要素：0個</>
        ) : (
          <>各要素は「データ＋次の場所（ポインタ）」をもつ</>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ③ 木構造
// ---------------------------------------------------------------------------

type TreeNode = { id: string; label: string; x: number; y: number; role: "root" | "node" | "leaf"; parent?: string };

const TREE: TreeNode[] = [
  { id: "root", label: "ルート", x: 150, y: 22, role: "root" },
  { id: "doc", label: "書類", x: 78, y: 84, role: "node", parent: "root" },
  { id: "pic", label: "写真", x: 222, y: 84, role: "node", parent: "root" },
  { id: "a", label: "企画.txt", x: 38, y: 146, role: "leaf", parent: "doc" },
  { id: "b", label: "見積.xlsx", x: 118, y: 146, role: "leaf", parent: "doc" },
  { id: "c", label: "旅行.jpg", x: 222, y: 146, role: "leaf", parent: "pic" },
];

const ROLE_STYLE = {
  root: { box: "fill-brand-600 stroke-brand-600", text: "fill-white", name: "根（ルート）", chip: "bg-brand-600 text-white" },
  node: { box: "fill-brand-50 stroke-brand-300", text: "fill-brand-900", name: "節（ノード）", chip: "bg-brand-50 text-brand-900 ring-1 ring-brand-300" },
  leaf: { box: "fill-white stroke-gray-300", text: "fill-gray-800", name: "葉（リーフ）", chip: "bg-white text-gray-800 ring-1 ring-gray-300" },
} as const;

function TreePanel() {
  const at = (id: string) => TREE.find((n) => n.id === id)!;
  return (
    <Panel>
      <SectionTitle step={3}>木構造 ＝ 根から枝分かれ</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        パソコンのフォルダがそのまま木構造です。木を<b className="text-gray-800">逆さま</b>にした形で、根が一番上にきます。
      </p>
      <svg viewBox="0 0 300 172" className="mx-auto mt-3 w-full max-w-md" role="img" aria-label="ルートの下に書類と写真のフォルダ、その下にファイルがある木構造" data-testid="dsl-tree">
        {TREE.filter((n) => n.parent).map((n) => {
          const p = at(n.parent!);
          return <line key={n.id} x1={p.x} y1={p.y + 13} x2={n.x} y2={n.y - 13} className="stroke-gray-400" strokeWidth="1.5" />;
        })}
        {TREE.map((n) => {
          const s = ROLE_STYLE[n.role];
          const w = n.role === "leaf" ? 70 : 60;
          return (
            <g key={n.id}>
              <rect x={n.x - w / 2} y={n.y - 13} width={w} height="26" rx="6" className={s.box} />
              <text x={n.x} y={n.y + 4.5} textAnchor="middle" fontSize="12" className={`${s.text} font-bold`}>{n.label}</text>
            </g>
          );
        })}
        <text x="262" y="26" fontSize="11" className="fill-gray-500">親</text>
        <text x="262" y="88" fontSize="11" className="fill-gray-500">子</text>
        <line x1="266" y1="32" x2="266" y2="74" className="stroke-gray-300" strokeWidth="1.2" />
      </svg>
      <div className="mt-2 flex flex-wrap justify-center gap-1.5">
        {(["root", "node", "leaf"] as const).map((r) => (
          <span key={r} className={`rounded-full px-2.5 py-0.5 text-[12px] font-bold ${ROLE_STYLE[r].chip}`}>
            {ROLE_STYLE[r].name}
          </span>
        ))}
      </div>
      <ul className="mt-3 space-y-1 text-[13px] leading-relaxed text-gray-700">
        <li><b>根</b>：親をもたない一番上（ルートディレクトリ）</li>
        <li><b>節</b>：親と子の両方をもつ途中の要素（フォルダ）</li>
        <li><b>葉</b>：子をもたない末端の要素（ファイル）</li>
      </ul>
      <Note tone="sky">
        どの節も子が<b>最大2つ</b>までの木を<b>2分木</b>と呼びます。この図も、どの節の子も2つ以下なので2分木です。
      </Note>
    </Panel>
  );
}
