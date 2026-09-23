import { describe, expect, it } from "vitest";
import type { AppState } from "@/types";
import type { CheckpointId } from "@/types/checkpoint";
import type { Topic, TopicField } from "@/types/content";
import { INITIAL_CHECKPOINT_PROGRESS } from "@/types/checkpoint";
import { getAllTopics } from "@/lib/content";
import { buildTodaysLearningQueue } from "@/lib/learningLoop";
import { buildCheckpointNeeds } from "@/lib/checkpointNeeds";
import { generateTodayMenu } from "@/lib/aiPlanner";
import { completeTopicStudy } from "@/lib/study";

const all = getAllTopics();
const byField = (field: TopicField) => all.filter((topic) => topic.field === field);
const tech = byField("technology");
const mgmt = byField("management");
const strat = byField("strategy");
const now = new Date("2026-09-23T09:00:00.000Z");

function state(checkpointId: CheckpointId, completed: Topic[] = [], mastery: Record<string, number> = {}): AppState {
  return {
    progress: {
      level: 1, exp: 0, streakCount: 0, weakTags: [],
      completedTopics: completed.map((topic) => topic.id),
      topicMastery: mastery, topicMasteryStats: {}, reviewQueue: [],
      currentDay: 1, completedDays: [],
      checkpointProgress: { ...INITIAL_CHECKPOINT_PROGRESS, currentCheckpointId: checkpointId },
    },
    answers: [],
  };
}

function queue(appState: AppState, topics: Topic[]) {
  return buildTodaysLearningQueue({ state: appState, progress: appState.progress, topics, now });
}

describe("Today follows the current checkpoint", () => {
  it("CP1 recommends an untouched field before more technology", () => {
    const s = state("cp1", [tech[0]]);
    const selected = queue(s, [tech[1], mgmt[0], strat[0]]);
    expect(selected[0].topicId).not.toBe(tech[1].id);
    expect([mgmt[0].id, strat[0].id]).toContain(selected[0].topicId);
    expect(selected[0].reason).toContain("CP1");
  });

  it("CP2 recommends management even when an unrelated technology topic is more important", () => {
    const s = state("cp2", [...tech.slice(0, 6), mgmt[0], ...strat.slice(0, 4)]);
    const selected = queue(s, [
      { ...tech[6], importance: 3 },
      { ...mgmt[1], importance: 1 },
      strat[4],
    ]);
    expect(selected[0].topicId).toBe(mgmt[1].id);
    expect(selected[0].reason).toContain("マネジメント");
    const menu = generateTodayMenu(
      { itExperience: "", dailyMinutes: "5", examPlan: "", confidence: 0, weekdayMinutes: 5 },
      s.progress, all, s.answers, now,
    );
    expect(menu.items[0].field).toBe("management");
  });

  it("CP2 values a field badge one step away above a general total step", () => {
    const s = state("cp2", [...tech.slice(0, 5), mgmt[0], ...strat.slice(0, 4)]);
    const selected = queue(s, [tech[5], mgmt[1], strat[4]]);
    expect(selected[0].topicId).toBe(tech[5].id);
    expect(selected[0].reason).toContain("テクノロジ基礎");
  });

  it("CP3 recommends an uncleared management quiz before an already covered field", () => {
    const completed = [...tech.slice(0, 9), ...mgmt.slice(0, 4), ...strat.slice(0, 5)];
    const mastery = Object.fromEntries([
      ...tech.slice(0, 8), ...mgmt.slice(0, 3), ...strat.slice(0, 5),
    ].map((topic) => [topic.id, 60]));
    const s = state("cp3", completed, mastery);
    const selected = queue(s, [tech[8], mgmt[3]]);
    expect(selected[0].topicId).toBe(mgmt[3].id);
    expect(selected[0].reason).toContain("確認問題");
  });

  it("CP4 still puts an overdue review first while review reduction is needed", () => {
    const s = state("cp4", [...tech.slice(0, 10)]);
    s.progress.reviewQueue = tech.slice(0, 5).map((topic, index) => ({
      topicId: topic.id,
      dueAt: index === 0 ? "2020-01-01T00:00:00.000Z" : "2020-01-02T00:00:00.000Z",
      reason: "復習",
    }));
    const selected = queue(s, [tech[0], mgmt[0]]);
    expect(selected[0]).toEqual(expect.objectContaining({ topicId: tech[0].id, kind: "overdue_review" }));
    expect(selected[0].reason).toContain("復習");
  });

  it("CP4 can recommend a completed topic near mastery when no review is due", () => {
    const completed = [...tech.slice(0, 20), ...mgmt.slice(0, 10)];
    const mastery = Object.fromEntries(completed.slice(0, 29).map((topic) => [topic.id, 75]));
    mastery[completed[29].id] = 70;
    const s = state("cp4", completed, mastery);
    const selected = queue(s, [completed[29], strat[0]]);
    expect(selected[0].topicId).toBe(completed[29].id);
    expect(selected[0].reason).toContain("習熟度");
  });

  it("CP4 review shortfall falls after a successful review is rescheduled", () => {
    const s = state("cp4", tech.slice(0, 10));
    s.progress.reviewQueue = tech.slice(0, 5).map((topic) => ({
      topicId: topic.id, dueAt: "2020-01-01T00:00:00.000Z", reason: "復習",
    }));
    const before = buildCheckpointNeeds(s).badges.find((need) => need.badge.id === "b-cp4-review-light");
    s.progress.reviewQueue[0] = { ...s.progress.reviewQueue[0], dueAt: "2099-01-01T00:00:00.000Z" };
    const after = buildCheckpointNeeds(s).badges.find((need) => need.badge.id === "b-cp4-review-light");
    expect(before?.paths[0][0]).toEqual({
      metric: "reviewCount", current: 5, target: 3, direction: "decrease",
    });
    expect(after?.paths[0][0]).toEqual({
      metric: "reviewCount", current: 4, target: 3, direction: "decrease",
    });
  });

  it("CP4 weak-tag shortfall can fall after a correct retry of that tag", () => {
    const topic = tech[0];
    const tag = topic.tags[0];
    const s = state("cp4", tech.slice(0, 10));
    s.progress.weakTags = [tag, "other-a", "other-b"];
    s.answers = [tag, "other-a", "other-b"].map((answerTag, index) => ({
      questionId: `old-${index}`, selectedChoice: "B" as const, isCorrect: false,
      answeredAt: "2020-01-01T00:00:00.000Z", tag: answerTag, topicId: topic.id,
    }));
    const next = completeTopicStudy(s, topic.id, [{
      questionId: "retry", selectedChoice: "A", isCorrect: true,
      answeredAt: now.toISOString(), tag, topicId: topic.id,
    }], { retry: { questionId: "retry", state: "seen", attemptedBefore: true, firstAttemptAt: null, attemptCount: 2 } }, now);
    expect(next.progress.weakTags).not.toContain(tag);
    expect(next.progress.weakTags).toEqual(["other-a", "other-b"]);
  });

  it("CP5 recommends a nearly mastered topic for the mastered count", () => {
    const completed = [...tech.slice(0, 24), ...mgmt.slice(0, 13), ...strat.slice(0, 8)];
    const mastery = Object.fromEntries(completed.slice(0, 44).map((topic) => [topic.id, 75]));
    mastery[completed[44].id] = 70;
    const s = state("cp5", completed, mastery);
    const selected = queue(s, [completed[44], tech[25]]);
    expect(selected[0].topicId).toBe(completed[44].id);
    expect(selected[0].reason).toContain("CP5");
  });

  it("CP5 favors practice in the field below its mastery requirement", () => {
    const mastery = Object.fromEntries(all.map((topic) => [
      topic.id, topic.field === "management" ? 50 : 75,
    ]));
    const s = state("cp5", all, mastery);
    const selected = queue(s, [tech[0], mgmt[0]]);
    expect(selected[0].topicId).toBe(mgmt[0].id);
    expect(selected[0].reason).toContain("マネジメント");
  });

  it("CP6 recommends a nearly mastered topic without predicting readiness", () => {
    const completed = [...tech.slice(0, 32), ...mgmt.slice(0, 17), ...strat.slice(0, 11)];
    const mastery = Object.fromEntries(completed.slice(0, 59).map((topic) => [topic.id, 75]));
    mastery[completed[59].id] = 70;
    const s = state("cp6", completed, mastery);
    const selected = queue(s, [completed[59], tech[33]]);
    expect(selected[0].topicId).toBe(completed[59].id);
    expect(selected[0].reason).not.toMatch(/準備度.*(上がる|達成)/);
  });

  it("reports numeric shortfalls from the same required badge rules used by the gate", () => {
    const s = state("cp2", [...tech.slice(0, 5), mgmt[0], ...strat.slice(0, 4)]);
    const needs = buildCheckpointNeeds(s);
    expect(needs.badges.find((need) => need.badge.id === "b-cp2-basics-tech")?.paths).toEqual([[
      { metric: "completedByField", field: "technology", current: 5, target: 6, direction: "increase" },
    ]]);
    expect(needs.badges.find((need) => need.badge.id === "b-cp2-basics-mgmt")?.paths).toEqual([[
      { metric: "completedByField", field: "management", current: 1, target: 3, direction: "increase" },
    ]]);
  });
});
