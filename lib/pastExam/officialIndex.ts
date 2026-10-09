// 公式過去問の軽い索引（ID・公式区分・復習先トピック）。サーバ専用（問題バンクを読む）。
// 部分演習（/past-exams/drill）と CP5 の突破試験（/api/past-exams/final-exam）が同じ索引から選ぶ。

import type { TopicField } from "@/types/content";
import { getPublishedQuestions } from "@/lib/questionBank";
import type { DrillIndexEntry } from "@/lib/pastExam/drillSelection";

/** 出題元にしてよい公式過去問（公開済みの公式原文だけ）の索引。 */
export function buildOfficialDrillIndex(): DrillIndexEntry[] {
  return getPublishedQuestions()
    .filter((q) => q.origin === "official_past" && q.official)
    .map((q) => ({
      id: q.id,
      field: q.official!.examField as TopicField,
      topicId: q.primaryTopicId,
    }));
}
