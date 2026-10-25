"use client";

import { useState, type ReactNode } from "react";
import { Panel, SectionTitle } from "../ui";

// 生成AIとDXの解説で、過去問の出題に合わせて足した4枚。
// 10/9 に決めた「DXとは」と「似ている2つの比較」の2枚（1ページに1つの問い・表は3列まで）はそのまま残す。
//   ⑤ 生成AIのしくみと言葉：基盤モデル→ファインチューニング、生成AIの定義、プロンプトエンジニアリング、似た言葉
//   ⑥ 人間中心のAI社会原則：3つの基本理念と7つのAI社会原則、取り違えやすい記述
//   ⑦ 「デジタル○○」の見分け方
//   ⑧ どれ？ クイズ
// 文言は公式過去問（令和4〜8年度）と「人間中心のAI社会原則」（内閣府、2019）の言い回しにそろえている。

function Lead({ children }: { children: ReactNode }) {
  return <p className="mt-2 text-sm leading-relaxed text-gray-600 [&_b]:font-bold [&_b]:text-gray-800">{children}</p>;
}

function Takeaway({ children }: { children: ReactNode }) {
  return (
    <p className="mt-3 border-t border-gray-100 pt-3 text-sm leading-relaxed text-gray-700 [&_b]:font-bold [&_b]:text-gray-900">{children}</p>
  );
}

function TermList({ items, testId, col }: { items: { t: string; d: ReactNode }[]; testId: string; col: string }) {
  return (
    <dl className="mt-2 space-y-1.5" data-testid={testId}>
      {items.map((x) => (
        <div key={x.t} className="grid items-baseline gap-2 text-[12.5px] leading-snug" style={{ gridTemplateColumns: `${col} 1fr` }} data-term={x.t}>
          <dt className="font-bold text-gray-900">{x.t}</dt>
          <dd className="text-gray-700">{x.d}</dd>
        </div>
      ))}
    </dl>
  );
}

// ⑤ 生成AIのしくみと言葉 ------------------------------------------------------------------
const USES = ["文章を書くAI", "画像を作るAI", "翻訳・要約"];

export function GenAiMechanismPanel({ step }: { step: number }) {
  return (
    <Panel>
      <SectionTitle step={step}>生成AIのしくみと言葉</SectionTitle>
      <Lead>
        生成AIは、<b>自然言語で指示された内容</b>に従い、<b>事前に学習したデータを基に</b>、新しいコンテンツを生成します。学習なしで作れるわけではありません。
      </Lead>

      <div className="mt-3 flex flex-col items-stretch gap-1 text-center text-[12.5px]" data-testid="foundation-flow">
        <div className="rounded-lg bg-slate-50 px-2 py-1.5 text-gray-700 ring-1 ring-slate-200">広範囲かつ大量のデータで訓練</div>
        <span className="text-gray-400" aria-hidden>
          ↓
        </span>
        <div className="rounded-lg bg-gray-900 px-2 py-2 font-bold text-white">基盤モデル</div>
        <span className="text-[11.5px] text-gray-600">↓ ファインチューニング（用途に合わせて追加で学習）</span>
        <div className="grid grid-cols-3 gap-1">
          {USES.map((u) => (
            <span key={u} className="rounded-lg bg-brand-50 px-1 py-1.5 font-bold text-brand-800 ring-1 ring-brand-200">
              {u}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-[12.5px] leading-snug text-gray-800 ring-1 ring-amber-200" data-testid="prompt-engineering">
        <b className="text-gray-900">プロンプトエンジニアリング</b>：意図した回答を得るために、AIへの<b className="text-gray-900">質問や指示の内容・情報の提供・出力形式の指定</b>などを工夫すること（ラボの「具体的に頼む」）。
      </div>

      <p className="mt-3 text-[13px] font-bold text-gray-800">ハルシネーションと並ぶ言葉</p>
      <TermList
        testId="genai-terms"
        col="7.25rem"
        items={[
          { t: "ハルシネーション", d: "もっともらしいが事実と異なる内容を出力すること" },
          { t: "ディープフェイク", d: "AIで作った、本物そっくりの偽の画像・動画・音声" },
          { t: "エコーチェンバー", d: "似た意見ばかりに囲まれ、考えが強まっていく現象" },
          { t: "シンギュラリティ", d: "AIが人間の知能を超える転換点（技術的特異点）" },
        ]}
      />
    </Panel>
  );
}

// ⑥ 人間中心のAI社会原則 --------------------------------------------------------------------
const IDEALS = ["人間の尊厳が尊重される社会", "多様な背景を持つ人々が多様な幸せを追求できる社会", "持続性ある社会"];
const PRINCIPLES: { t: string; d: string }[] = [
  { t: "人間中心", d: "基本的人権を侵さない。AIの利用方法は人が判断・決定する" },
  { t: "教育・リテラシー", d: "情報弱者を生まないよう、幼児・初等中等教育からAIや情報リテラシーを教える" },
  { t: "プライバシー確保", d: "個人のデータが本人の望まない形で使われないようにする" },
  { t: "セキュリティ確保", d: "AIのリスクを把握し、安全に使えるようにする" },
  { t: "公正競争確保", d: "特定の国や企業にAIの資源が集中し、支配的な地位が濫用されないようにする" },
  { t: "公平性、説明責任及び透明性", d: "不当な差別をしない。AIを使っている事実やデータの取得・使用方法、結果の適切性を説明する" },
  { t: "イノベーション", d: "国際化・多様化、官民の連携、柔軟な人材の移動を進め、AIとともに人も進化する" },
];

export function AiPrinciplesPanel({ step }: { step: number }) {
  return (
    <Panel>
      <SectionTitle step={step}>人間中心のAI社会原則</SectionTitle>
      <Lead>
        政府が定めたAIの指針。<b>3つの基本理念</b>（めざす社会の姿）と、社会が留意すべき<b>7つのAI社会原則</b>からなります。
      </Lead>
      <ol className="mt-2.5 grid gap-1" data-testid="ai-ideals">
        {IDEALS.map((x, i) => (
          <li key={x} className="flex items-center gap-2 rounded-lg bg-brand-50 px-2.5 py-1.5 text-[12.5px] font-bold text-brand-900 ring-1 ring-brand-200">
            <span className="flex-none whitespace-nowrap font-mono text-[11px] text-brand-600">理念{i + 1}</span>
            {x}
          </li>
        ))}
      </ol>
      <dl className="mt-3 space-y-1" data-testid="ai-principles">
        {PRINCIPLES.map((p) => (
          <div key={p.t} className="grid grid-cols-[6.75rem_1fr] items-baseline gap-2 text-[12px] leading-snug" data-term={p.t}>
            <dt className="font-bold text-gray-900">{p.t}</dt>
            <dd className="text-gray-700">{p.d}</dd>
          </div>
        ))}
      </dl>
      <Takeaway>
        ひっかけ：「人間があらゆる労働から解放される社会」は理念にない。「AIが自律的に判断・決定」「リテラシーの高い人から段階的に」は原則と逆です。
      </Takeaway>
    </Panel>
  );
}

// ⑦ デジタル○○ ------------------------------------------------------------------------
const DIGITAL = [
  { t: "デジタルトランスフォーメーション", d: "デジタル技術が生活やビジネスのあらゆる面に影響を与え、変革をもたらす" },
  { t: "デジタルディスラプション", d: "デジタル技術で生んだ優れたUXやビジネスモデルが従来のサービスを駆逐し、業界の構造を破壊する" },
  { t: "デジタルディバイド", d: "デジタル製品を使いこなせる人とそうでない人の間に生じる、機会や格差の差" },
  { t: "デジタルネイティブ", d: "生まれた時からネットやスマホが身近にあり、それを使いながら育った世代" },
  { t: "デジタルサイネージ", d: "駅や店頭のディスプレイに広告や案内を表示する電子看板" },
];

export function DigitalTermsPanel({ step }: { step: number }) {
  return (
    <Panel>
      <SectionTitle step={step}>「デジタル○○」の見分け方</SectionTitle>
      <Lead>
        試験では同じ「デジタル」で始まる言葉が選択肢に並びます。<b>後ろの英単語の意味</b>で見分けます。
      </Lead>
      <ul className="mt-3 space-y-2" data-testid="digital-terms">
        {DIGITAL.map((x) => {
          const [, tail] = x.t.split("デジタル");
          return (
            <li key={x.t} className="rounded-xl px-3 py-2 ring-1 ring-gray-200" data-term={x.t}>
              <p className="text-[13.5px] font-bold text-gray-900">
                デジタル<span className="text-brand-700">{tail}</span>
              </p>
              <p className="mt-0.5 text-[12.5px] leading-snug text-gray-700">{x.d}</p>
            </li>
          );
        })}
      </ul>
      <Takeaway>
        transformation＝変革、disruption＝破壊、divide＝分断、native＝生まれつき、signage＝看板。
        アナログ信号をデジタル信号に変えるのは単なる<b>デジタル化</b>で、DXではありません。
      </Takeaway>
    </Panel>
  );
}

// ⑧ どれ？ ------------------------------------------------------------------------------
const QUIZ = [
  {
    t: "大量のデータで訓練し、ファインチューニングで様々な用途に適応できるAIは？",
    ans: "基盤モデル",
    opts: ["基盤モデル", "エキスパート​システム", "アノテーション"],
    why: "大量のデータで訓練した土台＝基盤モデル。アノテーションはデータに正解のラベルを付ける作業。",
  },
  {
    t: "人間中心のAI社会原則の基本理念に「ない」のは？",
    ans: "労働からの解放",
    opts: ["持続性ある社会", "人間の尊厳", "労働からの解放"],
    why: "理念は「人間の尊厳」「多様な幸せ」「持続性」の3つ。",
  },
  {
    t: "新しいネット配車サービスが広まり、従来のタクシー業界の構造が崩れた。",
    ans: "ディスラプション",
    opts: ["ディバイド", "ディスラプション", "サイネージ"],
    why: "既存の業界構造を壊す＝デジタルディスラプション。",
  },
  {
    t: "AIを使っている事実やデータの使い方を、利用者に説明する。どの原則？",
    ans: "説明責任・透明性",
    opts: ["イノベーション", "説明責任・透明性", "公正競争確保"],
    why: "使っている事実・データの取得や使用方法を説明する＝公平性、説明責任及び透明性の原則。",
  },
];

export function GenAiQuiz({ step }: { step: number }) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  return (
    <Panel>
      <SectionTitle step={step}>どれ？</SectionTitle>
      <ul className="mt-3 space-y-2" data-testid="genai-quiz">
        {QUIZ.map((q, i) => {
          const chosen = answers[i];
          const correct = chosen === q.ans;
          return (
            <li key={q.t} className="rounded-xl bg-gray-50 p-2.5 ring-1 ring-gray-200">
              <div className="text-[13px] font-bold leading-snug text-gray-800">{q.t}</div>
              <div className="mt-1.5 grid grid-cols-3 gap-1.5">
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
                      className={`rounded-lg px-1 py-1.5 text-[11px] font-bold leading-tight transition [word-break:auto-phrase] active:scale-95 ${tone}`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
              {chosen && (
                <p className={`mt-1.5 text-xs font-medium ${correct ? "text-emerald-700" : "text-rose-600"}`}>
                  {correct ? "正解！ " : `正解は「${q.ans}」。 `}
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
