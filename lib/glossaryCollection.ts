// 単語帳図鑑の導出（GF-P1-008・純関数・保存なし）。
//
// 既存の wordlist progress（lib/wordlistProgress）をそのまま読み、カテゴリ別の
// グリッドとコンプ率を組み立てるだけ。新しい進捗も報酬も作らない。
//
// 境界:
//   - 図鑑の状態は既存の WordStatus をそのまま写す。独自判定を作らない。
//   - コンプ率は表示のためだけの値で、学習評価（合格準備度・バッジ）へは渡さない。
//     カテゴリ達成をバッジへつなぐ場合も既存の badgeSignals 経路を使う。
//   - 未学習語も略語を伏せずに並べる。図鑑化で教材としての検索性を落とさない。

import type { WordlistCategory } from "@/types/wordlist";
import type { WordProgressMap, WordStatus } from "@/lib/wordlistProgress";
import { getAllWords } from "@/lib/wordlist";

/** カテゴリの表示名。 */
export const WORDLIST_CATEGORY_LABELS: Record<WordlistCategory, string> = {
  strategy: "ストラテジ",
  management: "マネジメント",
  technology: "テクノロジ",
  security: "セキュリティ",
  ai: "AI",
  finance: "会計・財務",
};

/** 図鑑での表示状態。既存の WordStatus と 1:1 で対応させる。 */
export const WORD_STATUS_LABELS: Record<WordStatus, string> = {
  mastered: "定着",
  weak: "苦手",
  learning: "学習中",
  new: "未学習",
};

export type CollectionEntry = {
  id: string;
  acronym: string;
  japanese: string;
  status: WordStatus;
};

export type CollectionCategory = {
  category: WordlistCategory;
  label: string;
  entries: CollectionEntry[];
  total: number;
  masteredCount: number;
  /** 定着した割合（0〜100）。表示専用。 */
  completionPct: number;
};

/** カテゴリ内の並び順。図鑑として引きやすいよう略語のアルファベット順に固定する。 */
function byAcronym(a: CollectionEntry, b: CollectionEntry): number {
  return a.acronym.localeCompare(b.acronym);
}

/**
 * カテゴリ別の図鑑を組み立てる。
 * 語を持たないカテゴリは返さない（空のグリッドを出さないため）。
 */
export function buildGlossaryCollection(progress: WordProgressMap): CollectionCategory[] {
  const byCategory = new Map<WordlistCategory, CollectionEntry[]>();

  for (const word of getAllWords()) {
    const entry: CollectionEntry = {
      id: word.id,
      acronym: word.acronym,
      japanese: word.japanese,
      status: progress[word.id]?.status ?? "new",
    };
    const list = byCategory.get(word.category);
    if (list) list.push(entry);
    else byCategory.set(word.category, [entry]);
  }

  const categories: CollectionCategory[] = [];
  for (const [category, entries] of byCategory) {
    const sorted = [...entries].sort(byAcronym);
    const masteredCount = sorted.filter((entry) => entry.status === "mastered").length;
    categories.push({
      category,
      label: WORDLIST_CATEGORY_LABELS[category],
      entries: sorted,
      total: sorted.length,
      masteredCount,
      completionPct: sorted.length === 0 ? 0 : Math.round((masteredCount / sorted.length) * 100),
    });
  }

  // 進みの近いカテゴリを上に出す（目標勾配）。同率はラベル順で安定させる。
  return categories.sort(
    (a, b) => b.completionPct - a.completionPct || a.label.localeCompare(b.label),
  );
}

/** 図鑑全体のコンプ率（0〜100）。表示専用。 */
export function collectionCompletionPct(categories: CollectionCategory[]): number {
  const total = categories.reduce((sum, category) => sum + category.total, 0);
  if (total === 0) return 0;
  const mastered = categories.reduce((sum, category) => sum + category.masteredCount, 0);
  return Math.round((mastered / total) * 100);
}
