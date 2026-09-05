import { describe, expect, it } from "vitest";
import type { AppState, UserAnswer } from "@/types";
import { INITIAL_CHECKPOINT_PROGRESS } from "@/types/checkpoint";
import { getAllTopics } from "@/lib/content";
import { getLessonLocation } from "@/lib/learningCatalog";
import {
  buildComebackMission,
  getDaysAway,
  COMEBACK_MAX_ITEMS,
  COMEBACK_MIN_DAYS_AWAY,
  COMEBACK_TARGET_MINUTES,
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

    expect(mission?.items.length).toBeLessThanOrEqual(COMEBACK_MAX_ITEMS);
    expect(mission?.items.length).toBeGreaterThan(0);
  });

  // GF-P1-002「3〜5分の復帰ルート」。件数固定だと1件8分×2件で通常の学習量になる。
  it("stays inside the minute budget whenever a unit fits", () => {
    const short = LEARNABLE.filter((t) => t.estimatedMinutes <= COMEBACK_TARGET_MINUTES);
    if (short.length === 0) return; // 予算に収まる単位が無い教材構成なら fallback 側で担保する
    const appState = state({
      lastPlayedAt: daysAgo(5),
      completedTopics: short.map((t) => t.id),
    });
    const mission = buildComebackMission({ state: appState, now: NOW });

    expect(mission?.totalMinutes).toBeLessThanOrEqual(COMEBACK_TARGET_MINUTES);
  });

  // フォールバック: 予算に収まる単位が1つも無いときは、いちばん短いものを1件だけ。
  it("falls back to the single shortest unit when nothing fits the budget", () => {
    const long = LEARNABLE.filter((t) => t.estimatedMinutes > COMEBACK_TARGET_MINUTES);
    const appState = state({
      lastPlayedAt: daysAgo(5),
      completedTopics: long.map((t) => t.id),
    });
    const mission = buildComebackMission({ state: appState, now: NOW });
    const shortest = Math.min(...long.map((t) => t.estimatedMinutes));

    expect(mission?.items).toHaveLength(1);
    expect(mission?.totalMinutes).toBe(shortest);
  });

  // 回帰: 8分級のトピックしか無くても、復帰直後に通常の学習量を積まない。
  it("never stacks a normal-sized study load on a returning user", () => {
    const mission = buildComebackMission({ state: returning(5, 8), now: NOW });
    const shortest = Math.min(...LEARNABLE.map((t) => t.estimatedMinutes));

    expect(mission?.totalMinutes).toBeLessThanOrEqual(
      Math.max(COMEBACK_TARGET_MINUTES, shortest),
    );
  });

  it("only revisits topics the user already finished", () => {
    const mission = buildComebackMission({ state: returning(5), now: NOW });
    const completed = new Set(returning(5).progress.completedTopics);

    expect(mission?.items.every((item) => completed.has(item.topicId))).toBe(true);
  });

  // 予算に収まる単位が複数あるときは、いちばん長く触れていないものから選ぶ。
  it("starts with the topic left untouched the longest", () => {
    const topics = LEARNABLE.filter(
      (t) => t.estimatedMinutes <= COMEBACK_TARGET_MINUTES,
    ).slice(0, 3);
    if (topics.length < 2) return; // 予算内の教材が足りなければ fallback 側の担保に任せる
    const appState = state(
      { lastPlayedAt: daysAgo(5), completedTopics: topics.map((t) => t.id) },
      topics.map((t, i) => answer(t.id, daysAgo([6, 40, 20][i] ?? 10))),
    );
    const mission = buildComebackMission({ state: appState, now: NOW });

    expect(mission?.items[0].topicId).toBe(topics[1].id);
  });

  // フォールバック時は「短さ」が優先。同じ長さが並べば古い方が残る。
  it("prefers the shortest over the stalest when nothing fits the budget", () => {
    const long = LEARNABLE.filter((t) => t.estimatedMinutes > COMEBACK_TARGET_MINUTES);
    const shortestMinutes = Math.min(...long.map((t) => t.estimatedMinutes));
    const stalest = long.find((t) => t.estimatedMinutes > shortestMinutes);
    const shortest = long.find((t) => t.estimatedMinutes === shortestMinutes);
    if (!stalest || !shortest) return;
    const appState = state(
      { lastPlayedAt: daysAgo(5), completedTopics: [stalest.id, shortest.id] },
      [answer(stalest.id, daysAgo(90)), answer(shortest.id, daysAgo(3))],
    );
    const mission = buildComebackMission({ state: appState, now: NOW });

    expect(mission?.items).toHaveLength(1);
    expect(mission?.items[0].topicId).toBe(shortest.id);
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
