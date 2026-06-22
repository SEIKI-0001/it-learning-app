"use client";

import { useState } from "react";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「バリューチェーン（価値連鎖）」専用の体験。
//   ① 主活動を矢印の流れで見る（価値が積み上がっていく）
//   ② 支援活動が下から全体を支える図
//   ③ 「主活動？支援活動？」仕分けクイズ
// ============================================================================

const MAIN = [
  { emo: "📥", name: "購買物流", d: "原材料や部品を仕入れ、受け入れる" },
  { emo: "🏭", name: "製造", d: "材料を加工して製品をつくる" },
  { emo: "📦", name: "出荷物流", d: "完成した製品を保管・配送する" },
  { emo: "🛒", name: "販売・マーケティング", d: "宣伝し、顧客に売る" },
  { emo: "🔧", name: "サービス", d: "アフターサポートで価値を保つ" },
];

const SUPPORT = [
  { emo: "🏢", name: "全般管理", d: "経営・経理・法務など全体の管理" },
  { emo: "👥", name: "人事・労務管理", d: "採用・教育・働く環境づくり" },
  { emo: "🔬", name: "技術開発", d: "研究や新技術の開発" },
  { emo: "🛍️", name: "調達", d: "設備や資材を買い入れる活動" },
];

function MainFlow() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <Panel>
      <SectionTitle step={1}>主活動 ― 価値が積み上がる流れ</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        <b className="text-gray-800">主活動</b>は、仕入れから製造・出荷・販売・サービスまで、
        <b className="text-gray-800">価値を直接生み出していく流れ</b>です。各工程をタップしてみましょう。
      </p>
      <div className="mt-3 space-y-1.5">
        {MAIN.map((m, i) => {
          const picked = open === i;
          return (
            <div key={m.name}>
              <button
                onClick={() => setOpen(picked ? null : i)}
                className={`flex w-full items-center gap-2.5 rounded-xl p-2.5 text-left ring-1 transition active:scale-[0.99] ${
                  picked ? "bg-indigo-50 ring-indigo-300" : "bg-gray-50 ring-gray-200"
                }`}
              >
                <span className="grid h-7 w-7 flex-none place-items-center rounded-lg bg-white text-base ring-1 ring-gray-200">
                  {m.emo}
                </span>
                <span className="text-sm font-extrabold text-gray-800">{m.name}</span>
                <span className="ml-auto text-[11px] font-bold text-emerald-600">価値 +</span>
              </button>
              {picked && (
                <p className="px-2 pt-1.5 text-[13px] leading-relaxed text-gray-600">{m.d}</p>
              )}
              {i < MAIN.length - 1 && (
                <div className="py-0.5 text-center text-xs text-gray-300">↓</div>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-3 rounded-xl bg-emerald-50 px-4 py-2.5 text-xs leading-relaxed text-emerald-800 ring-1 ring-emerald-200">
        💰 各工程で価値が少しずつ加わり、最後に利益（マージン）として残ります。
      </div>
    </Panel>
  );
}

function Support() {
  return (
    <Panel>
      <SectionTitle step={2}>支援活動 ― 下から全体を支える</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        <b className="text-gray-800">支援活動</b>は、直接モノを作るわけではないけれど、
        主活動を<b className="text-gray-800">下支えする</b>活動です。
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        {SUPPORT.map((s) => (
          <div key={s.name} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
            <div className="flex items-center gap-1.5">
              <span className="text-lg">{s.emo}</span>
              <span className="text-sm font-extrabold text-gray-800">{s.name}</span>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-gray-500">{s.d}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-gray-500">
        ※ 人事・技術開発・調達は「価値を直接生む流れ」ではなく、それを<b>支える</b>側＝支援活動。
        ここが主活動とよく取り違えられます。
      </p>
    </Panel>
  );
}

const QUIZ: { t: string; ans: "主活動" | "支援活動"; why: string }[] = [
  { t: "工場で部品を組み立てて製品をつくる", ans: "主活動", why: "製造は価値を直接生む主活動。" },
  { t: "社員を採用し、研修で育てる", ans: "支援活動", why: "人事・労務管理は主活動を支える支援活動。" },
  { t: "完成した商品を店舗やお客様へ配送する", ans: "主活動", why: "出荷物流は主活動。" },
  { t: "新しい素材を研究開発する", ans: "支援活動", why: "技術開発は支援活動。" },
  { t: "広告を出して商品を売り込む", ans: "主活動", why: "販売・マーケティングは主活動。" },
];

function Quiz() {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  return (
    <Panel>
      <SectionTitle step={3}>主活動？　支援活動？</SectionTitle>
      <ul className="mt-3 space-y-2.5">
        {QUIZ.map((q, i) => {
          const chosen = answers[i];
          const correct = chosen === q.ans;
          return (
            <li key={i} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
              <div className="text-sm font-bold text-gray-800">{q.t}</div>
              <div className="mt-2 flex gap-1.5">
                {(["主活動", "支援活動"] as const).map((opt) => {
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
                      className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-bold transition active:scale-95 ${tone}`}
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

export default function ValueChainExperience() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        🔗 バリューチェーン（価値連鎖）は、会社の活動を<b>「価値を直接生む主活動」</b>と
        <b>「それを支える支援活動」</b>に分け、<b>どこに強みがあるか</b>を見える化します。
      </div>

      <MainFlow />
      <Support />
      <Quiz />
    </div>
  );
}
