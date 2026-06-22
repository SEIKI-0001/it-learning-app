"use client";

import { useState } from "react";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「企業活動とステークホルダ」専用の体験。
//   ① 自社を中心に、まわりの関係者（ステークホルダ）をタップで確認
//   ② ステークホルダに含まれる？ 仕分けクイズ（株主だけと思う罠）
//   ③ CSR（社会的責任）のひとこと
// ============================================================================

type Holder = { name: string; emoji: string; rel: string };

const HOLDERS: Holder[] = [
  { name: "顧客", emoji: "🙋", rel: "商品やサービスを買ってくれる人" },
  { name: "株主", emoji: "💰", rel: "会社にお金を出して支える人" },
  { name: "従業員", emoji: "👷", rel: "会社で働く人" },
  { name: "取引先", emoji: "🤝", rel: "材料を仕入れたり協力し合う相手" },
  { name: "地域社会", emoji: "🏘️", rel: "会社がある地域の人々・環境" },
  { name: "国・行政", emoji: "🏛️", rel: "税金やルールで関わる公的機関" },
];

function Hub() {
  const [sel, setSel] = useState<number | null>(null);
  return (
    <Panel>
      <SectionTitle step={1}>会社は多くの相手とつながっている</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        会社に関わる人や組織を<b className="text-gray-800">ステークホルダ（利害関係者）</b>と呼びます。
        まわりのカードをタップして、どんな関係か見てみよう。
      </p>

      {/* 中心＝自社 */}
      <div className="mt-4 flex justify-center">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-indigo-600 text-center text-xs font-extrabold leading-tight text-white ring-4 ring-indigo-100">
          🏢<br />自社
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {HOLDERS.map((h, i) => {
          const on = sel === i;
          return (
            <button
              key={h.name}
              onClick={() => setSel(i)}
              className={`flex flex-col items-center rounded-xl p-2.5 ring-2 transition active:scale-95 ${
                on
                  ? "bg-emerald-500 text-white ring-emerald-500"
                  : "bg-emerald-50 text-emerald-700 ring-emerald-200"
              }`}
            >
              <span className="text-xl leading-none">{h.emoji}</span>
              <span className="mt-1 text-[11px] font-extrabold">{h.name}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 min-h-[3.5em] rounded-xl bg-gray-50 px-4 py-3 ring-1 ring-gray-200">
        {sel !== null ? (
          <>
            <div className="text-sm font-extrabold text-gray-800">
              {HOLDERS[sel].emoji} {HOLDERS[sel].name}
            </div>
            <p className="mt-1 text-sm leading-relaxed text-gray-700">{HOLDERS[sel].rel}</p>
          </>
        ) : (
          <span className="text-sm text-gray-400">まわりのカードをタップしてね。</span>
        )}
      </div>

      <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        💡 たとえると学校行事も、生徒だけでなく<b>先生・保護者・地域の人</b>に関係します。会社も同じく多くの相手とつながっています。
      </div>
    </Panel>
  );
}

const ITEMS: { t: string; ok: boolean; why: string }[] = [
  { t: "その会社の商品を買う顧客", ok: true, why: "顧客はステークホルダの代表例。" },
  { t: "そこで働く従業員", ok: true, why: "従業員も会社と利害を共にする関係者。" },
  { t: "まったく関わりのない外国の知らない人", ok: false, why: "利害関係がなければステークホルダではない。" },
  { t: "会社がある地域の住民", ok: true, why: "地域社会もステークホルダ。環境や雇用で関わる。" },
];

function Quiz() {
  const [answers, setAnswers] = useState<Record<number, boolean>>({});
  return (
    <Panel>
      <SectionTitle step={2}>ステークホルダにあたる？</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        「ステークホルダ＝株主だけ」と思いがちですが、もっと広い相手を指します。
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
                  { v: true, label: "⭕ あたる" },
                  { v: false, label: "❌ ちがう" },
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
      <div className="mt-3 rounded-xl bg-sky-50 px-4 py-3 text-sm leading-relaxed text-sky-900 ring-1 ring-sky-200">
        🌍 会社は利益を出すだけでなく、社会の一員としての責任（<b>CSR</b>）も求められます。
      </div>
    </Panel>
  );
}

export default function EnterpriseActivitiesExperience() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        🏢 会社は商品やサービスで価値を生み、利益を得ながら社会に役立ちます。会社に関わる人・組織が
        <b>ステークホルダ（利害関係者）</b>。株主だけでなく、顧客・従業員・地域なども含みます。
      </div>

      <Hub />
      <Quiz />
    </div>
  );
}
