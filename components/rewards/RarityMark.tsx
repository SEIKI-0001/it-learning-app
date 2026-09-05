"use client";

// レアリティの識別表示（GF-P1-006）。
//
// 色だけに依存させない。common / rare / epic を「ラベル文言」「アイコン形状」
// 「枠線の太さ」の3つで区別し、色覚に依存せず読み取れるようにする。

import type { BadgeRarity } from "@/types/checkpoint";
import { BADGE_RARITY_LABELS } from "@/types/checkpoint";
import Icon, { type IconName } from "@/components/ui/Icon";

/** 形の違いでレアリティが分かるようにする（色を見なくても識別できる）。 */
const RARITY_ICONS: Record<BadgeRarity, IconName> = {
  common: "circle",
  rare: "star",
  epic: "award",
};

const RARITY_CLASS: Record<BadgeRarity, string> = {
  common: "border border-gray-300 bg-white text-gray-700",
  rare: "border-2 border-brand-400 bg-brand-50 text-brand-800",
  epic: "border-2 border-accent-500 bg-accent-50 text-accent-800",
};

export default function RarityMark({
  rarity,
  className = "",
}: {
  rarity: BadgeRarity;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${RARITY_CLASS[rarity]} ${className}`}
    >
      <Icon name={RARITY_ICONS[rarity]} className="h-3 w-3" aria-hidden />
      {BADGE_RARITY_LABELS[rarity]}
    </span>
  );
}

/** カードの枠に付けるレアリティ別のクラス（色 + 線の太さで差をつける）。 */
export const RARITY_FRAME_CLASS: Record<BadgeRarity, string> = {
  common: "border border-gray-200",
  rare: "border-2 border-brand-300",
  epic: "border-2 border-accent-400 shadow-sm",
};
