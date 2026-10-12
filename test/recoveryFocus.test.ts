import { describe, expect, it } from "vitest";
import type { AppState, UserProfile, UserProgress } from "@/types";
import { getAllTopics } from "@/lib/content";
import { buildTodaysLearningQueue } from "@/lib/learningLoop";
import { generateTodayMenu } from "@/lib/aiPlanner";
import {
  isRecoveryFocusActive,
  RECOVERY_FOCUS_PRIORITY,
  RECOVERY_FOCUS_REASON,
} from "@/lib/recoveryFocus";

// 立て直し提案を採用したら、その弱点トピックが Today のメニューの上位に出る（採用から7日間）。

const NOW = new Date(2026, 9, 12, 9, 0, 0);
const TOPICS = getAllTopics();

function progress(overrides: Partial<UserProgress> = {}): UserProgress {
  return {
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
    ...overrides,
  };
}

const accepted = (overrides = {}) => ({
  status: "accepted" as const,
  selectedOptionId: "weak_focus",
  acceptedAt: new Date(NOW.getTime() - 2 * 86_400_000).toISOString(),
  ...overrides,
});

describe("isRecoveryFocusActive", () => {
  it("is active for a week after the proposal was accepted", () => {
    expect(isRecoveryFocusActive(accepted(), NOW)).toBe(true);
    expect(
      isRecoveryFocusActive(accepted({ acceptedAt: new Date(NOW.getTime() - 8 * 86_400_000).toISOString() }), NOW),
    ).toBe(false);
  });

  it("ignores proposals that were not accepted, and the postpone option", () => {
    expect(isRecoveryFocusActive(accepted({ status: "proposed" }), NOW)).toBe(false);
    expect(isRecoveryFocusActive(accepted({ selectedOptionId: "postpone_exam" }), NOW)).toBe(false);
    expect(isRecoveryFocusActive(null, NOW)).toBe(false);
  });
});

describe("focus topics in Today's queue", () => {
  const learned = TOPICS.slice(0, 10).map((t) => t.id);
  const focus = learned[7];
  const p = progress({ completedTopics: learned });
  const state: AppState = { profile: { weekdayMinutes: 20 } as UserProfile, progress: p, answers: [] };

  it("puts the chosen weak topics ahead of new topics, with the reason", () => {
    const queue = buildTodaysLearningQueue({ progress: p, topics: TOPICS, state, now: NOW, focusTopicIds: [focus] });

    expect(queue[0]).toMatchObject({ topicId: focus, priority: RECOVERY_FOCUS_PRIORITY, reason: RECOVERY_FOCUS_REASON });
  });

  it("keeps the queue unchanged without focus topics", () => {
    const withEmpty = buildTodaysLearningQueue({ progress: p, topics: TOPICS, state, now: NOW, focusTopicIds: [] });
    const without = buildTodaysLearningQueue({ progress: p, topics: TOPICS, state, now: NOW });

    expect(withEmpty).toEqual(without);
  });

  it("shows up in today's menu as a review", () => {
    const menu = generateTodayMenu(state.profile, p, TOPICS, [], NOW, 20, undefined, { focusTopicIds: [focus] });

    expect(menu.reviewItems.map((r) => r.topicId)).toContain(focus);
  });
});
