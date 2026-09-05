import { describe, expect, it } from "vitest";
import type { AppState, ReviewItem } from "@/types";
import { INITIAL_CHECKPOINT_PROGRESS } from "@/types/checkpoint";
import {
  applyDailyQuestProgress,
  applyQuestReroll,
  buildTodayQuests,
  canRerollQuest,
  claimDailyQuestReward,
  localDateOf,
  pickRerollCandidate,
  resolveDailyQuests,
} from "@/lib/dailyQuests";

// GF-P1-009。受け入れ基準:
//   - 1日2回以上リロールできない
//   - ページ再読込で差替結果が変わらない
//   - 日付更新時に新しい当日状態へ切り替わる
// 加えて「完了済みを不利益にしない」「獲得済み進捗を失わせない」を守る。

const NOW = new Date(2026, 7, 30, 12, 0, 0);
const TOMORROW = new Date(2026, 7, 31, 12, 0, 0);
const TODAY = localDateOf(NOW);

const review: ReviewItem = {
  topicId: "tech-binary-data",
  dueAt: "2026-08-30T00:00:00.000Z",
  reason: "復習",
};

function state(overrides: Partial<AppState["progress"]> = {}): AppState {
  return {
    progress: {
      level: 1,
      exp: 0,
      streakCount: 0,
      weakTags: [],
      completedTopics: [],
      topicMastery: {},
      topicMasteryStats: {},
      // 復習ミッションも候補に入るようにして、差し替え先を確保する。
      reviewQueue: [review],
      currentDay: 1,
      completedDays: [],
      checkpointProgress: { ...INITIAL_CHECKPOINT_PROGRESS, currentCheckpointId: "cp1" },
      ...overrides,
    },
    answers: [],
  };
}

function firstQuestId(appState: AppState): string {
  return resolveDailyQuests(appState, TODAY).quests[0].id;
}

describe("one reroll per day", () => {
  it("allows a reroll on a fresh day", () => {
    expect(canRerollQuest(state(), TODAY)).toBe(true);
  });

  it("refuses a second reroll on the same day", () => {
    const once = applyQuestReroll(state(), firstQuestId(state()), NOW);

    expect(canRerollQuest(once, TODAY)).toBe(false);
    expect(applyQuestReroll(once, firstQuestId(once), NOW)).toBe(once);
  });

  it("allows a reroll again the next day", () => {
    const once = applyQuestReroll(state(), firstQuestId(state()), NOW);

    expect(canRerollQuest(once, localDateOf(TOMORROW))).toBe(true);
  });
});

describe("the result survives a reload", () => {
  it("replaces the chosen quest with the candidate", () => {
    const before = state();
    const target = firstQuestId(before);
    const candidate = pickRerollCandidate(before, TODAY);
    const after = applyQuestReroll(before, target, NOW);
    const ids = resolveDailyQuests(after, TODAY).quests.map((q) => q.id);

    expect(ids).not.toContain(target);
    expect(ids).toContain(candidate?.id);
  });

  it("resolves to the same set every time it is read", () => {
    const after = applyQuestReroll(state(), firstQuestId(state()), NOW);
    const first = resolveDailyQuests(after, TODAY).quests.map((q) => q.id);
    const second = resolveDailyQuests(after, TODAY).quests.map((q) => q.id);

    expect(second).toEqual(first);
  });

  it("keeps three quests after the swap", () => {
    const after = applyQuestReroll(state(), firstQuestId(state()), NOW);

    expect(resolveDailyQuests(after, TODAY).quests).toHaveLength(3);
  });

  it("never offers a candidate already in today's set", () => {
    const before = state();
    const current = resolveDailyQuests(before, TODAY).quests.map((q) => q.id);

    expect(current).not.toContain(pickRerollCandidate(before, TODAY)?.id);
  });

  it("switches to a fresh set when the day rolls over", () => {
    const after = applyQuestReroll(state(), firstQuestId(state()), NOW);
    const tomorrow = resolveDailyQuests(after, localDateOf(TOMORROW));

    expect(tomorrow.date).toBe(localDateOf(TOMORROW));
    expect(tomorrow.quests.every((q) => q.progress === 0)).toBe(true);
  });
});

describe("never costs the user progress", () => {
  it("refuses to swap a quest that already has progress", () => {
    const started = applyDailyQuestProgress(
      state(),
      { correct: 1, total: 1, isReview: false, maxCombo: 1 },
      NOW,
    );
    const withProgress = resolveDailyQuests(started, TODAY).quests.find((q) => q.progress > 0);

    expect(withProgress).toBeDefined();
    expect(applyQuestReroll(started, withProgress!.id, NOW)).toBe(started);
  });

  it("refuses to swap a completed quest", () => {
    const done = applyDailyQuestProgress(
      state(),
      { correct: 8, total: 8, isReview: true, maxCombo: 8 },
      NOW,
    );
    const completed = resolveDailyQuests(done, TODAY).quests.find((q) => q.progress >= q.goal);

    expect(completed).toBeDefined();
    expect(applyQuestReroll(done, completed!.id, NOW)).toBe(done);
  });

  it("keeps the progress of the quests it did not touch", () => {
    const started = applyDailyQuestProgress(
      state(),
      { correct: 8, total: 8, isReview: true, maxCombo: 8 },
      NOW,
    );
    const untouched = resolveDailyQuests(started, TODAY).quests.find((q) => q.progress === 0);
    if (!untouched) return; // 全部進んだ日は対象外

    const after = applyQuestReroll(started, untouched.id, NOW);
    const before = resolveDailyQuests(started, TODAY).quests.filter((q) => q.progress > 0);
    const kept = resolveDailyQuests(after, TODAY).quests;

    for (const quest of before) {
      expect(kept.find((q) => q.id === quest.id)?.progress).toBe(quest.progress);
    }
  });

  it("does not touch the claimed flag", () => {
    const built = buildTodayQuests(state(), TODAY);
    const claimedState = state({
      checkpointProgress: {
        ...INITIAL_CHECKPOINT_PROGRESS,
        currentCheckpointId: "cp1",
        dailyQuests: {
          ...built,
          quests: built.quests.map((q) => ({ ...q, progress: q.goal })),
          claimed: true,
        },
      },
    });

    // 全完了なので差し替え自体が起きない（進捗を失わせない）。
    expect(applyQuestReroll(claimedState, built.quests[0].id, NOW)).toBe(claimedState);
    expect(claimDailyQuestReward(claimedState, NOW)).toBeNull();
  });
});

describe("guards", () => {
  it("ignores a quest that is not in today's set", () => {
    const before = state();

    expect(applyQuestReroll(before, "not-a-quest", NOW)).toBe(before);
  });

  it("grants no XP or reward by itself", () => {
    const before = state();
    const after = applyQuestReroll(before, firstQuestId(before), NOW);

    expect(after.progress.exp).toBe(before.progress.exp);
    expect(after.progress.checkpointProgress?.badgeFragments).toEqual([]);
    expect(after.progress.checkpointProgress?.earnedBadges).toEqual([]);
  });

  it("does not mutate the state it was given", () => {
    const before = state();
    const snapshot = structuredClone(before);
    applyQuestReroll(before, firstQuestId(before), NOW);

    expect(before).toEqual(snapshot);
  });
});
