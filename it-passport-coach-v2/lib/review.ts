import { addDays, toISODate, todayISO } from "@/lib/date";
import type { AppRepository } from "@/lib/storage/types";
import type { Question } from "@/types/content";
import type { AnswerHistory, ReviewItem } from "@/types/user";

export async function updateReviewAfterAnswer(
  repository: AppRepository,
  answer: AnswerHistory,
  question: Question
): Promise<void> {
  const existing = (await repository.getReviewItems(answer.userId)).find(
    (item) => item.topicId === answer.topicId
  );
  const now = new Date();

  if (!answer.isCorrect) {
    const priorityBase = question.difficulty === "exam" ? 6 : question.difficulty === "standard" ? 5 : 4;
    await repository.upsertReviewItem({
      userId: answer.userId,
      topicId: answer.topicId,
      priority: Math.min(10, Math.max(existing?.priority ?? 0, priorityBase) + 1),
      reason: "wrong_answer",
      dueDate: toISODate(addDays(now, 1)),
      consecutiveCorrect: 0,
      updatedAt: now.toISOString()
    });
    return;
  }

  if (!existing) {
    return;
  }

  const consecutiveCorrect = existing.consecutiveCorrect + 1;
  const nextPriority = Math.max(0, existing.priority - (consecutiveCorrect >= 2 ? 3 : 2));

  if (nextPriority <= 1 && consecutiveCorrect >= 2) {
    await repository.deleteReviewItem(answer.userId, answer.topicId);
    return;
  }

  const intervalDays = consecutiveCorrect >= 2 ? 7 : 3;
  await repository.upsertReviewItem({
    ...existing,
    priority: nextPriority,
    dueDate: toISODate(addDays(now, intervalDays)),
    consecutiveCorrect,
    updatedAt: now.toISOString()
  });
}

export async function ensureExamNearReviews(
  repository: AppRepository,
  userId: string,
  weakTopicIds: string[]
): Promise<void> {
  const existing = await repository.getReviewItems(userId);
  const existingIds = new Set(existing.map((item) => item.topicId));
  const now = new Date();

  await Promise.all(
    weakTopicIds
      .filter((topicId) => !existingIds.has(topicId))
      .map((topicId) =>
        repository.upsertReviewItem({
          userId,
          topicId,
          priority: 5,
          reason: "exam_near",
          dueDate: todayISO(),
          consecutiveCorrect: 0,
          updatedAt: now.toISOString()
        })
      )
  );
}

export function sortReviewItems(items: ReviewItem[]): ReviewItem[] {
  return [...items].sort((a, b) => {
    if (a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    return b.priority - a.priority;
  });
}
