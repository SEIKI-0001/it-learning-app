import type {
  CheckQuestion,
  GlossaryTerm,
  LearningDiagram,
  Topic,
  TopicField,
} from "@/types/content";
import type { ReviewItem, UserProgress } from "@/types";
import { glossaryTerms } from "@/data/glossary";
import { topics, taxonomy, type FieldTaxonomy } from "@/data/topics";
import { diagrams, diagramRegistry, diagramsByField } from "@/data/diagrams";

// ============================================================================
// コンテンツライブラリの取得ヘルパー（純粋関数）。
// AIプランナー（lib/aiPlanner.ts）・Web UI・LINE Bot が共通でここを使う。
// data/topics（データ）への参照をここに集約し、呼び出し側は import 先を意識しない。
// UI 側でコンテンツをベタ書きせず、必ずこのレイヤー経由で参照する。
// ============================================================================

/** すべてのトピックを返す */
export function getAllTopics(): Topic[] {
  return topics;
}

/** id でトピックを1件取得（無ければ undefined） */
export function getTopic(id: string): Topic | undefined {
  return topics.find((t) => t.id === id);
}

/** getTopic の別名（スペック準拠の名前） */
export const getTopicById = getTopic;

/** 分野（テクノロジ/マネジメント/ストラテジ）でトピックを取得 */
export function getTopicsByField(field: TopicField): Topic[] {
  return topics.filter((t) => t.field === field);
}

/** getTopicsByField の別名（「分野＝domain」のスペック語彙に合わせる） */
export const getTopicsByDomain = getTopicsByField;

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

/** トピックの確認問題を取得（無ければ空配列） */
export function getQuestionsByTopic(topicId: string): CheckQuestion[] {
  return getTopic(topicId)?.checkQuestions ?? [];
}

/** 重要度の高い順にトピックを返す（同点は難易度が低い順） */
export function getHighPriorityTopics(): Topic[] {
  return [...topics].sort(
    (a, b) => b.importance - a.importance || a.difficulty - b.difficulty,
  );
}

// ---------------------------------------------------------------------------
// ユーザー状態に応じた推薦・復習（AIプランナーが土台として使う純粋関数）。
// ここはルールベース。将来 lib/aiPlanner.ts 側で LLM の出力に差し替えてもよい。
// ---------------------------------------------------------------------------

export type UserContentState = {
  progress: Pick<UserProgress, "completedTopics" | "topicMastery" | "weakTags" | "reviewQueue">;
  weakFields?: TopicField[];
};

/**
 * 次に学ぶと良いトピックを優先度順に返す。
 * 優先順位: 苦手分野 → 重要度 → 難易度が低い。すでに完了したトピックは除外。
 */
export function getRecommendedTopicsForUser(state: UserContentState): Topic[] {
  const completed = new Set(state.progress.completedTopics);
  const weakFields = new Set(state.weakFields ?? []);
  const weakTags = new Set(state.progress.weakTags);

  return topics
    .filter((t) => !completed.has(t.id))
    .map((t) => {
      let score = t.importance * 10 - t.difficulty;
      if (weakFields.has(t.field)) score += 50;
      if (t.tags.some((tag) => weakTags.has(tag))) score += 30;
      return { t, score };
    })
    .sort((a, b) => b.score - a.score)
    .map((x) => x.t);
}

/**
 * 復習対象（ReviewItem）を返す。
 * 期限が来たキュー項目 + 苦手タグに対応するトピックを統合（重複なし）。
 */
export function getReviewItemsForUser(
  state: UserContentState,
  now: Date = new Date(),
): ReviewItem[] {
  const items = new Map<string, ReviewItem>();

  // 1) 復習キューのうち期限が来たもの
  for (const item of state.progress.reviewQueue ?? []) {
    if (new Date(item.dueAt).getTime() <= now.getTime()) {
      items.set(item.topicId, item);
    }
  }

  // 2) 苦手タグに対応するトピック（まだ入っていなければ追加）
  for (const t of getTopicsByAnyTag(state.progress.weakTags)) {
    if (!items.has(t.id)) {
      items.set(t.id, {
        topicId: t.id,
        dueAt: now.toISOString(),
        reason: "苦手分野",
      });
    }
  }

  return Array.from(items.values());
}

/** 分野→中分類の taxonomy を返す */
export function getTaxonomy(): FieldTaxonomy[] {
  return taxonomy;
}

// ---------------------------------------------------------------------------
// 図解（LearningDiagram）の取得ヘルパー。
// UI 側は図解データを直接 import せず、必ずここ経由で参照する（content.ts と同方針）。
// ---------------------------------------------------------------------------

/** すべての図解を返す */
export function getAllDiagrams(): LearningDiagram[] {
  return diagrams;
}

/** id で図解を1件取得（無ければ undefined） */
export function getDiagram(id: string): LearningDiagram | undefined {
  return diagramRegistry[id];
}

/** 分野で図解を取得 */
export function getDiagramsByField(field: TopicField): LearningDiagram[] {
  return diagramsByField(field);
}

/** 図解の総数 */
export function getDiagramCount(): number {
  return diagrams.length;
}

/** トピックの総数 */
export function getTopicCount(): number {
  return topics.length;
}

/** すべての用語集エントリを返す */
export function getAllGlossaryTerms(): GlossaryTerm[] {
  return glossaryTerms;
}

/** id で用語集エントリを1件取得（無ければ undefined） */
export function getGlossaryTerm(id: string): GlossaryTerm | undefined {
  return glossaryTerms.find((term) => term.id === id);
}

/** 用語名で用語集エントリを1件取得（完全一致） */
export function getGlossaryTermByName(name: string): GlossaryTerm | undefined {
  return glossaryTerms.find((term) => term.term === name);
}

/** タグで用語集エントリを取得 */
export function getGlossaryTermsByTag(tag: string): GlossaryTerm[] {
  return glossaryTerms.filter((term) => term.reviewTags.includes(tag));
}

/** 分野で用語集エントリを取得 */
export function getGlossaryTermsByField(field: TopicField): GlossaryTerm[] {
  return glossaryTerms.filter((term) => term.field === field);
}

/** 用語集の総数 */
export function getGlossaryTermCount(): number {
  return glossaryTerms.length;
}
