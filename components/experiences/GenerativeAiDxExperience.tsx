"use client";

import { useState } from "react";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「生成AIとDX」専用の体験。
//   ① 生成AIの用語（プロンプト/ハルシネーション）をタップで理解
//   ② DX=単なるIT化ではない（電子化との段階比較）
//   ③ 生成AIの使い方 適切/不適切クイズ
// ============================================================================

const TERMS = [
  {
    emo: "💬",
    name: "プロンプト",
    d: "AIへの「指示文・お願いの言葉」。具体的に書くほど、ねらった答えが返りやすい。",
  },
  {
    emo: "⚠️",
    name: "ハルシネーション",
    d: "AIが事実と違う内容を、もっともらしく自信ありげに出してしまう現象。だから人の確認が必須。",
  },
  {
    emo: "📚",
    name: "学習データ",
    d: "AIが学んだ元データ。古い・偏った情報で学べば、出力もその影響を受ける。",
  },
];

function AiTerms() {
  const [open, setOpen] = useState<string | null>("ハルシネーション");
  return (
    <Panel>
      <SectionTitle step={1}>生成AIは「賢いけど時々まちがう」アシスタント</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        生成AIは、文章・画像・プログラムなどを<b className="text-gray-800">新しく作り出す</b>AIです。
        まず大事な3つの言葉をタップで確認しましょう。
      </p>
      <div className="mt-3 space-y-2">
        {TERMS.map((t) => {
          const picked = open === t.name;
          return (
            <button
              key={t.name}
              onClick={() => setOpen(picked ? null : t.name)}
              className={`block w-full rounded-xl p-3 text-left ring-1 transition active:scale-[0.99] ${
                picked ? "bg-indigo-50 ring-indigo-300" : "bg-gray-50 ring-gray-200"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{t.emo}</span>
                <span className="text-sm font-extrabold text-gray-800">{t.name}</span>
              </div>
              {picked && <p className="mt-2 text-[13px] leading-relaxed text-gray-600">{t.d}</p>}
            </button>
          );
        })}
      </div>
      <div className="mt-3 rounded-xl bg-rose-50 px-4 py-2.5 text-xs leading-relaxed text-rose-800 ring-1 ring-rose-200">
        ⚠️ 生成AIの答えは<b>必ずしも正しくない</b>（ハルシネーション）。
        そのまま使わず、<b>人が事実を確認</b>するのが鉄則。
      </div>
    </Panel>
  );
}

const DX_STEPS = [
  { emo: "📄", name: "デジタイゼーション", d: "紙をPDFにするなど、道具をデジタルに置き換えるだけ。", level: "入口" },
  { emo: "🔁", name: "デジタライゼーション", d: "業務の流れをデジタルで効率化する（手続きをオンライン化など）。", level: "途中" },
  { emo: "🚀", name: "DX", d: "デジタルで事業や仕事のしくみそのものを変え、新しい価値を生む。", level: "ゴール" },
];

function DxLadder() {
  return (
    <Panel>
      <SectionTitle step={2}>DXは「紙の電子化」だけではない</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        DX（デジタルトランスフォーメーション）は、単に紙を電子化することではありません。
        <b className="text-gray-800">仕事や事業のしくみごと作り変える</b>のがゴールです。
      </p>
      <div className="mt-3 space-y-1.5">
        {DX_STEPS.map((s, i) => (
          <div key={s.name}>
            <div
              className={`rounded-xl px-4 py-2.5 ring-1 ${
                s.name === "DX"
                  ? "bg-emerald-50 ring-emerald-300"
                  : "bg-gray-50 ring-gray-200"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{s.emo}</span>
                <span className="text-sm font-extrabold text-gray-800">{s.name}</span>
                <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-gray-500 ring-1 ring-gray-200">
                  {s.level}
                </span>
              </div>
              <p className="mt-1 text-[12px] leading-relaxed text-gray-600">{s.d}</p>
            </div>
            {i < DX_STEPS.length - 1 && (
              <div className="py-0.5 text-center text-xs text-gray-300">↑ さらに進める</div>
            )}
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-gray-500">
        ※ 「紙をPDFにしただけ」「PCを買い替えただけ」は<b>DXとは言えない</b>のが定番のひっかけ。
      </p>
    </Panel>
  );
}

const QUIZ: { t: string; ans: "適切" | "不適切"; why: string }[] = [
  {
    t: "生成AIが書いた説明文を、内容を確認せずそのまま公式資料として公開した。",
    ans: "不適切",
    why: "ハルシネーション（誤り）の可能性があるため、人の確認が必要。",
  },
  {
    t: "生成AIに下書きを作らせ、事実関係を自分で確かめてから仕上げた。",
    ans: "適切",
    why: "下書きに使い、人が確認するのは正しい使い方。",
  },
  {
    t: "会社の機密情報や顧客の個人情報を、外部の生成AIにそのまま入力した。",
    ans: "不適切",
    why: "機密・個人情報の入力は情報漏えいのリスクがあり避けるべき。",
  },
  {
    t: "「紙の申請書をPDFにしただけ」を、会社のDX達成と発表した。",
    ans: "不適切",
    why: "電子化だけではDXとは言えない（しくみの変革が伴っていない）。",
  },
];

function Quiz() {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  return (
    <Panel>
      <SectionTitle step={3}>その使い方、適切？　不適切？</SectionTitle>
      <ul className="mt-3 space-y-2.5">
        {QUIZ.map((q, i) => {
          const chosen = answers[i];
          const correct = chosen === q.ans;
          return (
            <li key={i} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
              <div className="text-sm font-bold text-gray-800">{q.t}</div>
              <div className="mt-2 flex gap-1.5">
                {(["適切", "不適切"] as const).map((opt) => {
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
                      {opt === "適切" ? "⭕ 適切" : "❌ 不適切"}
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

export default function GenerativeAiDxExperience() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        🤖 生成AIは<b>便利だが誤る（ハルシネーション）</b>ので人の確認が必須。
        DXは<b>電子化だけでなく、しくみごと変えて新しい価値を生む</b>こと。
      </div>

      <AiTerms />
      <DxLadder />
      <Quiz />
    </div>
  );
}
