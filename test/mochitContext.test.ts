import { describe, expect, it } from "vitest";
import type { AppState, UserAnswer } from "@/types";
import { INITIAL_CHECKPOINT_PROGRESS } from "@/types/checkpoint";
import { INITIAL_STREAK_META } from "@/lib/streak";
import { getRequiredBadges } from "@/lib/badges";
import { buildMochitContext } from "@/lib/mochitContext";

// GF-P0-004。要件書 §16.1「MochitContext: 事実がない場合に具体メッセージを
// 生成しない」を、コンテキスト側で事実を作らないことによって固定する。

const TOPIC = "tech-binary-data";
const CP1_REQUIRED = getRequiredBadges("cp1").map((b) => b.id);

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

function state(
  overrides: Partial<AppState["progress"]> = {},
  answers: UserAnswer[] = [],
): AppState {
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

function earnedBadges(count: number) {
  return CP1_REQUIRED.slice(0, count).map((badgeId) => ({
    badgeId,
    earnedAt: "2026-08-01T00:00:00.000Z",
  }));
}

function build(
  before: AppState,
  after: AppState,
  answers: UserAnswer[] = [],
  newlyEarnedBadgeIds: string[] = [],
) {
  return buildMochitContext({ before, after, topicId: TOPIC, answers, newlyEarnedBadgeIds });
}

describe("says nothing it cannot back with a fact", () => {
  it("returns an empty context for an uneventful session", () => {
    const plain = state({
      checkpointProgress: {
        ...INITIAL_CHECKPOINT_PROGRESS,
        currentCheckpointId: "cp1",
        earnedBadges: earnedBadges(CP1_REQUIRED.length),
      },
    });

    // 必須バッジが揃っており残数も無い＝語る事実が無い状態。
    expect(build(plain, plain)).toEqual({});
  });

  it("omits recovered count when nothing was recovered", () => {
    expect(build(state(), state(), [answer("q1", true, "2026-08-20T00:00:00.000Z")]))
      .not.toHaveProperty("recoveredCount");
  });

  it("omits the streak best when it did not move", () => {
    expect(build(state(), state())).not.toHaveProperty("personalBestStreak");
  });

  it("omits the shield flag when no shield was spent", () => {
    expect(build(state(), state())).not.toHaveProperty("streakShieldUsed");
  });

  it("never reports zero as a fact", () => {
    const context = build(state(), state(), [answer("q1", false, "2026-08-20T00:00:00.000Z")]);

    expect(context.recoveredCount).toBeUndefined();
  });
});

describe("recovered questions", () => {
  it("counts a question that was wrong before and right now", () => {
    const before = state({}, [answer("q1", false, "2026-08-01T00:00:00.000Z")]);
    const context = build(before, state(), [answer("q1", true, "2026-08-20T00:00:00.000Z")]);

    expect(context.recoveredCount).toBe(1);
  });

  it("does not count a question that was already correct", () => {
    const before = state({}, [answer("q1", true, "2026-08-01T00:00:00.000Z")]);
    const context = build(before, state(), [answer("q1", true, "2026-08-20T00:00:00.000Z")]);

    expect(context.recoveredCount).toBeUndefined();
  });

  it("uses the most recent prior attempt", () => {
    const before = state({}, [
      answer("q1", false, "2026-08-01T00:00:00.000Z"),
      answer("q1", true, "2026-08-10T00:00:00.000Z"),
    ]);
    const context = build(before, state(), [answer("q1", true, "2026-08-20T00:00:00.000Z")]);

    expect(context.recoveredCount).toBeUndefined();
  });
});

describe("review and checkpoint facts", () => {
  it("reports leaving the review queue", () => {
    const before = state({
      reviewQueue: [{ topicId: TOPIC, dueAt: "2026-08-20T00:00:00.000Z", reason: "復習" }],
    });

    expect(build(before, state()).reviewCleared).toBe(true);
  });

  it("does not report a review that is still queued", () => {
    const queued = {
      reviewQueue: [{ topicId: TOPIC, dueAt: "2026-08-20T00:00:00.000Z", reason: "復習" }],
    };

    expect(build(state(queued), state(queued)).reviewCleared).toBeUndefined();
  });

  it("reports the remaining required badges", () => {
    const after = state({
      checkpointProgress: {
        ...INITIAL_CHECKPOINT_PROGRESS,
        currentCheckpointId: "cp1",
        earnedBadges: earnedBadges(CP1_REQUIRED.length - 1),
      },
    });

    expect(build(state(), after).remainingRequiredBadges).toBe(1);
  });

  it("reports the final exam unlocking only when it just happened", () => {
    // 分野カバレッジも満たす必要があるため、gate の結果に委ねて
    // 「解放されていないなら残数を出す」側であることだけを確かめる。
    const after = state({
      checkpointProgress: {
        ...INITIAL_CHECKPOINT_PROGRESS,
        currentCheckpointId: "cp1",
        earnedBadges: earnedBadges(CP1_REQUIRED.length),
      },
    });
    const context = build(state(), after);

    expect(context.remainingRequiredBadges).toBeUndefined();
  });
});

describe("no double notification with Celebration", () => {
  it("flags a freshly earned badge so the bubble stays quiet about badges", () => {
    const after = state({
      checkpointProgress: {
        ...INITIAL_CHECKPOINT_PROGRESS,
        currentCheckpointId: "cp1",
        earnedBadges: earnedBadges(1),
      },
    });

    expect(build(state(), after, [], ["b-cp1-touch-tech"]).badgeJustEarned).toBe(true);
  });

  it("leaves the flag off when no badge was earned", () => {
    expect(build(state(), state()).badgeJustEarned).toBeUndefined();
  });
});

describe("streak facts", () => {
  function withStreak(streakCount: number, longestStreak: number, shieldsUsed = 0): AppState {
    return state({
      streakCount,
      checkpointProgress: {
        ...INITIAL_CHECKPOINT_PROGRESS,
        currentCheckpointId: "cp1",
        streakMeta: { ...INITIAL_STREAK_META, longestStreak, shieldsUsed, shieldsGranted: 2 },
      },
    });
  }

  it("reports a personal best that was just set", () => {
    expect(build(withStreak(4, 4), withStreak(5, 5)).personalBestStreak).toBe(5);
  });

  it("does not claim a personal best while below it", () => {
    expect(build(withStreak(2, 9), withStreak(3, 9)).personalBestStreak).toBeUndefined();
  });

  it("reports a shield that was just spent", () => {
    expect(build(withStreak(5, 5, 0), withStreak(6, 6, 1)).streakShieldUsed).toBe(true);
  });
});

describe("purity", () => {
  it("does not mutate the states it reads", () => {
    const before = state({}, [answer("q1", false, "2026-08-01T00:00:00.000Z")]);
    const after = state();
    const snapshot = structuredClone({ before, after });

    build(before, after, [answer("q1", true, "2026-08-20T00:00:00.000Z")]);

    expect({ before, after }).toEqual(snapshot);
  });
});
