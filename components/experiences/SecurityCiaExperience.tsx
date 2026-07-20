"use client";

import { useState } from "react";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「情報セキュリティの3要素（CIA）」専用の体験。
//   ① 柱を折ってみる … 3本の柱が「情報」を支える図解。タップで柱が折れ、
//                        何が起きるか（事件例）を体感する
//   ② どの要素が損なわれた？ … 事件を3要素に仕分け（試験で頻出）
//   ③ おさらい … 3要素をコンパクトに一望
// ============================================================================

const ELEMS = [
  { id: "c", emo: "🔒", name: "機密性", en: "Confidentiality", mean: "許可された人だけが見られる", bad: "情報漏えい・のぞき見", incident: "顧客名簿が外部に漏れた！" },
  { id: "i", emo: "✅", name: "完全性", en: "Integrity", mean: "内容が正しく保たれ、勝手に書きかえられない", bad: "改ざん・書きかえ", incident: "Webサイトが書きかえられた！" },
  { id: "a", emo: "⚡", name: "可用性", en: "Availability", mean: "使いたいときにきちんと使える（止まらない）", bad: "システム停止・サービス不能", incident: "サーバが落ちて使えない！" },
] as const;

type ElemId = (typeof ELEMS)[number]["id"];

// ---------------------------------------------------------------------------
// ① 柱を折ってみる: 3本の柱が「情報」の屋根を支える。タップで折る⇄直す。
// ---------------------------------------------------------------------------
function PillarDemo() {
  const [broken, setBroken] = useState<Record<ElemId, boolean>>({ c: false, i: false, a: false });
  const brokenList = ELEMS.filter((e) => broken[e.id]);
  const count = brokenList.length;

  return (
    <Panel>
      <SectionTitle step={1}>3本の柱が「情報」を支えている</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        大切な情報は<b className="text-gray-800">3本の柱</b>で支えられています。
        柱をタップして<b className="text-gray-800">折ってみる</b>と、何が起きるか分かります。
      </p>

      {/* 屋根（情報）＋3本柱の図解 */}
      <div className="mt-4 select-none">
        <div
          className={`mx-auto grid h-14 max-w-[280px] place-items-center rounded-xl text-sm font-bold transition-all duration-300 ${
            count === 0
              ? "bg-brand-600 text-white"
              : count < 3
                ? "translate-y-1 -rotate-2 bg-amber-500 text-white"
                : "translate-y-3 rotate-3 bg-rose-500 text-white"
          }`}
        >
          {count === 0 ? "📦 大切な情報（安全）" : count < 3 ? "📦 大切な情報（危険！）" : "📦 情報が守れない！"}
        </div>
        <div className="mx-auto mt-1 flex max-w-[280px] justify-between gap-2">
          {ELEMS.map((e) => {
            const isBroken = broken[e.id];
            return (
              <button
                key={e.id}
                onClick={() => setBroken((p) => ({ ...p, [e.id]: !p[e.id] }))}
                aria-pressed={isBroken}
                className={`flex h-24 flex-1 flex-col items-center justify-center gap-1 rounded-lg border-2 text-xs font-bold transition-all active:scale-95 ${
                  isBroken
                    ? "translate-y-2 rotate-6 border-dashed border-rose-400 bg-rose-50 text-rose-600 opacity-80"
                    : "border-brand-300 bg-brand-50 text-brand-700"
                }`}
              >
                <span className="text-lg leading-none">{isBroken ? "💥" : e.emo}</span>
                {e.name}
                <span className="font-mono text-[10px] font-bold opacity-60">{e.en[0]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 起きたことの表示 */}
      <div className="mt-4 min-h-[4em] rounded-xl bg-gray-50 px-4 py-3 ring-1 ring-gray-200">
        {count === 0 ? (
          <p className="text-sm leading-relaxed text-emerald-700">
            ✅ 3本すべて立っている＝情報は安全。<b>どれか1本欠けただけで危険</b>になります。柱をタップして確かめてみよう。
          </p>
        ) : (
          <ul className="space-y-1.5">
            {brokenList.map((e) => (
              <li key={e.id} className="text-sm leading-relaxed text-rose-700">
                💥 <b>{e.name}</b>が折れた → {e.incident}（{e.bad}）
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        💡 セキュリティ＝「秘密を守る」だけではありません。<b>書きかえられない</b>（完全性）、
        <b>止まらない</b>（可用性）も同じくらい大切。<b>3つセット</b>で考えます。
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ② 仕分けクイズ
// ---------------------------------------------------------------------------
const ITEMS: { t: string; ans: ElemId; why: string }[] = [
  { t: "顧客名簿が外部に漏えいした", ans: "c", why: "見てはいけない人に見られた＝機密性。" },
  { t: "Webサイトを勝手に書きかえられた", ans: "i", why: "内容が正しく保たれていない＝完全性。" },
  { t: "アクセス集中でサーバが落ち、使えない", ans: "a", why: "使いたいのに使えない＝可用性。" },
  { t: "パスワードをのぞき見された", ans: "c", why: "秘密が漏れた＝機密性。" },
  { t: "振込金額のデータが改ざんされた", ans: "i", why: "勝手に書きかえられた＝完全性。" },
];

function Classifier() {
  const [answers, setAnswers] = useState<Record<number, ElemId>>({});
  const label = (id: ElemId) => ELEMS.find((e) => e.id === id)!.name;

  return (
    <Panel>
      <SectionTitle step={2}>どの柱が折れた？</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        起きた出来事は、3要素の<b className="text-gray-800">どれが損なわれた</b>ケース？
        試験ではこの仕分けがよく問われます。
      </p>
      <ul className="mt-3 space-y-2.5">
        {ITEMS.map((it, i) => {
          const chosen = answers[i];
          const correct = chosen === it.ans;
          return (
            <li key={i} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
              <div className="text-sm font-bold text-gray-800">{it.t}</div>
              <div className="mt-2 flex gap-1.5">
                {ELEMS.map((e) => {
                  const picked = chosen === e.id;
                  const tone = !chosen
                    ? "text-gray-600 ring-1 ring-gray-300"
                    : picked
                      ? e.id === it.ans
                        ? "bg-emerald-500 text-white"
                        : "bg-rose-500 text-white"
                      : e.id === it.ans
                        ? "ring-2 ring-emerald-400 text-emerald-700"
                        : "text-gray-400 ring-1 ring-gray-200";
                  return (
                    <button
                      key={e.id}
                      onClick={() => setAnswers((p) => ({ ...p, [i]: e.id }))}
                      className={`flex-1 rounded-lg py-1.5 text-sm font-bold transition active:scale-95 ${tone}`}
                    >
                      {e.name}
                    </button>
                  );
                })}
              </div>
              {chosen && (
                <p className={`mt-2 text-xs font-medium ${correct ? "text-emerald-700" : "text-rose-600"}`}>
                  {correct ? "⭕ 正解！ " : `❌ 正解は「${label(it.ans)}」。 `}
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

export default function SecurityCiaExperience() {
  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        🛡️ 情報セキュリティは<b>3つの柱（CIA）</b>で守ります——
        <b>機密性</b>（見せない）・<b>完全性</b>（正しく保つ）・<b>可用性</b>（止めない）。
      </div>

      <PillarDemo />
      <Classifier />

      <Panel>
        <SectionTitle step={3}>おさらい</SectionTitle>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {ELEMS.map((e) => (
            <div key={e.id} className="rounded-xl bg-brand-50 p-2.5 text-center ring-1 ring-brand-100">
              <div className="text-lg">{e.emo}</div>
              <div className="mt-0.5 text-xs font-bold text-brand-800">{e.name}</div>
              <div className="mt-0.5 text-[10px] leading-tight text-gray-600">{e.mean}</div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-gray-500">
          ※ 3つの頭文字 C（Confidentiality）・I（Integrity）・A（Availability）をとって「情報セキュリティのCIA」と呼びます。
        </p>
      </Panel>
    </div>
  );
}
