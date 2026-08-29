import { describe, expect, it } from "vitest";
import type { AppState, ReviewItem, UserAnswer } from "@/types";
import { INITIAL_CHECKPOINT_PROGRESS } from "@/types/checkpoint";
import {
  allQuestsDone,
  applyDailyQuestProgress,
  buildTodayQuests,
  claimDailyQuestReward,
  localDateOf,
  maxComboOf,
  resolveDailyQuests,
  DAILY_QUEST_CLEAR_XP,
  QUEST_DEFS,
} from "@/lib/dailyQuests";

// 「今日の3ミッション」の特性テスト。
// gameful-design-v2 §16.1「Daily quest reroll: 1日1回・完了済み保護・日付更新」の
// 前提となる現行挙動（決定的選出・claim冪等・進捗の上限）を先に固定する。

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
      checkpointProgress: { ...INITIAL_CHECKPOINT_PROGRESS },
      ...overrides,
    },
    answers: [],
  };
}

const review: ReviewItem = {
  topicId: "topic-a",
  dueAt: "2026-08-20T00:00:00.000Z",
  reason: "復習予定日です。",
};

function answer(isCorrect: boolean, index: number): UserAnswer {
  return {
    questionId: `q-${index}`,
    topicId: "topic-a",
    tag: "tag-a",
    selectedChoice: isCorrect ? "A" : "B",
    isCorrect,
    answeredAt: `2026-08-20T00:0${index}:00.000Z`,
  };
}

describe("buildTodayQuests", () => {
  it("picks exactly three quests", () => {
    expect(buildTodayQuests(state(), "2026-08-20").quests).toHaveLength(3);
  });

  it("is deterministic for the same date and state", () => {
    const a = buildTodayQuests(state(), "2026-08-20");
    const b = buildTodayQuests(state(), "2026-08-20");

    expect(a).toEqual(b);
  });

  it("selects a different set on at least some other days", () => {
    const ids = new Set(
      ["2026-08-20", "2026-08-21", "2026-08-22", "2026-08-23", "2026-08-24"].map((date) =>
        buildTodayQuests(state({ reviewQueue: [review] }), date)
          .quests.map((q) => q.id)
          .join(","),
      ),
    );

    expect(ids.size).toBeGreaterThan(1);
  });

  it("omits the review quest when the review queue is empty", () => {
    const quests = buildTodayQuests(state(), "2026-08-20").quests;

    expect(quests.some((q) => q.id === "review_one")).toBe(false);
  });

  it("allows the review quest once the review queue has an item", () => {
    // review_one が候補に入りうることを、全日付を通して確認する。
    const appears = ["2026-08-20", "2026-08-21", "2026-08-22", "2026-08-23"].some((date) =>
      buildTodayQuests(state({ reviewQueue: [review] }), date).quests.some(
        (q) => q.id === "review_one",
      ),
    );

    expect(appears).toBe(true);
  });

  it("starts every quest at zero progress and unclaimed", () => {
    const built = buildTodayQuests(state(), "2026-08-20");

    expect(built.claimed).toBe(false);
    expect(built.quests.every((q) => q.progress === 0)).toBe(true);
    expect(built.quests.every((q) => q.goal > 0)).toBe(true);
  });

  it("only picks quests defined in QUEST_DEFS", () => {
    const known = new Set(QUEST_DEFS.map((q) => q.id));

    expect(
      buildTodayQuests(state(), "2026-08-20").quests.every((q) => known.has(q.id)),
    ).toBe(true);
  });
});

describe("resolveDailyQuests", () => {
  it("returns the saved state when the date still matches", () => {
    const saved = buildTodayQuests(state(), "2026-08-20");
    const withSaved = state({
      checkpointProgress: { ...INITIAL_CHECKPOINT_PROGRESS, dailyQuests: saved },
    });

    expect(resolveDailyQuests(withSaved, "2026-08-20")).toBe(saved);
  });

  it("rebuilds when the local date has rolled over", () => {
    const saved = buildTodayQuests(state(), "2026-08-20");
    const withSaved = state({
      checkpointProgress: { ...INITIAL_CHECKPOINT_PROGRESS, dailyQuests: saved },
    });
    const resolved = resolveDailyQuests(withSaved, "2026-08-21");

    expect(resolved.date).toBe("2026-08-21");
    expect(resolved.claimed).toBe(false);
    expect(resolved.quests.every((q) => q.progress === 0)).toBe(true);
  });
});

describe("applyDailyQuestProgress", () => {
  const now = new Date(2026, 7, 20, 12, 0, 0);

  it("advances the complete-a-topic quest on any completion", () => {
    const after = applyDailyQuestProgress(
      state(),
      { correct: 1, total: 4, isReview: false, maxCombo: 1 },
      now,
    );
    const quest = after.progress.checkpointProgress?.dailyQuests?.quests.find(
      (q) => q.id === "complete_topic",
    );

    expect(quest?.progress).toBe(1);
  });

  it("caps progress at the quest goal", () => {
    let next = state();
    for (let i = 0; i < 5; i++) {
      next = applyDailyQuestProgress(
        next,
        { correct: 8, total: 8, isReview: true, maxCombo: 8 },
        now,
      );
    }
    const quests = next.progress.checkpointProgress?.dailyQuests?.quests ?? [];

    expect(quests.every((q) => q.progress <= q.goal)).toBe(true);
  });

  it("stores the resolved quest set under the local date", () => {
    const after = applyDailyQuestProgress(
      state(),
      { correct: 1, total: 1, isReview: false, maxCombo: 1 },
      now,
    );

    expect(after.progress.checkpointProgress?.dailyQuests?.date).toBe(localDateOf(now));
  });

  it("never awards XP by itself", () => {
    const before = state();
    const after = applyDailyQuestProgress(
      before,
      { correct: 8, total: 8, isReview: true, maxCombo: 8 },
      now,
    );

    expect(after.progress.exp).toBe(before.progress.exp);
  });

  it("does not mutate the state it was given", () => {
    const before = state();
    const snapshot = structuredClone(before);
    applyDailyQuestProgress(before, { correct: 1, total: 1, isReview: false, maxCombo: 1 }, now);

    expect(before).toEqual(snapshot);
  });
});

describe("claimDailyQuestReward", () => {
  const now = new Date(2026, 7, 20, 12, 0, 0);

  function completedState(): AppState {
    const date = localDateOf(now);
    const built = buildTodayQuests(state(), date);
    return state({
      checkpointProgress: {
        ...INITIAL_CHECKPOINT_PROGRESS,
        dailyQuests: {
          ...built,
          quests: built.quests.map((q) => ({ ...q, progress: q.goal })),
        },
      },
    });
  }

  it("returns null while the quests are unfinished", () => {
    expect(claimDailyQuestReward(state(), now)).toBeNull();
  });

  it("grants the fixed clear XP once all quests are done", () => {
    const before = completedState();
    const claimed = claimDailyQuestReward(before, now);

    expect(claimed?.rewardXp).toBe(DAILY_QUEST_CLEAR_XP);
    expect(claimed?.state.progress.checkpointProgress?.dailyQuests?.claimed).toBe(true);
    // 固定XP + 宝箱の少量ボーナス(0〜3)以上は増えない。
    const gained = (claimed?.state.progress.exp ?? 0) - before.progress.exp;
    expect(gained).toBeGreaterThanOrEqual(DAILY_QUEST_CLEAR_XP);
    expect(gained).toBeLessThanOrEqual(DAILY_QUEST_CLEAR_XP + 3);
  });

  it("is idempotent: a second claim on the same day returns null", () => {
    const claimed = claimDailyQuestReward(completedState(), now);

    expect(claimed).not.toBeNull();
    expect(claimDailyQuestReward(claimed!.state, now)).toBeNull();
  });

  it("does not touch learning progression when claimed", () => {
    const before = completedState();
    const claimed = claimDailyQuestReward(before, now);
    const after = claimed!.state.progress;

    expect(after.completedTopics).toEqual(before.progress.completedTopics);
    expect(after.topicMastery).toEqual(before.progress.topicMastery);
    expect(after.checkpointProgress?.earnedBadges).toEqual([]);
    expect(after.checkpointProgress?.currentCheckpointId).toBe("cp0");
    expect(after.checkpointProgress?.clearedCheckpointIds).toEqual([]);
  });
});

describe("helpers", () => {
  it("allQuestsDone requires every quest to reach its goal", () => {
    const built = buildTodayQuests(state(), "2026-08-20");

    expect(allQuestsDone(built)).toBe(false);
    expect(
      allQuestsDone({ ...built, quests: built.quests.map((q) => ({ ...q, progress: q.goal })) }),
    ).toBe(true);
  });

  it("maxComboOf returns the longest run of correct answers", () => {
    expect(maxComboOf([])).toBe(0);
    expect(
      maxComboOf([answer(true, 1), answer(true, 2), answer(false, 3), answer(true, 4)]),
    ).toBe(2);
    expect(maxComboOf([answer(false, 1), answer(false, 2)])).toBe(0);
  });

  it("localDateOf uses the local calendar date, not the UTC one", () => {
    expect(localDateOf(new Date(2026, 7, 20, 23, 30, 0))).toBe("2026-08-20");
    expect(localDateOf(new Date(2026, 7, 20, 0, 30, 0))).toBe("2026-08-20");
  });
});
