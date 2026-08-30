"use client";

// 今日の学習量（GF-P1-001）。
//
// 「選ばない人に決めさせない」ことを最優先にした設計:
//   - 既定の「おまかせ」を最初から選択済みとして描く。未回答の問いに見せない。
//   - おまかせのときも実際の分量を併記し、確認だけで済ませられるようにする。
//   - どの選択肢も同じ見た目にして、長い時間を推奨しない。

import type { StudyAmountOption } from "@/lib/studyAmount";
import { STUDY_AMOUNT_OPTIONS } from "@/lib/studyAmount";

export default function StudyAmountPicker({
  selectedMinutes,
  defaultMinutes,
  onSelect,
  onClear,
}: {
  /** 選択中の分数。おまかせなら null。 */
  selectedMinutes: number | null;
  /** おまかせのときに使われる分量。 */
  defaultMinutes: number;
  onSelect: (minutes: StudyAmountOption) => void;
  onClear: () => void;
}) {
  const chipClass = (active: boolean) =>
    `rounded-full border px-3 py-1 text-xs font-medium tabular-nums transition ${
      active
        ? "border-brand-500 bg-brand-50 text-brand-800"
        : "border-gray-200 bg-white text-gray-600 hover:border-brand-300"
    }`;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-0.5 text-xs text-gray-500">今日の学習量</span>

      <button
        type="button"
        onClick={onClear}
        aria-pressed={selectedMinutes === null}
        className={chipClass(selectedMinutes === null)}
      >
        おまかせ（{defaultMinutes}分）
      </button>

      {STUDY_AMOUNT_OPTIONS.map((minutes) => (
        <button
          key={minutes}
          type="button"
          onClick={() => onSelect(minutes)}
          aria-pressed={selectedMinutes === minutes}
          className={chipClass(selectedMinutes === minutes)}
        >
          {minutes}分
        </button>
      ))}
    </div>
  );
}
