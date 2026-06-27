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
  dense?: boolean; // 縦幅を詰めた表示（単語帳の4択など）
};

export default function ChoiceButton({
  choiceKey,
  text,
  onClick,
  disabled,
  isSelected,
  isCorrect,
  revealed,
  dense = false,
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
      className={`flex w-full items-center gap-3 rounded-2xl border-2 text-left font-medium shadow-sm transition ${
        dense ? "px-3 py-2.5 text-sm" : "px-4 py-4 text-base"
      } ${tone} disabled:cursor-default`}
    >
      <span
        className={`flex shrink-0 items-center justify-center rounded-full font-bold ${
          dense ? "h-7 w-7 text-xs" : "h-8 w-8 text-sm"
        } ${
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
