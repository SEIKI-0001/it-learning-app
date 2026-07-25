// 単語帳の画面で共有する見た目メタ情報（状態バッジ・カテゴリバッジ）。
// 状態色は /learn の学習状態(未着手→学習中→復習待ち→習得済み)と同じ意味体系に合わせる。
// カテゴリは「状態」ではなく分類なので、装飾的な多色は使わず無彩色で揃える。

import type { WordStatus } from "@/lib/wordlistProgress";
import type { WordlistCategory } from "@/types/wordlist";

export const STATUS_META: Record<
  WordStatus,
  { label: string; badge: string; dot: string }
> = {
  new: { label: "未学習", badge: "bg-gray-100 text-gray-600", dot: "bg-gray-300" },
  learning: {
    label: "学習中",
    badge: "bg-brand-100 text-brand-700",
    dot: "bg-brand-500",
  },
  weak: {
    label: "苦手",
    badge: "bg-accent-100 text-accent-700",
    dot: "bg-accent-500",
  },
  mastered: {
    label: "定着",
    badge: "bg-emerald-100 text-emerald-700",
    dot: "bg-emerald-500",
  },
};

const NEUTRAL_CATEGORY = "border border-gray-200 bg-white text-gray-600";

export const CATEGORY_BADGE: Record<WordlistCategory, string> = {
  strategy: NEUTRAL_CATEGORY,
  management: NEUTRAL_CATEGORY,
  technology: NEUTRAL_CATEGORY,
  security: NEUTRAL_CATEGORY,
  ai: NEUTRAL_CATEGORY,
  finance: NEUTRAL_CATEGORY,
};
