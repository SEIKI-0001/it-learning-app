import type { Topic, TopicField } from "@/types/content";
import { topics, taxonomy, type FieldTaxonomy } from "@/data/topics";

// ============================================================================
// コンテンツライブラリの取得ヘルパー（純粋関数）。
// AIプランナー（Step 4）と Web UI（Step 3 以降）の両方がここを使う。
// data/topics（データ）への参照をここに集約し、呼び出し側は import 先を意識しない。
// ============================================================================

/** すべてのトピックを返す */
export function getAllTopics(): Topic[] {
  return topics;
}

/** id でトピックを1件取得（無ければ undefined） */
export function getTopic(id: string): Topic | undefined {
  return topics.find((t) => t.id === id);
}

/** 分野（テクノロジ/マネジメント/ストラテジ）でトピックを取得 */
export function getTopicsByField(field: TopicField): Topic[] {
  return topics.filter((t) => t.field === field);
}

/** 中分類（カテゴリ）でトピックを取得 */
export function getTopicsByCategory(category: string): Topic[] {
  return topics.filter((t) => t.category === category);
}

/**
 * 苦手タグに関連するトピックを取得する。
 * 既存の weakTags（不正解だったタグ）から復習トピックを引くときに使う。
 */
export function getTopicsByTag(tag: string): Topic[] {
  return topics.filter((t) => t.tags.includes(tag));
}

/** 複数タグのいずれかに一致するトピックを取得（重複なし） */
export function getTopicsByAnyTag(tags: string[]): Topic[] {
  if (tags.length === 0) return [];
  const set = new Set(tags);
  return topics.filter((t) => t.tags.some((tag) => set.has(tag)));
}

/** 分野→中分類の taxonomy を返す */
export function getTaxonomy(): FieldTaxonomy[] {
  return taxonomy;
}

/** トピックの総数 */
export function getTopicCount(): number {
  return topics.length;
}
