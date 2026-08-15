import type {
  LearningEvidence,
  LearningEvidenceKind,
  ReviewItem,
  ReviewReasonCode,
  TodaysLearningQueueItem,
  TopicMasteryStats,
  UserProgress,
  WeakTopic,
  WeakTopicReason,
} from "@/types";
import type { Topic } from "@/types/content";

const DAY_MS = 86_400_000;
export const LEARNING_LOOP_CONFIG = {
  masteryWeights: {
    confirmation: { correct: 8, incorrect: 10 },
    review: { correct: 14, incorrect: 18 },
    summary_exam: { correct: 12, incorrect: 20 },
    mock_exam: { correct: 12, incorrect: 20 },
    past_exam: { correct: 12, incorrect: 20 },
    checkpoint: { correct: 10, incorrect: 16 },
  } satisfies Record<LearningEvidenceKind, { correct: number; incorrect: number }>,
  firstSeenBonus: 3,
  repeatedMissPenaltyStep: 4,
  repeatedMissPenaltyMax: 8,
  lowMasteryThreshold: 60,
  weakSeverityBase: 60,
  minMasteryScore: 0,
  maxMasteryScore: 100,
  recentEvidenceLimit: 20,
  reviewIntervalDays: [3, 7, 14, 28] as const,
  maxReviewIntervalDays: 180,
} as const;

export const MASTERY_WEIGHTS = LEARNING_LOOP_CONFIG.masteryWeights;
export const LOW_MASTERY_THRESHOLD = LEARNING_LOOP_CONFIG.lowMasteryThreshold;
export const REVIEW_INTERVAL_DAYS = LEARNING_LOOP_CONFIG.reviewIntervalDays;

function clampScore(value: number): number {
  return Math.max(
    LEARNING_LOOP_CONFIG.minMasteryScore,
    Math.min(LEARNING_LOOP_CONFIG.maxMasteryScore, Math.round(value)),
  );
}

function emptyStats(topicId: string, masteryScore = 0): TopicMasteryStats {
  return {
    topicId,
    masteryScore: clampScore(masteryScore),
    lastEvaluatedAt: "",
    correctCount: 0,
    incorrectCount: 0,
    reviewSuccessCount: 0,
    recentEvidence: [],
  };
}

function lastEvidenceIndex(
  evidence: TopicMasteryStats["recentEvidence"],
  predicate: (item: TopicMasteryStats["recentEvidence"][number]) => boolean,
): number {
  for (let index = evidence.length - 1; index >= 0; index -= 1) {
    if (predicate(evidence[index])) return index;
  }
  return -1;
}

/** 1問ぶんの根拠をTopic Masteryへ反映する純粋関数。 */
export function applyLearningEvidence(
  current: TopicMasteryStats | undefined,
  evidence: LearningEvidence,
): TopicMasteryStats {
  const before = current ?? emptyStats(evidence.topicId);
  const weight = MASTERY_WEIGHTS[evidence.kind];
  const isFirstSeen = evidence.exposureState === "first";
  const firstSeenBonus = isFirstSeen && evidence.kind !== "confirmation"
    ? LEARNING_LOOP_CONFIG.firstSeenBonus
    : 0;
  const consecutiveMisses = before.recentEvidence
    .slice()
    .reverse()
    .findIndex((item) => item.isCorrect);
  const missRun = consecutiveMisses === -1
    ? before.recentEvidence.length
    : consecutiveMisses;
  const repeatedMissPenalty = evidence.isCorrect
    ? 0
    : Math.min(
        LEARNING_LOOP_CONFIG.repeatedMissPenaltyMax,
        missRun * LEARNING_LOOP_CONFIG.repeatedMissPenaltyStep,
      );
  const delta = evidence.isCorrect
    ? weight.correct + firstSeenBonus
    : -(weight.incorrect + firstSeenBonus + repeatedMissPenalty);
  const recentEvidence = [
    ...before.recentEvidence,
    {
      questionId: evidence.questionId,
      kind: evidence.kind,
      isCorrect: evidence.isCorrect,
      isFirstSeen,
      exposureState: evidence.exposureState,
      answeredAt: evidence.answeredAt,
    },
  ].slice(-LEARNING_LOOP_CONFIG.recentEvidenceLimit);

  return {
    topicId: evidence.topicId,
    masteryScore: clampScore(before.masteryScore + delta),
    lastEvaluatedAt: evidence.answeredAt,
    correctCount: before.correctCount + (evidence.isCorrect ? 1 : 0),
    incorrectCount: before.incorrectCount + (evidence.isCorrect ? 0 : 1),
    reviewSuccessCount:
      before.reviewSuccessCount +
      (evidence.kind === "review" && evidence.isCorrect ? 1 : 0),
    recentEvidence,
  };
}

function afterDays(now: Date, days: number): string {
  return new Date(now.getTime() + days * DAY_MS).toISOString();
}

function intervalForStage(stage: number): number {
  if (stage <= REVIEW_INTERVAL_DAYS.length) {
    return REVIEW_INTERVAL_DAYS[Math.max(0, stage - 1)];
  }
  return Math.min(
    LEARNING_LOOP_CONFIG.maxReviewIntervalDays,
    REVIEW_INTERVAL_DAYS.at(-1)! * 2 ** (stage - REVIEW_INTERVAL_DAYS.length),
  );
}

function isSummativeEvaluation(kind: LearningEvidenceKind): boolean {
  return kind === "summary_exam" || kind === "mock_exam" || kind === "past_exam";
}

/** Topic単位の評価結果から次回復習期限を決める。 */
export function scheduleTopicReview(
  topicId: string,
  success: boolean,
  previous: ReviewItem | undefined,
  now: Date = new Date(),
  failureReason: ReviewReasonCode = "review_failure",
): ReviewItem {
  const previousStage = previous?.reviewStage ?? 0;
  const reviewStage = success ? previousStage + 1 : 0;
  return {
    topicId,
    dueAt: afterDays(now, success ? intervalForStage(reviewStage) : 1),
    reason: success
      ? reviewStage === 1
        ? "定着確認"
        : `${reviewStage}回目の定着確認`
      : failureReason === "summary_exam_miss"
        ? "総まとめ試験で間違えた"
        : "復習で間違えた",
    confirmationCount: Math.max(0, reviewStage - 1),
    reviewStage,
    lastReviewedAt: now.toISOString(),
    reasonCode: success ? "scheduled" : failureReason,
  };
}

export function getDueReviewTopics(
  reviewQueue: ReviewItem[],
  now: Date = new Date(),
): ReviewItem[] {
  return reviewQueue
    .filter((item) => {
      const due = Date.parse(item.dueAt);
      return Number.isFinite(due) && due <= now.getTime();
    })
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
}

const WEAK_REASON_PRIORITY: Record<WeakTopicReason, number> = {
  summary_exam_miss: 4,
  review_failure: 3,
  repeated_miss: 2,
  low_mastery: 1,
};

/** 保存済みの手入力値ではなく、Mastery根拠からWeak Topicを導出する。 */
export function getWeakTopics(
  statsByTopic: Record<string, TopicMasteryStats>,
): WeakTopic[] {
  const result: WeakTopic[] = [];
  for (const stats of Object.values(statsByTopic)) {
    const candidates: WeakTopic[] = [];
    const recent = stats.recentEvidence;
    if (stats.lastEvaluatedAt && stats.masteryScore < LOW_MASTERY_THRESHOLD) {
      candidates.push({
        topicId: stats.topicId,
        severity: Math.min(
          LEARNING_LOOP_CONFIG.maxMasteryScore,
          LEARNING_LOOP_CONFIG.weakSeverityBase
            + (LOW_MASTERY_THRESHOLD - stats.masteryScore),
        ),
        reason: "low_mastery",
      });
    }
    if (recent.slice(-2).length === 2 && recent.slice(-2).every((item) => !item.isCorrect)) {
      candidates.push({ topicId: stats.topicId, severity: 80, reason: "repeated_miss" });
    }
    const lastSummaryMiss = lastEvidenceIndex(
      recent,
      (item) => isSummativeEvaluation(item.kind) && !item.isCorrect,
    );
    const lastSuccessfulReview = lastEvidenceIndex(
      recent,
      (item) => item.kind === "review" && item.isCorrect,
    );
    if (lastSummaryMiss > lastSuccessfulReview) {
      candidates.push({ topicId: stats.topicId, severity: 95, reason: "summary_exam_miss" });
    }
    const latestReview = lastEvidenceIndex(recent, (item) => item.kind === "review");
    if (latestReview >= 0 && !recent[latestReview].isCorrect) {
      candidates.push({ topicId: stats.topicId, severity: 90, reason: "review_failure" });
    }
    const strongest = candidates.sort(
      (a, b) =>
        WEAK_REASON_PRIORITY[b.reason] - WEAK_REASON_PRIORITY[a.reason] ||
        b.severity - a.severity,
    )[0];
    if (strongest) result.push(strongest);
  }
  return result.sort((a, b) => b.severity - a.severity || a.topicId.localeCompare(b.topicId));
}

function failureReasonFor(evidence: LearningEvidence[]): ReviewReasonCode {
  if (evidence.some((item) => isSummativeEvaluation(item.kind) && !item.isCorrect)) {
    return "summary_exam_miss";
  }
  if (evidence.some((item) => item.kind === "review" && !item.isCorrect)) {
    return "review_failure";
  }
  return "repeated_miss";
}

/** 1回の確認・試験をTopicごとにまとめてMasteryとReview Dueへ反映する。 */
export function updateLearningLoopProgress(
  progress: UserProgress,
  evidence: LearningEvidence[],
  now: Date = new Date(),
): UserProgress {
  const valid = evidence.filter((item) => item.topicId.trim().length > 0);
  if (valid.length === 0) return progress;

  const statsByTopic = { ...(progress.topicMasteryStats ?? {}) };
  const mastery = { ...progress.topicMastery };
  const reviews = new Map(progress.reviewQueue.map((item) => [item.topicId, item]));
  const grouped = new Map<string, LearningEvidence[]>();
  for (const item of valid) {
    const list = grouped.get(item.topicId) ?? [];
    list.push(item);
    grouped.set(item.topicId, list);
  }

  for (const [topicId, topicEvidence] of grouped) {
    let current = statsByTopic[topicId] ?? emptyStats(topicId, mastery[topicId] ?? 0);
    for (const item of topicEvidence) current = applyLearningEvidence(current, item);
    statsByTopic[topicId] = current;
    mastery[topicId] = current.masteryScore;
    const success = topicEvidence.every((item) => item.isCorrect);
    const previousReview = reviews.get(topicId);
    const previousDueAt = previousReview ? Date.parse(previousReview.dueAt) : Number.NaN;
    const completedDueReview = topicEvidence.some((item) => item.kind === "review")
      && Number.isFinite(previousDueAt)
      && previousDueAt <= now.getTime();
    if (!success || !previousReview || completedDueReview) {
      reviews.set(
        topicId,
        scheduleTopicReview(
          topicId,
          success,
          previousReview,
          now,
          failureReasonFor(topicEvidence),
        ),
      );
    }
  }

  return {
    ...progress,
    topicMastery: mastery,
    topicMasteryStats: statsByTopic,
    reviewQueue: [...reviews.values()],
  };
}

export type ExamReadiness = {
  score: number;
  evaluatedTopicCount: number;
  weakTopicCount: number;
};

/** P0の将来拡張用インターフェース。UI表示は既存の統合準備度を維持する。 */
export function computeExamReadiness(
  statsByTopic: Record<string, TopicMasteryStats>,
): ExamReadiness {
  const values = Object.values(statsByTopic).filter((item) => item.lastEvaluatedAt);
  return {
    score:
      values.length === 0
        ? 0
        : Math.round(values.reduce((sum, item) => sum + item.masteryScore, 0) / values.length),
    evaluatedTopicCount: values.length,
    weakTopicCount: getWeakTopics(statsByTopic).length,
  };
}

export function buildTodaysLearningQueue(input: {
  progress: UserProgress;
  topics: Topic[];
  now?: Date;
  includeFlashcards?: boolean;
  includeExtraPractice?: boolean;
}): TodaysLearningQueueItem[] {
  const now = input.now ?? new Date();
  const topicById = new Map(input.topics.map((topic) => [topic.id, topic]));
  const added = new Set<string>();
  const queue: TodaysLearningQueueItem[] = [];
  const addTopic = (
    topicId: string,
    kind: TodaysLearningQueueItem["kind"],
    priority: number,
    reason: string,
  ) => {
    const topic = topicById.get(topicId);
    if (!topic || added.has(topicId)) return;
    added.add(topicId);
    queue.push({
      id: `${kind}:${topicId}`,
      topicId,
      kind,
      priority,
      estimatedMinutes: topic.estimatedMinutes,
      reason,
    });
  };

  for (const review of getDueReviewTopics(input.progress.reviewQueue, now)) {
    addTopic(review.topicId, "overdue_review", 600, review.reason);
  }

  const weak = getWeakTopics(input.progress.topicMasteryStats ?? {});
  for (const item of weak.filter((candidate) => candidate.reason === "summary_exam_miss")) {
    addTopic(item.topicId, "summary_weak", 500 + item.severity, "総まとめ試験の誤答");
  }
  for (const item of weak.filter((candidate) => candidate.reason !== "summary_exam_miss")) {
    const topic = topicById.get(item.topicId);
    addTopic(
      item.topicId,
      "low_mastery",
      400 + item.severity + (topic?.importance ?? 1) * 10,
      "理解度が低い重要Topic",
    );
  }

  const legacyWeakTags = new Set(input.progress.weakTags);
  for (const topic of input.topics.filter((item) =>
    item.tags.some((tag) => legacyWeakTags.has(tag)),
  )) {
    addTopic(
      topic.id,
      "low_mastery",
      390 + topic.importance * 10,
      "既存の誤答履歴に関連するTopic",
    );
  }

  const completed = new Set(input.progress.completedTopics);
  for (const topic of input.topics
    .filter((item) => !completed.has(item.id))
    .sort((a, b) => b.importance - a.importance || a.difficulty - b.difficulty)) {
    addTopic(topic.id, "new_topic", 300 + topic.importance * 10, "次の新規Topic");
  }

  if (input.includeFlashcards) {
    queue.push({ id: "flashcard", kind: "flashcard", priority: 200, estimatedMinutes: 5, reason: "単語帳" });
  }
  if (input.includeExtraPractice) {
    queue.push({ id: "extra-practice", kind: "extra_practice", priority: 100, estimatedMinutes: 10, reason: "追加演習" });
  }

  return queue.sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));
}
