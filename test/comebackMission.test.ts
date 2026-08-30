import { describe, expect, it } from "vitest";
import type { AppState, UserAnswer } from "@/types";
import { INITIAL_CHECKPOINT_PROGRESS } from "@/types/checkpoint";
import { getAllTopics } from "@/lib/content";
import { getLessonLocation } from "@/lib/learningCatalog";
import {
  buildComebackMission,
  getDaysAway,
  COMEBACK_MIN_DAYS_AWAY,
  COMEBACK_MISSION_SIZE,
} from "@/lib/comebackMission";

// GF-P1-002。受け入れ基準:
//   - 対象ユーザーに通常の重い today 画面より先に復帰導線を提示できる
//   - 復帰ミッション終了後に通常学習へ遷移可能（＝通常導線を消さない）
//   - 復帰失敗にペナルティを課さない

const DAY_MS = 86_400_000;
const NOW = new Date(2026, 7, 30, 12, 0, 0);
const LEARNABLE = getAllTopics().filter((topic) => getLessonLocation(topic.id));

function daysAgo(days: number): string {
  return new Date(NOW.getTime() - days * DAY_MS).toISOString();
}

function answer(topicId: string, answeredAt: string): UserAnswer {
  return {
    questionId: `q-${topicId}-${answeredAt}`,
    topicId,
    tag: "tag",
    selectedChoice: "A",
    isCorrect: true,
    answeredAt,
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
      checkpointProgress: { ...INITIAL_CHECKPOINT_PROGRESS, currentCheckpointId: "cp1" },
      ...overrides,
    },
    answers,
  };
}

function returning(days: number, topicCount = 3): AppState {
  const topics = LEARNABLE.slice(0, topicCount);
  return state(
    { lastPlayedAt: daysAgo(days), completedTopics: topics.map((t) => t.id) },
    topics.map((t, index) => answer(t.id, daysAgo(days + topicCount - index))),
  );
}

describe("who it is for", () => {
  it("reports the gap since the last session", () => {
    expect(getDaysAway(state({ lastPlayedAt: daysAgo(4) }), NOW)).toBe(4);
  });

  it("reports nothing for a user who never studied", () => {
    expect(getDaysAway(state(), NOW)).toBeNull();
    expect(buildComebackMission({ state: state(), now: NOW })).toBeNull();
  });

  it("stays away from someone who studied today", () => {
    expect(buildComebackMission({ state: returning(0), now: NOW })).toBeNull();
  });

  it("stays away from a one-day gap", () => {
    expect(buildComebackMission({ state: returning(1), now: NOW })).toBeNull();
  });

  it("appears at the configured gap", () => {
    const mission = buildComebackMission({ state: returning(COMEBACK_MIN_DAYS_AWAY), now: NOW });

    expect(mission?.daysAway).toBe(COMEBACK_MIN_DAYS_AWAY);
  });

  it("appears after a long absence", () => {
    expect(buildComebackMission({ state: returning(30), now: NOW })?.daysAway).toBe(30);
  });

  it("survives an unparseable timestamp", () => {
    const broken = state({ lastPlayedAt: "not-a-date" });

    expect(getDaysAway(broken, NOW)).toBeNull();
    expect(buildComebackMission({ state: broken, now: NOW })).toBeNull();
  });
});

describe("what it asks for", () => {
  it("keeps the mission short", () => {
    const mission = buildComebackMission({ state: returning(5, 8), now: NOW });

    expect(mission?.items.length).toBeLessThanOrEqual(COMEBACK_MISSION_SIZE);
    expect(mission?.items.length).toBeGreaterThan(0);
  });

  it("only revisits topics the user already finished", () => {
    const mission = buildComebackMission({ state: returning(5), now: NOW });
    const completed = new Set(returning(5).progress.completedTopics);

    expect(mission?.items.every((item) => completed.has(item.topicId))).toBe(true);
  });

  it("starts with the topic left untouched the longest", () => {
    const topics = LEARNABLE.slice(0, 3);
    const appState = state(
      { lastPlayedAt: daysAgo(5), completedTopics: topics.map((t) => t.id) },
      [
        answer(topics[0].id, daysAgo(6)),
        answer(topics[1].id, daysAgo(40)),
        answer(topics[2].id, daysAgo(20)),
      ],
    );
    const mission = buildComebackMission({ state: appState, now: NOW });

    expect(mission?.items[0].topicId).toBe(topics[1].id);
  });

  it("reports the total minutes it will take", () => {
    const mission = buildComebackMission({ state: returning(5), now: NOW });
    const sum = mission?.items.reduce((total, item) => total + item.estimatedMinutes, 0);

    expect(mission?.totalMinutes).toBe(sum);
  });

  it("offers nothing when there is no finished topic to revisit", () => {
    const noneCompleted = state({ lastPlayedAt: daysAgo(5) });

    expect(buildComebackMission({ state: noneCompleted, now: NOW })).toBeNull();
  });

  it("skips topics that have no lesson to open", () => {
    const appState = state({
      lastPlayedAt: daysAgo(5),
      completedTopics: ["topic-that-does-not-exist"],
    });

    expect(buildComebackMission({ state: appState, now: NOW })).toBeNull();
  });
});

describe("no penalty, no stored state", () => {
  it("produces no reward or progression field", () => {
    const mission = buildComebackMission({ state: returning(5), now: NOW });

    expect(mission).not.toHaveProperty("xp");
    expect(mission).not.toHaveProperty("penalty");
    expect(mission).not.toHaveProperty("deadline");
    for (const item of mission?.items ?? []) {
      expect(item).not.toHaveProperty("xp");
      expect(item).not.toHaveProperty("required");
    }
  });

  it("does not mutate the state it reads", () => {
    const input = returning(5);
    const snapshot = structuredClone(input);

    buildComebackMission({ state: input, now: NOW });

    expect(input).toEqual(snapshot);
  });

  it("returns the same mission every time it is built", () => {
    const input = returning(5);
    const first = buildComebackMission({ state: input, now: NOW });
    const second = buildComebackMission({ state: input, now: NOW });

    expect(second).toEqual(first);
  });
});
