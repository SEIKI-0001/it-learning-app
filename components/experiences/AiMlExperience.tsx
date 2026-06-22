"use client";

import { useState } from "react";
import { Panel, SectionTitle, StepNav } from "./ui";

// ============================================================================
// 「AIと機械学習」専用の体験。
//   ① 包含図：AI ⊃ 機械学習 ⊃ 深層学習・生成AI
//   ② 機械学習の流れ（例を集める→学ぶ→モデル→予測）をStepで実演
//   ③ 学習の3タイプ（教師あり／教師なし／強化）の早見
// ============================================================================

function Nested() {
  return (
    <Panel>
      <SectionTitle step={1}>言葉の大きさを整理</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        AI・機械学習・生成AIは<b className="text-gray-800">大きさの違う入れ子</b>の関係です。
      </p>
      <div className="mt-4 rounded-2xl bg-violet-50 p-3 ring-2 ring-violet-300">
        <div className="text-xs font-extrabold text-violet-700">🤖 AI（人工知能）</div>
        <div className="mt-0.5 text-[11px] text-violet-600/80">人の知的な判断に近い処理ぜんぶ</div>
        <div className="mt-2.5 rounded-xl bg-indigo-50 p-3 ring-2 ring-indigo-300">
          <div className="text-xs font-extrabold text-indigo-700">📊 機械学習</div>
          <div className="mt-0.5 text-[11px] text-indigo-600/80">データからパターンを学ぶ代表的な方法</div>
          <div className="mt-2.5 rounded-lg bg-sky-100 p-3 ring-2 ring-sky-300">
            <div className="text-xs font-extrabold text-sky-700">🧠 深層学習・生成AI</div>
            <div className="mt-0.5 text-[11px] text-sky-600/80">機械学習をさらに発展させた方法</div>
          </div>
        </div>
      </div>
      <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        💡 一番大きいのが <b>AI</b>。その中の代表が <b>機械学習</b>。さらにその中に <b>生成AI</b> がいます。
      </div>
    </Panel>
  );
}

const STEPS = [
  {
    label: "① 例を集める",
    html: "猫の写真を<b>たくさん</b>用意し「これは猫」とラベルを付けます。データの<b>量と質</b>が結果を左右します。",
    art: ["🐱", "🐱", "🐱", "🐱"],
    badge: "📥 データ",
  },
  {
    label: "② 特徴を学ぶ",
    html: "コンピュータが共通点（耳の形・ひげ・輪郭…）を自分で見つけ、<b>パターン（コツ）</b>をつかみます。",
    art: ["👂", "〰️", "⬭"],
    badge: "🔁 学習",
  },
  {
    label: "③ モデル完成",
    html: "学んだコツが詰まった<b>モデル</b>ができます。これが「判断の型」です。",
    art: ["🧠"],
    badge: "📦 モデル",
  },
  {
    label: "④ 予測する",
    html: "<b>初めて見る写真</b>をモデルに見せると「これは猫」と判定できます。これが機械学習の使い道です。",
    art: ["❓", "→", "🐱"],
    badge: "🎯 予測",
  },
];

function MlFlow() {
  const [idx, setIdx] = useState(0);
  const step = STEPS[idx];
  return (
    <Panel>
      <SectionTitle step={2}>機械学習の流れ</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        「<b className="text-gray-800">猫の写真を見分けるAI</b>」を例に、1歩ずつ進めてみよう。
      </p>

      <div className="mt-3 flex gap-1.5">
        {STEPS.map((s, i) => (
          <div
            key={i}
            className={`flex-1 rounded-lg px-1 py-1.5 text-center text-[10px] font-bold transition ${
              i === idx ? "bg-indigo-600 text-white" : i < idx ? "bg-indigo-100 text-indigo-600" : "bg-gray-100 text-gray-400"
            }`}
          >
            {s.badge}
          </div>
        ))}
      </div>

      <div className="mt-4 flex min-h-[64px] items-center justify-center gap-2 rounded-xl bg-gray-50 py-4 ring-1 ring-gray-200">
        {step.art.map((a, i) => (
          <span key={i} className="text-3xl">{a}</span>
        ))}
      </div>

      <p
        className="mt-3 min-h-[3.5em] rounded-xl bg-sky-50 px-4 py-3 text-sm leading-relaxed text-gray-700 ring-1 ring-sky-200 [&_b]:text-gray-900"
        dangerouslySetInnerHTML={{ __html: `<b>${step.label}</b>：${step.html}` }}
      />

      <StepNav
        index={idx}
        total={STEPS.length}
        onPrev={() => setIdx((i) => Math.max(0, i - 1))}
        onNext={() => setIdx((i) => Math.min(STEPS.length - 1, i + 1))}
        onReset={() => setIdx(0)}
        doneLabel="予測まで完成 🎉"
      />
    </Panel>
  );
}

const TYPES = [
  { name: "教師あり学習", emoji: "🏷️", desc: "正解ラベル付きデータで学ぶ。予測・分類が得意。", ex: "迷惑メール判定、売上予測" },
  { name: "教師なし学習", emoji: "🧩", desc: "正解なしで似たものをグループ分け。", ex: "顧客のグループ分け" },
  { name: "強化学習", emoji: "🎮", desc: "試行錯誤し、良い結果に報酬を与えて上達。", ex: "ゲームAI、ロボット制御" },
];

function Types() {
  return (
    <Panel>
      <SectionTitle step={3}>学習の3タイプ（早見）</SectionTitle>
      <div className="mt-3 space-y-2.5">
        {TYPES.map((t) => (
          <div key={t.name} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
            <div className="flex items-center gap-2">
              <span className="text-lg">{t.emoji}</span>
              <span className="text-sm font-extrabold text-gray-800">{t.name}</span>
            </div>
            <p className="mt-1 text-sm leading-relaxed text-gray-600">{t.desc}</p>
            <p className="mt-1 text-[11px] text-gray-400">例：{t.ex}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        ⚠️ AIは<b>魔法ではない</b>。学んだデータに偏りや誤りがあれば、結果も間違えます。
      </div>
    </Panel>
  );
}

export default function AiMlExperience() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        🤖 <b>AI</b> は知的な処理の総称。その代表が、データからパターンを学ぶ <b>機械学習</b>。
        問題集をたくさん解いて傾向をつかむ学習者のように、<b>データを見て判断のコツを覚えます</b>。
      </div>

      <Nested />
      <MlFlow />
      <Types />
    </div>
  );
}
