import { describe, expect, it } from "vitest";
import type { AppState, UserProfile } from "@/types";
import { INITIAL_CHECKPOINT_PROGRESS } from "@/types/checkpoint";
import {
  buildPledgeSummary,
  getPledge,
  hasPledged,
  makePledge,
  releasePledge,
} from "@/lib/pledge";
import {
  clearMochitName,
  getMochitDisplayName,
  hasCustomMochitName,
  setMochitName,
  validateMochitName,
  DEFAULT_MOCHIT_NAME,
  MOCHIT_NAME_MAX_LENGTH,
} from "@/lib/mochitName";

// GF-P1-010（合格宣言）と GF-P1-007（モチット命名）。
// どちらも任意で、使わないユーザーが一切損をしないことが前提。

const NOW = new Date(2026, 7, 30, 12, 0, 0);

function state(overrides: Partial<AppState["progress"]> = {}): AppState {
  return {
    progress: {
      level: 3,
      exp: 200,
      streakCount: 5,
      weakTags: [],
      completedTopics: ["tech-binary-data"],
      topicMastery: { "tech-binary-data": 70 },
      topicMasteryStats: {},
      reviewQueue: [],
      currentDay: 1,
      completedDays: [],
      checkpointProgress: { ...INITIAL_CHECKPOINT_PROGRESS, currentCheckpointId: "cp2" },
      ...overrides,
    },
    answers: [],
  };
}

const profile = { examDate: "2026-10-15" } as UserProfile;

describe("pledging is optional and costs nothing", () => {
  it("starts unpledged", () => {
    expect(hasPledged(state())).toBe(false);
    expect(buildPledgeSummary(state(), profile, NOW)).toBeNull();
  });

  it("records the declaration with its date", () => {
    const after = makePledge(state(), NOW, profile.examDate);

    expect(getPledge(after)?.pledgedAt).toBe(NOW.toISOString());
    expect(getPledge(after)?.examDate).toBe("2026-10-15");
  });

  it("keeps the original declaration date when pledging again", () => {
    const once = makePledge(state(), NOW);

    expect(makePledge(once, new Date(2026, 8, 5))).toBe(once);
  });

  it("can be released and re-declared", () => {
    const pledged = makePledge(state(), NOW);
    const released = releasePledge(pledged);

    expect(hasPledged(released)).toBe(false);
    expect(hasPledged(makePledge(released, new Date(2026, 8, 5)))).toBe(true);
  });

  it("does nothing when releasing without a pledge", () => {
    const before = state();

    expect(releasePledge(before)).toBe(before);
  });

  it("changes no XP, badge, checkpoint or mastery", () => {
    const before = state();
    const after = releasePledge(makePledge(before, NOW));

    expect(after.progress.exp).toBe(before.progress.exp);
    expect(after.progress.level).toBe(before.progress.level);
    expect(after.progress.completedTopics).toEqual(before.progress.completedTopics);
    expect(after.progress.topicMastery).toEqual(before.progress.topicMastery);
    expect(after.progress.checkpointProgress?.earnedBadges).toEqual([]);
    expect(after.progress.checkpointProgress?.currentCheckpointId).toBe("cp2");
    expect(after.progress.checkpointProgress?.badgeFragments).toEqual([]);
  });

  it("summarises elapsed days and the exam countdown", () => {
    const pledged = makePledge(state(), NOW, profile.examDate);
    const summary = buildPledgeSummary(pledged, profile, new Date(2026, 8, 2, 12));

    expect(summary?.daysSincePledge).toBe(3);
    expect(summary?.daysUntilExam).toBeGreaterThan(0);
  });

  it("never reports a negative elapsed count", () => {
    const pledged = makePledge(state(), NOW);
    const summary = buildPledgeSummary(pledged, profile, new Date(2026, 7, 29, 12));

    expect(summary?.daysSincePledge).toBe(0);
  });

  it("works without an exam date", () => {
    const pledged = makePledge(state(), NOW);

    expect(buildPledgeSummary(pledged, undefined, NOW)?.daysUntilExam).toBeNull();
  });

  it("does not mutate the state it was given", () => {
    const before = state();
    const snapshot = structuredClone(before);
    makePledge(before, NOW);

    expect(before).toEqual(snapshot);
  });
});

describe("naming is optional", () => {
  it("uses the default name when nothing is set", () => {
    expect(getMochitDisplayName(state())).toBe(DEFAULT_MOCHIT_NAME);
    expect(hasCustomMochitName(state())).toBe(false);
  });

  it("falls back to the default without any state", () => {
    expect(getMochitDisplayName(null)).toBe(DEFAULT_MOCHIT_NAME);
    expect(getMochitDisplayName(undefined)).toBe(DEFAULT_MOCHIT_NAME);
  });

  it("stores a chosen name", () => {
    const named = setMochitName(state(), "もちすけ", NOW);

    expect(getMochitDisplayName(named)).toBe("もちすけ");
    expect(hasCustomMochitName(named)).toBe(true);
  });

  it("can be renamed later", () => {
    const renamed = setMochitName(setMochitName(state(), "いち", NOW), "に", NOW);

    expect(getMochitDisplayName(renamed)).toBe("に");
  });

  it("can go back to the default", () => {
    const cleared = clearMochitName(setMochitName(state(), "もちすけ", NOW));

    expect(getMochitDisplayName(cleared)).toBe(DEFAULT_MOCHIT_NAME);
    expect(hasCustomMochitName(cleared)).toBe(false);
  });

  it("changes no learning value", () => {
    const before = state();
    const after = setMochitName(before, "もちすけ", NOW);

    expect(after.progress.exp).toBe(before.progress.exp);
    expect(after.progress.completedTopics).toEqual(before.progress.completedTopics);
    expect(after.progress.checkpointProgress?.earnedBadges).toEqual([]);
  });
});

describe("name validation handles hostile input safely", () => {
  const NEWLINE = String.fromCharCode(10);
  const TAB = String.fromCharCode(9);
  const NULL_CHAR = String.fromCharCode(0);

  it("trims surrounding whitespace", () => {
    expect(validateMochitName("  もち  ")).toEqual({ ok: true, value: "もち" });
  });

  it("collapses inner whitespace", () => {
    expect(validateMochitName("もち   すけ")).toEqual({ ok: true, value: "もち すけ" });
  });

  it("rejects an empty or whitespace-only name", () => {
    expect(validateMochitName("")).toEqual({ ok: false, reason: "empty" });
    expect(validateMochitName("   ")).toEqual({ ok: false, reason: "empty" });
  });

  it("rejects a name that is too long", () => {
    const long = "あ".repeat(MOCHIT_NAME_MAX_LENGTH + 1);

    expect(validateMochitName(long)).toEqual({ ok: false, reason: "too_long" });
  });

  it("accepts a name at the maximum length", () => {
    const exact = "あ".repeat(MOCHIT_NAME_MAX_LENGTH);

    expect(validateMochitName(exact)).toEqual({ ok: true, value: exact });
  });

  it("rejects newlines, tabs and null characters", () => {
    for (const bad of [NEWLINE, TAB, NULL_CHAR]) {
      expect(validateMochitName(`もち${bad}すけ`)).toEqual({
        ok: false,
        reason: "invalid_characters",
      });
    }
  });

  it("counts emoji by code point rather than UTF-16 units", () => {
    const emoji = "\u{1F600}".repeat(MOCHIT_NAME_MAX_LENGTH);

    expect(validateMochitName(emoji).ok).toBe(true);
  });

  it("does not store an invalid name", () => {
    const before = state();

    expect(setMochitName(before, "", NOW)).toBe(before);
    expect(setMochitName(before, `もち${NEWLINE}すけ`, NOW)).toBe(before);
  });

  it("stores the normalised form, not the raw input", () => {
    expect(getMochitDisplayName(setMochitName(state(), "  もち  すけ ", NOW))).toBe("もち すけ");
  });
});
