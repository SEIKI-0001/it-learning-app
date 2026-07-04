"use client";

import { useState } from "react";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「情報セキュリティ関連法規」専用の体験。
//   ① ログインを試してみる … シナリオを選ぶとドアの図で OK/違法 が変わる
//   ② その行為は「不正アクセス」にあたる？ ○×クイズ（侵入しなくてもNG）
//   ③ 関連法規の早見
// ============================================================================

// ---------------------------------------------------------------------------
// ① シナリオセレクタ: 誰の鍵でどう入るかを選ぶ → 判定と理由が変わる
// ---------------------------------------------------------------------------
const SCENARIOS = [
  {
    id: "own",
    label: "自分のIDでログイン",
    emoji: "🔑",
    door: "🚪✅",
    ok: true,
    verdict: "OK（正当な利用）",
    why: "自分の鍵で自分の家に入るのと同じ。何の問題もありません。",
  },
  {
    id: "steal",
    label: "他人のIDで無断ログイン",
    emoji: "🗝️",
    door: "🚪🚨",
    ok: false,
    verdict: "違法（不正アクセス）",
    why: "他人の鍵を勝手に使って入るのと同じ。中身を見なくても、ログインした時点でアウトです。",
  },
  {
    id: "keep",
    label: "他人のパスワードを入手して保管",
    emoji: "📋",
    door: "🏠🗝️",
    ok: false,
    verdict: "違法（不正取得・保管）",
    why: "合鍵をこっそり作って持っているのと同じ。ログインしていなくても、不正な取得・保管自体が禁止されています。",
  },
  {
    id: "hole",
    label: "セキュリティの穴を突いて侵入",
    emoji: "🪟",
    door: "🪟🚨",
    ok: false,
    verdict: "違法（不正アクセス）",
    why: "鍵を使わず窓から入るのと同じ。認証を回避した侵入も不正アクセスです。",
  },
] as const;

function LoginSimulator() {
  const [sel, setSel] = useState<number | null>(null);
  const s = sel !== null ? SCENARIOS[sel] : null;

  return (
    <Panel>
      <SectionTitle step={1}>ログインを試してみる</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        IDとパスワードは<b className="text-gray-800">「家の鍵」</b>。
        どの入り方が法律違反になるか、試して確かめよう。
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {SCENARIOS.map((sc, i) => {
          const on = sel === i;
          return (
            <button
              key={sc.id}
              onClick={() => setSel(i)}
              className={`rounded-xl p-2.5 text-left text-xs font-bold leading-relaxed ring-2 transition active:scale-95 ${
                on ? "bg-indigo-600 text-white ring-indigo-600" : "bg-indigo-50 text-indigo-800 ring-indigo-200"
              }`}
            >
              <span className="mr-1">{sc.emoji}</span>
              {sc.label}
            </button>
          );
        })}
      </div>

      {/* 判定表示 */}
      <div
        className={`mt-3 min-h-[7em] rounded-xl px-4 py-3 ring-1 transition-colors ${
          !s
            ? "bg-gray-50 ring-gray-200"
            : s.ok
              ? "bg-emerald-50 ring-emerald-200"
              : "bg-rose-50 ring-rose-200"
        }`}
      >
        {!s ? (
          <p className="text-sm text-gray-400">上のボタンから入り方を選んでね。</p>
        ) : (
          <div>
            <div className="flex items-center gap-3">
              <span className="text-3xl">{s.door}</span>
              <span className={`text-sm font-extrabold ${s.ok ? "text-emerald-700" : "text-rose-700"}`}>
                {s.ok ? "⭕" : "🚫"} {s.verdict}
              </span>
            </div>
            <p className={`mt-2 text-sm leading-relaxed ${s.ok ? "text-emerald-800" : "text-rose-800"}`}>{s.why}</p>
          </div>
        )}
      </div>

      <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        💡 ポイントは<b>「実害がなくてもアウト」</b>。無断ログイン・不正な取得や保管は、
        中身を見たかどうかに関係なく<b>不正アクセス禁止法</b>で禁じられています。
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ② ○×クイズ
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// ③ 関連法規の早見: 「困りごと」から法律を引ける形に
// ---------------------------------------------------------------------------
function LawList() {
  const laws = [
    { emoji: "🔓", scene: "他人のIDで無断ログインされた", name: "不正アクセス禁止法", d: "無断ログイン・不正取得などを禁止" },
    { emoji: "🪪", scene: "個人情報が勝手に使われた", name: "個人情報保護法", d: "個人情報の適切な取り扱いを定める" },
    { emoji: "🛡️", scene: "国全体でセキュリティを強くしたい", name: "サイバーセキュリティ基本法", d: "国の対策の基本方針を定める" },
  ];
  return (
    <Panel>
      <SectionTitle step={3}>場面から法律を引く</SectionTitle>
      <div className="mt-3 space-y-2">
        {laws.map((l) => (
          <div key={l.name} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
            <div className="text-xs text-gray-500">「{l.scene}」→</div>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-lg">{l.emoji}</span>
              <div>
                <div className="text-sm font-extrabold text-gray-800">{l.name}</div>
                <div className="text-xs text-gray-500">{l.d}</div>
              </div>
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

      <LoginSimulator />
      <Quiz />
      <LawList />
    </div>
  );
}
