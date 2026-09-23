import { describe, expect, it } from "vitest";
import { calculateLevel, getLevelRange } from "@/lib/game";
import { getRankStatus, RANKS } from "@/lib/rank";
import { normalizeAppState } from "@/lib/storage";
import { mergeProgress } from "@/lib/mergeAppState";
import { INITIAL_CHECKPOINT_PROGRESS } from "@/types/checkpoint";
import type { AppState } from "@/types";

describe("モチットのLvとランク", () => {
  it("既存ランクのXP境界をLvの節目として使う", () => {
    for (const rank of RANKS.slice(1)) {
      const below = getRankStatus(rank.minExp - 1);
      const at = getRankStatus(rank.minExp);
      expect(at.current.id).toBe(rank.id);
      expect(below.current.id).not.toBe(rank.id);
      expect(calculateLevel(rank.minExp)).toBe(at.current.minLevel);
      expect(getLevelRange(at.current.minLevel).min).toBe(rank.minExp);
    }
  });

  it("最高ランク到達後もLvが成長する", () => {
    expect(calculateLevel(3000)).toBeGreaterThan(calculateLevel(2200));
    expect(getRankStatus(3000).current.id).toBe("master");
  });

  it("保存済みの旧Lvと端末マージ後のLvをXPにそろえる", () => {
    const state = {
      progress: { level: 5, exp: 750, checkpointProgress: INITIAL_CHECKPOINT_PROGRESS,
        completedTopics: [], topicMastery: {}, topicMasteryStats: {}, reviewQueue: [],
        streakCount: 0, weakTags: [], currentDay: 1, completedDays: [] },
      answers: [],
    } as AppState;
    expect(normalizeAppState(state).progress.level).toBe(calculateLevel(750));
    expect(mergeProgress(state.progress, { ...state.progress, exp: 1300, level: 5 }).level)
      .toBe(calculateLevel(1300));
  });
});
