import type { Topic } from "@/types/content";
import type { AppState } from "@/types";
import type { ReferenceBook } from "@/types/referenceBook";
import { buildTodaysLearningQueue } from "@/lib/learningLoop";
import {
  buildBookStudyOrder,
  currentBookUnit,
  nextBookTopicIds,
} from "@/lib/bookStudyOrder";
import { assessBookQuality, type BookQuality } from "@/lib/bookQuality";

// ============================================================================
// 参考書順（Book mode）の Shadow 比較（管理画面専用・純粋関数）。
//
// ユーザーにはアプリ順を出したまま、同じデータで「参考書順にしたら何が変わるか」を
// 計算して並べる。しきい値（lib/bookQuality）の調整と、有効化の判断材料にする。
// 書き込みは一切しない。
// ============================================================================

export type BookOrderDiagnosis = {
  ok: boolean;
  error?: string;
  quality?: BookQuality;
  units?: {
    total: number;
    withTopics: number;
    readingOnly: number;
    supplementUnits: number;
    maxTopicsPerUnit: number;
    avgTopicsPerUnit: number;
    /** トピックが多すぎるユニット（順番として粗い） */
    largest: { label: string; topicCount: number }[];
  };
  /** 本に無く補足になった重要テーマ（重要度3） */
  importantSupplements?: { id: string; title: string; field: string }[];
  unknownTopicIds?: string[];
  /** 進捗に照らした現在地 */
  currentUnitLabel?: string | null;
  /** 次に新しく学ぶトピック（アプリ順 vs 参考書順） */
  nextApp?: string[];
  nextBook?: string[];
  /** 先頭5件のうち一致する数 */
  nextOverlap?: number;
  completedCount?: number;
  /** 完了済みで確認問題を持つトピック数（Book mode の CP 最終問題の出題元の大きさ） */
  examPoolTopics?: number;
};

const NEXT_COUNT = 5;

export function diagnoseBookOrder(input: {
  book: ReferenceBook | null;
  state: AppState | null;
  topics: Topic[];
  now?: Date;
}): BookOrderDiagnosis {
  try {
    const { book, topics } = input;
    const order = buildBookStudyOrder(book, topics);
    const quality = assessBookQuality(order, topics);
    const topicById = new Map(topics.map((topic) => [topic.id, topic]));
    const completed = input.state?.progress.completedTopics ?? [];

    if (!order) {
      return { ok: true, quality, completedCount: completed.length };
    }

    const withTopics = order.units.filter((u) => u.level !== "supplement" && u.topicIds.length > 0);
    const sizes = withTopics.map((u) => u.topicIds.length);
    const largest = [...withTopics]
      .sort((a, b) => b.topicIds.length - a.topicIds.length)
      .slice(0, 3)
      .map((u) => ({ label: u.label, topicCount: u.topicIds.length }));

    let nextApp: string[] | undefined;
    if (input.state) {
      nextApp = buildTodaysLearningQueue({
        progress: input.state.progress,
        topics,
        state: input.state,
        now: input.now,
      })
        .filter((item) => item.kind === "new_topic" && item.topicId)
        .slice(0, NEXT_COUNT)
        .map((item) => item.topicId!);
    }
    const nextBook = nextBookTopicIds(order, completed, NEXT_COUNT);
    const done = new Set(completed);

    return {
      ok: true,
      quality,
      units: {
        total: order.units.length,
        withTopics: withTopics.length,
        readingOnly: order.units.filter((u) => u.readingOnly).length,
        supplementUnits: order.units.filter((u) => u.level === "supplement").length,
        maxTopicsPerUnit: sizes.length ? Math.max(...sizes) : 0,
        avgTopicsPerUnit: sizes.length ? sizes.reduce((a, b) => a + b, 0) / sizes.length : 0,
        largest,
      },
      importantSupplements: order.supplementTopicIds
        .map((id) => topicById.get(id)!)
        .filter((topic) => topic.importance >= 3)
        .map((topic) => ({ id: topic.id, title: topic.title, field: topic.field })),
      unknownTopicIds: order.unknownTopicIds,
      currentUnitLabel: currentBookUnit(order, completed)?.label ?? null,
      nextApp,
      nextBook,
      nextOverlap: nextApp ? nextApp.filter((id) => nextBook.includes(id)).length : undefined,
      completedCount: completed.length,
      examPoolTopics: topics.filter((t) => done.has(t.id) && t.checkQuestions.length > 0).length,
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
