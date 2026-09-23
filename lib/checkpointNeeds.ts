import type { AppState } from "@/types";
import type { BadgeDef, CheckpointGate } from "@/types/checkpoint";
import type { TopicField } from "@/types/content";
import type { BadgeGap, BadgeSignals } from "@/lib/badges";
import { getRequiredBadgeGaps, MASTERED, QUIZ_CLEARED } from "@/lib/badges";
import { buildCheckpointGate, getCheckpointProgress } from "@/lib/checkpoints";
import { getAllTopics } from "@/lib/content";
import { recentAccuracy } from "@/lib/study";
import { masteryForTopic } from "@/lib/mastery";
import type { Topic } from "@/types/content";

export type CheckpointBadgeNeed = { badge: BadgeDef; paths: BadgeGap[][] };
export type CheckpointNeeds = {
  gate: CheckpointGate;
  badges: CheckpointBadgeNeed[];
  missingFieldCoverage: TopicField[];
  recentAccuracy: { current: number; target: number } | null;
};

/** Gate, badge predicates and their metric rules are the only sources of CP requirements. */
export function buildCheckpointNeeds(
  state: AppState,
  signals?: BadgeSignals,
  now: Date = new Date(),
): CheckpointNeeds {
  const gate = buildCheckpointGate(state, getCheckpointProgress(state).currentCheckpointId);
  const completed = new Set(state.progress.completedTopics);
  const covered = new Set(getAllTopics()
    .filter((topic) => completed.has(topic.id))
    .map((topic) => topic.field));
  const target = gate.checkpoint.recentAccuracyMin;
  const accuracy = recentAccuracy(state.answers);

  return {
    gate,
    badges: gate.missingBadges.map((badge) => ({
      badge,
      paths: getRequiredBadgeGaps(badge.id, state, signals, now),
    })),
    missingFieldCoverage: gate.checkpoint.requiredFieldCoverage.filter((field) => !covered.has(field)),
    recentAccuracy: target !== undefined && !gate.accuracyMet
      ? { current: accuracy, target }
      : null,
  };
}

export type CheckpointTopicImpact = {
  steps: number;
  unlocks: BadgeDef[];
  practice: boolean;
  reason: string | null;
  priority: number;
};

const fieldName: Record<TopicField, string> = {
  technology: "テクノロジ",
  management: "マネジメント",
  strategy: "ストラテジ",
};

/** A topic can certainly advance completion counts; quiz/mastery changes remain opportunities. */
export function assessTopicForCheckpoint(
  state: AppState,
  topic: Topic,
  needs: CheckpointNeeds,
  now: Date = new Date(),
): CheckpointTopicImpact {
  if (needs.gate.finalExamUnlocked || !needs.gate.checkpoint.finalExam) {
    return { steps: 0, unlocks: [], practice: false, reason: null, priority: 0 };
  }

  const completed = state.progress.completedTopics.includes(topic.id);
  const mastery = masteryForTopic(state.progress, state.answers, topic.id);
  const contributes = (gap: BadgeGap): boolean => {
    if (gap.field && gap.field !== topic.field) return false;
    if (gap.metric === "completedTotal" || gap.metric === "completedByField") return !completed;
    if (gap.metric === "quizClearedTotal" || gap.metric === "quizClearedByField") return mastery < QUIZ_CLEARED;
    if (gap.metric === "masteredCount") return completed && mastery < MASTERED;
    if (gap.metric === "fieldMasteryAvg") return mastery < gap.target;
    if (gap.metric === "reviewCount") return state.progress.reviewQueue.some((item) =>
      item.topicId === topic.id && Date.parse(item.dueAt) <= now.getTime());
    if (gap.metric === "weakTagCount") return topic.tags.some((tag) => state.progress.weakTags.includes(tag));
    if (gap.metric === "recentAccuracy") return completed;
    return false; // readiness and external exam-level signals cannot be predicted per Topic
  };

  const hits = needs.badges.flatMap(({ badge, paths }) => {
    if (paths.some((path) => path.length === 0)) return [];
    const best = paths
      .map((path) => path.filter(contributes))
      .sort((a, b) => b.length - a.length)[0] ?? [];
    return best.length > 0 ? [{ badge, gaps: best }] : [];
  });
  const coverage = !completed && needs.missingFieldCoverage.includes(topic.field);
  const steps = hits.reduce((sum, hit) => sum + hit.gaps.length, 0) + Number(coverage);
  if (steps === 0) return { steps: 0, unlocks: [], practice: false, reason: null, priority: 0 };

  const afterCompletion = !completed ? {
    ...state,
    progress: { ...state.progress, completedTopics: [...state.progress.completedTopics, topic.id] },
  } : state;
  const unlocks = !completed
    ? hits.filter(({ badge }) =>
      !needs.badges.find((need) => need.badge.id === badge.id)?.paths.some((path) => path.length === 0)
      && getRequiredBadgeGaps(badge.id, afterCompletion, undefined, now).some((path) => path.length === 0)
    ).map(({ badge }) => badge)
    : [];
  const first = hits[0];
  const firstGap = first?.gaps[0];
  const cp = `CP${needs.gate.checkpoint.order}`;
  const reason = unlocks.length > 0
    ? `このテーマを終えると${cp}突破に必要な${unlocks[0].label}バッジの条件を達成します`
    : firstGap?.metric === "quizClearedTotal" || firstGap?.metric === "quizClearedByField"
      ? `${cp}突破に必要な${firstGap.field ? `${fieldName[firstGap.field]}の` : ""}確認問題クリアを目指します`
      : firstGap?.metric === "masteredCount" || firstGap?.metric === "fieldMasteryAvg"
        ? `${cp}突破に必要な${firstGap.field ? `${fieldName[firstGap.field]}の` : ""}習熟度を高めます`
        : firstGap?.metric === "reviewCount"
          ? `${cp}突破に向けて復習対象を確認します`
          : firstGap?.metric === "weakTagCount"
            ? `${cp}突破に向けて苦手を確認します`
            : firstGap?.metric === "recentAccuracy"
              ? `${cp}突破に向けて直近の理解度を確認します`
              : first
                ? `${cp}突破に必要な${first.badge.label}を進めます`
                : `${cp}突破に必要な${fieldName[topic.field]}を進めます`;
  const practice = completed;
  const nearMastery = practice && mastery >= QUIZ_CLEARED && mastery < MASTERED
    ? mastery - QUIZ_CLEARED + 1 : 0;
  return {
    steps,
    unlocks,
    practice,
    reason,
    priority: 1000 + unlocks.length * 500 + steps * 100 + nearMastery + topic.importance * 2,
  };
}
