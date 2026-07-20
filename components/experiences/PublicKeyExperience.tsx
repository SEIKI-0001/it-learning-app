"use client";

import { useState } from "react";
import { Panel, SectionTitle, StepNav } from "./ui";

// ============================================================================
// 「公開鍵暗号方式」専用の体験。
//   ① 2つの鍵（公開鍵＝配ってよい／秘密鍵＝本人だけ）
//   ② 送信の流れ … B宛にAが公開鍵で暗号化 → Bが秘密鍵で復号（1歩ずつ）
//   ③ 共通鍵とのちがい
// 郵便受けのたとえ：誰でも投函できる（公開鍵）が、開けられるのは持ち主だけ（秘密鍵）。
// ============================================================================

type WireDir = "toA" | "toB";
type Step = {
  phase: 1 | 2;
  active: "A" | "B" | null;
  wire: { item: string; dir: WireDir } | null;
  html: string;
};

const STEPS: Step[] = [
  {
    phase: 1,
    active: "B",
    wire: null,
    html: "【準備①】Bさんが鍵を <b>2本ペア</b> で作成。<b>公開鍵🔓</b>と<b>秘密鍵🔑</b>。秘密鍵は自分だけが保管します。",
  },
  {
    phase: 1,
    active: null,
    wire: { item: "🔓 公開鍵", dir: "toA" },
    html: "【準備②】Bさんが <b>公開鍵🔓を先にAさんへ渡します</b>（公開鍵は誰に渡してもOK）。これで“事前準備”が完了。",
  },
  {
    phase: 2,
    active: "A",
    wire: null,
    html: "【通信①】Aさんは、受け取った <b>公開鍵で暗号化🔒</b>。平文「会議は10時」→ 暗号文に。",
  },
  {
    phase: 2,
    active: null,
    wire: { item: "🔒 暗号文", dir: "toB" },
    html: "【通信②】暗号文を Aさん→Bさん へ送信。途中で😈に盗まれても、<b>公開鍵では開けられない</b>ので安全。",
  },
  {
    phase: 2,
    active: "B",
    wire: null,
    html: "【通信③】Bさんが <b>対の秘密鍵🔑で復号</b>。「会議は10時」が読めた！",
  },
  {
    phase: 2,
    active: "B",
    wire: null,
    html: "💡 2段階がポイント：<b>①先に公開鍵を配る → ②その鍵で暗号通信</b>。秘密鍵は一度も渡さないので安全です。",
  },
];

function Flow() {
  const [idx, setIdx] = useState(0);
  const step = STEPS[idx];

  const actor = (id: "A" | "B", emo: string, name: string, sub: string) => {
    const on = step.active === id;
    return (
      <div className={`w-[90px] flex-none rounded-xl border-2 px-1 py-2.5 text-center transition ${
        on ? "border-brand-500 bg-brand-50 shadow-md shadow-brand-100" : "border-gray-200 bg-gray-50"
      }`}>
        <div className="text-2xl leading-none">{emo}</div>
        <div className="mt-1 text-xs font-bold text-gray-800">{name}</div>
        <div className="text-[10px] leading-tight text-gray-500">{sub}</div>
      </div>
    );
  };

  return (
    <Panel>
      <SectionTitle step={2}>送信の流れ（2段階：鍵を配る → 暗号通信）</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        AさんからBさんへ秘密のメッセージを送ります。<b className="text-gray-800">先に公開鍵を渡してから</b>通信する流れを「次へ」で1歩ずつ。
      </p>

      {/* フェーズ表示（2段階） */}
      <div className="mt-3 flex gap-2 text-center text-[11px] font-bold">
        <div className={`flex-1 rounded-lg px-2 py-1.5 ring-1 ${step.phase === 1 ? "bg-brand-600 text-white ring-brand-600" : "bg-gray-50 text-gray-400 ring-gray-200"}`}>
          ① 事前準備：公開鍵を渡す
        </div>
        <div className={`flex-1 rounded-lg px-2 py-1.5 ring-1 ${step.phase === 2 ? "bg-brand-600 text-white ring-brand-600" : "bg-gray-50 text-gray-400 ring-gray-200"}`}>
          ② 本番：暗号化して送る
        </div>
      </div>

      {/* 通信路でつないだ図 */}
      <div className="mt-4 flex items-center">
        {actor("A", "🅰️", "Aさん", "送る人")}
        <div className="flex-1 px-1 text-center">
          <div className="h-4 text-[11px] font-bold text-brand-700">{step.wire ? step.wire.item : ""}</div>
          <div className={`h-0.5 w-full rounded ${step.wire ? "bg-brand-500" : "bg-gray-300"}`} />
          <div className={`mt-1 text-sm tracking-widest ${step.wire ? "text-brand-600" : "text-gray-400"}`}>
            {step.wire ? (step.wire.dir === "toA" ? "◀ ◀ ◀" : "▶ ▶ ▶") : "😈"}
          </div>
        </div>
        {actor("B", "🅱️", "Bさん", "秘密鍵🔑を持つ")}
      </div>

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

export default function PublicKeyExperience() {
  const rows = [
    { k: "鍵の数", c: "1本（同じ鍵を共有）", p: "2本ペア（公開鍵＋秘密鍵）" },
    { k: "暗号化／復号", c: "同じ鍵で両方", p: "公開鍵で暗号化→秘密鍵で復号" },
    { k: "鍵を配る悩み", c: "あり（同じ鍵を安全に渡す必要）", p: "小さい（公開鍵は配ってよい）" },
    { k: "速さ", c: "速い", p: "遅め" },
  ];
  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        📮 たとえると<b>郵便受け</b>。<b>公開鍵＝投入口</b>（誰でも手紙を入れられる＝暗号化できる）、
        <b>秘密鍵＝持ち主だけの開錠鍵</b>（中身を取り出せる＝復号できる）。鍵は<b>2本でペア</b>です。
      </div>

      <Panel>
        <SectionTitle step={1}>2つの鍵（ペアで使う）</SectionTitle>
        <ul className="mt-3 space-y-2.5">
          <li className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
            <div className="flex items-center gap-2">
              <span className="text-xl">🔓</span>
              <span className="text-sm font-bold text-gray-800">公開鍵</span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">配ってOK</span>
            </div>
            <p className="mt-1 text-sm text-gray-600">みんなに渡してよい鍵。<b>暗号化（閉める）専用</b>。これだけでは中身を開けられない。</p>
          </li>
          <li className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
            <div className="flex items-center gap-2">
              <span className="text-xl">🔑</span>
              <span className="text-sm font-bold text-gray-800">秘密鍵</span>
              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-700">本人だけ</span>
            </div>
            <p className="mt-1 text-sm text-gray-600">絶対に配らない、自分だけの鍵。<b>復号（開ける）専用</b>。公開鍵で閉めたものを開けられる唯一の鍵。</p>
          </li>
        </ul>
        <p className="mt-2 text-xs leading-relaxed text-gray-500">
          ※ よくある勘違い：「公開鍵で何でも開ける」「秘密鍵も相手に配る」は誤り。<b>閉めるのは公開鍵、開けるのは秘密鍵</b>。
        </p>
      </Panel>

      <Flow />

      <Panel>
        <SectionTitle step={3}>共通鍵方式とのちがい</SectionTitle>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          鍵が1本だけの<b className="text-gray-800">共通鍵方式</b>とくらべると、違いがはっきりします。
        </p>
        <div className="mt-3 overflow-hidden rounded-xl ring-1 ring-gray-300">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100 text-gray-700">
                <th className="px-3 py-2 text-left font-bold"> </th>
                <th className="px-3 py-2 text-center font-bold text-gray-700">共通鍵</th>
                <th className="px-3 py-2 text-center font-bold text-brand-700">公開鍵</th>
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
          ※ 公開鍵暗号は<b>デジタル署名</b>にも使われます（こちらは逆に、秘密鍵で署名し公開鍵で確認）。
        </p>
      </Panel>
    </div>
  );
}
