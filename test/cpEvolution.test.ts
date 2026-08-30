import { describe, expect, it } from "vitest";
import type { AppState } from "@/types";
import type { CheckpointId } from "@/types/checkpoint";
import { INITIAL_CHECKPOINT_PROGRESS } from "@/types/checkpoint";
import { getMochitGrowthStage, getMochitStageChange } from "@/lib/mochit";
import {
  COMMEMORATIVE_TITLES,
  COSMETIC_TITLES,
  equipTitle,
  exchangeTitle,
  getCosmeticTitle,
  getEarnedCommemoratives,
  getEquippedTitle,
  getUnlockedTitleIds,
  listTitleAvailability,
} from "@/lib/rewardInventory";

// GF-P1-003。受け入れ基準:
//   - CP突破時に通常学習完了とは異なる節目演出がある
//   - prefers-reduced-motion 時は簡略化される（globals.css の .animate-* に集約）
//   - 演出によって CP 判定ロジックを変更しない

function state(clearedCheckpointIds: CheckpointId[] = []): AppState {
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
      checkpointProgress: {
        ...INITIAL_CHECKPOINT_PROGRESS,
        currentCheckpointId: "cp1",
        clearedCheckpointIds,
      },
    },
    answers: [],
  };
}

describe("the growth step is detected, not invented", () => {
  it("reports nothing when the stage did not move", () => {
    expect(getMochitStageChange(state(["cp1"]), state(["cp1"]))).toBeNull();
  });

  it("reports the step when a checkpoint pushes the stage up", () => {
    const change = getMochitStageChange(state(["cp1"]), state(["cp1", "cp2"]));

    expect(change).toEqual({ from: 1, to: 2 });
  });

  it("reports nothing for a checkpoint that does not change the stage", () => {
    // cp3 を足しても段階2のまま（段階3は4クリアから）。
    expect(getMochitStageChange(state(["cp1", "cp2"]), state(["cp1", "cp2", "cp3"]))).toBeNull();
  });

  it("agrees with the existing stage calculation", () => {
    const before = state(["cp1", "cp2", "cp3"]);
    const after = state(["cp1", "cp2", "cp3", "cp4"]);
    const change = getMochitStageChange(before, after);

    expect(change?.from).toBe(getMochitGrowthStage(before));
    expect(change?.to).toBe(getMochitGrowthStage(after));
  });

  it("never reports a step backwards", () => {
    expect(getMochitStageChange(state(["cp1", "cp2"]), state(["cp1"]))).toBeNull();
  });
});

describe("commemoratives come from the record, not from a grant", () => {
  it("gives nothing before any checkpoint is cleared", () => {
    expect(getEarnedCommemoratives(state())).toEqual([]);
  });

  it("appears as soon as the checkpoint is cleared", () => {
    const earned = getEarnedCommemoratives(state(["cp1"]));

    expect(earned).toHaveLength(1);
    expect(earned[0].milestoneCheckpointId).toBe("cp1");
  });

  it("counts one commemorative per cleared checkpoint", () => {
    expect(getEarnedCommemoratives(state(["cp1", "cp2", "cp3"]))).toHaveLength(3);
  });

  it("stores nothing to earn it", () => {
    const before = state(["cp1"]);
    getEarnedCommemoratives(before);

    // 導出だけなので、報酬の保存領域は空のまま。
    expect(before.progress.checkpointProgress?.gameful).toBeUndefined();
  });

  it("counts as an owned title so it can be displayed", () => {
    expect(getUnlockedTitleIds(state(["cp1"]))).toContain("title-cp-cp1");
  });

  it("can be equipped once earned", () => {
    const equipped = equipTitle(state(["cp1"]), "title-cp-cp1");

    expect(getEquippedTitle(equipped)?.id).toBe("title-cp-cp1");
  });

  it("cannot be equipped before the checkpoint is cleared", () => {
    const before = state();

    expect(equipTitle(before, "title-cp-cp1")).toBe(before);
  });
});

describe("commemoratives are not for sale", () => {
  it("cannot be bought with fragments", () => {
    const rich = state();
    rich.progress.checkpointProgress!.badgeFragments = [
      { fragmentId: "frag-rare", count: 999 },
      { fragmentId: "frag-common", count: 999 },
      { fragmentId: "chest-rare", count: 999 },
    ];

    expect(exchangeTitle(rich, "title-cp-cp1")).toBe(rich);
  });

  it("carries no fragment price at all", () => {
    for (const title of COMMEMORATIVE_TITLES) {
      expect(title.cost).toBeUndefined();
      expect(title.milestoneCheckpointId).toBeDefined();
    }
  });

  it("stays out of the exchange list", () => {
    const rows = listTitleAvailability(state(["cp1"]));

    expect(rows.every((row) => row.title.milestoneCheckpointId === undefined)).toBe(true);
    expect(rows).toHaveLength(COSMETIC_TITLES.length);
  });

  it("is still resolvable by id", () => {
    expect(getCosmeticTitle("title-cp-cp1")?.milestoneCheckpointId).toBe("cp1");
  });

  it("grants no learning value", () => {
    for (const title of COMMEMORATIVE_TITLES) {
      expect(title).not.toHaveProperty("xp");
      expect(title).not.toHaveProperty("badgeId");
      expect(title).not.toHaveProperty("readiness");
      expect(title).not.toHaveProperty("unlocksFinalExam");
    }
  });
});

describe("checkpoint judgement is untouched", () => {
  it("does not change the cleared list when a commemorative is displayed", () => {
    const before = state(["cp1", "cp2"]);
    const after = equipTitle(before, "title-cp-cp1");

    expect(after.progress.checkpointProgress?.clearedCheckpointIds).toEqual(["cp1", "cp2"]);
    expect(after.progress.checkpointProgress?.currentCheckpointId).toBe("cp1");
    expect(after.progress.exp).toBe(before.progress.exp);
  });

  it("does not mutate the state it reads", () => {
    const input = state(["cp1"]);
    const snapshot = structuredClone(input);

    getEarnedCommemoratives(input);
    getMochitStageChange(input, input);

    expect(input).toEqual(snapshot);
  });
});
