import { describe, expect, it } from "vitest";
import type { AppState } from "@/types";
import type { BadgeFragment, RewardState } from "@/types/checkpoint";
import { INITIAL_CHECKPOINT_PROGRESS } from "@/types/checkpoint";
import {
  COSMETIC_TITLES,
  equipTitle,
  exchangeTitle,
  fragmentLabel,
  getCosmeticTitle,
  getEquippedTitle,
  getFragments,
  getUnlockedTitleIds,
  listTitleAvailability,
} from "@/lib/rewardInventory";

// GF-P1-005 の「出口」。欠片は称号にしか変えられず、学習評価は買えない。

function state(badgeFragments: BadgeFragment[] = [], rewards?: RewardState): AppState {
  return {
    progress: {
      level: 3,
      exp: 200,
      streakCount: 2,
      weakTags: [],
      completedTopics: ["tech-binary-data"],
      topicMastery: { "tech-binary-data": 70 },
      topicMasteryStats: {},
      reviewQueue: [],
      currentDay: 1,
      completedDays: [],
      checkpointProgress: {
        ...INITIAL_CHECKPOINT_PROGRESS,
        currentCheckpointId: "cp2",
        badgeFragments,
        ...(rewards ? { gameful: { rewards } } : {}),
      },
    },
    answers: [],
  };
}

const CHEAPEST = COSMETIC_TITLES.find((t) => t.id === "title-steady")!;
/** 交換できる称号は必ず cost を持つ。 */
const CHEAPEST_COST = CHEAPEST.cost!;

describe("the catalogue can only sell cosmetics", () => {
  it("offers nothing that touches learning evaluation", () => {
    for (const title of COSMETIC_TITLES) {
      expect(title).not.toHaveProperty("xp");
      expect(title).not.toHaveProperty("badgeId");
      expect(title).not.toHaveProperty("readiness");
      expect(title).not.toHaveProperty("checkpointId");
      expect(title).not.toHaveProperty("unlocksFinalExam");
    }
  });

  it("prices every exchangeable title in fragments only", () => {
    for (const title of COSMETIC_TITLES) {
      expect(title.cost).toBeDefined();
      expect(title.cost!.count).toBeGreaterThan(0);
      expect(title.cost!.fragmentId).toMatch(/^(frag|chest)-/);
    }
  });

  it("gives every title a unique id", () => {
    const ids = COSMETIC_TITLES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("fragment inventory", () => {
  it("lists held fragments, most numerous first", () => {
    const fragments = getFragments(
      state([
        { fragmentId: "frag-rare", count: 2 },
        { fragmentId: "frag-common", count: 9 },
      ]),
    );

    expect(fragments.map((f) => f.fragmentId)).toEqual(["frag-common", "frag-rare"]);
  });

  it("hides fragments that ran out", () => {
    expect(getFragments(state([{ fragmentId: "frag-common", count: 0 }]))).toEqual([]);
  });

  it("names known fragments and falls back for unknown ones", () => {
    expect(fragmentLabel("frag-common")).toBe("ノーマルのかけら");
    expect(fragmentLabel("frag-unknown-xyz")).toBe("かけら");
  });
});

describe("exchanging a title", () => {
  const affordable = () => state([{ fragmentId: CHEAPEST_COST.fragmentId, count: CHEAPEST_COST.count }]);

  it("spends the fragments and unlocks the title", () => {
    const after = exchangeTitle(affordable(), CHEAPEST.id);

    expect(getUnlockedTitleIds(after)).toEqual([CHEAPEST.id]);
    expect(getFragments(after)).toEqual([]);
  });

  it("equips the first title automatically", () => {
    expect(getEquippedTitle(exchangeTitle(affordable(), CHEAPEST.id))?.id).toBe(CHEAPEST.id);
  });

  it("refuses when the fragments are short by one", () => {
    const short = state([
      { fragmentId: CHEAPEST_COST.fragmentId, count: CHEAPEST_COST.count - 1 },
    ]);

    expect(exchangeTitle(short, CHEAPEST.id)).toBe(short);
  });

  it("is idempotent: exchanging twice spends the fragments once", () => {
    const once = exchangeTitle(affordable(), CHEAPEST.id);

    expect(exchangeTitle(once, CHEAPEST.id)).toBe(once);
  });

  it("ignores an unknown title", () => {
    const before = affordable();

    expect(exchangeTitle(before, "title-does-not-exist")).toBe(before);
  });

  it("never changes XP, badges, checkpoints or mastery", () => {
    const before = affordable();
    const after = exchangeTitle(before, CHEAPEST.id);

    expect(after.progress.exp).toBe(before.progress.exp);
    expect(after.progress.level).toBe(before.progress.level);
    expect(after.progress.completedTopics).toEqual(before.progress.completedTopics);
    expect(after.progress.topicMastery).toEqual(before.progress.topicMastery);
    expect(after.progress.checkpointProgress?.earnedBadges).toEqual([]);
    expect(after.progress.checkpointProgress?.currentCheckpointId).toBe("cp2");
    expect(after.progress.checkpointProgress?.clearedCheckpointIds).toEqual([]);
    expect(after.progress.checkpointProgress?.rarePityCount).toBe(0);
  });

  it("does not mutate the state it was given", () => {
    const before = affordable();
    const snapshot = structuredClone(before);
    exchangeTitle(before, CHEAPEST.id);

    expect(before).toEqual(snapshot);
  });
});

describe("availability", () => {
  it("reports how many fragments are still missing", () => {
    const rows = listTitleAvailability(state([{ fragmentId: "frag-common", count: 2 }]));
    const cheapest = rows.find((row) => row.title.id === CHEAPEST.id)!;

    expect(cheapest.unlocked).toBe(false);
    expect(cheapest.affordable).toBe(false);
    expect(cheapest.missing).toBe(CHEAPEST_COST.count - 2);
  });

  it("marks a title affordable once the fragments are there", () => {
    const rows = listTitleAvailability(
      state([{ fragmentId: CHEAPEST_COST.fragmentId, count: CHEAPEST_COST.count }]),
    );

    expect(rows.find((row) => row.title.id === CHEAPEST.id)?.affordable).toBe(true);
  });

  it("stops asking for fragments once unlocked", () => {
    const after = exchangeTitle(
      state([{ fragmentId: CHEAPEST_COST.fragmentId, count: CHEAPEST_COST.count }]),
      CHEAPEST.id,
    );
    const row = listTitleAvailability(after).find((r) => r.title.id === CHEAPEST.id)!;

    expect(row).toMatchObject({ unlocked: true, affordable: false, missing: 0 });
  });

  it("covers every title in the catalogue", () => {
    expect(listTitleAvailability(state())).toHaveLength(COSMETIC_TITLES.length);
  });
});

describe("equipping", () => {
  const owned = () => state([], { unlockedCosmetics: [CHEAPEST.id], equippedTitleId: CHEAPEST.id });

  it("refuses a title that was never unlocked", () => {
    const before = state();

    expect(equipTitle(before, CHEAPEST.id)).toBe(before);
  });

  it("can clear the equipped title", () => {
    expect(getEquippedTitle(equipTitle(owned(), null))).toBeUndefined();
  });

  it("switches between unlocked titles", () => {
    const two = COSMETIC_TITLES[1];
    const both = state([], { unlockedCosmetics: [CHEAPEST.id, two.id], equippedTitleId: CHEAPEST.id });

    expect(getEquippedTitle(equipTitle(both, two.id))?.id).toBe(two.id);
  });

  it("resolves a title by id", () => {
    expect(getCosmeticTitle(CHEAPEST.id)?.label).toBe(CHEAPEST.label);
    expect(getCosmeticTitle("nope")).toBeUndefined();
  });

  it("reports no title for older data", () => {
    expect(getEquippedTitle(state())).toBeUndefined();
    expect(getUnlockedTitleIds(state())).toEqual([]);
  });
});
