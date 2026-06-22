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

// 教師あり／教師なしは「正解ラベルがあるか」で対比できる、いちばん大事なペア。
function DataLearning() {
  return (
    <Panel>
      <SectionTitle step={3}>データから学ぶ2タイプ</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        いちばんよく出るのがこの2つ。ちがいは<b className="text-gray-800">「正解（ラベル）が付いているか」</b>だけです。
      </p>

      {/* 教師あり */}
      <div className="mt-4 rounded-xl bg-indigo-50 p-3.5 ring-1 ring-indigo-200">
        <div className="flex items-center gap-2">
          <span className="text-lg">🏷️</span>
          <span className="text-sm font-extrabold text-indigo-800">教師あり学習</span>
          <span className="rounded-full bg-indigo-200 px-2 py-0.5 text-[10px] font-bold text-indigo-800">正解あり</span>
        </div>
        <p className="mt-1.5 text-sm leading-relaxed text-gray-700">
          <b>答え付きの問題集</b>で練習するイメージ。「この写真は猫」「このメールは迷惑」と
          <b>正解をセットで</b>大量に見せ、当てられるようにします。
        </p>
        <dl className="mt-2.5 space-y-1 text-xs leading-relaxed text-gray-600">
          <div><dt className="inline font-bold text-indigo-700">学び方：</dt> 入力と正解のペアから、対応のルールを覚える</div>
          <div><dt className="inline font-bold text-indigo-700">できること：</dt> 分類（迷惑メールか否か）・予測（来月の売上）</div>
          <div><dt className="inline font-bold text-indigo-700">見分け方：</dt> 学習データに「正解ラベル」が付いている</div>
        </dl>
      </div>

      {/* 教師なし */}
      <div className="mt-3 rounded-xl bg-emerald-50 p-3.5 ring-1 ring-emerald-200">
        <div className="flex items-center gap-2">
          <span className="text-lg">🧩</span>
          <span className="text-sm font-extrabold text-emerald-800">教師なし学習</span>
          <span className="rounded-full bg-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-800">正解なし</span>
        </div>
        <p className="mt-1.5 text-sm leading-relaxed text-gray-700">
          正解は教えず、<b>似たもの同士を自分でグループ分け</b>するイメージ。
          バラバラのお客さんを、買い物の傾向が近い人ごとにまとめます。
        </p>
        <dl className="mt-2.5 space-y-1 text-xs leading-relaxed text-gray-600">
          <div><dt className="inline font-bold text-emerald-700">学び方：</dt> 正解なしで、データの似ている／離れているを見る</div>
          <div><dt className="inline font-bold text-emerald-700">できること：</dt> グループ分け（顧客の分類）・傾向の発見</div>
          <div><dt className="inline font-bold text-emerald-700">見分け方：</dt> 学習データに「正解ラベル」がない</div>
        </dl>
      </div>

      <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        💡 ひとことで：<b>正解を教える＝教師あり</b>、<b>教えず仲間分け＝教師なし</b>。
      </div>
    </Panel>
  );
}

// 強化学習はデータを見るのではなく「やってみて学ぶ」別タイプなので項目を分ける。
function Reinforcement() {
  return (
    <Panel>
      <SectionTitle step={4}>やってみて学ぶタイプ</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        上の2つは用意したデータから学びました。<b className="text-gray-800">強化学習</b>は、
        実際に<b className="text-gray-800">行動してみて、その結果から学ぶ</b>のがちがいです。
      </p>

      <div className="mt-4 rounded-xl bg-violet-50 p-3.5 ring-1 ring-violet-200">
        <div className="flex items-center gap-2">
          <span className="text-lg">🎮</span>
          <span className="text-sm font-extrabold text-violet-800">強化学習</span>
          <span className="rounded-full bg-violet-200 px-2 py-0.5 text-[10px] font-bold text-violet-800">ごほうびで上達</span>
        </div>
        <p className="mt-1.5 text-sm leading-relaxed text-gray-700">
          ゲームで<b>上手な手にはスコア（報酬）</b>、まずい手には減点。
          試行錯誤をくり返し、<b>報酬が増える行動</b>を自分で見つけて上達します。
        </p>
      </div>

      {/* 試行錯誤のループ */}
      <div className="mt-3 flex items-center justify-center gap-1.5 text-center">
        {[
          { e: "🤖", t: "行動する" },
          { e: "🌍", t: "結果が出る" },
          { e: "🍬", t: "報酬／減点" },
          { e: "📈", t: "次に活かす" },
        ].map((s, i, arr) => (
          <div key={i} className="flex items-center">
            <div className="w-[64px] rounded-lg bg-gray-50 px-1 py-2 ring-1 ring-gray-200">
              <div className="text-xl leading-none">{s.e}</div>
              <div className="mt-1 text-[10px] font-bold text-gray-600">{s.t}</div>
            </div>
            {i < arr.length - 1 && <span className="px-0.5 text-gray-300">→</span>}
          </div>
        ))}
      </div>
      <p className="mt-2 text-center text-[11px] text-gray-400">このループをくり返して、だんだん賢くなる</p>

      <dl className="mt-3 space-y-1 rounded-xl bg-gray-50 p-3 text-xs leading-relaxed text-gray-600 ring-1 ring-gray-200">
        <div><dt className="inline font-bold text-violet-700">できること：</dt> ゲームAI・ロボットの制御・自動運転の判断</div>
        <div><dt className="inline font-bold text-violet-700">見分け方：</dt> 正解データではなく「報酬」で良し悪しを教える</div>
      </dl>

      <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        ⚠️ AIは<b>魔法ではない</b>。どのタイプも、学ぶデータや報酬の決め方に偏り・誤りがあれば結果も間違えます。
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
      <DataLearning />
      <Reinforcement />
    </div>
  );
}
