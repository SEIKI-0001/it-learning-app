import { describe, expect, it } from "vitest";
import type { AppState } from "@/types";
import type { CheckpointId, MochitGrowthRecord } from "@/types/checkpoint";
import { INITIAL_CHECKPOINT_PROGRESS } from "@/types/checkpoint";
import { learningThemes } from "@/data/learningCatalog";
import {
  ensureMochitMilestoneBaseline,
  getMochitAlbum,
  mergeMochitGrowthRecord,
  recordMochitMilestones,
} from "@/lib/mochitMilestones";
import { mergeAppState } from "@/lib/mergeAppState";

const STRATEGY_LESSON = learningThemes.find((t) => t.field === "strategy")!.sections[0].lessonIds[0];
const NOW = new Date("2026-10-18T03:00:00.000Z");

function makeState(opts: { cleared?: CheckpointId[]; mastery?: Record<string, number>; record?: MochitGrowthRecord } = {}): AppState {
  return {
    progress: {
      level: 1,
      exp: 0,
      streakCount: 0,
      weakTags: [],
      completedTopics: [],
      topicMastery: opts.mastery ?? {},
      reviewQueue: [],
      currentDay: 1,
      completedDays: [],
      checkpointProgress: {
        ...INITIAL_CHECKPOINT_PROGRESS,
        clearedCheckpointIds: opts.cleared ?? [],
        ...(opts.record ? { mochitGrowth: opts.record } : {}),
      },
    },
    answers: [],
  };
}

const record = (s: AppState) => s.progress.checkpointProgress?.mochitGrowth;

describe("モチットの成長アルバム", () => {
  it("何も届いていない初回は記録を作らない（保存を増やさない）", () => {
    const state = makeState();
    const result = recordMochitMilestones(state, NOW);
    expect(result.state).toBe(state);
    expect(result.newlyReached).toEqual([]);
  });

  it("記録前から届いていた節目は日付を推測せず「以前から」(null) にし、通知しない", () => {
    const state = makeState({ cleared: ["cp1", "cp2"], mastery: { [STRATEGY_LESSON]: 40 } });
    const result = recordMochitMilestones(state, NOW);
    expect(result.newlyReached).toEqual([]);
    expect(record(result.state)?.milestones["stage-3"]).toBeNull();
    expect(record(result.state)?.milestones["field-strategy-lit"]).toBeNull();
  });

  it("baseline の後に届いた節目だけに日付が付き、二重に記録しない", () => {
    const before = ensureMochitMilestoneBaseline(makeState());
    expect(record(before)?.milestones).toEqual({});
    const after = { ...before, progress: { ...before.progress, topicMastery: { [STRATEGY_LESSON]: 30 } } };
    const first = recordMochitMilestones(after, NOW);
    expect(first.newlyReached).toEqual(["field-strategy-lit"]);
    expect(record(first.state)?.milestones["field-strategy-lit"]).toBe(NOW.toISOString());
    const second = recordMochitMilestones(first.state, new Date("2026-10-20T00:00:00Z"));
    expect(second.newlyReached).toEqual([]);
    expect(second.state).toBe(first.state);
  });

  it("マージは和集合・日付は早い方・null と日付なら日付", () => {
    const merged = mergeMochitGrowthRecord(
      { milestones: { "stage-2": "2026-10-10T00:00:00Z", "stage-3": null, "field-strategy-lit": "2026-10-01T00:00:00Z" } },
      { milestones: { "stage-2": "2026-10-05T00:00:00Z", "stage-3": "2026-10-12T00:00:00Z", personality: null } },
    );
    expect(merged?.milestones).toEqual({
      "stage-2": "2026-10-05T00:00:00Z",
      "stage-3": "2026-10-12T00:00:00Z",
      "field-strategy-lit": "2026-10-01T00:00:00Z",
      personality: null,
    });
  });

  it("端末間マージ（mergeAppState）でアルバムが消えない", () => {
    const a = makeState({ record: { milestones: { "stage-2": "2026-10-10T00:00:00Z" } } });
    const b = makeState();
    const merged = mergeAppState(a, b);
    expect(record(merged)?.milestones["stage-2"]).toBe("2026-10-10T00:00:00Z");
  });

  it("アルバムは未記録でも届いていれば「以前から」、未到達は undefined", () => {
    const album = getMochitAlbum(makeState({ cleared: ["cp1"] }));
    expect(album.find((e) => e.def.id === "stage-2")?.reachedAt).toBeNull();
    expect(album.find((e) => e.def.id === "stage-5")?.reachedAt).toBeUndefined();
  });
});
