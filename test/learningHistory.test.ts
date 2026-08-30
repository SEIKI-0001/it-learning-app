import { describe, expect, it } from "vitest";
import type { AppState, UserAnswer } from "@/types";
import { INITIAL_CHECKPOINT_PROGRESS } from "@/types/checkpoint";
import { INITIAL_STREAK_META } from "@/lib/streak";
import { getRequiredBadges } from "@/lib/badges";
import {
  buildJourneyTimeline,
  buildLearningHeatmap,
  buildLifetimeStats,
} from "@/lib/learningHistory";

// GF-P1-004。受け入れ基準:
//   - 未学習日を失敗・警告として扱わない（強度0で表す）
//   - 日付境界がローカル日付と一致する
//   - 既存ログから再構築できる値を二重保存しない（＝すべて導出で作れる）

const NOW = new Date(2026, 7, 15, 12, 0, 0); // 2026-08-15（8月は31日）

/** ローカル時刻で作った Date の ISO。UTC との差があってもローカル日付で数える。 */
function localAt(year: number, month1: number, day: number, hour = 12): string {
  return new Date(year, month1 - 1, day, hour).toISOString();
}

function answer(isCorrect: boolean, answeredAt: string): UserAnswer {
  return {
    questionId: `q-${answeredAt}-${isCorrect}`,
    topicId: "tech-binary-data",
    tag: "tag",
    selectedChoice: isCorrect ? "A" : "B",
    isCorrect,
    answeredAt,
  };
}

function state(
  answers: UserAnswer[],
  overrides: Partial<AppState["progress"]> = {},
): AppState {
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
      checkpointProgress: { ...INITIAL_CHECKPOINT_PROGRESS, currentCheckpointId: "cp1" },
      ...overrides,
    },
    answers,
  };
}

describe("heatmap shape", () => {
  it("covers every day of the month", () => {
    const heatmap = buildLearningHeatmap({ answers: [], now: NOW });

    expect(heatmap.year).toBe(2026);
    expect(heatmap.month).toBe(8);
    expect(heatmap.days).toHaveLength(31);
    expect(heatmap.days[0].dayOfMonth).toBe(1);
    expect(heatmap.days[30].dayOfMonth).toBe(31);
  });

  it("handles a short month", () => {
    const february = buildLearningHeatmap({ answers: [], now: new Date(2026, 1, 10) });

    expect(february.days).toHaveLength(28);
  });

  it("exposes the weekday so the grid can be offset", () => {
    const heatmap = buildLearningHeatmap({ answers: [], now: NOW });

    expect(heatmap.days[0].weekday).toBe(new Date(2026, 7, 1).getDay());
  });
});

describe("unstudied days are never a failure", () => {
  it("gives an unstudied day intensity zero", () => {
    const heatmap = buildLearningHeatmap({ answers: [], now: NOW });

    expect(heatmap.days.every((day) => day.intensity === 0)).toBe(true);
    expect(heatmap.studiedDayCount).toBe(0);
  });

  it("never produces a negative or special marker for an empty day", () => {
    const heatmap = buildLearningHeatmap({
      answers: [answer(true, localAt(2026, 8, 5))],
      now: NOW,
    });
    const empty = heatmap.days.find((day) => day.dayOfMonth === 6);

    expect(empty).toMatchObject({ answerCount: 0, correctCount: 0, intensity: 0 });
  });
});

describe("local date boundary", () => {
  it("counts a late-night answer on its local day", () => {
    const heatmap = buildLearningHeatmap({
      answers: [answer(true, localAt(2026, 8, 10, 23))],
      now: NOW,
    });

    expect(heatmap.days.find((day) => day.dayOfMonth === 10)?.answerCount).toBe(1);
    expect(heatmap.days.find((day) => day.dayOfMonth === 11)?.answerCount).toBe(0);
  });

  it("counts an early-morning answer on its local day", () => {
    const heatmap = buildLearningHeatmap({
      answers: [answer(true, localAt(2026, 8, 10, 0))],
      now: NOW,
    });

    expect(heatmap.days.find((day) => day.dayOfMonth === 10)?.answerCount).toBe(1);
    expect(heatmap.days.find((day) => day.dayOfMonth === 9)?.answerCount).toBe(0);
  });

  it("ignores answers from other months", () => {
    const heatmap = buildLearningHeatmap({
      answers: [answer(true, localAt(2026, 7, 10)), answer(true, localAt(2026, 9, 10))],
      now: NOW,
    });

    expect(heatmap.studiedDayCount).toBe(0);
  });

  it("skips an unparseable timestamp instead of crashing", () => {
    const broken: UserAnswer = { ...answer(true, localAt(2026, 8, 5)), answeredAt: "not-a-date" };

    expect(() => buildLearningHeatmap({ answers: [broken], now: NOW })).not.toThrow();
  });
});

describe("intensity", () => {
  function dayWith(count: number) {
    const answers = Array.from({ length: count }, (_, i) =>
      answer(true, localAt(2026, 8, 5, (i % 12) + 1)),
    );
    return buildLearningHeatmap({ answers, now: NOW }).days.find((d) => d.dayOfMonth === 5);
  }

  it("rises with the number of answers", () => {
    expect(dayWith(1)?.intensity).toBe(1);
    expect(dayWith(5)?.intensity).toBe(2);
    expect(dayWith(10)?.intensity).toBe(3);
    expect(dayWith(20)?.intensity).toBe(4);
  });

  it("never exceeds the top step", () => {
    expect(dayWith(500)?.intensity).toBe(4);
  });
});

describe("lifetime stats", () => {
  it("counts answers, correct answers and study days", () => {
    const stats = buildLifetimeStats(
      state([
        answer(true, localAt(2026, 8, 1)),
        answer(false, localAt(2026, 8, 1, 13)),
        answer(true, localAt(2026, 8, 2)),
      ]),
    );

    expect(stats).toMatchObject({ totalAnswers: 3, totalCorrect: 2, studyDayCount: 2 });
  });

  it("reports the personal best streak", () => {
    const stats = buildLifetimeStats(
      state([], {
        checkpointProgress: {
          ...INITIAL_CHECKPOINT_PROGRESS,
          streakMeta: { ...INITIAL_STREAK_META, longestStreak: 12 },
        },
      }),
    );

    expect(stats.longestStreak).toBe(12);
  });

  it("falls back to the current streak for older data with no record", () => {
    expect(buildLifetimeStats(state([], { streakCount: 4 })).longestStreak).toBe(4);
  });

  it("is all zeros for a brand new user", () => {
    expect(buildLifetimeStats(state([]))).toEqual({
      totalAnswers: 0,
      totalCorrect: 0,
      studyDayCount: 0,
      longestStreak: 0,
    });
  });
});

describe("journey timeline", () => {
  const badgeId = getRequiredBadges("cp1")[0].id;

  it("is empty for a user with no history", () => {
    expect(buildJourneyTimeline(state([]))).toEqual([]);
  });

  it("records the first study day", () => {
    const events = buildJourneyTimeline(state([answer(true, localAt(2026, 7, 1))]));

    expect(events[0]).toMatchObject({ kind: "started", label: "学習をはじめた日" });
  });

  it("records earned badges and passed checkpoints", () => {
    const events = buildJourneyTimeline(
      state([], {
        checkpointProgress: {
          ...INITIAL_CHECKPOINT_PROGRESS,
          earnedBadges: [{ badgeId, earnedAt: localAt(2026, 8, 1) }],
          finalExamAttempts: [
            {
              checkpointId: "cp1",
              passed: true,
              correct: 5,
              total: 6,
              attemptedAt: localAt(2026, 8, 5),
              wrongTopicIds: [],
            },
          ],
        },
      }),
    );

    expect(events.map((e) => e.kind)).toEqual(["checkpoint", "badge"]);
    expect(events[0].label).toContain("突破");
  });

  it("leaves out a failed checkpoint attempt", () => {
    const events = buildJourneyTimeline(
      state([], {
        checkpointProgress: {
          ...INITIAL_CHECKPOINT_PROGRESS,
          finalExamAttempts: [
            {
              checkpointId: "cp1",
              passed: false,
              correct: 2,
              total: 6,
              attemptedAt: localAt(2026, 8, 5),
              wrongTopicIds: [],
            },
          ],
        },
      }),
    );

    expect(events).toEqual([]);
  });

  it("orders newest first", () => {
    const events = buildJourneyTimeline(
      state([answer(true, localAt(2026, 7, 1))], {
        checkpointProgress: {
          ...INITIAL_CHECKPOINT_PROGRESS,
          earnedBadges: [{ badgeId, earnedAt: localAt(2026, 8, 1) }],
        },
      }),
    );

    expect(events.map((e) => e.kind)).toEqual(["badge", "started"]);
  });

  it("does not date the personal best streak it cannot place", () => {
    const events = buildJourneyTimeline(
      state([], {
        checkpointProgress: {
          ...INITIAL_CHECKPOINT_PROGRESS,
          streakMeta: { ...INITIAL_STREAK_META, longestStreak: 30 },
        },
      }),
    );

    expect(events).toEqual([]);
  });
});

describe("purity", () => {
  it("does not mutate the state it reads", () => {
    const input = state([answer(true, localAt(2026, 8, 1))]);
    const snapshot = structuredClone(input);

    buildLearningHeatmap({ answers: input.answers, now: NOW });
    buildLifetimeStats(input);
    buildJourneyTimeline(input);

    expect(input).toEqual(snapshot);
  });
});
