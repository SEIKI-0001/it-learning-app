"use client";

import { useState } from "react";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「認証・認可・多要素認証」専用の体験。
//   ① 認証→認可の順番（あなたは誰？→何をしてよい？）
//   ② どっち？クイズ（認証／認可の仕分け）
//   ③ 多要素認証 … 3要素（知識・所持・生体）から選び、異なる2種以上かを判定
// ============================================================================

// ② 認証/認可クイズ -------------------------------------------------------
const ITEMS: { t: string; ans: "認証" | "認可"; why: string }[] = [
  { t: "IDとパスワードでログインする", ans: "認証", why: "「あなたは誰？」を確かめている＝認証。" },
  { t: "指紋でスマホのロックを解除する", ans: "認証", why: "本人かどうかの確認＝認証。" },
  { t: "一般社員は給与データを見られない", ans: "認可", why: "「何をしてよいか」の権限＝認可。" },
  { t: "管理者だけが設定を変更できる", ans: "認可", why: "操作してよい範囲の許可＝認可。" },
];

function Classifier() {
  const [answers, setAnswers] = useState<Record<number, "認証" | "認可">>({});
  return (
    <Panel>
      <SectionTitle step={2}>どっち？（認証 or 認可）</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        次は「本人確認（認証）」と「権限の許可（認可）」のどちら？ 試験で混同しやすいポイントです。
      </p>
      <ul className="mt-3 space-y-2.5">
        {ITEMS.map((it, i) => {
          const chosen = answers[i];
          const correct = chosen === it.ans;
          return (
            <li key={i} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
              <div className="flex items-center justify-between gap-2">
                <span className="flex-1 text-sm font-bold text-gray-800">{it.t}</span>
                <div className="flex gap-1.5">
                  {(["認証", "認可"] as const).map((opt) => {
                    const picked = chosen === opt;
                    const tone = !chosen
                      ? "text-gray-600 ring-1 ring-gray-300"
                      : picked
                        ? opt === it.ans
                          ? "bg-emerald-500 text-white"
                          : "bg-rose-500 text-white"
                        : opt === it.ans
                          ? "ring-2 ring-emerald-400 text-emerald-700"
                          : "text-gray-400 ring-1 ring-gray-200";
                    return (
                      <button
                        key={opt}
                        onClick={() => setAnswers((p) => ({ ...p, [i]: opt }))}
                        className={`rounded-lg px-3 py-1.5 text-sm font-bold transition active:scale-95 ${tone}`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
              {chosen && (
                <p className={`mt-2 text-xs font-medium ${correct ? "text-emerald-700" : "text-rose-600"}`}>
                  {correct ? "⭕ 正解！ " : `❌ 正解は「${it.ans}」。 `}
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

// ③ 多要素認証 -----------------------------------------------------------
const FACTORS = [
  { cat: "知識（記憶）", emo: "🧠", items: [{ id: "pw", label: "パスワード" }, { id: "pin", label: "PIN・暗証番号" }] },
  { cat: "所持（持ち物）", emo: "📱", items: [{ id: "app", label: "スマホ認証アプリ" }, { id: "ic", label: "ICカード" }] },
  { cat: "生体（からだ）", emo: "🖐", items: [{ id: "finger", label: "指紋" }, { id: "face", label: "顔" }] },
];
const CAT_OF: Record<string, string> = {};
FACTORS.forEach((g) => g.items.forEach((it) => (CAT_OF[it.id] = g.cat)));

function Mfa() {
  const [sel, setSel] = useState<string[]>(["pw", "app"]);
  const cats = new Set(sel.map((id) => CAT_OF[id]));
  const distinct = cats.size;
  const isMfa = distinct >= 2;

  const toggle = (id: string) =>
    setSel((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <Panel>
      <SectionTitle step={3}>多要素認証（異なる種類を2つ以上）</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        認証の方法は<b className="text-gray-800">3種類</b>（知識・所持・生体）。
        <b className="text-gray-800">異なる種類を2つ以上</b>組み合わせると多要素認証になり、安全性が上がります。使うものを選んでみよう。
      </p>

      <div className="mt-3 space-y-3">
        {FACTORS.map((g) => (
          <div key={g.cat}>
            <div className="mb-1 text-xs font-bold text-gray-500">
              {g.emo} {g.cat}
            </div>
            <div className="flex flex-wrap gap-2">
              {g.items.map((it) => {
                const on = sel.includes(it.id);
                return (
                  <button
                    key={it.id}
                    onClick={() => toggle(it.id)}
                    className={`rounded-lg px-3 py-1.5 text-sm font-bold transition active:scale-95 ${
                      on ? "bg-brand-600 text-white" : "text-gray-600 ring-1 ring-gray-300"
                    }`}
                  >
                    {on ? "✓ " : ""}
                    {it.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div
        className={`mt-3 rounded-xl px-4 py-3 text-sm font-bold ring-1 ${
          isMfa
            ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
            : distinct === 1
              ? "bg-amber-50 text-amber-800 ring-amber-200"
              : "bg-gray-50 text-gray-500 ring-gray-200"
        }`}
      >
        {distinct === 0
          ? "使うものを選んでください。"
          : isMfa
            ? `✅ 多要素認証！ 異なる種類を ${distinct} 種つかっています（強い）。`
            : "⚠️ 単要素です。同じ種類だけでは多要素になりません（例：パスワード＋PIN はどちらも『知識』）。"}
      </div>
      <p className="mt-2 text-xs leading-relaxed text-gray-500">
        ※ ポイントは「数」ではなく「<b>種類のちがい</b>」。パスワードを2つ使っても、どちらも知識なので多要素ではありません。
      </p>
      <div className="mt-2 rounded-xl bg-brand-50 px-3 py-2.5 text-xs leading-relaxed text-brand-900 ring-1 ring-brand-200">
        💡 身近な例：銀行ATMの「<b>キャッシュカード＋暗証番号(PIN)</b>」は、
        <b>カード＝所持</b>・<b>暗証番号＝知識</b>の組み合わせ。つまり<b>それ自体が多要素認証</b>の代表例です。
        （ここでは PIN を“知識”として分類していますが、実際は「カードとセットで使う」点に注目）
      </div>
    </Panel>
  );
}

export default function AuthExperience() {
  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        🏢 会社の入館でたとえると——社員証で<b>「あなたは誰？」を確かめる＝認証</b>、
        役職によって<b>「入ってよい部屋」が決まる＝認可</b>。まず認証、つぎに認可の順です。
      </div>

      <Panel>
        <SectionTitle step={1}>認証 → 認可 の順番</SectionTitle>
        <div className="mt-3 flex items-center justify-center gap-1 text-center">
          <div className="w-20 rounded-xl bg-gray-50 px-1 py-2.5 ring-1 ring-gray-200">
            <div className="text-2xl">🧑</div>
            <div className="text-[11px] font-bold text-gray-700">利用者</div>
          </div>
          <span className="text-gray-300">→</span>
          <div className="flex-1 rounded-xl bg-brand-50 px-2 py-2.5 ring-1 ring-brand-200">
            <div className="text-sm font-bold text-brand-700">① 認証</div>
            <div className="text-[11px] text-gray-600">あなたは誰？</div>
            <div className="text-[10px] text-gray-400">ID・パスワード／指紋</div>
          </div>
          <span className="text-gray-300">→</span>
          <div className="flex-1 rounded-xl bg-emerald-50 px-2 py-2.5 ring-1 ring-emerald-200">
            <div className="text-sm font-bold text-emerald-700">② 認可</div>
            <div className="text-[11px] text-gray-600">何をしてよい？</div>
            <div className="text-[10px] text-gray-400">権限・アクセス範囲</div>
          </div>
        </div>
        <ul className="mt-3 space-y-2 text-sm">
          <li className="rounded-xl bg-gray-50 px-3 py-2 ring-1 ring-gray-200">
            <b className="text-brand-700">認証</b>（Authentication）＝<b>本人確認</b>。「あなたは誰？」
          </li>
          <li className="rounded-xl bg-gray-50 px-3 py-2 ring-1 ring-gray-200">
            <b className="text-emerald-700">認可</b>（Authorization）＝<b>権限の許可</b>。「何をしてよい？」
          </li>
        </ul>
        <p className="mt-2 text-xs text-gray-500">※ 必ず「認証してから認可」。誰かが分からなければ、何を許すかも決められません。</p>
      </Panel>

      <Classifier />
      <Mfa />
    </div>
  );
}
