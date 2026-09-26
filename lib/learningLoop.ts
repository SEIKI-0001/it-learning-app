import type {
  LearningEvidence,
  LearningEvidenceKind,
  ReviewItem,
  ReviewReasonCode,
  TodayActivity,
  TodaysLearningQueueItem,
  TopicMasteryStats,
  UserProgress,
  WeakTopic,
  WeakTopicReason,
  AppState,
} from "@/types";
import type { Topic } from "@/types/content";
import { assessTopicForCheckpoint, buildCheckpointNeeds } from "@/lib/checkpointNeeds";

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
  /** 失敗理由の表示文言を差し替える（公式過去問の誤答など。reasonCode は変えない）。 */
  failureLabel?: string,
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
      : failureLabel ?? (failureReason === "summary_exam_miss"
        ? "総まとめ試験で間違えた"
        : "復習で間違えた"),
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

/** 公式過去問の誤答は、復習理由をそのまま伝える（判定上は総まとめ試験と同じ扱い）。 */
export const PAST_EXAM_MISS_LABEL = "公式過去問で間違えた";

function failureLabelFor(evidence: LearningEvidence[]): string | undefined {
  return evidence.some((item) => item.kind === "past_exam" && !item.isCorrect)
    ? PAST_EXAM_MISS_LABEL
    : undefined;
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
    const seenEvents = new Set(
      current.recentEvidence.map((item) =>
        `${item.questionId}\u001f${item.kind}\u001f${item.answeredAt}`
      ),
    );
    const appliedEvidence: LearningEvidence[] = [];
    for (const item of topicEvidence) {
      const eventKey = `${item.questionId}\u001f${item.kind}\u001f${item.answeredAt}`;
      if (seenEvents.has(eventKey)) continue;
      seenEvents.add(eventKey);
      appliedEvidence.push(item);
      current = applyLearningEvidence(current, item);
    }
    if (appliedEvidence.length === 0) continue;
    statsByTopic[topicId] = current;
    mastery[topicId] = current.masteryScore;
    const success = appliedEvidence.every((item) => item.isCorrect);
    const previousReview = reviews.get(topicId);
    const previousDueAt = previousReview ? Date.parse(previousReview.dueAt) : Number.NaN;
    const completedDueReview = appliedEvidence.some((item) => item.kind === "review")
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
          failureReasonFor(appliedEvidence),
          success ? undefined : failureLabelFor(appliedEvidence),
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

/**
 * トピック学習以外のタスク（関連用語・公式過去問）の優先度。
 * トピック側の優先度（このファイルの addTopic と lib/checkpointNeeds）と同じ物差しに置き、
 * 「期限切れ復習 → 過去問誤答 → CP進行に必要な課題 → 公式過去問 → 単語 → 新規学習」の
 * 基本順になるようにしてある。固定順ではなく、同じキューの中で他の候補と並べる。
 *
 *   overdue_review (6000) > pastExamRetry (5000)
 *     > CP のバッジを直接そろえるトピック (1500+) > pastExamDrill (1450)
 *     > termsStabilizing (1150) ≒ CP 必要課題のトピック (1000〜1400)
 *     > 総まとめ誤答・弱点 (400〜600) > wordsReviewLate
 *     > 新規・CP練習 (300〜350) > wordsReview > wordsRelated
 *
 * 公式過去問を CP 必要課題の大半より上に置くのは、CP5 以降では公式過去問の回答そのものが
 * 習熟度・分野バランス・直近正答率（= CP5/6 の突破条件）を進めるから。ただしバッジを
 * その場でそろえるトピックよりは下にする。
 */
export const TODAY_ACTIVITY_PRIORITY = {
  /** 前日までに間違えた公式過去問の解き直し。期限切れ復習の次。 */
  pastExamRetry: 5000,
  /** 公式過去問の演習。バッジを直接そろえるトピックの次。 */
  pastExamDrill: 1450,
  /** 確認パックが用語定着待ち（terms_stabilizing）のトピックの関連用語。Primary 候補。 */
  termsStabilizing: 1150,
  /** CP5 以降の復習語・苦手語。弱点トピックの後、新規学習の前。 */
  wordsReviewLate: 380,
  /** CP2〜4 の復習語・苦手語。その日のトピック学習の後に回す。 */
  wordsReview: 250,
  /** CP2〜3 の「今日のトピックの関連語」。いちばん最後（新規学習を圧迫しない）。 */
  wordsRelated: 240,
} as const;

export function buildTodaysLearningQueue(input: {
  progress: UserProgress;
  topics: Topic[];
  state?: AppState;
  now?: Date;
  includeFlashcards?: boolean;
  includeExtraPractice?: boolean;
  /**
   * トピック学習以外のタスク（lib/todayActivities が作る）。渡したときだけ同じキューへ並べる。
   * 優先度は各タスクの priority（TODAY_ACTIVITY_PRIORITY）をそのまま使う。
   */
  activities?: TodayActivity[];
}): TodaysLearningQueueItem[] {
  const now = input.now ?? new Date();
  const topicById = new Map(input.topics.map((topic) => [topic.id, topic]));
  const added = new Set<string>();
  const queue: TodaysLearningQueueItem[] = [];
  const needs = input.state ? buildCheckpointNeeds(input.state, undefined, now) : null;
  const impactByTopic = new Map<string, ReturnType<typeof assessTopicForCheckpoint>>();
  const impactFor = (topic: Topic) => {
    if (!input.state || !needs) return null;
    const cached = impactByTopic.get(topic.id);
    if (cached) return cached;
    const impact = assessTopicForCheckpoint(input.state, topic, needs, now);
    impactByTopic.set(topic.id, impact);
    return impact;
  };
  const addTopic = (
    topicId: string,
    kind: TodaysLearningQueueItem["kind"],
    priority: number,
    reason: string,
  ) => {
    const topic = topicById.get(topicId);
    if (!topic || added.has(topicId)) return;
    const impact = impactFor(topic);
    const overdue = kind === "overdue_review";
    added.add(topicId);
    queue.push({
      id: `${kind}:${topicId}`,
      topicId,
      kind,
      priority: overdue ? 6000 : Math.max(priority, impact?.priority ?? 0),
      estimatedMinutes: topic.estimatedMinutes,
      reason: overdue
        ? "復習期限を過ぎているため、今日は先に復習します"
        : impact?.reason ?? reason,
    });
  };

  for (const review of getDueReviewTopics(input.progress.reviewQueue, now)) {
    addTopic(review.topicId, "overdue_review", 600, review.reason);
  }

  const weak = getWeakTopics(input.progress.topicMasteryStats ?? {});
  for (const item of weak.filter((candidate) => candidate.reason === "summary_exam_miss")) {
    const recent = input.progress.topicMasteryStats?.[item.topicId]?.recentEvidence ?? [];
    const lastMiss = [...recent].reverse().find((e) => !e.isCorrect && isSummativeEvaluation(e.kind));
    addTopic(
      item.topicId,
      "summary_weak",
      500 + item.severity,
      lastMiss?.kind === "past_exam" ? "公式過去問の誤答" : "総まとめ試験の誤答",
    );
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

  // CP3以降の確認問題・定着条件は、完了済みTopicの再挑戦も候補に必要。
  if (needs) {
    for (const topic of input.topics) {
      if (input.progress.completedTopics.includes(topic.id) && (impactFor(topic)?.steps ?? 0) > 0) {
        addTopic(topic.id, "checkpoint_practice", 300, "確認問題を進めます");
      }
    }
  }

  const completed = new Set(input.progress.completedTopics);
  for (const topic of input.topics
    .filter((item) => !completed.has(item.id))
    .sort((a, b) => b.importance - a.importance || a.difficulty - b.difficulty)) {
    addTopic(topic.id, "new_topic", 300 + topic.importance * 10, "次の新規Topic");
  }

  for (const activity of input.activities ?? []) {
    queue.push({
      id: activity.id,
      kind: activity.kind === "vocab"
        ? "flashcard"
        : activity.kind === "past_exam_retry" ? "past_exam_retry" : "past_exam",
      priority: activity.priority,
      estimatedMinutes: activity.estimatedMinutes,
      reason: activity.reason,
      activity,
    });
  }

  if (input.includeFlashcards && !(input.activities ?? []).some((a) => a.kind === "vocab")) {
    queue.push({ id: "flashcard", kind: "flashcard", priority: 200, estimatedMinutes: 5, reason: "単語帳" });
  }
  if (input.includeExtraPractice) {
    queue.push({ id: "extra-practice", kind: "extra_practice", priority: 100, estimatedMinutes: 10, reason: "追加演習" });
  }

  return queue.sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));
}
