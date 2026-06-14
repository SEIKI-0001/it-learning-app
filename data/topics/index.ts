import type { Topic, TopicField } from "@/types/content";
import { technologyTopics } from "./technology";
import { managementTopics } from "./management";
import { strategyTopics } from "./strategy";

// ============================================================================
// コンテンツライブラリの集約点。
// 各分野のトピックをここで1つにまとめ、taxonomy（分野→中分類）も提供する。
// 取得ヘルパーは lib/content.ts 側に置く（このファイルはデータの集約のみ）。
// ============================================================================

/** すべてのトピック（分野順に連結） */
export const topics: Topic[] = [
  ...technologyTopics,
  ...managementTopics,
  ...strategyTopics,
];

export { technologyTopics, managementTopics, strategyTopics };

/** 分野ごとの中分類（カテゴリ）一覧。現在のトピックから動的に組み立てる。 */
export type FieldTaxonomy = {
  field: TopicField;
  categories: string[];
};

export function buildTaxonomy(list: Topic[] = topics): FieldTaxonomy[] {
  const order: TopicField[] = ["technology", "management", "strategy"];
  return order.map((field) => {
    const categories = Array.from(
      new Set(list.filter((t) => t.field === field).map((t) => t.category)),
    );
    return { field, categories };
  });
}

/** 静的に組み立てた taxonomy（変化しないので使い回す） */
export const taxonomy: FieldTaxonomy[] = buildTaxonomy();
