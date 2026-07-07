// 突破・バッジ獲得にともなう「新しい装備を解放しました」表示。
// 派手にしすぎず、何が増えたか・次に何をすればよいかが分かることを優先する。

import Link from "next/link";
import type { AvatarItemDef } from "@/types/avatar";
import { AVATAR_SLOT_LABELS } from "@/types/avatar";

type Props = {
  /** 今回新たに解放された装備。 */
  items: AvatarItemDef[];
  /** 今回新たに獲得したバッジ名（表示のみ）。 */
  badgeLabels?: string[];
};

export default function AvatarUnlockToast({ items, badgeLabels = [] }: Props) {
  if (items.length === 0 && badgeLabels.length === 0) return null;

  return (
    <div className="animate-pop-in rounded-2xl bg-amber-50 p-4 text-left ring-1 ring-amber-200">
      {badgeLabels.length > 0 && (
        <div>
          <p className="text-xs font-bold text-amber-700">🏅 新しいバッジを獲得</p>
          <ul className="mt-1 flex flex-wrap gap-1.5">
            {badgeLabels.map((label) => (
              <li
                key={label}
                className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-amber-700 ring-1 ring-amber-200"
              >
                {label}
              </li>
            ))}
          </ul>
        </div>
      )}

      {items.length > 0 && (
        <div className={badgeLabels.length > 0 ? "mt-3" : ""}>
          <p className="text-xs font-bold text-amber-700">
            🎁 新しい装備を解放しました
          </p>
          <ul className="mt-1 space-y-1">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between rounded-xl bg-white px-3 py-2 ring-1 ring-amber-200"
              >
                <span className="text-sm font-extrabold text-gray-800">
                  {item.name}
                </span>
                <span className="shrink-0 text-[11px] font-bold text-gray-400">
                  {AVATAR_SLOT_LABELS[item.slot]}
                </span>
              </li>
            ))}
          </ul>
          <Link
            href="/avatar"
            className="mt-2 block text-center text-xs font-bold text-indigo-600 underline underline-offset-2"
          >
            装備を付け替える →
          </Link>
        </div>
      )}
    </div>
  );
}
