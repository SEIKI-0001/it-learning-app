"use client";

import type { ChoiceKey } from "@/types";

type Props = {
  choiceKey: ChoiceKey;
  text: string;
  onClick: () => void;
  disabled: boolean;
  // 回答後の見た目制御
  isSelected: boolean;
  isCorrect: boolean; // この選択肢が正解か
  revealed: boolean; // 回答後（正誤を表示する状態）か
};

export default function ChoiceButton({
  choiceKey,
  text,
  onClick,
  disabled,
  isSelected,
  isCorrect,
  revealed,
}: Props) {
  let tone =
    "border-gray-200 bg-white text-gray-800 active:scale-[0.99] hover:border-indigo-300";

  if (revealed) {
    if (isCorrect) {
      tone = "border-green-400 bg-green-50 text-green-800";
    } else if (isSelected) {
      tone = "border-rose-300 bg-rose-50 text-rose-700";
    } else {
      tone = "border-gray-200 bg-white text-gray-400";
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-4 text-left text-base font-medium shadow-sm transition ${tone} disabled:cursor-default`}
    >
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
          revealed && isCorrect
            ? "bg-green-500 text-white"
            : revealed && isSelected
              ? "bg-rose-400 text-white"
              : "bg-indigo-100 text-indigo-700"
        }`}
      >
        {choiceKey}
      </span>
      <span className="flex-1 leading-snug">{text}</span>
      {revealed && isCorrect && <span aria-hidden>⭕️</span>}
      {revealed && isSelected && !isCorrect && <span aria-hidden>✗</span>}
    </button>
  );
}
