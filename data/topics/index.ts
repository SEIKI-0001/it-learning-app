import type { Topic, TopicField } from "@/types/content";
import { technologyTopics as baseTechnologyTopics } from "./technology";
import { managementTopics as baseManagementTopics } from "./management";
import { strategyTopics as baseStrategyTopics } from "./strategy";
import { topicVisualLearning } from "./visualLearning";
import { topicProcessDemo } from "./processDemo";

// ============================================================================
// コンテンツライブラリの集約点。
// 各分野のトピックをここで1つにまとめ、taxonomy（分野→中分類）も提供する。
// 取得ヘルパーは lib/content.ts 側に置く（このファイルはデータの集約のみ）。
// ============================================================================

function attachVisualLearning(list: Topic[]): Topic[] {
  return list.map((topic) => {
    const visualLearning = topic.visualLearning ?? topicVisualLearning[topic.id];

    return {
      ...topic,
      heroDiagram: topic.heroDiagram ?? visualLearning?.heroDiagram,
      visualLearning,
      processDemo: topic.processDemo ?? topicProcessDemo[topic.id],
    };
  });
}

export const technologyTopics: Topic[] = attachVisualLearning(baseTechnologyTopics);
export const managementTopics: Topic[] = attachVisualLearning(baseManagementTopics);
export const strategyTopics: Topic[] = attachVisualLearning(baseStrategyTopics);

/** すべてのトピック（分野順に連結） */
export const topics: Topic[] = [
  ...technologyTopics,
  ...managementTopics,
  ...strategyTopics,
];

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
