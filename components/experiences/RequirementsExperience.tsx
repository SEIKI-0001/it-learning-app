"use client";

import { useState } from "react";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「要件定義」専用の体験。
//   ① 要件定義 = 何を作るかを利用者と決めて合意する工程
//   ② あいまいだと「思ってたのと違う」手戻りが起きる（対比）
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
        <div className="rounded-xl bg-indigo-50 px-3 py-3 text-center ring-1 ring-indigo-200">
          <div className="text-2xl">🧑‍💻</div>
          <div className="mt-1 text-[11px] font-bold text-indigo-700">開発者</div>
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

function WhyMatters() {
  const [vague, setVague] = useState(true);
  return (
    <Panel>
      <SectionTitle step={2}>あいまいだと、あとで困る</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        ここがあいまいだと、完成後に<b className="text-gray-800">「思っていたものと違う」</b>が起きて、
        大きな作り直し（手戻り）になります。
      </p>

      <div className="mt-3 flex justify-center gap-2">
        <button
          onClick={() => setVague(true)}
          className={`rounded-lg px-3 py-1.5 text-xs font-bold transition active:scale-95 ${
            vague ? "bg-rose-500 text-white" : "text-gray-600 ring-1 ring-gray-300"
          }`}
        >
          あいまいな要件
        </button>
        <button
          onClick={() => setVague(false)}
          className={`rounded-lg px-3 py-1.5 text-xs font-bold transition active:scale-95 ${
            !vague ? "bg-emerald-500 text-white" : "text-gray-600 ring-1 ring-gray-300"
          }`}
        >
          はっきりした要件
        </button>
      </div>

      <div className={`mt-3 rounded-xl p-4 ring-1 ${vague ? "bg-rose-50 ring-rose-200" : "bg-emerald-50 ring-emerald-200"}`}>
        {vague ? (
          <>
            <p className="text-sm font-bold text-rose-700">「いい感じの予約システムを作って」</p>
            <p className="mt-2 text-sm leading-relaxed text-gray-700">
              → 開発者「いい感じ…？」と解釈がバラバラ。完成後に「これじゃない」となり、
              <b>大きな作り直し</b>に。😣
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-bold text-emerald-700">「スマホで席を選び、前日まで予約・変更できること」</p>
            <p className="mt-2 text-sm leading-relaxed text-gray-700">
              → 何を作ればよいか<b>具体的</b>。認識がそろい、<b>手戻りが減る</b>。😊
            </p>
          </>
        )}
      </div>
      <p className="mt-3 text-center text-xs text-gray-400">要件定義を丁寧にやるほど、後工程の手戻りが減る</p>
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
      <div className="rounded-2xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        📝 <b>要件定義</b>は、作り始める前に<b>「何を作るか」を利用者と決めて合意する</b>工程。
        ここがあいまいだと、完成後に「思ってたのと違う」が起きやすくなります。
      </div>

      <WhatIs />
      <WhyMatters />
      <Quiz />
    </div>
  );
}
