"use client";

// 3択報酬の受け取りUI（GF-P1-005 / GF-P1-006）。
//
// 既存の choice ドロップは候補まで作られていたのに画面へ出ていなかった。ここで接続する。
//
// 守る約束:
//   - 3択はすべて「当たり」。選ばなかった選択肢による損失を作らない。
//     どれを選んでも学習は1ミリも不利にならないことを文言でも明示する。
//   - 選ぶまで消えない（未選択のまま画面を離れても保持される）。
//   - render 中に乱数を使わない。候補は保存済みの pendingChoice をそのまま描くだけ。

import type { PendingChoice, PendingChoiceOption } from "@/types/checkpoint";
import { describeChoiceOption } from "@/lib/rewardInventory";
import RarityMark, { RARITY_FRAME_CLASS } from "@/components/rewards/RarityMark";
import Icon from "@/components/ui/Icon";

export default function RewardChoiceCard({
  choice,
  onSelect,
}: {
  choice: PendingChoice;
  onSelect: (option: PendingChoiceOption) => void;
}) {
  return (
    <section
      aria-labelledby="reward-choice-heading"
      className={`rounded-xl bg-white p-4 ${RARITY_FRAME_CLASS[choice.rarity]}`}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 id="reward-choice-heading" className="text-sm font-semibold text-gray-900">
          好きなものを1つどうぞ
        </h3>
        <RarityMark rarity={choice.rarity} />
      </div>
      <p className="mt-1 text-xs text-gray-500">
        どれを選んでも学習の進みは変わりません。好みで選んで大丈夫です。
      </p>

      <ul className="mt-3 space-y-2">
        {choice.options.map((option) => (
          <li key={option.id}>
            <button
              type="button"
              onClick={() => onSelect(option)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-brand-50 active:scale-[0.99] ${RARITY_FRAME_CLASS[option.rarity]}`}
            >
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-gray-900">{option.label}</span>
                <span className="mt-0.5 block text-xs text-gray-500">
                  {describeChoiceOption(option)}
                </span>
              </span>
              <RarityMark rarity={option.rarity} />
              <Icon name="chevron-right" className="h-4 w-4 shrink-0 text-gray-400" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
