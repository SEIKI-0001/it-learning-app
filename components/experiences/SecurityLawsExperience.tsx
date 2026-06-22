"use client";

import { useState } from "react";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「情報セキュリティ関連法規」専用の体験。
//   ① 不正アクセス禁止法のイメージ（他人の鍵を勝手に使わない）
//   ② その行為は「不正アクセス」にあたる？ ○×クイズ（侵入しなくてもNG）
//   ③ 関連法規の早見
// ============================================================================

function Intro() {
  return (
    <Panel>
      <SectionTitle step={1}>IDとパスワードは「家の鍵」</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        <b className="text-gray-800">不正アクセス禁止法</b>は、他人のID・パスワードを無断で使ってログインするような行為を禁じる法律です。
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <div className="rounded-xl bg-emerald-50 p-3 text-center ring-1 ring-emerald-200">
          <div className="text-2xl">🔑🏠</div>
          <div className="mt-1 text-sm font-extrabold text-emerald-700">自分の鍵で入る</div>
          <p className="mt-1 text-[11px] leading-relaxed text-gray-600">自分のID/パスワードでログイン＝OK</p>
        </div>
        <div className="rounded-xl bg-rose-50 p-3 text-center ring-1 ring-rose-200">
          <div className="text-2xl">🗝️🚫</div>
          <div className="mt-1 text-sm font-extrabold text-rose-700">他人の鍵を勝手に使う</div>
          <p className="mt-1 text-[11px] leading-relaxed text-gray-600">他人のID/パスワードで無断ログイン＝NG</p>
        </div>
      </div>
      <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        💡 他人の家の鍵を勝手に使って入ってはいけないのと同じ。<b>許可のないログインは犯罪</b>になりえます。
      </div>
    </Panel>
  );
}

const ITEMS: { t: string; ok: boolean; why: string }[] = [
  { t: "他人のIDとパスワードを無断で使ってログインする", ok: true, why: "典型的な不正アクセス。許可なくログインはNG。" },
  { t: "他人のパスワードを勝手に入手して保管しておく", ok: true, why: "ログインしなくても、不正取得・保管は禁止対象。" },
  { t: "自分のアカウントに自分でログインする", ok: false, why: "正当な利用。不正アクセスではない。" },
  { t: "セキュリティの穴を突いて許可なくシステムに侵入する", ok: true, why: "認証を回避した侵入も不正アクセスにあたる。" },
];

function Quiz() {
  const [answers, setAnswers] = useState<Record<number, boolean>>({});
  return (
    <Panel>
      <SectionTitle step={2}>これは「不正アクセス」にあたる？</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        ポイント：<b className="text-gray-800">実際に中身を見なくても</b>、無断ログインや不正な取得はNG。
      </p>
      <ul className="mt-3 space-y-2.5">
        {ITEMS.map((it, i) => {
          const chosen = answers[i];
          const answered = chosen !== undefined;
          const correct = chosen === it.ok;
          return (
            <li key={i} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
              <p className="text-sm font-bold text-gray-800">{it.t}</p>
              <div className="mt-2 flex gap-2">
                {[
                  { v: true, label: "🚫 あたる" },
                  { v: false, label: "⭕ あたらない" },
                ].map((opt) => {
                  const picked = chosen === opt.v;
                  const tone = !answered
                    ? "text-gray-600 ring-1 ring-gray-300"
                    : picked
                      ? opt.v === it.ok
                        ? "bg-emerald-500 text-white"
                        : "bg-rose-500 text-white"
                      : opt.v === it.ok
                        ? "ring-2 ring-emerald-400 text-emerald-700"
                        : "text-gray-400 ring-1 ring-gray-200";
                  return (
                    <button
                      key={String(opt.v)}
                      onClick={() => setAnswers((p) => ({ ...p, [i]: opt.v }))}
                      className={`flex-1 rounded-lg px-2 py-1.5 text-sm font-bold transition active:scale-95 ${tone}`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              {answered && (
                <p className={`mt-2 text-xs font-medium ${correct ? "text-emerald-700" : "text-rose-600"}`}>
                  {correct ? "⭕ 正解！ " : "❌ 残念。 "}
                  {it.why}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

function LawList() {
  const laws = [
    { emoji: "🔓", name: "不正アクセス禁止法", d: "無断ログイン・不正取得などを禁止" },
    { emoji: "🪪", name: "個人情報保護法", d: "個人情報の適切な取り扱いを定める" },
    { emoji: "🛡️", name: "サイバーセキュリティ基本法", d: "国全体のセキュリティ対策の基本方針" },
  ];
  return (
    <Panel>
      <SectionTitle step={3}>関連する主な法律</SectionTitle>
      <div className="mt-3 space-y-2">
        {laws.map((l) => (
          <div key={l.name} className="flex items-center gap-3 rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
            <span className="grid h-9 w-9 flex-none place-items-center rounded-lg bg-white text-lg ring-1 ring-gray-200">
              {l.emoji}
            </span>
            <div>
              <div className="text-sm font-extrabold text-gray-800">{l.name}</div>
              <div className="text-xs text-gray-500">{l.d}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-xl bg-sky-50 px-4 py-3 text-sm leading-relaxed text-sky-900 ring-1 ring-sky-200">
        📌 「無断ログイン」と聞いたら<b>不正アクセス禁止法</b>、と結びつけて覚えると解きやすい。
      </div>
    </Panel>
  );
}

export default function SecurityLawsExperience() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        📜 IT利用にはルールを定めた法律があります。代表が<b>不正アクセス禁止法</b>。
        他人のID・パスワードを無断で使うような行為を禁じます。
      </div>

      <Intro />
      <Quiz />
      <LawList />
    </div>
  );
}
