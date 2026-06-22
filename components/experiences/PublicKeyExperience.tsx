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

const PLAINTEXT = "会議は10時";

type Step = { loc: "A" | "wire" | "B"; locked: boolean; html: string };

const STEPS: Step[] = [
  {
    loc: "B",
    locked: false,
    html: "Bさんは鍵を <b>2本ペア</b> でつくり、<b>公開鍵🔓を全員に配り</b>ます。<b>秘密鍵🔑は自分だけ</b>が持ちます。",
  },
  {
    loc: "A",
    locked: false,
    html: "AさんはBさんに秘密のメッセージを送りたい。いまは平文（だれでも読める状態）。",
  },
  {
    loc: "A",
    locked: true,
    html: "Aさんは <b>Bさんの公開鍵🔓で暗号化</b>（＝Bの郵便受けに投函）。公開鍵は『閉める専用』です。",
  },
  {
    loc: "wire",
    locked: true,
    html: "暗号文を送信。途中で😈に盗まれても、<b>公開鍵では開けられない</b>ので中身は読めません。",
  },
  {
    loc: "B",
    locked: false,
    html: "Bさんは <b>対の秘密鍵🔑で復号</b>（＝持ち主だけが郵便受けを開ける）。読めた！",
  },
  {
    loc: "B",
    locked: false,
    html: "💡 ポイント：<b>公開鍵で閉めて、対の秘密鍵でしか開かない</b>。だから鍵を安全に配る悩み（鍵配送問題）が起きません。",
  },
];

function Flow() {
  const [idx, setIdx] = useState(0);
  const step = STEPS[idx];

  const actor = (id: "A" | "B", emo: string, name: string, sub: string) => {
    const on = step.loc === id;
    return (
      <div className={`w-[100px] rounded-xl border-2 px-1 py-2.5 text-center transition ${
        on ? "border-indigo-500 bg-indigo-50 shadow-md shadow-indigo-100" : "border-gray-200 bg-gray-50"
      }`}>
        <div className="text-2xl leading-none">{emo}</div>
        <div className="mt-1 text-xs font-extrabold text-gray-800">{name}</div>
        <div className="text-[10px] leading-tight text-gray-500">{sub}</div>
      </div>
    );
  };

  return (
    <Panel>
      <SectionTitle step={2}>送信の流れ（公開鍵で閉めて、秘密鍵で開ける）</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        AさんからBさんへ秘密のメッセージを送ります。「次へ」で1歩ずつ。
      </p>

      <div className="mt-4 flex items-center justify-center gap-1">
        {actor("A", "🅰️", "Aさん", "送る人")}
        <span className="px-0.5 text-center text-[10px] leading-tight text-gray-400">
          通信路<br />😈
        </span>
        {actor("B", "🅱️", "Bさん", "秘密鍵🔑を持つ")}
      </div>

      {/* 状態表示：ステップ0は鍵の準備、それ以降はメッセージの状態 */}
      {idx === 0 ? (
        <div className="mt-3 rounded-xl bg-gray-50 px-4 py-3 text-center ring-1 ring-gray-200">
          <div className="text-xs font-bold text-gray-500">鍵の準備</div>
          <div className="mt-1 text-sm font-bold text-gray-700">
            🔓 公開鍵 … 全員に配布　/　🔑 秘密鍵 … Bさんだけが保管
          </div>
        </div>
      ) : (
        <div
          className={`mt-3 rounded-xl px-4 py-3 text-center ring-1 ${
            step.locked ? "bg-indigo-50 ring-indigo-200" : "bg-emerald-50 ring-emerald-200"
          }`}
        >
          <div className="text-xs font-bold text-gray-500">
            メッセージ（今ある場所：{step.loc === "wire" ? "通信路" : step.loc === "A" ? "Aさん" : "Bさん"}）
          </div>
          <div className="mt-1 font-mono text-base font-bold text-gray-800">
            {step.locked ? "🔒 ＃＄％‥（暗号文・読めない）" : `「${PLAINTEXT}」`}
          </div>
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

export default function PublicKeyExperience() {
  const rows = [
    { k: "鍵の数", c: "1本（同じ鍵を共有）", p: "2本ペア（公開鍵＋秘密鍵）" },
    { k: "暗号化／復号", c: "同じ鍵で両方", p: "公開鍵で暗号化→秘密鍵で復号" },
    { k: "鍵を配る悩み", c: "あり（同じ鍵を安全に渡す必要）", p: "小さい（公開鍵は配ってよい）" },
    { k: "速さ", c: "速い", p: "遅め" },
  ];
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        📮 たとえると<b>郵便受け</b>。<b>公開鍵＝投入口</b>（誰でも手紙を入れられる＝暗号化できる）、
        <b>秘密鍵＝持ち主だけの開錠鍵</b>（中身を取り出せる＝復号できる）。鍵は<b>2本でペア</b>です。
      </div>

      <Panel>
        <SectionTitle step={1}>2つの鍵（ペアで使う）</SectionTitle>
        <ul className="mt-3 space-y-2.5">
          <li className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
            <div className="flex items-center gap-2">
              <span className="text-xl">🔓</span>
              <span className="text-sm font-extrabold text-gray-800">公開鍵</span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">配ってOK</span>
            </div>
            <p className="mt-1 text-sm text-gray-600">みんなに渡してよい鍵。<b>暗号化（閉める）専用</b>。これだけでは中身を開けられない。</p>
          </li>
          <li className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
            <div className="flex items-center gap-2">
              <span className="text-xl">🔑</span>
              <span className="text-sm font-extrabold text-gray-800">秘密鍵</span>
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
                <th className="px-3 py-2 text-center font-bold text-indigo-700">公開鍵</th>
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
