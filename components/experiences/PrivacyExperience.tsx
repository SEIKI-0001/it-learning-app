"use client";

import { useState } from "react";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「個人情報保護」専用の体験。
//   ① 「個人を特定できるか」で個人情報かどうかを判定するクイズ
//   ② 集め方・使い方が適切か（利用目的/必要な範囲/第三者提供）のクイズ
// ============================================================================

const IS_PI: { t: string; ok: boolean; why: string }[] = [
  { t: "氏名と住所と電話番号", ok: true, why: "個人を特定できる→個人情報。" },
  { t: "今日の天気の記録", ok: false, why: "誰の情報でもない→個人情報ではない。" },
  { t: "顔写真", ok: true, why: "本人を識別できる→個人情報。" },
  { t: "「20代・東京在住」だけ（誰かは分からない）", ok: false, why: "個人を特定できなければ個人情報にあたらない。" },
];

function IsPersonalInfo() {
  const [answers, setAnswers] = useState<Record<number, boolean>>({});
  return (
    <Panel>
      <SectionTitle step={1}>これは「個人情報」？</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        個人情報のポイントは<b className="text-gray-800">「特定の個人を識別できるか」</b>。
        名前そのものがなくても、組み合わせで分かれば個人情報です。
      </p>
      <ul className="mt-3 space-y-2.5">
        {IS_PI.map((it, i) => {
          const chosen = answers[i];
          const answered = chosen !== undefined;
          const correct = chosen === it.ok;
          return (
            <li key={i} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
              <p className="text-sm font-bold text-gray-800">{it.t}</p>
              <div className="mt-2 flex gap-2">
                {[
                  { v: true, label: "🔒 個人情報" },
                  { v: false, label: "➖ ちがう" },
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

function Rules() {
  const rules = [
    { emoji: "🎯", t: "利用目的を明確に", d: "何に使うかをはっきり決めて伝える" },
    { emoji: "📏", t: "必要な範囲だけ", d: "目的に必要な分だけ集める（取りすぎない）" },
    { emoji: "🔐", t: "安全に管理", d: "漏えいしないよう適切に守る" },
    { emoji: "🚪", t: "勝手に渡さない", d: "本人の同意なく第三者へ提供しない" },
  ];
  return (
    <Panel>
      <SectionTitle step={2}>集め方・使い方の4つの約束</SectionTitle>
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        {rules.map((r) => (
          <div key={r.t} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
            <div className="text-xl">{r.emoji}</div>
            <div className="mt-1 text-sm font-bold text-gray-800">{r.t}</div>
            <p className="mt-0.5 text-[11px] leading-relaxed text-gray-500">{r.d}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        🤐 友だちの住所や電話番号を、本人に黙って別の人に渡さないのと同じ。集めた情報は<b>何にでも使える訳ではありません</b>。
      </div>
    </Panel>
  );
}

const HANDLING: { t: string; ok: boolean; why: string }[] = [
  { t: "利用目的を伝え、必要な範囲で集める", ok: true, why: "適切。目的の明確化と最小限の収集が基本。" },
  { t: "目的を知らせず、できるだけ多く集める", ok: false, why: "目的外・過剰な収集はNG。" },
  { t: "不要になった情報も永久に保存し続ける", ok: false, why: "持ち続けると漏えいリスクが増える。不要なら消す。" },
  { t: "本人の同意なく他社へ顧客名簿を渡す", ok: false, why: "第三者提供には原則として本人の同意が必要。" },
];

function HandlingQuiz() {
  const [answers, setAnswers] = useState<Record<number, boolean>>({});
  return (
    <Panel>
      <SectionTitle step={3}>扱い方として正しい？</SectionTitle>
      <ul className="mt-3 space-y-2.5">
        {HANDLING.map((it, i) => {
          const chosen = answers[i];
          const answered = chosen !== undefined;
          const correct = chosen === it.ok;
          return (
            <li key={i} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
              <p className="text-sm font-bold text-gray-800">{it.t}</p>
              <div className="mt-2 flex gap-2">
                {[
                  { v: true, label: "⭕ 正しい" },
                  { v: false, label: "🚫 NG" },
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

export default function PrivacyExperience() {
  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        🪪 <b>個人情報</b>は、氏名・住所・顔写真など<b>特定の個人を識別できる情報</b>。
        集めるときは目的を明確にし、必要な範囲で、安全に扱うのがルールです。
      </div>

      <IsPersonalInfo />
      <Rules />
      <HandlingQuiz />
    </div>
  );
}
