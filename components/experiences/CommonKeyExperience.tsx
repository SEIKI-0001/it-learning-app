"use client";

import { useState } from "react";
import { Panel, SectionTitle, StepNav } from "./ui";

// ============================================================================
// 「共通鍵暗号方式」専用の体験。
//   ① 1本の鍵で暗号化も復号も（合鍵のたとえ）
//   ② 送信の流れ … ①同じ鍵を共有（弱点＝鍵配送）→ ②暗号化して送る（1歩ずつ）
//   ③ 公開鍵との使い分け
// 公開鍵方式の体験と同じ図の見せ方にして、違いを対比できるようにする。
// ============================================================================

type WireDir = "toA" | "toB";
type Step = {
  phase: 1 | 2;
  active: "A" | "B" | null;
  wire: { item: string; dir: WireDir } | null;
  warn?: boolean;
  html: string;
};

const STEPS: Step[] = [
  {
    phase: 1,
    active: null,
    wire: { item: "🔑 共通鍵", dir: "toB" },
    warn: true,
    html: "【準備】AさんとBさんで <b>同じ共通鍵🔑</b> を使うため、Aが鍵をBへ渡します。⚠️ここが弱点：<b>渡す途中で😈に盗まれると暗号が破られます（鍵配送問題）</b>。",
  },
  {
    phase: 2,
    active: "A",
    wire: null,
    html: "【通信①】Aさんが <b>共通鍵🔑で暗号化🔒</b>。平文「会議は10時」→ 暗号文に。",
  },
  {
    phase: 2,
    active: null,
    wire: { item: "🔒 暗号文", dir: "toB" },
    html: "【通信②】暗号文を Aさん→Bさん へ送信。",
  },
  {
    phase: 2,
    active: "B",
    wire: null,
    html: "【通信③】Bさんが <b>同じ共通鍵🔑で復号</b>。「会議は10時」が読めた！",
  },
  {
    phase: 2,
    active: "B",
    wire: null,
    html: "💡 ポイント：1本の鍵だから <b>処理が速い</b>。ただし <b>その鍵を安全に渡すのが課題</b>（鍵配送問題）。",
  },
];

function Flow() {
  const [idx, setIdx] = useState(0);
  const step = STEPS[idx];

  const actor = (id: "A" | "B", emo: string, name: string, sub: string) => {
    const on = step.active === id;
    return (
      <div className={`w-[90px] flex-none rounded-xl border-2 px-1 py-2.5 text-center transition ${
        on ? "border-indigo-500 bg-indigo-50 shadow-md shadow-indigo-100" : "border-gray-200 bg-gray-50"
      }`}>
        <div className="text-2xl leading-none">{emo}</div>
        <div className="mt-1 text-xs font-extrabold text-gray-800">{name}</div>
        <div className="text-[10px] leading-tight text-gray-500">{sub}</div>
      </div>
    );
  };

  const lineColor = step.warn ? "bg-amber-500" : step.wire ? "bg-indigo-500" : "bg-gray-300";
  const arrowColor = step.warn ? "text-amber-600" : step.wire ? "text-indigo-600" : "text-gray-400";
  const badgeColor = step.warn ? "bg-amber-500" : "bg-indigo-600";

  return (
    <Panel>
      <SectionTitle step={2}>送信の流れ（2段階：鍵を共有 → 暗号通信）</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        AさんからBさんへ秘密のメッセージを送ります。<b className="text-gray-800">同じ鍵を共有してから</b>通信する流れを「次へ」で1歩ずつ。
      </p>

      {/* フェーズ表示（2段階） */}
      <div className="mt-3 flex gap-2 text-center text-[11px] font-bold">
        <div className={`flex-1 rounded-lg px-2 py-1.5 ring-1 ${step.phase === 1 ? "bg-indigo-600 text-white ring-indigo-600" : "bg-gray-50 text-gray-400 ring-gray-200"}`}>
          ① 同じ鍵を共有
        </div>
        <div className={`flex-1 rounded-lg px-2 py-1.5 ring-1 ${step.phase === 2 ? "bg-indigo-600 text-white ring-indigo-600" : "bg-gray-50 text-gray-400 ring-gray-200"}`}>
          ② 暗号化して送る
        </div>
      </div>

      {/* 通信路でつないだ図 */}
      <div className="mt-4 flex items-center">
        {actor("A", "🅰️", "Aさん", "共通鍵🔑を持つ")}
        <div className="flex-1 px-1 text-center">
          <div className={`h-4 text-[11px] font-bold ${step.warn ? "text-amber-700" : "text-indigo-700"}`}>
            {step.wire ? step.wire.item : ""}
          </div>
          <div className={`h-0.5 w-full rounded ${lineColor}`} />
          <div className={`mt-1 text-sm tracking-widest ${arrowColor}`}>
            {step.wire ? (step.wire.dir === "toA" ? "◀ ◀ ◀" : "▶ ▶ ▶") : "😈"}
          </div>
        </div>
        {actor("B", "🅱️", "Bさん", "共通鍵🔑を持つ")}
      </div>
      {/* warn 用のバッジ色を使う（lint回避兼ねた明示） */}
      {step.warn && (
        <div className="mt-2 text-center">
          <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-bold text-white ${badgeColor}`}>
            ⚠️ 鍵配送問題
          </span>
        </div>
      )}

      <p
        className="mt-3 min-h-[3.5em] rounded-xl bg-sky-50 px-4 py-3 text-sm leading-relaxed text-gray-700 ring-1 ring-sky-200 [&_b]:text-gray-900"
        dangerouslySetInnerHTML={{ __html: step.html }}
      />

      <StepNav
        index={idx}
        total={STEPS.length}
        onPrev={() => setIdx((i) => Math.max(0, i - 1))}
        onNext={() => setIdx((i) => Math.min(STEPS.length - 1, i + 1))}
        onReset={() => setIdx(0)}
        doneLabel="しくみ完成 💡"
      />
    </Panel>
  );
}

export default function CommonKeyExperience() {
  const rows = [
    { k: "鍵の数", c: "1本（同じ鍵を共有）", p: "2本ペア（公開鍵＋秘密鍵）" },
    { k: "暗号化／復号", c: "同じ鍵で両方", p: "公開鍵で暗号化→秘密鍵で復号" },
    { k: "速さ", c: "速い 🚀", p: "遅め" },
    { k: "鍵を配る悩み", c: "あり（鍵配送問題）", p: "小さい（公開鍵は配ってよい）" },
    { k: "向いている用途", c: "大量データの暗号化", p: "鍵の受け渡し・少量データ" },
  ];
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        🔑 たとえると<b>「合鍵」</b>。AさんもBさんも<b>同じ1本の鍵</b>を持ち、
        その鍵で<b>閉める（暗号化）も開ける（復号）も</b>できます。便利で速い反面、
        <b>合鍵を相手にどう安全に渡すか</b>が悩みどころです。
      </div>

      <Panel>
        <SectionTitle step={1}>1本の鍵で暗号化も復号も</SectionTitle>
        <div className="mt-3 flex items-center justify-center gap-2 text-center">
          <div className="rounded-xl bg-gray-50 px-3 py-2.5 ring-1 ring-gray-200">
            <div className="text-sm font-bold text-gray-700">平文</div>
            <div className="text-[11px] text-gray-500">会議は10時</div>
          </div>
          <div className="text-center">
            <div className="text-lg">🔑→🔒</div>
            <div className="text-[10px] text-gray-400">共通鍵で暗号化</div>
          </div>
          <div className="rounded-xl bg-indigo-50 px-3 py-2.5 ring-1 ring-indigo-200">
            <div className="text-sm font-bold text-indigo-700">暗号文</div>
            <div className="text-[11px] text-gray-500">＃＄％‥</div>
          </div>
          <div className="text-center">
            <div className="text-lg">🔑→🔓</div>
            <div className="text-[10px] text-gray-400">同じ鍵で復号</div>
          </div>
          <div className="rounded-xl bg-emerald-50 px-3 py-2.5 ring-1 ring-emerald-200">
            <div className="text-sm font-bold text-emerald-700">平文</div>
            <div className="text-[11px] text-gray-500">会議は10時</div>
          </div>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-gray-600">
          暗号化に使った鍵と、復号に使う鍵が<b className="text-gray-800">まったく同じ（1本）</b>。これが共通鍵暗号方式です。
          鍵が1本でシンプルなので<b className="text-gray-800">処理が速い</b>のが長所。
        </p>
      </Panel>

      <Flow />

      <Panel>
        <SectionTitle step={3}>公開鍵方式との使い分け</SectionTitle>
        <div className="mt-3 overflow-hidden rounded-xl ring-1 ring-gray-300">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100 text-gray-700">
                <th className="px-3 py-2 text-left font-bold"> </th>
                <th className="px-3 py-2 text-center font-bold text-indigo-700">共通鍵</th>
                <th className="px-3 py-2 text-center font-bold text-gray-700">公開鍵</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.k} className={i % 2 ? "bg-gray-50" : "bg-white"}>
                  <td className="px-3 py-2 font-bold text-gray-700">{r.k}</td>
                  <td className="px-3 py-2 text-center text-gray-700">{r.c}</td>
                  <td className="px-3 py-2 text-center text-gray-700">{r.p}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-gray-500">
          💡 実際のしくみ（HTTPSなど）は<b>両方のいいとこ取り</b>：<b>共通鍵を公開鍵で安全に届けて</b>、
          そのあとは速い共通鍵でやり取りします（ハイブリッド方式）。
        </p>
      </Panel>
    </div>
  );
}
