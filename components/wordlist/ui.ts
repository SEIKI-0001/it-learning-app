// 単語帳の画面で共有する見た目メタ情報（状態バッジ・カテゴリバッジ）。

import type { WordStatus } from "@/lib/wordlistProgress";
import type { WordlistCategory } from "@/types/wordlist";

export const STATUS_META: Record<
  WordStatus,
  { label: string; badge: string; dot: string }
> = {
  new: { label: "未学習", badge: "bg-gray-100 text-gray-500", dot: "bg-gray-300" },
  learning: {
    label: "学習中",
    badge: "bg-amber-100 text-amber-700",
    dot: "bg-amber-400",
  },
  weak: { label: "苦手", badge: "bg-rose-100 text-rose-700", dot: "bg-rose-400" },
  mastered: {
    label: "定着",
    badge: "bg-green-100 text-green-700",
    dot: "bg-green-500",
  },
};

export const CATEGORY_BADGE: Record<WordlistCategory, string> = {
  strategy: "bg-violet-100 text-violet-700",
  management: "bg-amber-100 text-amber-700",
  technology: "bg-sky-100 text-sky-700",
  security: "bg-rose-100 text-rose-700",
  ai: "bg-fuchsia-100 text-fuchsia-700",
  finance: "bg-emerald-100 text-emerald-700",
};
