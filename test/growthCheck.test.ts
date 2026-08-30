import { describe, expect, it } from "vitest";
import type { AppState, ReviewItem, TopicMasteryStats, UserAnswer } from "@/types";
import type { CheckpointGate } from "@/types/checkpoint";
import { INITIAL_CHECKPOINT_PROGRESS } from "@/types/checkpoint";
import { getAllTopics } from "@/lib/content";
import { buildCheckpointGate } from "@/lib/checkpoints";
import {
  buildGrowthEvidence,
  evaluateGrowthCheckGate,
  getShownCheckpointIds,
  hasSufficientEvidence,
  markGrowthCheckShown,
  resolveCheckpointStartedAt,
  GROWTH_CHECK_URGENT_REVIEW_LIMIT,
  GROWTH_EVIDENCE_SUFFICIENT,
} from "@/lib/growthCheck";

// GF-P0-003 の再設計。復習を常に優先し、成長確認は CP 中間で最大1回の
// 「ふりかえり」に限定する。

const DAY_MS = 86_400_000;
const NOW = new Date(2026, 7, 30, 12, 0, 0);
const CP_START = "2026-08-10T00:00:00.000Z";

const TOPICS = getAllTopics().filter((topic) => topic.checkQuestions.length > 0);
const TOPIC_A = TOPICS[0];
const TOPIC_B = TOPICS[1];

function at(iso: string): string {
  return iso;
}

function answer(
  questionId: string,
  isCorrect: boolean,
  answeredAt: string,
  topicId = TOPIC_A.id,
): UserAnswer {
  return { questionId, topicId, tag: "tag", selectedChoice: isCorrect ? "A" : "B", isCorrect, answeredAt };
}

function stats(topicId: string, masteryScore: number): TopicMasteryStats {
  return {
    topicId,
    masteryScore,
    lastEvaluatedAt: CP_START,
    correctCount: 5,
    incorrectCount: 1,
    reviewSuccessCount: 1,
    recentEvidence: [],
  };
}

function state(overrides: Partial<AppState["progress"]> = {}, answers: UserAnswer[] = []): AppState {
  return {
    progress: {
      level: 1,
      exp: 0,
      streakCount: 0,
      weakTags: [],
      completedTopics: [],
      topicMastery: {},
      topicMasteryStats: {},
      reviewQueue: [],
      currentDay: 1,
      completedDays: [],
      checkpointProgress: {
        ...INITIAL_CHECKPOINT_PROGRESS,
        currentCheckpointId: "cp1",
        // CP1 の開始境界として、cp0 ではなく最初の解答日を使う経路になる。
      },
      ...overrides,
    },
    answers,
  };
}

/** 必須バッジの充足率を指定したゲート（判定ロジック自体は呼ばず組み立てる）。 */
function gateWith(overrides: Partial<CheckpointGate> = {}): CheckpointGate {
  return {
    ...buildCheckpointGate(state(), "cp1"),
    earnedRequiredCount: 2,
    totalRequiredCount: 3,
    finalExamUnlocked: false,
    finalExamPassed: false,
    ...overrides,
  };
}

function review(topicId: string, dueAt: string): ReviewItem {
  return { topicId, dueAt, reason: "復習予定日です。" };
}

describe("gate: checkpoint midpoint", () => {
  it("stays closed before the halfway mark", () => {
    const result = evaluateGrowthCheckGate({
      state: state(),
      gate: gateWith({ earnedRequiredCount: 1, totalRequiredCount: 3 }),
      now: NOW,
    });

    expect(result).toEqual({ available: false, reason: "before_midpoint" });
  });

  it("opens exactly at the halfway mark", () => {
    const result = evaluateGrowthCheckGate({
      state: state(),
      gate: gateWith({ earnedRequiredCount: 2, totalRequiredCount: 4 }),
      now: NOW,
    });

    expect(result).toEqual({ available: true, checkpointId: "cp1" });
  });

  it("closes once the final exam is unlocked", () => {
    const result = evaluateGrowthCheckGate({
      state: state(),
      gate: gateWith({ earnedRequiredCount: 3, totalRequiredCount: 3, finalExamUnlocked: true }),
      now: NOW,
    });

    expect(result).toEqual({ available: false, reason: "final_exam_ready" });
  });

  it("stays closed for a checkpoint with no required badges", () => {
    const result = evaluateGrowthCheckGate({
      state: state(),
      gate: gateWith({ earnedRequiredCount: 0, totalRequiredCount: 0 }),
      now: NOW,
    });

    expect(result).toEqual({ available: false, reason: "before_midpoint" });
  });
});

describe("gate: once per checkpoint", () => {
  it("closes for a checkpoint that already showed the growth check", () => {
    const shown = state({
      checkpointProgress: {
        ...INITIAL_CHECKPOINT_PROGRESS,
        currentCheckpointId: "cp1",
        gameful: { growthCheck: { shownCheckpointIds: ["cp1"] } },
      },
    });

    expect(evaluateGrowthCheckGate({ state: shown, gate: gateWith(), now: NOW })).toEqual({
      available: false,
      reason: "already_shown",
    });
  });

  it("opens again on a later checkpoint", () => {
    const shown = state({
      checkpointProgress: {
        ...INITIAL_CHECKPOINT_PROGRESS,
        currentCheckpointId: "cp2",
        gameful: { growthCheck: { shownCheckpointIds: ["cp1"] } },
      },
    });
    const cp2Gate = { ...gateWith(), checkpoint: buildCheckpointGate(shown, "cp2").checkpoint };

    expect(evaluateGrowthCheckGate({ state: shown, gate: cp2Gate, now: NOW })).toMatchObject({
      available: true,
    });
  });
});

describe("gate: reviews come first", () => {
  it("defers while urgent reviews are piled up", () => {
    const overdue = Array.from({ length: GROWTH_CHECK_URGENT_REVIEW_LIMIT + 1 }, (_, i) =>
      review(`topic-${i}`, new Date(NOW.getTime() - DAY_MS).toISOString()),
    );
    const result = evaluateGrowthCheckGate({
      state: state({ reviewQueue: overdue }),
      gate: gateWith(),
      now: NOW,
    });

    expect(result).toEqual({ available: false, reason: "urgent_reviews" });
  });

  it("opens when the overdue reviews are within the limit", () => {
    const overdue = Array.from({ length: GROWTH_CHECK_URGENT_REVIEW_LIMIT }, (_, i) =>
      review(`topic-${i}`, new Date(NOW.getTime() - DAY_MS).toISOString()),
    );

    expect(
      evaluateGrowthCheckGate({ state: state({ reviewQueue: overdue }), gate: gateWith(), now: NOW }),
    ).toMatchObject({ available: true });
  });

  it("ignores reviews that are not due yet", () => {
    const upcoming = Array.from({ length: 5 }, (_, i) =>
      review(`topic-${i}`, new Date(NOW.getTime() + 5 * DAY_MS).toISOString()),
    );

    expect(
      evaluateGrowthCheckGate({ state: state({ reviewQueue: upcoming }), gate: gateWith(), now: NOW }),
    ).toMatchObject({ available: true });
  });

  it("does not write any state when deferring", () => {
    const overdue = Array.from({ length: 5 }, (_, i) =>
      review(`topic-${i}`, new Date(NOW.getTime() - DAY_MS).toISOString()),
    );
    const input = state({ reviewQueue: overdue });
    const snapshot = structuredClone(input);

    evaluateGrowthCheckGate({ state: input, gate: gateWith(), now: NOW });

    expect(input).toEqual(snapshot);
    expect(getShownCheckpointIds(input)).toEqual([]);
  });
});

describe("marking a checkpoint as shown", () => {
  it("records the checkpoint", () => {
    const next = markGrowthCheckShown(state(), "cp1");

    expect(getShownCheckpointIds(next)).toEqual(["cp1"]);
  });

  it("is idempotent", () => {
    const once = markGrowthCheckShown(state(), "cp1");

    expect(markGrowthCheckShown(once, "cp1")).toBe(once);
  });

  it("keeps checkpoints recorded earlier", () => {
    const next = markGrowthCheckShown(markGrowthCheckShown(state(), "cp1"), "cp2");

    expect(getShownCheckpointIds(next).sort()).toEqual(["cp1", "cp2"]);
  });

  it("touches nothing else in the progress", () => {
    const before = state({ exp: 120, completedTopics: [TOPIC_A.id] });
    const after = markGrowthCheckShown(before, "cp1");

    expect(after.progress.exp).toBe(before.progress.exp);
    expect(after.progress.completedTopics).toEqual(before.progress.completedTopics);
    expect(after.progress.checkpointProgress?.earnedBadges).toEqual([]);
    expect(after.progress.checkpointProgress?.currentCheckpointId).toBe("cp1");
  });

  it("does not mutate the state it was given", () => {
    const before = state();
    const snapshot = structuredClone(before);
    markGrowthCheckShown(before, "cp1");

    expect(before).toEqual(snapshot);
  });
});

describe("checkpoint start boundary", () => {
  it("uses the passed final exam of an earlier checkpoint", () => {
    const withAttempt = state({
      checkpointProgress: {
        ...INITIAL_CHECKPOINT_PROGRESS,
        currentCheckpointId: "cp2",
        finalExamAttempts: [
          {
            checkpointId: "cp1",
            passed: true,
            correct: 5,
            total: 6,
            attemptedAt: CP_START,
            wrongTopicIds: [],
          },
        ],
      },
    });

    expect(resolveCheckpointStartedAt(withAttempt, "cp2")).toBe(CP_START);
  });

  it("splits the history at its median when there is no earlier pass", () => {
    const answers = [
      answer("q1", true, at("2026-07-01T00:00:00.000Z")),
      answer("q2", true, at("2026-07-02T00:00:00.000Z")),
      answer("q3", true, at("2026-07-03T00:00:00.000Z")),
      answer("q4", true, at("2026-08-20T00:00:00.000Z")),
      answer("q5", true, at("2026-08-21T00:00:00.000Z")),
      answer("q6", true, at("2026-08-22T00:00:00.000Z")),
    ];

    expect(resolveCheckpointStartedAt(state({}, answers), "cp1")).toBe("2026-08-20T00:00:00.000Z");
  });

  it("returns null with no history at all", () => {
    expect(resolveCheckpointStartedAt(state(), "cp1")).toBeNull();
  });

  it("returns null when the history is too short to split", () => {
    const answers = [answer("q1", true, at("2026-07-01T00:00:00.000Z"))];

    expect(resolveCheckpointStartedAt(state({}, answers), "cp1")).toBeNull();
  });
});

describe("evidence extraction", () => {
  const gate = gateWith();

  function evidenceFor(answers: UserAnswer[], overrides: Partial<AppState["progress"]> = {}) {
    return buildGrowthEvidence({ state: state(overrides, answers), gate, now: NOW });
  }

  it("returns nothing without history", () => {
    expect(evidenceFor([])).toEqual([]);
  });

  it("returns nothing when the history is too short to split", () => {
    expect(evidenceFor([answer("q1", false, at("2026-08-20T00:00:00.000Z"))])).toEqual([]);
  });

  it("counts a question that was wrong before and right now", () => {
    const answers = [
      answer("q1", false, at("2026-07-01T00:00:00.000Z")),
      answer("q2", false, at("2026-07-02T00:00:00.000Z")),
      answer("q3", false, at("2026-07-03T00:00:00.000Z")),
      answer("q2", true, at("2026-08-20T00:00:00.000Z")),
      answer("q4", true, at("2026-08-21T00:00:00.000Z")),
      answer("q5", true, at("2026-08-22T00:00:00.000Z")),
    ];
    const recovered = evidenceFor(answers).find((e) => e.kind === "question_recovered");

    expect(recovered?.detail).toBe("1問");
  });

  it("does not count a question that is still wrong", () => {
    const answers = [
      answer("q1", false, at("2026-07-01T00:00:00.000Z")),
      answer("q2", false, at("2026-07-02T00:00:00.000Z")),
      answer("q3", false, at("2026-07-03T00:00:00.000Z")),
      answer("q2", false, at("2026-08-20T00:00:00.000Z")),
      answer("q4", true, at("2026-08-21T00:00:00.000Z")),
      answer("q5", true, at("2026-08-22T00:00:00.000Z")),
    ];

    expect(evidenceFor(answers).some((e) => e.kind === "question_recovered")).toBe(false);
  });

  it("reports an accuracy gain with enough samples on both sides", () => {
    const answers = [
      answer("q1", false, at("2026-07-01T00:00:00.000Z")),
      answer("q2", false, at("2026-07-02T00:00:00.000Z")),
      answer("q3", true, at("2026-07-03T00:00:00.000Z")),
      answer("q4", true, at("2026-08-20T00:00:00.000Z")),
      answer("q5", true, at("2026-08-21T00:00:00.000Z")),
      answer("q6", true, at("2026-08-22T00:00:00.000Z")),
    ];
    const accuracy = evidenceFor(answers).find((e) => e.kind === "topic_accuracy");

    expect(accuracy?.detail).toBe("33% → 100%");
  });

  it("ignores an accuracy comparison with too few samples", () => {
    // 前半3件は同一トピック、後半3件は別トピック → どちらのトピックも前後が揃わない。
    const answers = [
      answer("q1", false, at("2026-07-01T00:00:00.000Z"), TOPIC_A.id),
      answer("q2", false, at("2026-07-02T00:00:00.000Z"), TOPIC_A.id),
      answer("q3", false, at("2026-07-03T00:00:00.000Z"), TOPIC_A.id),
      answer("q4", true, at("2026-08-20T00:00:00.000Z"), TOPIC_B.id),
      answer("q5", true, at("2026-08-21T00:00:00.000Z"), TOPIC_B.id),
      answer("q6", true, at("2026-08-22T00:00:00.000Z"), TOPIC_B.id),
    ];

    expect(evidenceFor(answers).some((e) => e.kind === "topic_accuracy")).toBe(false);
  });

  const weakThenMasteredAnswers = [
    answer("q1", false, at("2026-07-01T00:00:00.000Z")),
    answer("q2", false, at("2026-07-02T00:00:00.000Z")),
    answer("q3", false, at("2026-07-03T00:00:00.000Z")),
    answer("q4", true, at("2026-08-20T00:00:00.000Z")),
    answer("q5", true, at("2026-08-21T00:00:00.000Z")),
    answer("q6", true, at("2026-08-22T00:00:00.000Z")),
  ];

  it("reports a previously weak topic that is now at the mastered level", () => {
    const items = evidenceFor(weakThenMasteredAnswers, {
      topicMasteryStats: { [TOPIC_A.id]: stats(TOPIC_A.id, 90) },
    });

    expect(items.some((e) => e.kind === "topic_mastered")).toBe(true);
  });

  it("does not report a topic that is still below the mastered level", () => {
    const items = evidenceFor(weakThenMasteredAnswers, {
      topicMasteryStats: { [TOPIC_A.id]: stats(TOPIC_A.id, 50) },
    });

    expect(items.some((e) => e.kind === "topic_mastered")).toBe(false);
  });

  it("never invents a comparison it cannot measure", () => {
    for (const item of evidenceFor(weakThenMasteredAnswers)) {
      if (item.detail) expect(item.detail).toMatch(/[0-9]/);
      expect(item.label).not.toMatch(/XP/);
    }
  });

  it("does not mutate the state it reads", () => {
    const input = state({}, weakThenMasteredAnswers);
    const snapshot = structuredClone(input);

    buildGrowthEvidence({ state: input, gate, now: NOW });

    expect(input).toEqual(snapshot);
  });
});

describe("sufficiency", () => {
  it("treats enough evidence as sufficient", () => {
    const evidence = Array.from({ length: GROWTH_EVIDENCE_SUFFICIENT }, () => ({
      kind: "question_recovered" as const,
      label: "x",
      detail: null,
    }));

    expect(hasSufficientEvidence(evidence)).toBe(true);
  });

  it("treats thin evidence as insufficient", () => {
    expect(hasSufficientEvidence([])).toBe(false);
    expect(
      hasSufficientEvidence([{ kind: "question_recovered", label: "x", detail: null }]),
    ).toBe(GROWTH_EVIDENCE_SUFFICIENT <= 1);
  });
});
