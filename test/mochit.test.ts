import { describe, expect, it } from "vitest";
import type { AppState } from "@/types";
import { getMochitGrowthStage, nextMochitGrowthStageInfo } from "@/lib/mochit";

function stateWithClears(clearedCheckpointIds: string[]): AppState {
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
      checkpointProgress: {
        currentCheckpointId: "cp1",
        clearedCheckpointIds: clearedCheckpointIds as AppState["progress"]["checkpointProgress"] extends infer T
          ? T extends { clearedCheckpointIds: infer Ids }
            ? Ids
            : never
          : never,
        earnedBadges: [],
        badgeFragments: [],
        finalExamAttempts: [],
        rarePityCount: 0,
      },
    },
    answers: [],
  };
}

describe("Mochit growth", () => {
  it("keeps the highest growth stage from cleared checkpoints", () => {
    expect(getMochitGrowthStage(stateWithClears([]))).toBe(1);
    expect(getMochitGrowthStage(stateWithClears(["cp1", "cp2"]))).toBe(2);
    expect(getMochitGrowthStage(stateWithClears(["cp1", "cp2", "cp3", "cp4"]))).toBe(3);
  });

  it("describes the next checkpoint-only growth condition", () => {
    expect(nextMochitGrowthStageInfo(stateWithClears([]))).toMatchObject({
      stage: 2,
      conditionLabel: "チェックポイントを2回クリア",
    });
  });
});
