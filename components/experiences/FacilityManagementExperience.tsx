"use client";

import { useState } from "react";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「ファシリティマネジメント（設備・電源・UPS）」専用の体験。
//   ① 停電が起きたとき、UPSなし ⇄ あり で何が変わるかをトグル体感
//   ② システムを支える設備（電源・空調・入退室）
//   ③ UPSの役割クイズ
// ============================================================================

function UpsToggle() {
  const [ups, setUps] = useState(false);
  return (
    <Panel>
      <SectionTitle step={1}>停電したら、どうなる？</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        サーバが動いている最中に<b className="text-gray-800">停電</b>が起きたら？
        <b className="text-gray-800">UPS（無停電電源装置）</b>のあり/なしで切り替えてみましょう。
      </p>

      <div className="mt-3 flex gap-1.5">
        <button
          onClick={() => setUps(false)}
          className={`flex-1 rounded-lg py-2 text-sm font-bold transition active:scale-95 ${
            !ups ? "bg-rose-500 text-white" : "bg-gray-50 text-gray-600 ring-1 ring-gray-300"
          }`}
        >
          UPS なし
        </button>
        <button
          onClick={() => setUps(true)}
          className={`flex-1 rounded-lg py-2 text-sm font-bold transition active:scale-95 ${
            ups ? "bg-emerald-500 text-white" : "bg-gray-50 text-gray-600 ring-1 ring-gray-300"
          }`}
        >
          UPS あり
        </button>
      </div>

      <div className="mt-3 rounded-xl bg-gray-50 p-4 ring-1 ring-gray-200">
        <div className="flex items-center justify-center gap-3 text-center">
          <span className="text-3xl">⚡️</span>
          <span className="text-xs font-bold text-gray-400">停電</span>
          <span className="text-2xl text-gray-300">→</span>
          {ups && (
            <>
              <span className="text-3xl">🔋</span>
              <span className="text-[10px] font-bold text-emerald-600">UPS</span>
              <span className="text-2xl text-gray-300">→</span>
            </>
          )}
          <span className={`text-3xl ${ups ? "" : "opacity-40 grayscale"}`}>🖥️</span>
        </div>
        <div
          className={`mt-3 rounded-lg px-3 py-2.5 text-center text-sm font-bold ${
            ups ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
          }`}
        >
          {ups
            ? "🔋 バッテリで電気が続く → 安全に終了 or 自家発電へ切替"
            : "💥 いきなり停止 → 作業中のデータが壊れるおそれ"}
        </div>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-gray-500">
        ※ UPSは<b>停電の瞬間にすぐ電力を供給</b>するための装置。
        ただし長時間はもたないので、その間に安全停止や自家発電への切り替えを行います。
      </p>
    </Panel>
  );
}

const FACILITIES = [
  { emo: "🔌", name: "電源設備", d: "UPSや自家発電で、電気を止めない・守る" },
  { emo: "❄️", name: "空調", d: "機器が熱で壊れないよう温度・湿度を保つ" },
  { emo: "🚪", name: "入退室管理", d: "ICカードなどで、関係者だけが入れるようにする" },
  { emo: "🧯", name: "防災設備", d: "火災・地震に備える（消火・耐震など）" },
];

function Facilities() {
  return (
    <Panel>
      <SectionTitle step={2}>システムを支える「設備」たち</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        ファシリティマネジメントは、こうした<b className="text-gray-800">設備・環境を適切に管理</b>し、
        システムを安全・安定して動かす活動です。
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        {FACILITIES.map((f) => (
          <div key={f.name} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
            <div className="flex items-center gap-1.5">
              <span className="text-lg">{f.emo}</span>
              <span className="text-sm font-bold text-gray-800">{f.name}</span>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-gray-500">{f.d}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

const QUIZ: { t: string; ans: string; opts: string[]; why: string }[] = [
  {
    t: "停電した瞬間に、内蔵バッテリで一時的に電力を供給し、機器が急停止するのを防ぐ装置は？",
    ans: "UPS",
    opts: ["UPS", "ルータ", "ファイアウォール"],
    why: "停電時に一時的に電力を供給＝UPS（無停電電源装置）。",
  },
  {
    t: "UPSの説明として正しいものは？",
    ans: "停電時に短時間、電力を供給し続ける",
    opts: ["停電時に短時間、電力を供給し続ける", "ウイルスを検知して駆除する", "通信を暗号化する"],
    why: "UPSは停電時の一時的な電力供給が役割。ウイルス対策や暗号化は別物。",
  },
];

function Quiz() {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  return (
    <Panel>
      <SectionTitle step={3}>確認クイズ</SectionTitle>
      <ul className="mt-3 space-y-3">
        {QUIZ.map((q, i) => {
          const chosen = answers[i];
          const correct = chosen === q.ans;
          return (
            <li key={i} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
              <div className="text-sm font-bold text-gray-800">{q.t}</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {q.opts.map((opt) => {
                  const picked = chosen === opt;
                  const tone = !chosen
                    ? "text-gray-600 ring-1 ring-gray-300"
                    : picked
                      ? opt === q.ans
                        ? "bg-emerald-500 text-white"
                        : "bg-rose-500 text-white"
                      : opt === q.ans
                        ? "ring-2 ring-emerald-400 text-emerald-700"
                        : "text-gray-400 ring-1 ring-gray-200";
                  return (
                    <button
                      key={opt}
                      onClick={() => setAnswers((p) => ({ ...p, [i]: opt }))}
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold transition active:scale-95 ${tone}`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
              {chosen && (
                <p className={`mt-2 text-xs font-medium ${correct ? "text-emerald-700" : "text-rose-600"}`}>
                  {correct ? "⭕ 正解！ " : `❌ 正解は「${q.ans}」。 `}
                  {q.why}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

export default function FacilityManagementExperience() {
  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        🏗️ ファシリティマネジメントは<b>電源・空調・入退室などの設備を管理</b>してシステムを守る活動。
        とくに<b>UPS＝停電時に一時的に電力を供給する装置</b>が頻出です。
      </div>

      <UpsToggle />
      <Facilities />
      <Quiz />
    </div>
  );
}
