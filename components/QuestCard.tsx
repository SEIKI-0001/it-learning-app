"use client";

import { useMemo } from "react";
import type { ChoiceKey, Question } from "@/types";
import ChoiceButton from "@/components/ChoiceButton";

type Props = {
  question: Question;
  questionNumber: number; // 1始まり
  totalQuestions: number;
  selectedChoice: ChoiceKey | null; // 未回答なら null
  onSelect: (choice: ChoiceKey) => void;
};

// 選択肢は表示順だけをシャッフルする（各選択肢の key は保持する）。
// データ上は正解が先頭に並んでいるため、そのままだと「正解＝常に一番上」になってしまう。
// key を振り直さないので、採点（selectedChoice === correctChoice）や
// 「正解は◯でした」の表示はこれまで通り正しく動く。
//
// 並び順は question.id から決まる固定シャッフル。
// - SSRとクライアントで一致＝ハイドレーション不整合を防ぐ
// - 回答選択で再レンダーされても順序が変わらない（問題ごとに安定）
// - それでいて「正解が必ず先頭」にはならない

/** 文字列から決定的なシード値を作る（FNV-1a） */
function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** シード付き擬似乱数（mulberry32） */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** key を保ったまま表示順だけ Fisher-Yates でシャッフルする */
function shuffleChoices(
  choices: Question["choices"],
  rnd: () => number,
): Question["choices"] {
  const out = [...choices];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export default function QuestCard({
  question,
  questionNumber,
  totalQuestions,
  selectedChoice,
  onSelect,
}: Props) {
  const revealed = selectedChoice !== null;
  const isCorrect = selectedChoice === question.correctChoice;

  const displayChoices = useMemo(
    () => shuffleChoices(question.choices, mulberry32(hashSeed(question.id))),
    [question.id, question.choices],
  );

  return (
    <div className="rounded-3xl bg-white p-5 shadow-md">
      <div className="mb-3 flex items-center justify-between">
        <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-600">
          {question.theme}
        </span>
        <span className="text-xs font-semibold text-gray-400">
          {questionNumber} / {totalQuestions} 問
        </span>
      </div>

      <h2 className="mb-4 text-lg font-bold leading-relaxed text-gray-800">
        {question.questionText}
      </h2>

      <div className="space-y-2.5">
        {displayChoices.map((c) => (
          <ChoiceButton
            key={c.key}
            choiceKey={c.key}
            text={c.text}
            onClick={() => onSelect(c.key)}
            disabled={revealed}
            isSelected={selectedChoice === c.key}
            isCorrect={c.key === question.correctChoice}
            revealed={revealed}
          />
        ))}
      </div>

      {revealed && (
        <div
          className={`animate-pop-in mt-4 rounded-2xl p-4 ${
            isCorrect ? "bg-green-50" : "bg-amber-50"
          }`}
        >
          <p
            className={`mb-1 text-sm font-extrabold ${
              isCorrect ? "text-green-700" : "text-amber-700"
            }`}
          >
            {isCorrect ? "🎉 正解！" : "🌱 大丈夫、ここはつまずきやすいところです"}
          </p>
          <p className="text-sm leading-relaxed text-gray-700">
            {isCorrect
              ? question.explanation
              : `正解は「${question.correctChoice}」でした。${question.explanation}`}
          </p>
        </div>
      )}
    </div>
  );
}
