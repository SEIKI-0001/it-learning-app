"use client";

// 問題の解説の下に置く「モチットに聞く」。別画面へは行かず、常駐モチットの相談シートを
// その問題を理解した状態で開く。回答後（正誤が出た後）の問題にだけ置くこと。

import type { MochitQuestionContext } from "@/lib/mochitAi/types";
import { openMochitConsult } from "./mochitConsultStore";

export default function AskMochitButton({
  context,
  className = "",
}: {
  context: MochitQuestionContext;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => openMochitConsult({ from: "question_button", question: context })}
      className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-100 ${className}`}
    >
      <span aria-hidden>🐾</span>
      モチットに聞く
    </button>
  );
}
