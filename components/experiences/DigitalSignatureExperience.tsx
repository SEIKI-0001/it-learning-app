"use client";

import { useState } from "react";
import { Panel, SectionTitle, StepNav } from "./ui";

// ============================================================================
// 「ディジタル署名・認証局(CA)」専用の体験。
//   ① 署名→検証の流れを1歩ずつ（送信者=秘密鍵で署名 / 受信者=公開鍵で検証）。
//      公開鍵暗号と「鍵の使い方が逆」なことを強調。改ざん検知＋なりすまし防止。
//   ② 認証局(CA)＝公開鍵が本物だと保証する第三者。PKIのひとこと。
//   ③ 暗号化とのちがい（早見表）。
// ============================================================================

const STEPS: { who: string; emoji: string; title: string; d: string }[] = [
  {
    who: "送信者",
    emoji: "✍️",
    title: "送る文書から「ハッシュ値」を作る",
    d: "文書全体を計算して短い“指紋”（ハッシュ値）を作ります。文書が1文字でも変わると指紋も変わります。",
  },
  {
    who: "送信者",
    emoji: "🔑",
    title: "自分の秘密鍵で指紋を暗号化＝署名",
    d: "指紋を“自分しか持っていない秘密鍵”で暗号化。これがディジタル署名です。文書と一緒に送ります。",
  },
  {
    who: "受信者",
    emoji: "🔓",
    title: "送信者の公開鍵で署名を戻す",
    d: "誰でも手に入る“送信者の公開鍵”で署名を復号し、送られてきた指紋を取り出します。",
  },
  {
    who: "受信者",
    emoji: "🔍",
    title: "自分でも指紋を作って照合",
    d: "受け取った文書から自分でも指紋を計算し、②の指紋と比べます。一致すれば「本人が送った・改ざんなし」と確認できます。",
  },
];

function SignatureFlow() {
  const [i, setI] = useState(0);
  const s = STEPS[i];
  const isSender = s.who === "送信者";
  return (
    <Panel>
      <SectionTitle step={1}>署名→検証を1歩ずつ</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        ディジタル署名は<b className="text-gray-800">「本人が送った」＋「途中で書き換えられていない」</b>を
        証明するしくみ。流れを追ってみましょう。
      </p>

      {/* 役割バッジ */}
      <div className="mt-4 flex items-center justify-between text-xs font-bold">
        <span className={isSender ? "text-indigo-700" : "text-gray-300"}>✍️ 送信者</span>
        <span className="text-gray-300">───▶</span>
        <span className={!isSender ? "text-emerald-700" : "text-gray-300"}>📬 受信者</span>
      </div>

      {/* 現在ステップ */}
      <div
        className={`mt-3 rounded-2xl p-4 ring-2 ${
          isSender ? "bg-indigo-50 ring-indigo-300" : "bg-emerald-50 ring-emerald-300"
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="text-2xl">{s.emoji}</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
              isSender ? "bg-indigo-200 text-indigo-800" : "bg-emerald-200 text-emerald-800"
            }`}
          >
            {s.who}
          </span>
        </div>
        <div className="mt-2 text-sm font-extrabold text-gray-800">
          {i + 1}. {s.title}
        </div>
        <p className="mt-1 text-sm leading-relaxed text-gray-600">{s.d}</p>
      </div>

      <StepNav
        index={i}
        total={STEPS.length}
        onPrev={() => setI((v) => Math.max(0, v - 1))}
        onNext={() => setI((v) => Math.min(STEPS.length - 1, v + 1))}
        onReset={() => setI(0)}
        doneLabel="検証OK ✅"
      />

      <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        ⚠️ <b>暗号化とは鍵の使い方が逆</b>。暗号化は「相手の公開鍵で施錠→相手の秘密鍵で開錠」。
        署名は<b>「自分の秘密鍵で署名→相手が公開鍵で検証」</b>です。
      </div>
    </Panel>
  );
}

function CaPanel() {
  return (
    <Panel>
      <SectionTitle step={2}>その公開鍵、本物？＝認証局(CA)</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        署名の検証には「送信者の公開鍵」を使います。でも、その公開鍵が
        <b className="text-gray-800">本当に本人のもの</b>か、誰が保証する？
      </p>
      <div className="mt-3 flex items-center justify-center gap-2 text-center">
        <div className="flex-1 rounded-xl bg-gray-50 p-2.5 text-xs font-bold text-gray-700 ring-1 ring-gray-200">
          🙋 本人の<br />公開鍵
        </div>
        <span className="text-gray-300">▶</span>
        <div className="flex-1 rounded-xl bg-indigo-50 p-2.5 text-xs font-bold text-indigo-700 ring-1 ring-indigo-200">
          🏛️ 認証局(CA)<br />が保証
        </div>
        <span className="text-gray-300">▶</span>
        <div className="flex-1 rounded-xl bg-emerald-50 p-2.5 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
          📜 電子証明書<br />を発行
        </div>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-gray-600">
        信頼できる第三者＝<b className="text-gray-800">認証局(CA)</b>が「この公開鍵は確かに本人のもの」と保証し、
        <b className="text-gray-800">電子証明書</b>を発行します。
      </p>
      <div className="mt-3 rounded-xl bg-sky-50 px-4 py-3 text-sm leading-relaxed text-sky-900 ring-1 ring-sky-200">
        📌 公開鍵・認証局・証明書をまとめて支える仕組みを <b>PKI（公開鍵基盤）</b> と呼びます。
        身近な例：<b>https</b> のサイトもこの証明書で本物だと確認しています。
      </div>
    </Panel>
  );
}

function CompareTable() {
  const rows = [
    { k: "目的", enc: "中身を読まれないようにする", sig: "本人確認＋改ざん検知" },
    { k: "署名/暗号化する人", enc: "送る人（相手の公開鍵で）", sig: "送る人（自分の秘密鍵で）" },
    { k: "開く/検証する人", enc: "受け取る人（自分の秘密鍵で）", sig: "受け取る人（相手の公開鍵で）" },
  ];
  return (
    <Panel>
      <SectionTitle step={3}>暗号化との違い</SectionTitle>
      <div className="mt-3 overflow-hidden rounded-xl ring-1 ring-gray-200">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-gray-100 text-gray-600">
              <th className="p-2 font-bold"></th>
              <th className="p-2 font-bold">🔒 暗号化</th>
              <th className="p-2 font-bold">✍️ ディジタル署名</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.k} className="border-t border-gray-200">
                <td className="bg-gray-50 p-2 font-bold text-gray-700">{r.k}</td>
                <td className="p-2 text-gray-600">{r.enc}</td>
                <td className="p-2 text-gray-600">{r.sig}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-gray-500">
        ※ どちらも公開鍵＋秘密鍵のペアを使いますが、<b>「どっちの鍵で・誰が」</b>処理するかが逆。ここが試験の狙い目です。
      </p>
    </Panel>
  );
}

export default function DigitalSignatureExperience() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        ✍️ <b>ディジタル署名</b>は「確かに本人が送った（なりすまし防止）」＋「途中で書き換えられていない（改ざん検知）」を
        証明するしくみ。<b>秘密鍵で署名→公開鍵で検証</b>が要点です。
      </div>

      <SignatureFlow />
      <CaPanel />
      <CompareTable />
    </div>
  );
}
