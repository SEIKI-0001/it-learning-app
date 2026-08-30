import { describe, expect, it } from "vitest";
import type { WordProgress, WordProgressMap } from "@/lib/wordlistProgress";
import { countByStatus } from "@/lib/wordlistProgress";
import { getAllWords, getWordlistCount } from "@/lib/wordlist";
import {
  buildGlossaryCollection,
  collectionCompletionPct,
  WORDLIST_CATEGORY_LABELS,
  WORD_STATUS_LABELS,
} from "@/lib/glossaryCollection";

// GF-P1-008。受け入れ基準:
//   - 既存単語進捗と図鑑状態が一致する
//   - 未学習語を隠しすぎて教材検索性を落とさない
//   - コンプ報酬が学習評価値を直接変更しない（＝ここは読み取りしかしない）

const ALL_WORDS = getAllWords();
const TOTAL = getWordlistCount();

function progress(id: string, status: WordProgress["status"]): [string, WordProgress] {
  return [
    id,
    {
      acronymId: id,
      status,
      correctCount: 0,
      wrongCount: 0,
      reviewCount: 0,
      lastReviewedAt: null,
      nextReviewAt: null,
      lastSelfRating: null,
    },
  ];
}

describe("matches the existing word progress", () => {
  it("treats a word with no record as unlearned", () => {
    const categories = buildGlossaryCollection({});
    const statuses = new Set(categories.flatMap((c) => c.entries.map((e) => e.status)));

    expect(statuses).toEqual(new Set(["new"]));
  });

  it("copies each stored status without reinterpreting it", () => {
    const [a, b, c, d] = ALL_WORDS;
    const map: WordProgressMap = Object.fromEntries([
      progress(a.id, "mastered"),
      progress(b.id, "weak"),
      progress(c.id, "learning"),
      progress(d.id, "new"),
    ]);
    const byId = new Map(
      buildGlossaryCollection(map).flatMap((category) =>
        category.entries.map((entry) => [entry.id, entry.status]),
      ),
    );

    expect(byId.get(a.id)).toBe("mastered");
    expect(byId.get(b.id)).toBe("weak");
    expect(byId.get(c.id)).toBe("learning");
    expect(byId.get(d.id)).toBe("new");
  });

  it("agrees with countByStatus on the mastered total", () => {
    const map: WordProgressMap = Object.fromEntries(
      ALL_WORDS.slice(0, 5).map((word) => progress(word.id, "mastered")),
    );
    const categories = buildGlossaryCollection(map);
    const mastered = categories.reduce((sum, category) => sum + category.masteredCount, 0);

    expect(mastered).toBe(countByStatus(ALL_WORDS.map((w) => w.id), map).mastered);
  });

  it("labels every status the collection can show", () => {
    for (const status of ["mastered", "weak", "learning", "new"] as const) {
      expect(WORD_STATUS_LABELS[status]).toBeTruthy();
    }
  });
});

describe("keeps the wordlist browsable", () => {
  it("includes every word exactly once", () => {
    const categories = buildGlossaryCollection({});
    const ids = categories.flatMap((category) => category.entries.map((entry) => entry.id));

    expect(ids).toHaveLength(TOTAL);
    expect(new Set(ids).size).toBe(TOTAL);
  });

  it("shows unlearned words rather than hiding them", () => {
    const categories = buildGlossaryCollection({});
    const unlearned = categories.flatMap((category) =>
      category.entries.filter((entry) => entry.status === "new"),
    );

    expect(unlearned).toHaveLength(TOTAL);
    // 略語と意味を伏せない（図鑑化で引けなくならない）。
    expect(unlearned.every((entry) => entry.acronym.length > 0)).toBe(true);
    expect(unlearned.every((entry) => entry.japanese.length > 0)).toBe(true);
  });

  it("labels every category it returns", () => {
    for (const category of buildGlossaryCollection({})) {
      expect(category.label).toBe(WORDLIST_CATEGORY_LABELS[category.category]);
      expect(category.label).toBeTruthy();
    }
  });

  it("sorts entries by acronym so the grid stays scannable", () => {
    const [first] = buildGlossaryCollection({});
    const acronyms = first.entries.map((entry) => entry.acronym);

    expect(acronyms).toEqual([...acronyms].sort((a, b) => a.localeCompare(b)));
  });

  it("returns no empty category", () => {
    expect(buildGlossaryCollection({}).every((category) => category.total > 0)).toBe(true);
  });
});

describe("completion is display only", () => {
  it("is zero when nothing is mastered", () => {
    const categories = buildGlossaryCollection({});

    expect(collectionCompletionPct(categories)).toBe(0);
    expect(categories.every((category) => category.completionPct === 0)).toBe(true);
  });

  it("is 100 when everything is mastered", () => {
    const map: WordProgressMap = Object.fromEntries(
      ALL_WORDS.map((word) => progress(word.id, "mastered")),
    );

    expect(collectionCompletionPct(buildGlossaryCollection(map))).toBe(100);
  });

  it("counts only mastered words toward completion", () => {
    const map: WordProgressMap = Object.fromEntries(
      ALL_WORDS.map((word) => progress(word.id, "learning")),
    );

    expect(collectionCompletionPct(buildGlossaryCollection(map))).toBe(0);
  });

  it("returns zero for an empty collection", () => {
    expect(collectionCompletionPct([])).toBe(0);
  });

  it("produces nothing that could be mistaken for a reward or a score", () => {
    const categories = buildGlossaryCollection({});

    for (const category of categories) {
      expect(category).not.toHaveProperty("xp");
      expect(category).not.toHaveProperty("badgeId");
      expect(category).not.toHaveProperty("readiness");
    }
  });
});

describe("purity", () => {
  it("does not mutate the progress map it reads", () => {
    const map: WordProgressMap = Object.fromEntries([progress(ALL_WORDS[0].id, "mastered")]);
    const snapshot = structuredClone(map);

    buildGlossaryCollection(map);

    expect(map).toEqual(snapshot);
  });
});
