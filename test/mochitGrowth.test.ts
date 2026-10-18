import { describe, expect, it } from "vitest";
import type { AppState } from "@/types";
import type { TopicField } from "@/types/content";
import type { CheckpointId } from "@/types/checkpoint";
import { INITIAL_CHECKPOINT_PROGRESS } from "@/types/checkpoint";
import { learningThemes } from "@/data/learningCatalog";
import {
  MOCHIT_FIELDS,
  getMochitFieldGrowth,
  getMochitGrowthLook,
  getMochitGrowthStage,
  getMochitPersonality,
  nextMochitGrowthStageInfo,
  type MochitFieldGrowth,
} from "@/lib/mochit";

const CP: CheckpointId[] = ["cp1", "cp2", "cp3", "cp4", "cp5", "cp6"];

function lessonIds(field: TopicField): string[] {
  const ids: string[] = [];
  for (const theme of learningThemes) {
    if (theme.field !== field) continue;
    for (const section of theme.sections) {
      for (const id of section.lessonIds) if (!ids.includes(id)) ids.push(id);
    }
  }
  return ids;
}

function makeState(opts: {
  cleared?: number;
  completedTopics?: string[];
  mastery?: Record<string, number>;
} = {}): AppState {
  return {
    progress: {
      level: 1,
      exp: 0,
      streakCount: 0,
      weakTags: [],
      completedTopics: opts.completedTopics ?? [],
      topicMastery: opts.mastery ?? {},
      topicMasteryStats: {},
      reviewQueue: [],
      currentDay: 1,
      completedDays: [],
      checkpointProgress: {
        ...INITIAL_CHECKPOINT_PROGRESS,
        currentCheckpointId: "cp1",
        clearedCheckpointIds: CP.slice(0, opts.cleared ?? 0),
      },
    },
    answers: [],
  } as AppState;
}

function masteryFor(field: TopicField, value: number): Record<string, number> {
  return Object.fromEntries(lessonIds(field).map((id) => [id, value]));
}

describe("getMochitGrowthStage (5 stages)", () => {
  it("starts at 1 with nothing done", () => {
    expect(getMochitGrowthStage(makeState())).toBe(1);
  });

  it("reaches 2 with 5 completed topics (4 is not enough)", () => {
    const ids = lessonIds("technology");
    expect(getMochitGrowthStage(makeState({ completedTopics: ids.slice(0, 4) }))).toBe(1);
    expect(getMochitGrowthStage(makeState({ completedTopics: ids.slice(0, 5) }))).toBe(2);
  });

  it("maps cleared checkpoints to stages 2/3/4/5", () => {
    const expected: Record<number, number> = { 0: 1, 1: 2, 2: 3, 3: 3, 4: 4, 5: 4, 6: 5 };
    for (const [clears, stage] of Object.entries(expected)) {
      expect(getMochitGrowthStage(makeState({ cleared: Number(clears) }))).toBe(stage);
    }
  });

  it("is never lower than the old 3-stage model", () => {
    const oldStage = (clears: number) => (clears >= 4 ? 3 : clears >= 2 ? 2 : 1);
    for (let clears = 0; clears <= 6; clears++) {
      expect(getMochitGrowthStage(makeState({ cleared: clears }))).toBeGreaterThanOrEqual(oldStage(clears));
    }
    expect(getMochitGrowthStage(makeState({ cleared: 2 }))).toBe(3);
    expect(getMochitGrowthStage(makeState({ cleared: 4 }))).toBe(4);
  });
});

describe("nextMochitGrowthStageInfo", () => {
  it("points at the following stage with a condition label", () => {
    const cases: Array<[number, number]> = [[0, 2], [1, 3], [2, 4], [4, 5]];
    for (const [clears, next] of cases) {
      const info = nextMochitGrowthStageInfo(makeState({ cleared: clears }));
      expect(info?.stage).toBe(next);
      expect(info?.conditionLabel.length).toBeGreaterThan(0);
    }
  });

  it("returns null at the final stage", () => {
    expect(nextMochitGrowthStageInfo(makeState({ cleared: 6 }))).toBeNull();
  });
});

describe("getMochitFieldGrowth", () => {
  it("lists the three fields in bar order", () => {
    expect(getMochitFieldGrowth(makeState()).map((f) => f.field)).toEqual([...MOCHIT_FIELDS]);
    expect(MOCHIT_FIELDS).toEqual(["strategy", "management", "technology"]);
  });

  it("is Lv0 for every field when nothing started", () => {
    for (const f of getMochitFieldGrowth(makeState())) {
      expect(f.level).toBe(0);
      expect(f.average).toBe(0);
      expect(f.startedTopics).toBe(0);
      expect(f.totalTopics).toBe(lessonIds(f.field).length);
    }
  });

  it("is Lv1 when a single lesson is started", () => {
    for (const field of MOCHIT_FIELDS) {
      const id = lessonIds(field)[0];
      const result = getMochitFieldGrowth(makeState({ mastery: { [id]: 10 } }));
      const own = result.find((f) => f.field === field)!;
      expect(own.level).toBe(1);
      expect(own.startedTopics).toBe(1);
      for (const other of result.filter((f) => f.field !== field)) expect(other.level).toBe(0);
    }
  });

  it("counts a completed topic as started even with 0 mastery", () => {
    const id = lessonIds("management")[0];
    const own = getMochitFieldGrowth(makeState({ completedTopics: [id] })).find((f) => f.field === "management")!;
    expect(own.level).toBe(1);
  });

  it("uses average thresholds 25 / 50 / 80", () => {
    const cases: Array<[number, number]> = [[24, 1], [25, 2], [49, 2], [50, 3], [79, 3], [80, 4], [100, 4]];
    for (const field of MOCHIT_FIELDS) {
      for (const [value, level] of cases) {
        const own = getMochitFieldGrowth(makeState({ mastery: masteryFor(field, value) })).find(
          (f) => f.field === field,
        )!;
        expect(own.average).toBe(value);
        expect(own.level).toBe(level);
      }
    }
  });

  it("clamps out-of-range mastery", () => {
    const own = getMochitFieldGrowth(makeState({ mastery: masteryFor("strategy", 500) })).find(
      (f) => f.field === "strategy",
    )!;
    expect(own.average).toBe(100);
  });
});

describe("getMochitPersonality", () => {
  const fields = (s: number, m: number, t: number): MochitFieldGrowth[] =>
    [["strategy", s], ["management", m], ["technology", t]].map(([field, average]) => ({
      field: field as TopicField,
      average: average as number,
      level: 0,
      startedTopics: 0,
      totalTopics: 10,
    }));

  it("is undecided while the top average is below 20", () => {
    expect(getMochitPersonality(fields(0, 0, 0))).toBe("undecided");
    expect(getMochitPersonality(fields(19, 0, 0))).toBe("undecided");
  });

  it("picks the leading field when it leads by 12 or more", () => {
    expect(getMochitPersonality(fields(20, 8, 0))).toBe("strategy");
    expect(getMochitPersonality(fields(10, 60, 48))).toBe("management");
    expect(getMochitPersonality(fields(10, 20, 70))).toBe("technology");
  });

  it("is balanced when the lead is under 12", () => {
    expect(getMochitPersonality(fields(30, 20, 19))).toBe("balanced");
    expect(getMochitPersonality(fields(40, 40, 40))).toBe("balanced");
  });
});

describe("getMochitGrowthLook", () => {
  it("bundles stage, field levels and personality", () => {
    const look = getMochitGrowthLook(
      makeState({ cleared: 4, mastery: { ...masteryFor("technology", 90), ...masteryFor("strategy", 30) } }),
    );
    expect(look.stage).toBe(4);
    expect(look.fieldLevels).toEqual([2, 0, 4]);
    expect(look.personality).toBe("technology");
  });

  it("is the quiet default for a fresh state", () => {
    expect(getMochitGrowthLook(makeState())).toEqual({
      stage: 1,
      fieldLevels: [0, 0, 0],
      personality: "undecided",
    });
  });
});
