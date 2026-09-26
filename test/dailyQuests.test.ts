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
  pinDailyQuests,
  pickRerollCandidate,
  applyQuestReroll,
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

describe("今日の3ミッションと Today のタスクの一致", () => {
  const date = "2026-09-26";
  const at = new Date(2026, 8, 26, 12, 0, 0);
  const vocabDay = { todayActivityKinds: new Set(["vocab"] as const), todayVocabWordCount: 4 };
  const noVocab = { todayActivityKinds: new Set(["past_exam_drill"] as const) };
  const ids = (s: AppState, ctx = {}) => resolveDailyQuests(s, date, ctx).quests.map((q) => q.id);
  const progressOf = (s: AppState, id: string) =>
    resolveDailyQuests(s, date).quests.find((q) => q.id === id)?.progress;
  const words = (cleared: number, fromTodayTask = true) =>
    ({ kind: "words" as const, correct: 0, total: 0, isReview: false, maxCombo: 0, wordsCleared: cleared, fromTodayTask });

  it("Today に用語タスクが無ければ用語ミッションを出さない（選び方は従来と同じ）", () => {
    for (const d of ["2026-09-01", "2026-09-02", "2026-09-03", "2026-09-26"]) {
      const without = buildTodayQuests(state(), d, noVocab).quests.map((q) => q.id);
      expect(without).not.toContain("words_today");
      expect(without).toEqual(buildTodayQuests(state(), d).quests.map((q) => q.id));
    }
  });

  it("Today に用語タスクがあれば、3件のうち1件を用語ミッションにする（決定的）", () => {
    const a = buildTodayQuests(state(), date, vocabDay);
    expect(a.quests).toHaveLength(3);
    expect(a.quests.map((q) => q.id)).toContain("words_today");
    expect(buildTodayQuests(state(), date, vocabDay)).toEqual(a);
  });

  it("用語ミッションの目標は今日の用語タスクの語数以内（Today の分だけで達成できる）", () => {
    const goal = (n: number) => buildTodayQuests(state(), date, { ...vocabDay, todayVocabWordCount: n })
      .quests.find((q) => q.id === "words_today")!.goal;
    expect(goal(1)).toBe(1);
    expect(goal(2)).toBe(2);
    expect(goal(8)).toBe(3);
  });

  it("Today のタスクで確定した3件を保存すると、以後は文脈なしでも同じ3件", () => {
    const pinned = pinDailyQuests(state(), date, vocabDay);
    expect(ids(pinned)).toContain("words_today");
    expect(pinDailyQuests(pinned, date, noVocab)).toBe(pinned); // 保存済みは変えない
  });

  it("Today の用語タスクを終えた成果で進み、開いただけ・Today 外の学習では進まない", () => {
    const s = pinDailyQuests(state(), date, vocabDay);
    expect(progressOf(applyDailyQuestProgress(s, words(0), at), "words_today")).toBe(0);
    expect(progressOf(applyDailyQuestProgress(s, words(3, false), at), "words_today")).toBe(0);
    const done = applyDailyQuestProgress(s, words(4), at);
    expect(progressOf(done, "words_today")).toBe(3);
    // 単語の成果はトピック・正解数ミッションに数えない
    for (const id of ids(done).filter((q) => q !== "words_today")) {
      expect(progressOf(done, id)).toBe(0);
    }
  });

  it("差し替えで用語ミッションは出さず、用語ミッションの差し替え・報酬は従来どおり動く", () => {
    const s = pinDailyQuests(state(), date, vocabDay);
    expect(pickRerollCandidate(s, date, vocabDay)?.id).not.toBe("words_today");
    const rerolled = applyQuestReroll(s, "words_today", at, vocabDay);
    expect(ids(rerolled)).not.toContain("words_today");
    expect(ids(rerolled)).toHaveLength(3);
  });

  it("公式過去問の演習は正解数・正答率のミッションを進め、トピック完了には数えない", () => {
    const s = state({
      checkpointProgress: {
        ...INITIAL_CHECKPOINT_PROGRESS,
        dailyQuests: {
          date,
          quests: ["correct_8", "accuracy_80", "complete_topic"].map((id) => ({
            id, goal: QUEST_DEFS.find((d) => d.id === id)!.goal, progress: 0,
          })),
          claimed: false,
        },
      },
    });
    const next = applyDailyQuestProgress(s, { kind: "past_exam", correct: 9, total: 10, isReview: false, maxCombo: 4 }, at);
    expect(progressOf(next, "correct_8")).toBe(8);
    expect(progressOf(next, "accuracy_80")).toBe(1);
    expect(progressOf(next, "complete_topic")).toBe(0);
  });
});
