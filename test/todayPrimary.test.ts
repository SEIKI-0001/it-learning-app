import { describe, expect, it } from "vitest";
import type { AppState, ReviewItem, TodaysLearningQueueItem } from "@/types";
import type { CheckpointGate } from "@/types/checkpoint";
import { INITIAL_CHECKPOINT_PROGRESS } from "@/types/checkpoint";
import type { QuestRouteNode } from "@/lib/questRoute";
import { buildTodayPrimaryAction } from "@/lib/todayPrimary";
import { buildCheckpointGate, getCheckpoint } from "@/lib/checkpoints";
import { getAllTopics } from "@/lib/content";

// GF-P0-001「/today の主CTA統合」。要件書 §16.1 が求める
// 「復習期限・弱点・CP条件・新規学習が競合した場合の優先順位」を固定する。

const TOPIC = getAllTopics()[0];

function state(overrides: Partial<AppState["progress"]> = {}): AppState {
  return {
    progress: {
      level: 1,
      exp: 0,
      streakCount: 0,
      weakTags: [],
      completedTopics: [],
      topicMastery: {},
      reviewQueue: [],
      currentDay: 1,
      completedDays: [],
      checkpointProgress: { ...INITIAL_CHECKPOINT_PROGRESS, currentCheckpointId: "cp1" },
      ...overrides,
    },
    answers: [],
  };
}

function node(overrides: Partial<QuestRouteNode> = {}): QuestRouteNode {
  return {
    topicId: TOPIC.id,
    title: TOPIC.title,
    estimatedMinutes: 7,
    activity: "learn",
    state: "current",
    ...overrides,
  };
}

function queueItem(
  kind: TodaysLearningQueueItem["kind"],
  reason: string,
  topicId = TOPIC.id,
): TodaysLearningQueueItem {
  return { id: `${kind}:${topicId}`, topicId, kind, priority: 500, estimatedMinutes: 7, reason };
}

/** 突破試験が解放されていないゲート。 */
function lockedGate(): CheckpointGate {
  return buildCheckpointGate(state(), "cp1");
}

/** 突破試験が解放済み・未突破のゲート（判定ロジックは呼ばず直接組み立てる）。 */
function unlockedGate(): CheckpointGate {
  return {
    ...buildCheckpointGate(state(), "cp1"),
    missingBadges: [],
    earnedRequiredCount: 3,
    totalRequiredCount: 3,
    fieldCoverageMet: true,
    accuracyMet: true,
    finalExamUnlocked: true,
    finalExamPassed: false,
    canAdvance: false,
  };
}

function build(input: {
  nodes: QuestRouteNode[];
  gate?: CheckpointGate;
  queue?: TodaysLearningQueueItem[];
  reviewItems?: ReviewItem[];
  appState?: AppState;
}) {
  return buildTodayPrimaryAction({
    state: input.appState ?? state(),
    nodes: input.nodes,
    gate: input.gate ?? lockedGate(),
    queue: input.queue ?? [],
    reviewItems: input.reviewItems ?? [],
  });
}

describe("priority between competing candidates", () => {
  it("puts an overdue review ahead of an unlocked final exam", () => {
    const primary = build({
      nodes: [node({ activity: "review" })],
      gate: unlockedGate(),
      queue: [queueItem("overdue_review", "復習予定日です。")],
    });

    expect(primary?.kind).toBe("review");
    expect(primary?.topicId).toBe(TOPIC.id);
  });

  it("puts an unlocked final exam ahead of a weak topic", () => {
    const primary = build({
      nodes: [node()],
      gate: unlockedGate(),
      queue: [queueItem("low_mastery", "理解度が低い重要Topic")],
    });

    expect(primary?.kind).toBe("final_exam");
  });

  it("puts an unlocked final exam ahead of a new topic", () => {
    const primary = build({
      nodes: [node()],
      gate: unlockedGate(),
      queue: [queueItem("new_topic", "次の新規Topic")],
    });

    expect(primary?.kind).toBe("final_exam");
  });

  it("falls back to the weak topic while the final exam is still locked", () => {
    const primary = build({
      nodes: [node()],
      queue: [queueItem("summary_weak", "総まとめ試験の誤答")],
    });

    expect(primary?.kind).toBe("weak");
  });

  it("ignores a final exam that is already passed", () => {
    const passed: CheckpointGate = { ...unlockedGate(), finalExamPassed: true };
    const primary = build({
      nodes: [node()],
      gate: passed,
      queue: [queueItem("new_topic", "次の新規Topic")],
    });

    expect(primary?.kind).toBe("new_topic");
  });

  it("offers the final exam even when no topic is left in the route", () => {
    const primary = build({ nodes: [], gate: unlockedGate() });

    expect(primary?.kind).toBe("final_exam");
    expect(primary?.href).toBe("/checkpoint/cp1/final");
    expect(primary?.topicId).toBeNull();
  });

  it("returns null when there is nothing to recommend", () => {
    expect(build({ nodes: [] })).toBeNull();
  });

  it("returns null when every route node is already done", () => {
    expect(build({ nodes: [node({ state: "done" })] })).toBeNull();
  });

  it("uses the route's current node, not a later one", () => {
    const later = getAllTopics()[1];
    const primary = build({
      nodes: [
        node({ state: "done" }),
        node({ state: "current" }),
        node({ topicId: later.id, title: later.title, state: "up_next" }),
      ],
    });

    expect(primary?.topicId).toBe(TOPIC.id);
  });
});

describe("recommendation reason", () => {
  it("carries the queue's own reason rather than inventing one", () => {
    const primary = build({
      nodes: [node()],
      queue: [queueItem("summary_weak", "総まとめ試験の誤答")],
    });

    expect(primary?.reasonLabel).toBe("総まとめ試験の誤答");
  });

  it("falls back to the review item's reason when the queue has no entry", () => {
    const primary = build({
      nodes: [node({ activity: "review" })],
      reviewItems: [{ topicId: TOPIC.id, dueAt: "2026-08-20T00:00:00.000Z", reason: "間違えた問題です。" }],
    });

    expect(primary?.reasonLabel).toBe("間違えた問題です。");
  });

  it("always produces a non-empty reason", () => {
    const primary = build({ nodes: [node()] });

    expect(primary?.reasonLabel.length).toBeGreaterThan(0);
  });

  it("states the badge count as the reason for the final exam", () => {
    const primary = build({ nodes: [], gate: unlockedGate() });

    expect(primary?.reasonLabel).toBe("必須バッジ 3/3 が揃いました");
  });
});

describe("action shape", () => {
  it("links a topic action to its lesson with the today entry point", () => {
    const primary = build({ nodes: [node()] });

    expect(primary?.href).toContain(TOPIC.id);
    expect(primary?.href).toContain("from=today");
    expect(primary?.href).toContain("#lesson-content");
  });

  it("anchors a review action at the quiz section", () => {
    const primary = build({
      nodes: [node({ activity: "review" })],
      queue: [queueItem("overdue_review", "復習予定日です。")],
    });

    expect(primary?.href).toContain("#lesson-quiz");
    expect(primary?.href).toContain("activity=review");
  });

  it("reports minutes for a topic and question count for the final exam", () => {
    const topic = build({ nodes: [node()] });
    expect(topic?.estimatedMinutes).toBe(7);
    expect(topic?.questionCount).toBeNull();

    const exam = build({ nodes: [], gate: unlockedGate() });
    expect(exam?.estimatedMinutes).toBeNull();
    expect(exam?.questionCount).toBe(getCheckpoint("cp1").finalExam?.questionCount);
  });

  it("treats a node with no queue entry as a new topic", () => {
    const primary = build({ nodes: [node()] });

    expect(primary?.kind).toBe("new_topic");
  });

  it("treats a review node with no queue entry as a review", () => {
    const primary = build({ nodes: [node({ activity: "review" })] });

    expect(primary?.kind).toBe("review");
  });
});

describe("purity", () => {
  it("does not mutate the inputs", () => {
    const appState = state();
    const nodes = [node()];
    const queue = [queueItem("new_topic", "次の新規Topic")];
    const snapshot = structuredClone({ appState, nodes, queue });

    build({ appState, nodes, queue });

    expect({ appState, nodes, queue }).toEqual(snapshot);
  });
});
