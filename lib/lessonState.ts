import { getLessonsForTheme } from "@/lib/learningCatalog";
import type { UserProgress } from "@/types";
import type { LearningTheme } from "@/types/learningCatalog";

// ============================================================================
// レッスン習熟度の共通5段階モデル。UserProgress からの純粋な導出のみを行い、
// 副作用・データ保存は持たない。既存の LessonStatus（4段階・lib/learningCatalog.ts
// getLessonStatus）は completed を1段階にまとめているが、こちらは
// 「完了直後（復習キューが残っている）」と「復習を2回通過して完全に定着した」を
// 区別したい画面（学習手帳・ロードマップ強調表示など）向けに separate する。
// ============================================================================

export type LessonMasterState =
  | "not_started"
  | "in_progress"
  | "review_due"
  | "mastered"
  | "fully_mastered";

export const LESSON_STATE_LABELS: Record<LessonMasterState, string> = {
  not_started: "未着手",
  in_progress: "学習中",
  review_due: "復習待ち",
  mastered: "習得済み",
  fully_mastered: "完全習得",
};

/**
 * レッスン単位の習熟度を判定する。
 * 判定順序が重要（上から優先）:
 *   1. 復習キューに期限到来分があれば、完了状態に関わらず「復習待ち」
 *      （不正解で復習キューに入った未完了トピックも対象になるため）
 *   2. 完了 かつ 復習キューに項目なし → 定着確認を通過し切った「完全習得」
 *   3. 完了 かつ 復習キューに未来の期限あり → 完了直後の「習得済み」
 *   4. 未完了 かつ 習熟度 > 0 → 「学習中」
 *   5. それ以外 → 「未着手」
 */
export function getLessonMasterState(
  lessonId: string,
  progress: UserProgress | undefined,
  now: Date = new Date(),
): LessonMasterState {
  if (!progress) return "not_started";

  const reviewItem = progress.reviewQueue.find((item) => item.topicId === lessonId);
  if (reviewItem && Date.parse(reviewItem.dueAt) <= now.getTime()) {
    return "review_due";
  }

  const mastery = progress.topicMastery[lessonId] ?? 0;
  const completed = progress.completedTopics.includes(lessonId) || mastery >= 100;

  if (completed) {
    return reviewItem ? "mastered" : "fully_mastered";
  }
  if (mastery > 0) return "in_progress";
  return "not_started";
}

/**
 * テーマ単位の習熟度を、テーマに属する全レッスンの状態から集約する。
 * 優先順位: 復習待ちが1件でもあれば最優先で表示（放置を防ぐ） → 全て完全習得 →
 * 全て習得済み以上 → 1件でも着手済みがあれば学習中 → 未着手。
 */
export function getThemeMasterState(
  theme: LearningTheme,
  progress: UserProgress | undefined,
  now: Date = new Date(),
): LessonMasterState {
  const lessons = getLessonsForTheme(theme);
  if (lessons.length === 0) return "not_started";

  const states = lessons.map((lesson) => getLessonMasterState(lesson.id, progress, now));

  if (states.some((state) => state === "review_due")) return "review_due";
  if (states.every((state) => state === "fully_mastered")) return "fully_mastered";
  if (states.every((state) => state === "mastered" || state === "fully_mastered")) {
    return "mastered";
  }
  if (states.some((state) => state !== "not_started")) return "in_progress";
  return "not_started";
}
