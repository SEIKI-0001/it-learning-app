"use client";

// 試験予定日の入力（初回設定・設定で共通）。
// 「1か月後／2か月後／3か月後／未定」から選ぶか、日付を直接入れる。
// 未定なら3か月後を仮の試験日にして、Today の量を逆算する（lib/examDateChoice.ts）。

import type { UserProfile } from "@/types";
import {
  EXAM_MONTH_PRESETS,
  PROVISIONAL_EXAM_MONTHS,
  resolveExamDateChoice,
  type ExamDateChoice,
} from "@/lib/examDateChoice";

export default function ExamDateField({
  choice,
  onChange,
  current,
}: {
  choice: ExamDateChoice | null;
  onChange: (choice: ExamDateChoice | null) => void;
  /** 保存済みのプロフィール。仮の試験日を保存し直しても動かさないために使う。 */
  current?: Pick<UserProfile, "examDate" | "examPlan">;
}) {
  const resolved = resolveExamDateChoice(choice, new Date(), current);

  const presetButton = (key: string, label: string, active: boolean, next: ExamDateChoice) => (
    <button
      key={key}
      type="button"
      onClick={() => onChange(next)}
      aria-pressed={active}
      className={`h-12 rounded-lg border text-sm transition active:scale-[0.98] ${
        active
          ? "border-brand-600 bg-brand-50 font-semibold text-brand-800"
          : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div>
      <div className="grid grid-cols-4 gap-2" role="group" aria-label="試験までの期間">
        {EXAM_MONTH_PRESETS.map((months) =>
          presetButton(
            `m${months}`,
            `${months}か月後`,
            choice?.kind === "months" && choice.months === months,
            { kind: "months", months },
          ),
        )}
        {presetButton("undecided", "未定", choice?.kind === "undecided", { kind: "undecided" })}
      </div>
      <label className="mt-3 block">
        <span className="mb-1.5 block text-sm text-gray-600">日付で指定する</span>
        <input
          type="date"
          value={resolved.examDate ?? ""}
          onChange={(e) => onChange(e.target.value ? { kind: "date", date: e.target.value } : null)}
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-base text-gray-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
      </label>
      <p className="mt-1.5 text-xs text-gray-500">
        {choice?.kind === "undecided"
          ? `決まっていなければ、${PROVISIONAL_EXAM_MONTHS}か月後を仮の試験日にして逆算します。決まったら変えてください。`
          : "試験日から逆算して、毎日の量を決めます。あとから変えられます。"}
      </p>
    </div>
  );
}
