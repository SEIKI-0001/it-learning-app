import { describe, expect, it } from "vitest";
import type { AppState, ReviewItem, UserProfile } from "@/types";
import { INITIAL_CHECKPOINT_PROGRESS } from "@/types/checkpoint";
import { getAllTopics } from "@/lib/content";
import { generateTodayMenu } from "@/lib/aiPlanner";
import {
  clearStudyAmount,
  defaultDailyMinutes,
  effectiveDailyMinutes,
  getSelectedMinutes,
  setStudyAmount,
  STUDY_AMOUNT_OPTIONS,
} from "@/lib/studyAmount";

// GF-P1-001。受け入れ基準:
//   - 時間を変えても優先弱点・期限復習が不当に後回しにならない
//   - 5分選択時にも意味のある完了単位が存在する
//   - 30分選択を強制・優遇しない
// あわせて「選ばない人に決めさせない」（既定=おまかせ）を固定する。

const DATE = "2026-08-30";
const NOW = new Date(2026, 7, 30, 12, 0, 0);
const TOPICS = getAllTopics();

const profile = { weekdayMinutes: 20 } as UserProfile;

function state(overrides: Partial<AppState["progress"]> = {}): AppState {
  return {
    profile,
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
    answers: [],
  };
}

const overdueReview: ReviewItem = {
  topicId: TOPICS[3].id,
  dueAt: "2026-08-01T00:00:00.000Z",
  reason: "復習予定日です。",
};

describe("choosing nothing costs nothing", () => {
  it("starts with no selection", () => {
    expect(getSelectedMinutes(state(), DATE)).toBeNull();
  });

  it("uses the profile budget when nothing is chosen", () => {
    expect(effectiveDailyMinutes(state(), profile, DATE)).toBe(20);
  });

  it("produces the same menu as before when no override is passed", () => {
    const withoutOverride = generateTodayMenu(profile, state().progress, TOPICS, [], NOW);
    const withUndefined = generateTodayMenu(
      profile,
      state().progress,
      TOPICS,
      [],
      NOW,
      undefined,
    );

    expect(withUndefined).toEqual(withoutOverride);
  });

  it("falls back to a sane budget without a profile", () => {
    expect(defaultDailyMinutes(undefined)).toBe(10);
  });

  it("drops the selection when the day rolls over", () => {
    const chosen = setStudyAmount(state(), DATE, 30);

    expect(getSelectedMinutes(chosen, DATE)).toBe(30);
    expect(getSelectedMinutes(chosen, "2026-08-31")).toBeNull();
  });
});

describe("selecting an amount", () => {
  it("stores a valid option", () => {
    expect(getSelectedMinutes(setStudyAmount(state(), DATE, 15), DATE)).toBe(15);
  });

  it("ignores an amount that is not offered", () => {
    const before = state();

    expect(setStudyAmount(before, DATE, 7)).toBe(before);
    expect(setStudyAmount(before, DATE, 0)).toBe(before);
  });

  it("is idempotent for the same amount", () => {
    const once = setStudyAmount(state(), DATE, 15);

    expect(setStudyAmount(once, DATE, 15)).toBe(once);
  });

  it("can go back to the default", () => {
    const cleared = clearStudyAmount(setStudyAmount(state(), DATE, 5), DATE);

    expect(getSelectedMinutes(cleared, DATE)).toBeNull();
    expect(effectiveDailyMinutes(cleared, profile, DATE)).toBe(20);
  });

  it("does nothing when clearing an unset choice", () => {
    const before = state();

    expect(clearStudyAmount(before, DATE)).toBe(before);
  });

  it("offers no option that nudges toward the longest time", () => {
    // 選択肢は同格。既定は「おまかせ」で、最長が既定にも先頭にもならない。
    expect(STUDY_AMOUNT_OPTIONS[0]).toBe(5);
    expect(Math.max(...STUDY_AMOUNT_OPTIONS)).toBe(30);
    expect(getSelectedMinutes(state(), DATE)).not.toBe(30);
  });

  it("changes no learning value", () => {
    const before = state();
    const after = setStudyAmount(before, DATE, 30);

    expect(after.progress.exp).toBe(before.progress.exp);
    expect(after.progress.completedTopics).toEqual(before.progress.completedTopics);
    expect(after.progress.checkpointProgress?.earnedBadges).toEqual([]);
  });

  it("does not mutate the state it was given", () => {
    const before = state();
    const snapshot = structuredClone(before);
    setStudyAmount(before, DATE, 15);

    expect(before).toEqual(snapshot);
  });
});

describe("the amount changes how much, never what", () => {
  const progressWithReview = state({ reviewQueue: [overdueReview] }).progress;

  it("keeps an overdue review in the menu even at the shortest amount", () => {
    const short = generateTodayMenu(profile, progressWithReview, TOPICS, [], NOW, 5);

    expect(short.reviewItems.some((item) => item.topicId === overdueReview.topicId)).toBe(true);
  });

  it("keeps the same review list at every amount", () => {
    const amounts = STUDY_AMOUNT_OPTIONS.map((minutes) =>
      generateTodayMenu(profile, progressWithReview, TOPICS, [], NOW, minutes)
        .reviewItems.map((item) => item.topicId),
    );

    for (const list of amounts) {
      expect(list).toEqual(amounts[0]);
    }
  });

  it("keeps the top-priority topic first at every amount", () => {
    const firsts = STUDY_AMOUNT_OPTIONS.map(
      (minutes) =>
        generateTodayMenu(profile, progressWithReview, TOPICS, [], NOW, minutes).items[0]?.topicId,
    );

    for (const first of firsts) {
      expect(first).toBe(firsts[0]);
    }
  });

  it("still offers a meaningful unit at the shortest amount", () => {
    const short = generateTodayMenu(profile, progressWithReview, TOPICS, [], NOW, 5);

    expect(short.items.length).toBeGreaterThanOrEqual(1);
  });

  it("does not shrink the menu when a longer amount is chosen", () => {
    const short = generateTodayMenu(profile, progressWithReview, TOPICS, [], NOW, 5);
    const long = generateTodayMenu(profile, progressWithReview, TOPICS, [], NOW, 30);

    expect(long.items.length).toBeGreaterThanOrEqual(short.items.length);
  });

  it("prefixes the longer menu with the shorter one", () => {
    // 量を増やしても順序は変わらず、後ろに足されるだけ。
    const short = generateTodayMenu(profile, progressWithReview, TOPICS, [], NOW, 5)
      .items.map((item) => item.topicId);
    const long = generateTodayMenu(profile, progressWithReview, TOPICS, [], NOW, 30)
      .items.map((item) => item.topicId);

    expect(long.slice(0, short.length)).toEqual(short);
  });
});
