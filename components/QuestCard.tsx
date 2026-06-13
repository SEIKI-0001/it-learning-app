"use client";

import type { ChoiceKey, Question } from "@/types";
import ChoiceButton from "@/components/ChoiceButton";

type Props = {
  question: Question;
  questionNumber: number; // 1始まり
  totalQuestions: number;
  selectedChoice: ChoiceKey | null; // 未回答なら null
  onSelect: (choice: ChoiceKey) => void;
};

export default function QuestCard({
  question,
  questionNumber,
  totalQuestions,
  selectedChoice,
  onSelect,
}: Props) {
  const revealed = selectedChoice !== null;
  const isCorrect = selectedChoice === question.correctChoice;

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
        {question.choices.map((c) => (
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
