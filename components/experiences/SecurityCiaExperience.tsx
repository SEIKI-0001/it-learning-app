"use client";

import { useState } from "react";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「情報セキュリティの3要素（CIA）」専用の体験。
//   ① 3つの柱 … 機密性・完全性・可用性（守る意味＋損なわれる例）
//   ② どの要素が損なわれた？ … 事件を3要素に仕分け（試験で頻出）
//   ③ おさらい
// ============================================================================

const ELEMS = [
  { id: "c", emo: "🔒", name: "機密性", en: "Confidentiality", mean: "許可された人だけが見られる", bad: "情報漏えい・のぞき見" },
  { id: "i", emo: "✅", name: "完全性", en: "Integrity", mean: "内容が正しく保たれ、勝手に書きかえられない", bad: "改ざん・書きかえ" },
  { id: "a", emo: "⚡", name: "可用性", en: "Availability", mean: "使いたいときにきちんと使える（止まらない）", bad: "システム停止・サービス不能" },
] as const;

type ElemId = (typeof ELEMS)[number]["id"];

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
      <SectionTitle step={2}>どの要素が損なわれた？</SectionTitle>
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
      <div className="rounded-2xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        🛡️ 情報セキュリティは<b>3つの柱（CIA）</b>で守ります——
        <b>機密性</b>（見せない）・<b>完全性</b>（正しく保つ）・<b>可用性</b>（止めない）。この3つで覚えます。
      </div>

      <Panel>
        <SectionTitle step={1}>3つの柱（CIA）</SectionTitle>
        <ul className="mt-3 space-y-2.5">
          {ELEMS.map((e) => (
            <li key={e.id} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
              <div className="flex items-center gap-2">
                <span className="text-xl">{e.emo}</span>
                <span className="text-sm font-extrabold text-gray-800">{e.name}</span>
                <span className="font-mono text-[11px] text-gray-400">{e.en}</span>
              </div>
              <p className="mt-1 text-sm text-gray-600">{e.mean}</p>
              <p className="mt-1 text-xs text-rose-600">損なわれる例：{e.bad}</p>
            </li>
          ))}
        </ul>
      </Panel>

      <Classifier />

      <Panel>
        <SectionTitle step={3}>おさらい</SectionTitle>
        <ul className="mt-3 space-y-2 text-sm">
          <li className="rounded-xl bg-gray-50 px-3 py-2.5 ring-1 ring-gray-200">
            <b>🔒 機密性</b>：許可された人だけが見られる（漏らさない）。
          </li>
          <li className="rounded-xl bg-gray-50 px-3 py-2.5 ring-1 ring-gray-200">
            <b>✅ 完全性</b>：内容が正しく保たれる（改ざんされない）。
          </li>
          <li className="rounded-xl bg-gray-50 px-3 py-2.5 ring-1 ring-gray-200">
            <b>⚡ 可用性</b>：使いたいときに使える（止まらない）。
          </li>
        </ul>
        <p className="mt-2 text-xs leading-relaxed text-gray-500">
          ※ 3つの頭文字 C・I・A をとって「情報セキュリティのCIA」と呼びます。
        </p>
      </Panel>
    </div>
  );
}
