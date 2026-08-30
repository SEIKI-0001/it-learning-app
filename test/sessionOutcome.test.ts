import { describe, expect, it } from "vitest";
import type { AppState, TopicMasteryStats, UserAnswer } from "@/types";
import { INITIAL_CHECKPOINT_PROGRESS } from "@/types/checkpoint";
import { SESSION_OUTCOME_LIMIT } from "@/types/gameful";
import { buildSessionOutcome } from "@/lib/sessionOutcome";

// GF-P0-005「学習後の成果差分フィードバック」。要件書 §16.1 が求める
// 「before/after 差分・値不変・再計算失敗時の fallback」を固定する。

const TOPIC = "tech-binary-data";

function state(overrides: Partial<AppState["progress"]> = {}, answers: UserAnswer[] = []): AppState {
  return {
    progress: {
      level: 1,
      exp: 0,
      streakCount: 1,
      weakTags: [],
      completedTopics: [],
      topicMastery: {},
      topicMasteryStats: {},
      reviewQueue: [],
      currentDay: 1,
      completedDays: [],
      checkpointProgress: { ...INITIAL_CHECKPOINT_PROGRESS, currentCheckpointId: "cp1" },
      ...overrides,
    },
    answers,
  };
}

function stats(score: number, topicId = TOPIC): Record<string, TopicMasteryStats> {
  return {
    [topicId]: {
      topicId,
      masteryScore: score,
      lastEvaluatedAt: "2026-08-20T00:00:00.000Z",
      correctCount: 4,
      incorrectCount: 1,
      reviewSuccessCount: 1,
      recentEvidence: [],
    },
  };
}

function answer(questionId: string, isCorrect: boolean, at: string): UserAnswer {
  return {
    questionId,
    topicId: TOPIC,
    tag: "tag",
    selectedChoice: isCorrect ? "A" : "B",
    isCorrect,
    answeredAt: at,
  };
}

function build(before: AppState, after: AppState, extra: Partial<Parameters<typeof buildSessionOutcome>[0]> = {}) {
  return buildSessionOutcome({
    before,
    after,
    topicId: TOPIC,
    answers: [],
    ...extra,
  });
}

describe("learning outcomes", () => {
  it("reports the mastery move as a before -> after pair", () => {
    const outcomes = build(
      state({ topicMasteryStats: stats(58) }),
      state({ topicMasteryStats: stats(66) }),
    );
    const mastery = outcomes.find((o) => o.kind === "mastery");

    expect(mastery?.detail).toBe("58 → 66");
  });

  it("stays silent about mastery when the score did not move", () => {
    const outcomes = build(
      state({ topicMasteryStats: stats(58) }),
      state({ topicMasteryStats: stats(58) }),
    );

    expect(outcomes.some((o) => o.kind === "mastery")).toBe(false);
  });

  it("reports a first measurement without inventing a previous value", () => {
    const outcomes = build(state(), state({ topicMasteryStats: stats(40) }));

    expect(outcomes.find((o) => o.kind === "mastery")?.detail).toBe("40");
  });

  it("counts answers that were wrong last time and right now", () => {
    const before = state({}, [answer("q1", false, "2026-08-01T00:00:00.000Z")]);
    const outcomes = build(before, state(), {
      answers: [answer("q1", true, "2026-08-20T00:00:00.000Z")],
    });

    expect(outcomes.find((o) => o.kind === "revenge")?.detail).toBe("1問");
  });

  it("does not claim a comeback for a question that was already correct", () => {
    const before = state({}, [answer("q1", true, "2026-08-01T00:00:00.000Z")]);
    const outcomes = build(before, state(), {
      answers: [answer("q1", true, "2026-08-20T00:00:00.000Z")],
    });

    expect(outcomes.some((o) => o.kind === "revenge")).toBe(false);
  });

  it("does not claim a comeback for a first-time question", () => {
    const outcomes = build(state(), state(), {
      answers: [answer("q-new", true, "2026-08-20T00:00:00.000Z")],
    });

    expect(outcomes.some((o) => o.kind === "revenge")).toBe(false);
  });

  it("uses the most recent prior attempt, not the oldest", () => {
    const before = state({}, [
      answer("q1", false, "2026-08-01T00:00:00.000Z"),
      answer("q1", true, "2026-08-10T00:00:00.000Z"),
    ]);
    const outcomes = build(before, state(), {
      answers: [answer("q1", true, "2026-08-20T00:00:00.000Z")],
    });

    expect(outcomes.some((o) => o.kind === "revenge")).toBe(false);
  });
});

describe("progress toward passing", () => {
  it("reports leaving the review queue", () => {
    const before = state({
      reviewQueue: [{ topicId: TOPIC, dueAt: "2026-08-20T00:00:00.000Z", reason: "復習" }],
    });

    expect(build(before, state()).some((o) => o.kind === "review_cleared")).toBe(true);
  });

  it("stays silent when the topic is still queued", () => {
    const queued = {
      reviewQueue: [{ topicId: TOPIC, dueAt: "2026-08-20T00:00:00.000Z", reason: "復習" }],
    };

    expect(build(state(queued), state(queued)).some((o) => o.kind === "review_cleared")).toBe(false);
  });

  it("reports leaving the weak-topic set", () => {
    const before = state({ topicMasteryStats: stats(10) });
    const after = state({ topicMasteryStats: stats(85) });

    expect(build(before, after).some((o) => o.kind === "weak_resolved")).toBe(true);
  });
});

describe("readiness comparison", () => {
  it("shows X -> Y only when both measured values exist and differ", () => {
    const outcomes = build(state(), state(), {
      readiness: { before: 58, after: 66 },
    });

    expect(outcomes.find((o) => o.kind === "readiness")?.detail).toBe("58% → 66%");
  });

  it("omits the readiness line when the recalculation failed", () => {
    expect(build(state(), state()).some((o) => o.kind === "readiness")).toBe(false);
  });

  it("omits the readiness line when there is no comparable previous value", () => {
    const outcomes = build(state(), state(), { readiness: { before: null, after: 66 } });

    expect(outcomes.some((o) => o.kind === "readiness")).toBe(false);
  });

  it("omits the readiness line when the value did not move", () => {
    const outcomes = build(state(), state(), { readiness: { before: 66, after: 66 } });

    expect(outcomes.some((o) => o.kind === "readiness")).toBe(false);
  });
});

describe("no double notification with Celebration", () => {
  it("never reports XP, level, rank, badges, checkpoint clears or streaks", () => {
    const before = state({ exp: 100, level: 1, streakCount: 2 });
    const after = state({
      exp: 220,
      level: 3,
      streakCount: 3,
      topicMasteryStats: stats(70),
      checkpointProgress: {
        ...INITIAL_CHECKPOINT_PROGRESS,
        currentCheckpointId: "cp2",
        clearedCheckpointIds: ["cp1"],
        earnedBadges: [{ badgeId: "b-cp1-touch-tech", earnedAt: "2026-08-20T00:00:00.000Z" }],
      },
    });
    const kinds = build(before, after).map((o) => o.kind);

    expect(kinds).not.toContain("xp");
    expect(kinds).not.toContain("rank");
    expect(kinds).not.toContain("streak");
    // CP が進んだときの節目通知は cpCleared の演出が担当する。
    expect(kinds).not.toContain("checkpoint");
  });

  it("never mentions XP in a label", () => {
    const outcomes = build(state({ exp: 0 }), state({ exp: 999, topicMasteryStats: stats(70) }));

    for (const outcome of outcomes) {
      expect(outcome.label).not.toMatch(/XP/);
    }
  });
});

describe("guarantees", () => {
  it("always returns at least one item", () => {
    expect(build(state(), state()).length).toBeGreaterThanOrEqual(1);
  });

  it("falls back to a factual measurement statement when nothing else moved", () => {
    expect(build(state(), state())).toEqual([
      { kind: "measurement", label: "理解度の測定データを更新しました", detail: null },
    ]);
  });

  it("never exceeds the display limit", () => {
    const before = state(
      {
        topicMasteryStats: stats(10),
        reviewQueue: [{ topicId: TOPIC, dueAt: "2026-08-20T00:00:00.000Z", reason: "復習" }],
      },
      [answer("q1", false, "2026-08-01T00:00:00.000Z")],
    );
    const after = state({ topicMasteryStats: stats(90) });
    const outcomes = buildSessionOutcome({
      before,
      after,
      topicId: TOPIC,
      answers: [answer("q1", true, "2026-08-20T00:00:00.000Z")],
      readiness: { before: 50, after: 60 },
    });

    expect(outcomes.length).toBeLessThanOrEqual(SESSION_OUTCOME_LIMIT);
  });

  it("orders learning outcomes before the readiness meaning", () => {
    const before = state({ topicMasteryStats: stats(20) }, [
      answer("q1", false, "2026-08-01T00:00:00.000Z"),
    ]);
    const outcomes = buildSessionOutcome({
      before,
      after: state({ topicMasteryStats: stats(80) }),
      topicId: TOPIC,
      answers: [answer("q1", true, "2026-08-20T00:00:00.000Z")],
      readiness: { before: 50, after: 60 },
    });
    const kinds = outcomes.map((o) => o.kind);

    expect(kinds.indexOf("revenge")).toBeLessThan(kinds.indexOf("readiness"));
    expect(kinds.indexOf("mastery")).toBeLessThan(kinds.indexOf("readiness"));
  });
});

describe("purity", () => {
  it("does not mutate the states it compares", () => {
    const before = state({ topicMasteryStats: stats(58) });
    const after = state({ topicMasteryStats: stats(66) });
    const snapshot = structuredClone({ before, after });

    build(before, after);

    expect({ before, after }).toEqual(snapshot);
  });
});
