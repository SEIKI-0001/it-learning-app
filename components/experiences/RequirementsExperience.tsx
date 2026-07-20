"use client";

import { useState } from "react";
import { Panel, SectionTitle, StepNav } from "./ui";

// ============================================================================
// 「要件定義」専用の体験。
//   ① 要件定義 = 何を作るかを利用者と決めて合意する工程
//   ② 開発シミュレータ：伝え方(あいまい/はっきり)で頭の中の絵がズレ、
//      完成後に「これじゃない」→手戻りが起きるのをステップで体感
//   ③ 機能要件 / 非機能要件 の振り分けクイズ
// ============================================================================

function WhatIs() {
  return (
    <Panel>
      <SectionTitle step={1}>要件定義ってなに？</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        作り始める前に、<b className="text-gray-800">システムに何をしてほしいか</b>を
        <b className="text-gray-800">利用者と開発者で確認して決める</b>工程です。
      </p>
      <div className="mt-4 flex items-center justify-center gap-2">
        <div className="rounded-xl bg-gray-50 px-3 py-3 text-center ring-1 ring-gray-200">
          <div className="text-2xl">🙋</div>
          <div className="mt-1 text-[11px] font-bold text-gray-700">利用者</div>
          <div className="text-[10px] text-gray-500">ほしい物を伝える</div>
        </div>
        <div className="flex flex-col items-center">
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">合意</span>
          <span className="text-lg text-gray-300">🤝</span>
        </div>
        <div className="rounded-xl bg-brand-50 px-3 py-3 text-center ring-1 ring-brand-200">
          <div className="text-2xl">🧑‍💻</div>
          <div className="mt-1 text-[11px] font-bold text-brand-700">開発者</div>
          <div className="text-[10px] text-gray-500">作れる形に整理</div>
        </div>
      </div>
      <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        💡 料理の注文と同じ。「何を・何人分・いつまでに」を先に確認しておくイメージです。
        ⚠️ 開発者だけで決めず、利用者と合意するのが大切。
      </div>
    </Panel>
  );
}

// 開発シミュレータ：伝え方で結末が変わる
const SIM = {
  vague: {
    order: "「いい感じの予約システムを作って！」",
    userThink: { emoji: "📱", label: "スマホでサクッと予約" },
    devThink: { emoji: "🖥️", label: "パソコンの管理画面" },
    product: "🖥️",
    productLabel: "パソコン用の予約システム",
  },
  clear: {
    order: "「スマホで席を選び、前日まで予約・変更できるように」",
    userThink: { emoji: "📱", label: "スマホでサクッと予約" },
    devThink: { emoji: "📱", label: "スマホでサクッと予約" },
    product: "📱",
    productLabel: "スマホ用の予約システム",
  },
};

function WhyMatters() {
  const [vague, setVague] = useState(true);
  const [step, setStep] = useState(0);
  const s = vague ? SIM.vague : SIM.clear;
  const TOTAL = 4; // 注文 → 頭の中 → 完成 → 結果

  return (
    <Panel>
      <SectionTitle step={2}>開発ごっこ：伝え方で結末が変わる</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        あなたは予約システムを注文する<b className="text-gray-800">利用者🙋</b>。
        伝え方を選んで「次へ」で進め、<b className="text-gray-800">結末の違い</b>を見比べよう。
      </p>

      <div className="mt-3 grid grid-cols-2 gap-1.5 rounded-xl bg-gray-100 p-1">
        <button
          onClick={() => setVague(true)}
          className={`rounded-lg px-2 py-2 text-xs font-bold transition active:scale-95 ${
            vague ? "bg-rose-500 text-white" : "text-gray-500"
          }`}
        >
          😶‍🌫️ あいまいに伝える
        </button>
        <button
          onClick={() => setVague(false)}
          className={`rounded-lg px-2 py-2 text-xs font-bold transition active:scale-95 ${
            !vague ? "bg-emerald-500 text-white" : "text-gray-500"
          }`}
        >
          📝 はっきり伝える
        </button>
      </div>

      {/* 場面 */}
      <div className="mt-3 min-h-[13em] rounded-xl bg-gray-50 p-4 ring-1 ring-gray-200">
        {step === 0 && (
          <div>
            <p className="text-xs font-bold text-gray-400">場面1：注文する</p>
            <div className="mt-3 flex items-start gap-2">
              <span className="text-3xl">🙋</span>
              <div
                className={`rounded-xl rounded-tl-none px-3 py-2 text-sm font-bold ring-1 ${
                  vague ? "bg-rose-50 text-rose-800 ring-rose-200" : "bg-emerald-50 text-emerald-800 ring-emerald-200"
                }`}
              >
                {s.order}
              </div>
            </div>
            <div className="mt-3 flex items-start justify-end gap-2">
              <div className="rounded-xl rounded-tr-none bg-brand-50 px-3 py-2 text-sm font-bold text-brand-800 ring-1 ring-brand-200">
                わかりました！作ってきます
              </div>
              <span className="text-3xl">🧑‍💻</span>
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <p className="text-xs font-bold text-gray-400">場面2：おたがいの頭の中は…</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-white p-3 text-center ring-1 ring-gray-200">
                <div className="text-xs font-bold text-gray-500">🙋 利用者の想像</div>
                <div className="mt-1.5 text-3xl">💭{s.userThink.emoji}</div>
                <div className="mt-1 text-[11px] font-bold text-gray-700">{s.userThink.label}</div>
              </div>
              <div className="rounded-xl bg-white p-3 text-center ring-1 ring-gray-200">
                <div className="text-xs font-bold text-gray-500">🧑‍💻 開発者の想像</div>
                <div className="mt-1.5 text-3xl">💭{s.devThink.emoji}</div>
                <div className="mt-1 text-[11px] font-bold text-gray-700">{s.devThink.label}</div>
              </div>
            </div>
            <div
              className={`mt-3 rounded-lg px-3 py-2 text-center text-sm font-bold ${
                vague ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"
              }`}
            >
              {vague ? "⚡ 頭の中の絵がズレてる！（本人たちは気づかない）" : "✅ 頭の中の絵がそろった！"}
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <p className="text-xs font-bold text-gray-400">場面3：数か月後、完成！</p>
            <div className="mt-4 text-center">
              <span className="text-5xl">{s.product}</span>
              <p className="mt-2 text-sm font-bold text-gray-700">🧑‍💻「{s.productLabel}、できました！」</p>
              <p className="mt-1 text-xs text-gray-400">開発者は想像どおりに、真面目に作りました</p>
            </div>
          </div>
        )}

        {step === 3 &&
          (vague ? (
            <div>
              <p className="text-xs font-bold text-gray-400">場面4：結末</p>
              <p className="mt-2 text-sm font-bold text-rose-700">🙋😣「スマホで使いたかったのに…これじゃない！」</p>
              <div className="mt-3 flex items-center justify-center gap-1 text-[11px] font-bold">
                {["要件", "設計", "開発", "完成"].map((t, i) => (
                  <span key={t} className="flex items-center gap-1">
                    <span className="rounded-lg bg-white px-2 py-1.5 text-gray-600 ring-1 ring-gray-200">{t}</span>
                    {i < 3 && <span className="text-gray-300">→</span>}
                  </span>
                ))}
              </div>
              <div className="mt-1.5 text-center text-sm font-bold text-rose-600">
                ↩️ 最初まで大きく戻ってやり直し（手戻り）
              </div>
              <p className="mt-2 text-center text-xs font-bold text-rose-600">時間もお金もほぼ2倍に… 😱</p>
            </div>
          ) : (
            <div>
              <p className="text-xs font-bold text-gray-400">場面4：結末</p>
              <p className="mt-2 text-sm font-bold text-emerald-700">🙋😊「これこれ！思ってたとおり！」</p>
              <div className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-center ring-1 ring-emerald-200">
                <span className="text-3xl">🎉</span>
                <p className="mt-1 text-sm font-bold text-emerald-800">一発で合格！手戻りゼロ</p>
              </div>
            </div>
          ))}
      </div>

      <StepNav
        index={step}
        total={TOTAL}
        onPrev={() => setStep((v) => Math.max(0, v - 1))}
        onNext={() => setStep((v) => Math.min(TOTAL - 1, v + 1))}
        onReset={() => setStep(0)}
        doneLabel={vague ? "手戻り… 😣" : "一発OK 🎉"}
      />

      <p className="mt-3 text-center text-xs text-gray-400">
        伝え方を切り替えて同じ場面を見比べてみよう。要件定義を丁寧にやるほど、後工程の手戻りが減る
      </p>
    </Panel>
  );
}

const ITEMS: { t: string; ans: "機能" | "非機能"; why: string }[] = [
  { t: "席を選んで予約できる", ans: "機能", why: "システムができること＝機能要件。" },
  { t: "予約のキャンセルができる", ans: "機能", why: "提供する機能そのもの＝機能要件。" },
  { t: "3秒以内に画面が表示される", ans: "非機能", why: "速さ（性能）は機能以外の条件＝非機能要件。" },
  { t: "同時に1000人が使っても落ちない", ans: "非機能", why: "性能・安定性＝非機能要件。" },
];

function Quiz() {
  const [answers, setAnswers] = useState<Record<number, "機能" | "非機能">>({});
  return (
    <Panel>
      <SectionTitle step={3}>機能要件？ 非機能要件？</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        <b className="text-gray-800">機能要件＝何ができるか</b>、
        <b className="text-gray-800">非機能要件＝速さ・安定性などの条件</b>。どっち？
      </p>
      <ul className="mt-3 space-y-2.5">
        {ITEMS.map((it, i) => {
          const chosen = answers[i];
          const correct = chosen === it.ans;
          return (
            <li key={i} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
              <p className="text-sm font-bold text-gray-800">{it.t}</p>
              <div className="mt-2 flex gap-1.5">
                {(["機能", "非機能"] as const).map((opt) => {
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
                      className={`flex-1 rounded-lg px-2 py-1.5 text-sm font-bold transition active:scale-95 ${tone}`}
                    >
                      {opt}要件
                    </button>
                  );
                })}
              </div>
              {chosen && (
                <p className={`mt-2 text-xs font-medium ${correct ? "text-emerald-700" : "text-rose-600"}`}>
                  {correct ? "⭕ 正解！ " : `❌ 正解は ${it.ans}要件。 `}
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

export default function RequirementsExperience() {
  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        📝 <b>要件定義</b>は、作り始める前に<b>「何を作るか」を利用者と決めて合意する</b>工程。
        ここがあいまいだと、完成後に「思ってたのと違う」が起きやすくなります。
      </div>

      <WhatIs />
      <WhyMatters />
      <Quiz />
    </div>
  );
}
